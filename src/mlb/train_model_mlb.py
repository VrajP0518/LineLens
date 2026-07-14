"""Train and compare MLB home-win moneyline models."""

from __future__ import annotations

from datetime import datetime, timezone
from functools import wraps
import json
import os
from pathlib import Path
import tempfile
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import typer
from rich.console import Console
from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.shared.export_utils import write_json_and_js
from src.shared.modeling import StackingEnsemble, clean_numeric_frame, read_table
from src.shared.paths import MODEL_DIR, PROCESSED_DIR, ensure_project_dirs, resolve_project_path
from src.shared.version import APP_NAME, APP_VERSION

console = Console()
app = typer.Typer(help="Train the MLB moneyline model.")
DEFAULT_FEATURES = PROCESSED_DIR / "mlb" / "mlb_features_2021_2025.csv"
DEFAULT_MODEL = MODEL_DIR / "mlb_moneyline_model.joblib"
DEFAULT_REPORT = Path("data/reports/model_report.json")
MODEL_COMPARISON_JSON = Path("data/reports/mlb_model_comparison.json")
MODEL_COMPARISON_JS = Path("data/reports/mlb_model_comparison.js")
MODEL_REGISTRY_JSON = Path("data/models/model_registry.json")
MODEL_REGISTRY_JS = Path("data/models/model_registry.js")
FEATURE_SUMMARY_JSON = Path("data/reports/mlb_feature_summary.json")
FEATURE_SUMMARY_JS = Path("data/reports/mlb_feature_summary.js")
MOLTRES_MODEL = MODEL_DIR / "mlb_moltres_model.joblib"
MOLTRES_CARD_JSON = Path("data/reports/mlb_moltres_model_card.json")
MOLTRES_CARD_JS = Path("data/reports/mlb_moltres_model_card.js")
TRAINING_LOCK = MODEL_DIR / ".mlb_moneyline_training.lock"

