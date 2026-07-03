"""Train a first-pass MLB home-win moneyline model."""

from __future__ import annotations

from datetime import datetime, timezone
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

from src.shared.modeling import clean_numeric_frame
from src.shared.paths import MODEL_DIR, PROCESSED_DIR, ensure_project_dirs, resolve_project_path

console = Console()
app = typer.Typer(help="Train the MLB moneyline model.")
DEFAULT_FEATURES = PROCESSED_DIR / "mlb" / "moneyline_dataset.parquet"
DEFAULT_MODEL = MODEL_DIR / "mlb_moneyline_model.joblib"
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


@app.command()
def train(
    features_file: Optional[Path] = typer.Option(None, help="Parquet file from feature_builder_mlb.py."),
    model_out: Path = typer.Option(DEFAULT_MODEL, help="Output model artifact."),
    train_start_season: Optional[int] = typer.Option(None, help="First training season."),
    train_end_season: Optional[int] = typer.Option(None, help="Last training season."),
    test_season: Optional[int] = typer.Option(None, help="Holdout season."),
    calibration_method: str = typer.Option("sigmoid", help="'sigmoid', 'isotonic', or 'none'."),
) -> None:
    ensure_project_dirs()
    path = resolve_project_path(features_file or DEFAULT_FEATURES)
    if not path.exists():
        raise typer.BadParameter(f"Missing feature file: {path}")
    df = pd.read_parquet(path)
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
    base.fit(X_train, y_train)
    if calibration_method not in {"sigmoid", "isotonic", "none"}:
        raise typer.BadParameter("calibration-method must be sigmoid, isotonic, or none.")
    model = base if calibration_method == "none" else CalibratedClassifierCV(base, method=calibration_method, cv="prefit")
    if calibration_method != "none":
        model.fit(X_test, y_test)

    probabilities = model.predict_proba(X_test)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "log_loss": float(log_loss(y_test, probabilities)),
        "brier_score": float(brier_score_loss(y_test, probabilities)),
    }
    if len(set(y_test)) > 1:
        metrics["roc_auc"] = float(roc_auc_score(y_test, probabilities))

    payload = {
        "model": model,
        "features": features,
        "metadata": {
            "sport": "MLB",
            "target": "home_win",
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "train_start_season": train_start_season,
            "train_end_season": train_end_season,
            "test_season": test_season,
            "metrics": metrics,
        },
    }
    out = resolve_project_path(model_out)
    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(payload, out)
    for key, value in metrics.items():
        console.print(f"{key}: {value:.3f}")
    console.print(f"[green]Saved model[/green] -> {out}")


if __name__ == "__main__":
    app()
