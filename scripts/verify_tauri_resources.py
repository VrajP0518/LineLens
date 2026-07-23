"""Verify that a Tauri release contains the runtime refresh payload.

This runs after ``tauri build`` in CI. It checks the resource directory used by
the installed executable, not only the source tree, so a missing script or
model fails the build before an installer is published.
"""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RELEASE_DIR = ROOT / "src-tauri" / "target" / "release"

REQUIRED_FILES = [
    "scripts/bootstrap_env.py",
    "scripts/startup_orchestrator.py",
    "scripts/refresh_data.py",
    "scripts/score_model_predictions.py",
    "scripts/live_scores.py",
    "scripts/odds_snapshots.py",
    "scripts/refresh_mlb_player_games.py",
    "scripts/refresh_wnba_availability.py",
    "scripts/refresh_player_props_pipeline.py",
    "scripts/score_prop_predictions.py",
    "src/shared/version.py",
    "src/mlb/feature_builder_mlb.py",
    "src/wnba/feature_builder_wnba.py",
    "models/mlb_moneyline_model.joblib",
    "models/wnba_moneyline_model.joblib",
    "data/predictions/mlb_predictions.json",
    "data/predictions/wnba_predictions.json",
    "data/live/live_heartbeat.json",
    "data/odds/odds_snapshots.json",
    "data/processed/mlb/moneyline_dataset.parquet",
    "requirements.txt",
]


def find_runtime() -> Path | None:
    candidates = [
        RELEASE_DIR / "resources" / "runtime",
        RELEASE_DIR / "resources" / "resources" / "runtime",
        RELEASE_DIR / "runtime",
    ]
    return next((candidate for candidate in candidates if candidate.is_dir()), None)


def main() -> int:
    runtime = find_runtime()
    if runtime is None:
        print("FAIL: Tauri release runtime directory was not found under src-tauri/target/release.")
        return 1

    missing = [path for path in REQUIRED_FILES if not (runtime / path).is_file()]
    if missing:
        print(f"FAIL: Tauri runtime is missing {len(missing)} required files:")
        for path in missing:
            print(f" - {path}")
        return 1

    if (runtime / ".env").exists():
        print("FAIL: Tauri runtime must not bundle a .env file or API key.")
        return 1

    print(f"PASS: Tauri runtime resources verified at {runtime}")
    print(f"PASS: {len(REQUIRED_FILES)} refresh, model, data, and dependency files are bundled")
    print("PASS: no .env file is bundled")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
