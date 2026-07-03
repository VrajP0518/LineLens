"""Small modeling helpers shared by sport pipelines."""

from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd


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
