"""Train a first-pass MLB home-win moneyline model."""

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
from sklearn.calibration import CalibratedClassifierCV
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
LEAKY_COLS = {
    "home_score",
    "away_score",
    "home_win",
    "game_id",
    "game_date",
    "home_team",
    "away_team",
    "home_display",
    "away_display",
    "status",
    "home_probable_pitcher",
    "away_probable_pitcher",
}


def _feature_columns(df: pd.DataFrame) -> list[str]:
    numeric = set(df.select_dtypes(include=[np.number]).columns)
    return [col for col in df.columns if col in numeric and col not in LEAKY_COLS]


def _metric_block(y_true: pd.Series, probabilities: np.ndarray) -> dict:
    predictions = (probabilities >= 0.5).astype(int)
    metrics = {
        "accuracy": float(accuracy_score(y_true, predictions)),
        "log_loss": float(log_loss(y_true, probabilities, labels=[0, 1])),
        "brier_score": float(brier_score_loss(y_true, probabilities)),
        "sample_size": int(len(y_true)),
    }
    metrics["roc_auc"] = float(roc_auc_score(y_true, probabilities)) if len(set(y_true)) > 1 else None
    return metrics


def _calibration(probabilities: np.ndarray, y_true: pd.Series) -> list[dict]:
    abs_prob = np.maximum(probabilities, 1 - probabilities)
    picked_home = probabilities >= 0.5
    pick_won = np.where(picked_home, y_true.to_numpy() == 1, y_true.to_numpy() == 0)
    buckets = [(0.50, 0.55, "50-55%"), (0.55, 0.60, "55-60%"), (0.60, 0.65, "60-65%"), (0.65, 1.01, "65%+")]
    rows = []
    for low, high, label in buckets:
        mask = (abs_prob >= low) & (abs_prob < high)
        count = int(mask.sum())
        predicted_avg = float(abs_prob[mask].mean()) if count else None
        actual_rate = float(pick_won[mask].mean()) if count else None
        rows.append(
            {
                "bucket": label,
                "predicted_avg": predicted_avg,
                "actual_rate": actual_rate,
                "games": count,
                "difference": None if predicted_avg is None or actual_rate is None else float(actual_rate - predicted_avg),
            }
        )
    return rows


def _model_record(probabilities: np.ndarray, y_true: pd.Series) -> dict:
    picked_home = probabilities >= 0.5
    actual_home = y_true.to_numpy() == 1
    wins = int((picked_home == actual_home).sum())
    losses = int(len(y_true) - wins)
    return {"wins": wins, "losses": losses, "record": f"{wins}-{losses}"}


def _confidence_records(probabilities: np.ndarray, y_true: pd.Series) -> list[dict]:
    rows = []
    abs_prob = np.maximum(probabilities, 1 - probabilities)
    picked_home = probabilities >= 0.5
    actual_home = y_true.to_numpy() == 1
    pick_won = picked_home == actual_home
    buckets = [(0.50, 0.55, "50-55%"), (0.55, 0.60, "55-60%"), (0.60, 0.65, "60-65%"), (0.65, 1.01, "65%+")]
    for low, high, label in buckets:
        mask = (abs_prob >= low) & (abs_prob < high)
        wins = int(pick_won[mask].sum())
        games = int(mask.sum())
        losses = games - wins
        rows.append(
            {
                "bucket": label,
                "record": f"{wins}-{losses}",
                "accuracy": None if games == 0 else float(wins / games),
                "sample_size": games,
            }
        )
    return rows


def _comparison(y_true: pd.Series, probabilities: np.ndarray, test_df: pd.DataFrame) -> list[dict]:
    rows = [{"model": "Logistic Regression", **_metric_block(y_true, probabilities), "status": "trained"}]
    rows.append({"model": "Baseline 50/50", **_metric_block(y_true, np.full(len(y_true), 0.5)), "status": "baseline"})
    rows.append({"model": "Baseline Home Team", **_metric_block(y_true, np.full(len(y_true), 0.54)), "status": "baseline"})
    if "recent_win_pct_diff_7" in test_df.columns:
        form_prob = (0.5 + pd.to_numeric(test_df["recent_win_pct_diff_7"], errors="coerce").fillna(0).clip(-0.25, 0.25) * 0.6).clip(0.35, 0.65)
        rows.append({"model": "Recent Form Baseline", **_metric_block(y_true, form_prob.to_numpy()), "status": "baseline"})
    return rows


