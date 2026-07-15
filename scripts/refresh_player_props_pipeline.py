"""Run the explicit local player-props data pipeline.

This command is intentionally manual. It downloads/uses local data, builds
leakage-safe datasets, trains research artifacts, exports candidates, and
scores only real completed player-game rows. It is never run implicitly when
LineLens opens.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(command: list[str]) -> None:
    print(f"[LineLens] {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mlb-start-date", default="2023-03-30")
    parser.add_argument("--mlb-end-date", default=date.today().isoformat())
    parser.add_argument("--skip-mlb-download", action="store_true")
    parser.add_argument("--skip-mlb-training", action="store_true")
    args = parser.parse_args()
    python = sys.executable
    run([python, "scripts/refresh_wnba_availability.py"])
    if not args.skip_mlb_download:
        run([python, "scripts/refresh_mlb_player_games.py", "--start-date", args.mlb_start_date, "--end-date", args.mlb_end_date])
    run([python, "-m", "src.mlb.props_dataset", "--mode", "all"])
    # Keep a separate latest-player feature export for current market joins.
    # The historical training file is intentionally not used as a substitute
    # when a current player-game source is available.
    run([python, "-m", "src.mlb.props_dataset", "--mode", "current"])
    if not args.skip_mlb_training:
        run([python, "-m", "src.mlb.train_prop_models"])
    run([python, "-m", "src.wnba.export_prop_predictions"])
    run([python, "-m", "src.mlb.export_prop_predictions"])
    run([python, "scripts/score_prop_predictions.py"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
