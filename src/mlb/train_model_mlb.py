"""Train and compare MLB home-win moneyline models."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import typer
from rich.console import Console
from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.shared.export_utils import write_json_and_js
from src.shared.modeling import clean_numeric_frame, read_table
from src.shared.paths import MODEL_DIR, PROCESSED_DIR, ensure_project_dirs, resolve_project_path
from src.shared.version import APP_VERSION

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


def _comparison_rows(model_rows: list[dict], y_test: pd.Series, test_df: pd.DataFrame) -> list[dict]:
    comparison = []
    for row in model_rows:
        metrics = row.get("metrics") or {}
        comparison.append(
            {
                "model": row["model_name"],
                "model_name": row["model_name"],
                "status": row["status"],
                "error": row.get("error"),
                **metrics,
            }
        )
    baselines = [
        ("Baseline 50/50", np.full(len(y_test), 0.5)),
        ("Baseline Home Team", np.full(len(y_test), 0.54)),
        ("Baseline Recent Form", _baseline_recent_form(test_df)),
    ]
    for name, probabilities in baselines:
        comparison.append({"model": name, "model_name": name, "status": "baseline", **_metric_block(y_test, probabilities)})
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


def _update_model_registry(entry: dict) -> None:
    registry = _load_json(MODEL_REGISTRY_JSON) or {"metadata": {}, "models": []}
    models = registry.get("models", [])
    for row in models:
        if row.get("sport") == "MLB" and row.get("target") == "home_win":
            row["selected"] = False
    models.append(entry)
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


@app.command()
def train(
    features_file: Optional[Path] = typer.Option(None, help="Feature table from feature_builder_mlb.py."),
    model_out: Path = typer.Option(DEFAULT_MODEL, help="Output model artifact."),
    report_out: Path = typer.Option(DEFAULT_REPORT, help="Model report JSON to update."),
    train_start_season: Optional[int] = typer.Option(None, "--train-start-season", "--train-start", help="First training season."),
    train_end_season: Optional[int] = typer.Option(None, "--train-end-season", "--train-end", help="Last training season."),
    test_season: Optional[int] = typer.Option(None, help="Holdout season."),
) -> None:
    ensure_project_dirs()
    path = resolve_project_path(features_file or DEFAULT_FEATURES)
    if not path.exists():
        raise typer.BadParameter(f"Missing feature file: {path}")
    df = read_table(path)
    df["game_date"] = pd.to_datetime(df["game_date"])
    df = df.dropna(subset=["home_win"]).copy()
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

    model_rows = _train_models(X_train, y_train, X_test, y_test)
    selected = _select_model(model_rows)
    probabilities = selected["probabilities"]
    metrics = selected["metrics"]
    calibration, calibration_error = _calibration(probabilities, y_test)
    record = _model_record(probabilities, y_test)
    confidence_records = _threshold_records(probabilities, y_test)
    comparison = _comparison_rows(model_rows, y_test, test_df)
    top_features = _feature_importance(selected["model"], features)
    created_at = utc_now()
    model_id = f"mlb_moneyline_{APP_VERSION}_{created_at.replace(':', '').replace('-', '').replace('Z', '')}"
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
        "selected_by": "log_loss",
        "calibration_error": calibration_error,
        "metrics": metrics,
        "record": record,
    }
    payload = {
        "model": selected["model"],
        "model_name": selected["model_name"],
        "features": features,
        "metadata": metadata,
        "metrics": metrics,
        "model_comparison": comparison,
        "top_global_features": top_features,
    }
    out = resolve_project_path(model_out)
    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(payload, out)

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
        "metrics": metrics,
        "selected": True,
        "notes": "Selected by lowest log loss, then Brier score.",
    }
    _update_model_registry(registry_entry)
    _write_model_comparison(comparison, selected, metadata, top_features)
    _write_report(report_out, metrics, calibration, comparison, metadata, confidence_records, top_features, record_breakdowns)
    _update_feature_summary(features)

    console.print(f"selected_model: {selected['model_name']}")
    console.print(f"features: {len(features)}")
    for key, value in metrics.items():
        console.print(f"{key}: {value:.4f}" if isinstance(value, (float, int)) else f"{key}: {value}")
    console.print(f"record: {record['record']}")
    console.print(f"[green]Updated report[/green] -> {resolve_project_path(report_out)}")
    console.print(f"[green]Saved model[/green] -> {out}")


if __name__ == "__main__":
    app()
