"""Central project paths for sport-specific pipelines."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
PREDICTIONS_DIR = DATA_DIR / "predictions"
MODEL_DIR = ROOT / "models"


def ensure_project_dirs() -> None:
    """Create the standard LineLens data/model directories."""

    for path in [
        RAW_DIR / "nfl",
        RAW_DIR / "mlb",
        PROCESSED_DIR / "nfl",
        PROCESSED_DIR / "mlb",
        PREDICTIONS_DIR,
        MODEL_DIR,
    ]:
        path.mkdir(parents=True, exist_ok=True)


def resolve_project_path(path: str | Path) -> Path:
    candidate = Path(path)
    return candidate if candidate.is_absolute() else ROOT / candidate