LEAKY_COLS = {
    "home_score",
    "away_score",
    "home_win",
    "game_id",
    "game_date",
    "game_datetime",
    "home_team",
    "away_team",
    "home_display",
    "away_display",
    "status",
    "venue",
    "home_probable_pitcher",
    "away_probable_pitcher",
    "home_pitcher_key",
    "away_pitcher_key",
    "home_league",
    "away_league",
    "home_division",
    "away_division",
    "matchup_key",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _active_pid(pid: int | None) -> bool:
    if not pid or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _acquire_training_lock() -> Path:
    """Prevent overlapping manual runs from racing to replace model artifacts."""

    path = resolve_project_path(TRAINING_LOCK)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            existing = {}
        if _active_pid(existing.get("pid")):
            raise typer.BadParameter(
                f"MLB training is already running (pid {existing.get('pid')}, started {existing.get('started_at', 'unknown')}). "
                "Wait for it to finish rather than starting a second worker."
            )
        path.unlink(missing_ok=True)
    try:
        descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as exc:
        raise typer.BadParameter("MLB training lock already exists. Wait for the active run or remove only a verified stale lock.") from exc
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump({"pid": os.getpid(), "started_at": utc_now(), "command": "src.mlb.train_model_mlb"}, handle)
    return path


def exclusive_training_run(func):
    @wraps(func)
    def wrapped(*args, **kwargs):
        lock = _acquire_training_lock()
        try:
            return func(*args, **kwargs)
        finally:
            lock.unlink(missing_ok=True)

    return wrapped


def _stage_joblib(payload: dict, destination: Path) -> Path:
    """Serialize beside the target before any production artifact is replaced."""

    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_name = tempfile.mkstemp(prefix=f".{destination.stem}.", suffix=".tmp", dir=destination.parent)
    os.close(descriptor)
    staged = Path(temp_name)
    try:
        joblib.dump(payload, staged)
        return staged
    except Exception:
        staged.unlink(missing_ok=True)
        raise


def _feature_columns(df: pd.DataFrame) -> list[str]:
    numeric = set(df.select_dtypes(include=[np.number]).columns)
    return [col for col in df.columns if col in numeric and col not in LEAKY_COLS and not col.endswith("_score")]


def _metric_block(y_true: pd.Series, probabilities: np.ndarray) -> dict:
    probabilities = np.clip(probabilities.astype(float), 0.001, 0.999)
    predictions = (probabilities >= 0.5).astype(int)
    metrics = {
        "accuracy": float(accuracy_score(y_true, predictions)),
        "log_loss": float(log_loss(y_true, probabilities, labels=[0, 1])),
        "brier_score": float(brier_score_loss(y_true, probabilities)),
        "sample_size": int(len(y_true)),
    }
    metrics["roc_auc"] = float(roc_auc_score(y_true, probabilities)) if len(set(y_true)) > 1 else None
    return metrics


def _stability_block(test_df: pd.DataFrame, probabilities: np.ndarray, y_true: pd.Series, blocks: int = 6) -> dict:
    """Measure consistency across chronological slices of the untouched holdout."""

    if len(y_true) < blocks:
        return {"blocks": 1, "accuracy_std": None, "log_loss_std": None, "stability_score": None}
    slices = np.array_split(np.arange(len(y_true)), blocks)
    accuracies = []
    losses = []
    for indices in slices:
        if not len(indices):
            continue
        actual = y_true.iloc[indices]
        predicted = probabilities[indices]
        accuracies.append(float(accuracy_score(actual, predicted >= 0.5)))
        losses.append(float(log_loss(actual, np.clip(predicted, 0.001, 0.999), labels=[0, 1])))
    accuracy_std = float(np.std(accuracies)) if accuracies else None
    log_loss_std = float(np.std(losses)) if losses else None
    # Higher is better: low variation in both accuracy and probability loss.
    stability_score = None if accuracy_std is None or log_loss_std is None else float(1 / (1 + accuracy_std + log_loss_std))
    return {
        "blocks": len(accuracies),
        "accuracy_std": accuracy_std,
        "log_loss_std": log_loss_std,
        "stability_score": stability_score,
    }


def _calibration_error(probabilities: np.ndarray, y_true: pd.Series) -> float | None:
    _, error = _calibration(probabilities, y_true)
    return error


def _pick_won(probabilities: np.ndarray, y_true: pd.Series) -> np.ndarray:
    picked_home = probabilities >= 0.5
    actual_home = y_true.to_numpy() == 1
    return picked_home == actual_home


def _model_record(probabilities: np.ndarray, y_true: pd.Series) -> dict:
    wins = int(_pick_won(probabilities, y_true).sum())
    losses = int(len(y_true) - wins)
    return {"wins": wins, "losses": losses, "pushes": 0, "record": f"{wins}-{losses}", "accuracy": None if len(y_true) == 0 else wins / len(y_true)}


def _calibration(probabilities: np.ndarray, y_true: pd.Series) -> tuple[list[dict], float | None]:
    abs_prob = np.maximum(probabilities, 1 - probabilities)
    pick_won = _pick_won(probabilities, y_true)
    buckets = [
        (0.50, 0.55, "50-55%"),
        (0.55, 0.60, "55-60%"),
        (0.60, 0.65, "60-65%"),
        (0.65, 0.70, "65-70%"),
        (0.70, 1.01, "70%+"),
    ]
    rows = []
    weighted_error = 0.0
    total = 0
    for low, high, label in buckets:
        mask = (abs_prob >= low) & (abs_prob < high)
        count = int(mask.sum())
        predicted_avg = float(abs_prob[mask].mean()) if count else None
        actual_rate = float(pick_won[mask].mean()) if count else None
        difference = None if predicted_avg is None or actual_rate is None else float(actual_rate - predicted_avg)
        if difference is not None:
            weighted_error += abs(difference) * count
            total += count
        rows.append(
            {
                "bucket": label,
                "predicted_avg": predicted_avg,
                "actual_rate": actual_rate,
                "games": count,
                "difference": difference,
            }
        )
    return rows, (weighted_error / total if total else None)


def _threshold_records(probabilities: np.ndarray, y_true: pd.Series) -> list[dict]:
    abs_prob = np.maximum(probabilities, 1 - probabilities)
    pick_won = _pick_won(probabilities, y_true)
    rows = []
    for threshold in [0.50, 0.525, 0.55, 0.575, 0.60, 0.65]:
        mask = abs_prob >= threshold
        games = int(mask.sum())
        wins = int(pick_won[mask].sum())
        losses = games - wins
        rows.append(
            {
                "bucket": f"{threshold * 100:.1f}%+",
                "threshold": threshold,
                "record": f"{wins}-{losses}",
                "wins": wins,
                "losses": losses,
                "pushes": 0,
                "accuracy": None if games == 0 else float(wins / games),
                "sample_size": games,
            }
        )
    return rows


def _per_month_accuracy(test_df: pd.DataFrame, probabilities: np.ndarray, y_true: pd.Series) -> list[dict]:
    frame = test_df[["game_date"]].copy()
    frame["month"] = pd.to_datetime(frame["game_date"]).dt.month
    frame["won"] = _pick_won(probabilities, y_true)
    rows = []
    for month, group in frame.groupby("month"):
        rows.append({"month": int(month), "sample_size": int(len(group)), "accuracy": float(group["won"].mean())})
    return rows


def _per_team_accuracy(test_df: pd.DataFrame, probabilities: np.ndarray, y_true: pd.Series) -> list[dict]:
    frame = test_df[["home_team", "away_team"]].copy()
    frame["won"] = _pick_won(probabilities, y_true)
    rows = []
    teams = sorted(set(frame["home_team"]).union(set(frame["away_team"])))
    for team in teams:
        group = frame[(frame["home_team"] == team) | (frame["away_team"] == team)]
        if len(group) < 20:
            continue
        rows.append({"team": team, "sample_size": int(len(group)), "accuracy": float(group["won"].mean())})
    return rows


def _home_away_pick_accuracy(test_df: pd.DataFrame, probabilities: np.ndarray, y_true: pd.Series) -> dict:
    pick_won = _pick_won(probabilities, y_true)
    picked_home = probabilities >= 0.5
    rows = {}
    for label, mask in [("home_picks", picked_home), ("away_picks", ~picked_home)]:
        games = int(mask.sum())
        wins = int(pick_won[mask].sum())
        rows[label] = {
            "wins": wins,
            "losses": games - wins,
            "sample_size": games,
            "accuracy": None if games == 0 else float(wins / games),
        }
    return rows


def _candidate_models() -> list[tuple[str, object]]:
    return [
        (
            "LogisticRegression",
            Pipeline(
                [
                    ("scaler", StandardScaler()),
                    ("model", LogisticRegression(max_iter=2000, class_weight="balanced")),
                ]
            ),
        ),
        (
            "RandomForestClassifier",
            RandomForestClassifier(
                n_estimators=250,
                min_samples_leaf=8,
                max_features="sqrt",
                class_weight="balanced_subsample",
                random_state=42,
                n_jobs=1,
            ),
        ),
        (
            "GradientBoostingClassifier",
            GradientBoostingClassifier(n_estimators=180, learning_rate=0.035, max_depth=2, random_state=42),
        ),
        (
            "HistGradientBoostingClassifier",
            HistGradientBoostingClassifier(max_iter=220, learning_rate=0.035, l2_regularization=0.02, random_state=42),
        ),
    ]


def _baseline_recent_form(test_df: pd.DataFrame) -> np.ndarray:
    source = "win_pct_14_diff" if "win_pct_14_diff" in test_df.columns else "win_pct_7_diff"
    values = pd.to_numeric(test_df.get(source, 0), errors="coerce").fillna(0).clip(-0.30, 0.30)
    return (0.5 + values * 0.65).clip(0.25, 0.75).to_numpy()


def _feature_importance(model: object, features: list[str]) -> list[dict]:
    values = None
    signed = False
    if isinstance(model, Pipeline) and "model" in model.named_steps and hasattr(model.named_steps["model"], "coef_"):
        values = model.named_steps["model"].coef_[0]
        signed = True
    elif hasattr(model, "feature_importances_"):
        values = model.feature_importances_
    if values is None:
        return []
    rows = []
    for feature, value in zip(features, values):
        rows.append(
            {
                "feature": feature,
                "importance": float(abs(value)),
                "signed_weight": float(value) if signed else None,
                "direction": "supports_home_when_higher" if signed and value > 0 else "supports_away_when_higher" if signed and value < 0 else "global_importance",
            }
        )
    return sorted(rows, key=lambda row: row["importance"], reverse=True)[:30]


def _ensemble_feature_importance(row: dict, features: list[str]) -> list[dict]:
    """Approximate Moltres global drivers from weighted base-model drivers."""

    totals: dict[str, float] = {}
    directions: dict[str, float] = {}
    weights = row.get("component_weights") or {}
    for name, model in getattr(row.get("model"), "base_models", []):
        weight = float(weights.get(name, 0))
        for item in _feature_importance(model, features):
            feature = item["feature"]
            totals[feature] = totals.get(feature, 0) + weight * float(item.get("importance") or 0)
            directions[feature] = directions.get(feature, 0) + weight * float(item.get("signed_weight") or 0)
    rows = []
    for feature, importance in totals.items():
        signed = directions.get(feature, 0)
        rows.append(
            {
                "feature": feature,
                "importance": float(importance),
                "signed_weight": float(signed),
                "direction": "supports_home_when_higher" if signed > 0 else "supports_away_when_higher" if signed < 0 else "global_importance",
            }
        )
    return sorted(rows, key=lambda item: item["importance"], reverse=True)[:30]


def _train_models(X_train: pd.DataFrame, y_train: pd.Series, X_test: pd.DataFrame, y_test: pd.Series) -> list[dict]:
    rows = []
    for name, model in _candidate_models():
        try:
            model.fit(X_train, y_train)
            probabilities = model.predict_proba(X_test)[:, 1]
            rows.append(
                {
                    "model_name": name,
                    "model": model,
                    "probabilities": probabilities,
                    "metrics": _metric_block(y_test, probabilities),
                    "status": "trained",
                    "error": None,
                }
            )
        except Exception as exc:  # noqa: BLE001 - keep comparison robust if one estimator fails.
            rows.append({"model_name": name, "model": None, "probabilities": None, "metrics": {}, "status": "failed", "error": f"{type(exc).__name__}: {exc}"})
    return rows


def _train_moltres(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> dict:
    """Train Moltres with chronological OOF stacking and a sealed test season."""

    candidates = _candidate_models()
    oof = np.full((len(X_train), len(candidates)), np.nan)
    splitter = TimeSeriesSplit(n_splits=4)
    fold_count = 0
    for fold_train, fold_valid in splitter.split(X_train):
        fold_count += 1
        for column, (name, _) in enumerate(candidates):
            try:
                fold_model = dict(_candidate_models())[name]
                fold_model.fit(X_train.iloc[fold_train], y_train.iloc[fold_train])
                oof[fold_valid, column] = fold_model.predict_proba(X_train.iloc[fold_valid])[:, 1]
            except Exception:
                # A base model that cannot train on a chronological fold is
                # excluded from the stack rather than backfilled with guesses.
                continue

    usable_cols = [column for column in range(oof.shape[1]) if np.isfinite(oof[:, column]).sum() >= max(100, int(len(oof) * 0.5))]
    if len(usable_cols) < 2:
        raise RuntimeError("Moltres could not retain at least two base models for chronological stacking.")
    valid = np.isfinite(oof[:, usable_cols]).all(axis=1)
    if valid.sum() < 100:
        raise RuntimeError("Moltres could not produce enough chronological OOF rows for a meta-model.")

    meta_model = LogisticRegression(max_iter=2000, class_weight="balanced")
    meta_model.fit(oof[valid][:, usable_cols], y_train.iloc[np.flatnonzero(valid)])
    final_models = []
    allowed_names = {candidates[column][0] for column in usable_cols}
    for name, _ in candidates:
        if name not in allowed_names:
            continue
        try:
            model = dict(_candidate_models())[name]
            model.fit(X_train, y_train)
            final_models.append((name, model))
        except Exception:
            continue
    if len(final_models) < 2:
        raise RuntimeError("Moltres requires at least two base models trained successfully.")

    # Align the meta model to the base models that survived all folds.
    surviving = [name for name, _ in final_models]
    # Refit a compact meta layer on the surviving OOF columns when a base
    # estimator failed a fold. This keeps component ordering exact.
    surviving_cols = [column for column in usable_cols if [name for name, _ in candidates][column] in surviving]
    meta_model.fit(oof[valid][:, surviving_cols], y_train.iloc[np.flatnonzero(valid)])
    ensemble = StackingEnsemble(final_models, meta_model)
    probabilities = ensemble.predict_proba(X_test)[:, 1]
    coefficients = np.abs(meta_model.coef_[0])
    denominator = float(coefficients.sum()) or 1.0
    weights = {name: float(value / denominator) for (name, _), value in zip(final_models, coefficients)}
    return {
        "model_name": "Moltres",
        "model": ensemble,
        "probabilities": probabilities,
        "metrics": _metric_block(y_test, probabilities),
        "status": "trained",
        "error": None,
        "component_models": surviving,
        "component_weights": weights,
        "oof_rows": int(valid.sum()),
        "oof_folds": fold_count,
    }


def _comparison_rows(model_rows: list[dict], y_test: pd.Series, test_df: pd.DataFrame) -> list[dict]:
    comparison = []
    for row in model_rows:
        metrics = row.get("metrics") or {}
        probabilities = row.get("probabilities")
        diagnostics = {}
        if probabilities is not None:
            diagnostics = {
                "calibration_error": _calibration_error(probabilities, y_test),
                "stability": _stability_block(test_df, probabilities, y_test),
            }
        comparison.append(
            {
                "model": row["model_name"],
                "model_name": row["model_name"],
                "status": row["status"],
                "error": row.get("error"),
                **metrics,
                **diagnostics,
                "components": row.get("component_models"),
            }
        )
    baselines = [
        ("Baseline 50/50", np.full(len(y_test), 0.5)),
        ("Baseline Home Team", np.full(len(y_test), 0.54)),
        ("Baseline Recent Form", _baseline_recent_form(test_df)),
    ]
    for name, probabilities in baselines:
        comparison.append(
            {
                "model": name,
                "model_name": name,
                "status": "baseline",
                **_metric_block(y_test, probabilities),
                "calibration_error": _calibration_error(probabilities, y_test),
                "stability": _stability_block(test_df, probabilities, y_test),
                "components": None,
            }
        )
    return comparison


def _select_model(rows: list[dict]) -> dict:
    trained = [row for row in rows if row["status"] == "trained" and row["metrics"].get("log_loss") is not None]
    if not trained:
        raise RuntimeError("No MLB model candidate trained successfully.")
    return sorted(trained, key=lambda row: (row["metrics"]["log_loss"], row["metrics"]["brier_score"]))[0]


def _load_json(path: Path) -> dict:
    path = resolve_project_path(path)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _write_model_comparison(comparison: list[dict], selected: dict, metadata: dict, top_features: list[dict]) -> None:
    payload = {
        "metadata": {
            "app": "LineLens Sports",
            "sport": "MLB",
            "version": APP_VERSION,
            "generated_at": utc_now(),
            "selected_model": selected["model_name"],
            "selected_by": "lowest log_loss, then brier_score",
            "real_data": True,
        },
        "models": comparison,
        "selected": metadata,
        "top_global_features": top_features,
    }
    write_json_and_js(payload, resolve_project_path(MODEL_COMPARISON_JSON), resolve_project_path(MODEL_COMPARISON_JS), "__MLB_MODEL_COMPARISON__")


def _update_model_registry(entries: list[dict]) -> None:
    registry = _load_json(MODEL_REGISTRY_JSON) or {"metadata": {}, "models": []}
    models = registry.get("models", [])
    for row in models:
        if row.get("sport") == "MLB" and row.get("target") == "home_win":
            row["selected"] = False
    models.extend(entries)
    registry = {
        "metadata": {
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": utc_now(),
            "real_data": True,
        },
        "models": models,
    }
    write_json_and_js(registry, resolve_project_path(MODEL_REGISTRY_JSON), resolve_project_path(MODEL_REGISTRY_JS), "__MODEL_REGISTRY__")


def _update_feature_summary(features: list[str]) -> None:
    summary = _load_json(FEATURE_SUMMARY_JSON)
    if not summary:
        return
    summary["features_used_by_model"] = features
    summary.setdefault("metadata", {})["updated_by_training_at"] = utc_now()
    write_json_and_js(summary, resolve_project_path(FEATURE_SUMMARY_JSON), resolve_project_path(FEATURE_SUMMARY_JS), "__MLB_FEATURE_SUMMARY__")


def _write_report(
    report_path: Path,
    metrics: dict,
    calibration: list[dict],
    comparison: list[dict],
    metadata: dict,
    confidence_records: list[dict],
    top_features: list[dict],
    record_breakdowns: dict,
) -> None:
    path = resolve_project_path(report_path)
    existing = _load_json(path)
    report = {
        "metadata": {
            "generated_at": utc_now(),
            "version": APP_VERSION,
            "real_data": True,
            "mode": "real",
        },
        "sports": existing.get("sports", {}),
    }
    report["sports"]["MLB"] = {
        "metadata": metadata,
        "metrics": metrics,
        "calibration": calibration,
        "model_comparison": comparison,
        "confidence_buckets": confidence_records,
        "threshold_records": confidence_records,
        "record": metadata.get("record"),
        "record_breakdowns": record_breakdowns,
        "top_global_features": top_features,
        "data_quality": {
            "pitcher_features": "proxy features from probable pitcher prior starts where names are available",
            "travel_features": "estimated from team venue coordinates",
            "odds_features": "not connected",
        },
        "clv_summary": {"label": "CLV unavailable until odds close data is connected.", "available": False},
        "real_data": True,
    }
    report["sports"].setdefault(
        "NFL",
        {
            "status": "missing",
            "real_data": False,
            "message": "NFL report metrics are generated only when real NFL report scoring is available.",
        },
    )
    write_json_and_js(report, path, path.with_suffix(".js"), "__MODEL_REPORT__")


def _write_moltres_card(metadata: dict, metrics: dict, comparison: list[dict], components: list[str], weights: dict[str, float], selected: bool) -> None:
    moltres_row = next((row for row in comparison if row.get("model_name") == "Moltres"), {})
    card = {
        "metadata": {
            "app": APP_NAME,
            "sport": "MLB",
            "model_name": "Moltres",
            "model_id": metadata.get("model_id"),
            "generated_at": utc_now(),
            "real_data": True,
        },
        "identity": {
            "display_name": "Moltres",
            "tagline": "Chronological ensemble for MLB moneyline probabilities",
            "accent": "ember",
            "status": "selected production model" if selected else "validated challenger",
        },
        "architecture": {
            "type": "stacked probability ensemble",
            "base_models": components,
            "meta_model": "LogisticRegression on chronological out-of-fold probabilities",
            "oof_rows": metadata.get("moltres_oof_rows"),
            "oof_folds": metadata.get("moltres_oof_folds"),
            "weights": weights,
        },
        "data": {
            "train_seasons": list(range(metadata.get("train_start_season"), metadata.get("train_end_season") + 1)),
            "test_season": metadata.get("test_season"),
            "train_rows": metadata.get("row_count_train"),
            "test_rows": metadata.get("row_count_test"),
            "feature_count": metadata.get("feature_count"),
            "leakage_controls": [
                "All rolling team features are shifted to prior games.",
                "The test season is never used for base or meta fitting.",
                "Meta probabilities come from chronological out-of-fold rows only.",
            ],
        },
        "metrics": metrics,
        "comparison": moltres_row,
        "selection": {
            "selected_for_production": selected,
            "rule": "lowest holdout log loss, then Brier score, among trained models",
            "evidence": "Moltres is not promoted unless its sealed test-season metrics win the same rule used for existing models.",
        },
        "limitations": [
            "Pitcher inputs are proxy features when probable pitcher history is available.",
            "Travel features estimate venue distance rather than exact itineraries.",
            "No paid odds feed is required; market features remain unavailable when snapshots are absent.",
        ],
    }
    write_json_and_js(card, resolve_project_path(MOLTRES_CARD_JSON), resolve_project_path(MOLTRES_CARD_JS), "__MLB_MOLTRES_MODEL_CARD__")


@app.command()
@exclusive_training_run
def train(
    features_file: Optional[Path] = typer.Option(None, help="Feature table from feature_builder_mlb.py."),
    model_out: Path = typer.Option(DEFAULT_MODEL, help="Output model artifact."),
    report_out: Path = typer.Option(DEFAULT_REPORT, help="Model report JSON to update."),
    train_start_season: Optional[int] = typer.Option(None, "--train-start-season", "--train-start", help="First training season."),
    train_end_season: Optional[int] = typer.Option(None, "--train-end-season", "--train-end", help="Last training season."),
    test_season: Optional[int] = typer.Option(None, help="Holdout season."),
) -> None:
    ensure_project_dirs()
    console.print("[cyan][1/6] Loading chronological MLB feature history[/cyan]")
    path = resolve_project_path(features_file or DEFAULT_FEATURES)
    if not path.exists():
        raise typer.BadParameter(f"Missing feature file: {path}")
    df = read_table(path)
    df["game_date"] = pd.to_datetime(df["game_date"])
    df = df.dropna(subset=["home_win"]).copy().sort_values(["game_date", "game_id"]).reset_index(drop=True)
    if df.empty:
        raise typer.BadParameter("No completed MLB games with home_win target were found.")

    seasons = sorted(int(value) for value in df["season"].dropna().unique())
    test_season = test_season or seasons[-1]
    train_start_season = train_start_season or seasons[0]
    train_end_season = train_end_season or max(season for season in seasons if season < test_season)

    train_df = df[df["season"].between(train_start_season, train_end_season)]
    test_df = df[df["season"] == test_season]
    if train_df.empty or test_df.empty:
        raise typer.BadParameter("Training or test split is empty. Adjust season options.")

    features = _feature_columns(df)
    X_train = clean_numeric_frame(train_df, features)
    y_train = train_df["home_win"].astype(int)
    X_test = clean_numeric_frame(test_df, features)
    y_test = test_df["home_win"].astype(int)

    console.print("[cyan][2/6] Fitting base models on pre-holdout seasons[/cyan]")
    model_rows = _train_models(X_train, y_train, X_test, y_test)
    console.print("[cyan][3/6] Building Moltres from chronological out-of-fold probabilities[/cyan]")
    moltres = _train_moltres(X_train, y_train, X_test, y_test)
    model_rows.append(moltres)
    console.print("[cyan][4/6] Evaluating every candidate on the sealed holdout season[/cyan]")
    selected = _select_model(model_rows)
    moltres_id = f"mlb_moltres_{APP_VERSION}_{utc_now().replace(':', '').replace('-', '').replace('Z', '')}"
    probabilities = selected["probabilities"]
    metrics = selected["metrics"]
    calibration, calibration_error = _calibration(probabilities, y_test)
    record = _model_record(probabilities, y_test)
    confidence_records = _threshold_records(probabilities, y_test)
    comparison = _comparison_rows(model_rows, y_test, test_df)
    # Keep the latest season sealed for model selection, then fit the
    # production artifacts on every completed row available in the feature
    # table. This preserves honest holdout metrics while ensuring the daily
    # exporter benefits from the full historical dataset.
    X_full = clean_numeric_frame(df, features)
    y_full = df["home_win"].astype(int)
    production_candidates = []
    for name, model in _candidate_models():
        try:
            model.fit(X_full, y_full)
            production_candidates.append((name, model))
        except Exception:
            continue
    production_moltres = _train_moltres(X_full, y_full, X_full, y_full)
    production_candidates.append(("Moltres", production_moltres["model"]))
    production_model = dict(production_candidates).get(selected["model_name"], selected["model"])
    candidate_models = production_candidates
    top_features = _ensemble_feature_importance(moltres, features) if selected["model_name"] == "Moltres" else _feature_importance(selected["model"], features)
    created_at = utc_now()
    model_id = moltres_id if selected["model_name"] == "Moltres" else f"mlb_moneyline_{APP_VERSION}_{created_at.replace(':', '').replace('-', '').replace('Z', '')}"
    record_breakdowns = {
        "per_month": _per_month_accuracy(test_df, probabilities, y_test),
        "per_team": _per_team_accuracy(test_df, probabilities, y_test),
        "home_away_picks": _home_away_pick_accuracy(test_df, probabilities, y_test),
    }

    metadata = {
        "sport": "MLB",
        "target": "home_win",
        "version": APP_VERSION,
        "model_id": model_id,
        "model_name": selected["model_name"],
        "created_at": created_at,
        "train_start_season": train_start_season,
        "train_end_season": train_end_season,
        "test_season": test_season,
        "feature_count": len(features),
        "row_count_train": int(len(train_df)),
        "row_count_test": int(len(test_df)),
        "production_fit_rows": int(len(df)),
        "production_fit_seasons": seasons,
        "production_fit_policy": "all completed rows after sealed latest-season evaluation",
        "holdout_sealed": True,
        "selected_by": "log_loss",
        "calibration_error": calibration_error,
        "metrics": metrics,
        "record": record,
        "moltres_model_id": moltres_id,
        "moltres_oof_rows": moltres.get("oof_rows"),
        "moltres_oof_folds": moltres.get("oof_folds"),
    }
    payload = {
        "model": production_model,
        "model_name": selected["model_name"],
        "features": features,
        "metadata": metadata,
        "metrics": metrics,
        "model_comparison": comparison,
        "top_global_features": top_features,
        "candidate_models": candidate_models,
    }
    out = resolve_project_path(model_out)
    staged_selected = _stage_joblib(payload, out)

    moltres_metadata = {
        **metadata,
        "model_id": moltres_id,
        "model_name": "Moltres",
        "metrics": moltres["metrics"],
        "record": _model_record(moltres["probabilities"], y_test),
        "selected_by": "chronological OOF stacking; holdout selection by log_loss then Brier score",
    }
    moltres_payload = {
        "model": production_moltres["model"],
        "model_name": "Moltres",
        "features": features,
        "metadata": moltres_metadata,
        "metrics": moltres["metrics"],
        "model_comparison": comparison,
        "top_global_features": _ensemble_feature_importance(moltres, features),
        "component_models": moltres.get("component_models"),
        "component_weights": moltres.get("component_weights"),
        "candidate_models": candidate_models,
    }
    staged_moltres = _stage_joblib(moltres_payload, resolve_project_path(MOLTRES_MODEL))

    registry_entry = {
        "model_id": model_id,
        "sport": "MLB",
        "target": "home_win",
        "model_name": selected["model_name"],
        "version": APP_VERSION,
        "trained_at": created_at,
        "train_seasons": list(range(train_start_season, train_end_season + 1)),
        "test_season": test_season,
        "feature_count": len(features),
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "production_fit_rows": int(len(df)),
        "production_fit_seasons": seasons,
        "production_fit_policy": "all completed rows after sealed latest-season evaluation",
        "metrics": metrics,
        "selected": True,
        "notes": "Selected by lowest log loss, then Brier score.",
    }
    moltres_entry = {
        **registry_entry,
        "model_id": moltres_id,
        "model_name": "Moltres",
        "metrics": moltres["metrics"],
        "selected": selected["model_name"] == "Moltres",
        "notes": "Chronological OOF stacking challenger; promoted only when sealed holdout metrics win the production selection rule.",
        "components": moltres.get("component_models"),
        "component_weights": moltres.get("component_weights"),
    }
    registry_entries = [moltres_entry] if selected["model_name"] == "Moltres" else [registry_entry, moltres_entry]
    console.print("[cyan][5/6] Writing model card, registry, reports, and comparison[/cyan]")
    _update_model_registry(registry_entries)
    _write_model_comparison(comparison, selected, metadata, top_features)
    _write_report(report_out, metrics, calibration, comparison, metadata, confidence_records, top_features, record_breakdowns)
    _write_moltres_card(moltres_metadata, moltres["metrics"], comparison, moltres.get("component_models", []), moltres.get("component_weights", {}), selected["model_name"] == "Moltres")
    _update_feature_summary(features)

    # The only production-model replacement happens after every other output
    # has been staged or written successfully. A failed train never replaces
    # the existing selected model artifact.
    os.replace(staged_moltres, resolve_project_path(MOLTRES_MODEL))
    os.replace(staged_selected, out)
    console.print("[cyan][6/6] Atomically promoted the evaluated selected artifact[/cyan]")

    console.print(f"selected_model: {selected['model_name']}")
    console.print(f"moltres_metrics: {moltres['metrics']}")
    console.print(f"features: {len(features)}")
    for key, value in metrics.items():
        console.print(f"{key}: {value:.4f}" if isinstance(value, (float, int)) else f"{key}: {value}")
    console.print(f"record: {record['record']}")
    console.print(f"[green]Updated report[/green] -> {resolve_project_path(report_out)}")
    console.print(f"[green]Saved model[/green] -> {out}")


if __name__ == "__main__":
    app()
