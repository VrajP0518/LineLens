"""Train and evaluate a spread-cover classifier using scikit-learn."""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
import typer
from rich.console import Console
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
PROCESSED_DIR = ROOT / "data" / "processed"
MODEL_DIR = ROOT / "models"

LEAKY_FEATURES = {
    "home_team_x",
    "home_team_y",
    "away_team_x",
    "away_team_y",
    "home_score",
    "away_score",
    "home_cover",
    "cover_margin",
}

console = Console()
app = typer.Typer(help="Train a scikit-learn model to predict spread covers.")


def _resolve_features_path(path: Optional[Path]) -> Path:
    if path:
        resolved = path if path.is_absolute() else (ROOT / path)
        if not resolved.exists():
            raise typer.BadParameter(f"Features file '{resolved}' was not found.")
        return resolved
    default = PROCESSED_DIR / "spread_dataset.parquet"
    if not default.exists():
        raise typer.BadParameter("Default features file data/processed/spread_dataset.parquet is missing.")
    return default


def _select_feature_columns(df: pd.DataFrame) -> List[str]:
    numeric_cols = set(df.select_dtypes(include=[np.number]).columns)
    candidate_cols = [
        col
        for col in df.columns
        if col in numeric_cols
        and (
            col.startswith("home_")
            or col.startswith("away_")
            or col in {"spread_line", "rest_diff"}
        )
    ]
    candidate_cols = [col for col in candidate_cols if col not in LEAKY_FEATURES]
    return candidate_cols


@app.command()
def train(
    features_file: Optional[Path] = typer.Option(None, help="Parquet file produced by feature_builder.py."),
    train_start_season: int = typer.Option(2018, help="First season to include in the training window."),
    train_end_season: int = typer.Option(2022, help="Last season to include in the training window."),
    test_season: int = typer.Option(2023, help="Season used exclusively for validation."),
    model_out: Path = typer.Option(MODEL_DIR / "spread_model.joblib", help="Where to store the fitted pipeline."),
    calibration_method: str = typer.Option(
        "sigmoid",
        help=(
            "Probability calibration strategy applied to the validation season. "
            "Choose from 'sigmoid', 'isotonic', or 'none' to skip calibration."
        ),
    ),
) -> None:
    """Fit a logistic regression model and report validation metrics."""

    features_path = _resolve_features_path(features_file)
    df = pd.read_parquet(features_path)

    df = df[df["season"].between(train_start_season, test_season)]
    df = df.replace([np.inf, -np.inf], np.nan).dropna()

    train_df = df[df["season"].between(train_start_season, train_end_season)]
    test_df = df[df["season"] == test_season]

    if train_df.empty or test_df.empty:
        raise typer.BadParameter("Training or test split is empty. Adjust season boundaries.")

    feature_cols = _select_feature_columns(df)
    if not feature_cols:
        raise RuntimeError("No feature columns detected. Did feature_builder run successfully?")

    X_train = train_df[feature_cols].values
    y_train = train_df["home_cover"].values
    X_test = test_df[feature_cols].values
    y_test = test_df["home_cover"].values

    base_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        (
            "model",
            LogisticRegression(max_iter=2000, class_weight="balanced", solver="lbfgs"),
        ),
    ])

    console.print(f"Training on {len(train_df)} samples, validating on {len(test_df)} samples...")
    base_pipeline.fit(X_train, y_train)

    if calibration_method.lower() not in {"sigmoid", "isotonic", "none"}:
        raise typer.BadParameter("calibration-method must be one of 'sigmoid', 'isotonic', 'none'.")

    if calibration_method.lower() == "none":
        estimator = base_pipeline
    else:
        if test_df.empty:
            raise typer.BadParameter("Validation split is empty; cannot run calibration.")
        estimator = CalibratedClassifierCV(base_pipeline, method=calibration_method.lower(), cv="prefit")
        estimator.fit(X_test, y_test)

    proba = estimator.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)

    metrics = {
        "accuracy": accuracy_score(y_test, preds),
        "roc_auc": roc_auc_score(y_test, proba),
        "log_loss": log_loss(y_test, proba),
    }
    for key, value in metrics.items():
        console.print(f"{key}: {value:.3f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = model_out if model_out.is_absolute() else (ROOT / model_out)
    joblib.dump({"model": estimator, "features": feature_cols}, model_path)
    console.print(f"[green]Saved model[/green] -> {model_path}")


if __name__ == "__main__":
    app()