def _write_report(report_path: Path, metrics: dict, calibration: list[dict], comparison: list[dict], metadata: dict) -> None:
    path = resolve_project_path(report_path)
    existing = {}
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}
    report = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
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
        "confidence_buckets": metadata.get("confidence_buckets", []),
        "clv_summary": {"label": "CLV unavailable until odds close data is connected.", "available": False},
        "real_data": True,
    }
    if "NFL" not in report["sports"] and existing.get("sports", {}).get("NFL"):
        report["sports"]["NFL"] = existing["sports"]["NFL"]
    write_json_and_js(report, path, path.with_suffix(".js"), "__MODEL_REPORT__")


@app.command()
def train(
    features_file: Optional[Path] = typer.Option(None, help="Parquet file from feature_builder_mlb.py."),
    model_out: Path = typer.Option(DEFAULT_MODEL, help="Output model artifact."),
    report_out: Path = typer.Option(DEFAULT_REPORT, help="Model report JSON to update."),
    train_start_season: Optional[int] = typer.Option(None, "--train-start-season", "--train-start", help="First training season."),
    train_end_season: Optional[int] = typer.Option(None, "--train-end-season", "--train-end", help="Last training season."),
    test_season: Optional[int] = typer.Option(None, help="Holdout season."),
    calibration_method: str = typer.Option("sigmoid", help="'sigmoid', 'isotonic', or 'none'."),
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
    train_end_season = train_end_season or max(season for season in seasons if season <= test_season)
    if train_end_season == test_season and len(seasons) > 1:
        train_end_season = seasons[-2]

    train_df = df[df["season"].between(train_start_season, train_end_season)]
    test_df = df[df["season"] == test_season]
    if train_df.empty or test_df.empty:
        raise typer.BadParameter("Training or test split is empty. Adjust season options.")

    features = _feature_columns(df)
    X_train = clean_numeric_frame(train_df, features)
    y_train = train_df["home_win"].astype(int)
    X_test = clean_numeric_frame(test_df, features)
    y_test = test_df["home_win"].astype(int)

    base = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ]
    )
    if calibration_method not in {"sigmoid", "isotonic", "none"}:
        raise typer.BadParameter("calibration-method must be sigmoid, isotonic, or none.")
    if calibration_method == "none":
        model = base
    else:
        model = CalibratedClassifierCV(base, method=calibration_method, cv=3)
    model.fit(X_train, y_train)

    probabilities = model.predict_proba(X_test)[:, 1]
    metrics = _metric_block(y_test, probabilities)
    calibration = _calibration(probabilities, y_test)
    record = _model_record(probabilities, y_test)
    confidence_records = _confidence_records(probabilities, y_test)
    comparison = _comparison(y_test, probabilities, test_df)

    payload = {
        "model": model,
        "features": features,
        "metadata": {
            "sport": "MLB",
            "target": "home_win",
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "version": APP_VERSION,
            "train_start_season": train_start_season,
            "train_end_season": train_end_season,
            "test_season": test_season,
            "metrics": metrics,
            "record": record,
            "confidence_buckets": confidence_records,
            "calibration_method": calibration_method,
            "feature_file": str(path),
        },
    }
    out = resolve_project_path(model_out)
    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(payload, out)
    for key, value in metrics.items():
        if isinstance(value, (float, int)):
            console.print(f"{key}: {value:.3f}")
        else:
            console.print(f"{key}: {value}")
    _write_report(report_out, metrics, calibration, comparison, payload["metadata"])
    console.print(f"[green]Updated report[/green] -> {resolve_project_path(report_out)}")
    console.print(f"[green]Saved model[/green] -> {out}")


if __name__ == "__main__":
    app()
