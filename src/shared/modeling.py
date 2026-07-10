"""Small modeling helpers shared by sport pipelines."""

from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd


class StackingEnsemble:
    """Small, serializable probability stacker used by the MLB Moltres model.

    Base estimators are trained without seeing the holdout season. The meta
    estimator is fit only on chronological out-of-fold base probabilities.
    Keeping this object here makes the joblib artifact usable by both the
    training and export commands without importing a training script.
    """

    def __init__(self, base_models: list[tuple[str, object]], meta_model: object):
        self.base_models = base_models
        self.meta_model = meta_model

    def _base_matrix(self, frame: pd.DataFrame) -> np.ndarray:
        return np.column_stack([model.predict_proba(frame)[:, 1] for _, model in self.base_models])

    def predict_proba(self, frame: pd.DataFrame) -> np.ndarray:
        probabilities = np.clip(self.meta_model.predict_proba(self._base_matrix(frame))[:, 1], 0.001, 0.999)
        return np.column_stack([1.0 - probabilities, probabilities])

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        return (self.predict_proba(frame)[:, 1] >= 0.5).astype(int)

    def component_probabilities(self, frame: pd.DataFrame) -> dict[str, np.ndarray]:
        matrix = self._base_matrix(frame)
        return {name: matrix[:, index] for index, (name, _) in enumerate(self.base_models)}


def clean_numeric_frame(df: pd.DataFrame, feature_cols: Iterable[str]) -> pd.DataFrame:
    """Return finite numeric model features with missing values filled conservatively."""

    frame = df[list(feature_cols)].apply(pd.to_numeric, errors="coerce")
    frame = frame.replace([np.inf, -np.inf], np.nan)
    return frame.fillna(0.0)


def confidence_bucket(probability: float | None) -> str:
    if probability is None:
        return "Pending"
    distance = abs(float(probability) - 0.5)
    if distance < 0.05:
        return "Low"
    if distance < 0.12:
        return "Medium"
    return "High"


def read_table(path) -> pd.DataFrame:
    """Read CSV or Parquet tables while keeping pipeline commands simple."""

    path = str(path)
    if path.lower().endswith(".csv"):
        return pd.read_csv(path)
    return pd.read_parquet(path)
