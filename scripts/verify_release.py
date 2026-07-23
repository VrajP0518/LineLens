"""Run release-safe LineLens verification without training, refresh, or Tauri."""

from __future__ import annotations

import subprocess
import sys
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NPM = "npm.cmd" if os.name == "nt" else "npm"

import sys

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.version import APP_VERSION


def run(label: str, command: list[str]) -> bool:
    print(f"\n[{label}] {' '.join(command)}")
    result = subprocess.run(command, cwd=ROOT, text=True)
    if result.returncode:
        print(f"FAIL: {label} exited with {result.returncode}")
        return False
    print(f"PASS: {label}")
    return True


def required_bundle_files() -> bool:
    required = [
        "index.html", "app.js", "styles.css", "widget.html", "widget.js", "widget.css",
        "assets/sportsdesk-hero.png", "images/Logo1.png", "images/Logo2.png", "images/Logo3.png", "data/app_metadata.json", "data/team_metadata.json",
        "data/predictions/mlb_predictions.json", "data/predictions/mlb_backtest_predictions.json",
        "data/predictions/nfl_predictions.json", "data/live/live_scores.json", "data/live/live_heartbeat.json",
        "data/models/model_registry.json", "data/reports/mlb_model_comparison.json",
        "data/reports/mlb_moltres_model_card.json", "data/reports/model_report.json",
        "data/tracking/model_record.json", "data/tracking/model_predictions_log.json",
        "data/odds/player_props.json", "data/odds/odds_snapshots.json", "data/odds/odds_snapshots.js", "data/odds/odds_health.json", "data/odds/wnba_availability.json",
        "data/odds/props_matching_diagnostics.json", "data/predictions/mlb_prop_predictions.json",
        "data/predictions/wnba_prop_predictions.json", "data/tracking/prop_prediction_log.json",
        "data/tracking/prop_record.json", "data/reports/wnba_prop_model_registry.json",
        "data/reports/wnba_prop_model_cards.json", "data/reports/wnba_prop_model_health.json",
        "data/reports/mlb_prop_model_registry.json", "data/reports/mlb_prop_model_cards.json",
        "data/reports/mlb_prop_model_health.json", "data/reports/mlb_prop_dataset_summary.json",
        f"RELEASE_NOTES_{APP_VERSION}.md", "data/processed/mlb/moneyline_dataset.parquet",
    ]
    missing = [path for path in required if not (ROOT / path).exists()]
    if missing:
        print(f"FAIL: required bundled files missing: {', '.join(missing)}")
        return False
    optional_odds = ROOT / "data/odds/odds_snapshots.json"
    print(f"PASS: required bundled files present; odds snapshots {'included' if optional_odds.exists() else 'not bundled'}")
    return True


def git_safety() -> bool:
    tracked = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True).stdout.decode().split("\0")
    staged = subprocess.run(["git", "diff", "--cached", "--name-only", "-z"], cwd=ROOT, capture_output=True, check=True).stdout.decode().split("\0")
    untracked = subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "-z"], cwd=ROOT, capture_output=True, check=True).stdout.decode().split("\0")
    paths = sorted({path.replace("\\", "/") for path in tracked + staged + untracked if path})
    forbidden = (".env", ".venv/", "node_modules/", "dist-web/", "data/raw/", "data/processed/", ".pytest_cache/", "__pycache__/")
    approved_runtime_context = {"data/processed/mlb/moneyline_dataset.parquet"}
    approved_env_templates = {".env.example", ".env.template"}
    bad = [
        path
        for path in paths
        if (path == ".env" or path.endswith(".env") or (path.startswith(".env.") and path not in approved_env_templates))
        or any(path.startswith(prefix) and path not in approved_runtime_context for prefix in forbidden[1:])
    ]
    temp_markers = (".tmp", "training_output", "checkpoint", ".log")
    bad.extend(path for path in paths if any(marker in path.lower() for marker in temp_markers))
    approved_locks = {"package-lock.json", "src-tauri/Cargo.lock"}
    bad.extend(path for path in paths if path.lower().endswith(".lock") and path not in approved_locks)
    oversized = []
    for path in paths:
        full = ROOT / path
        if full.exists() and full.suffix.lower() in {".csv", ".parquet"} and full.stat().st_size > 10 * 1024 * 1024:
            oversized.append(path)
    if bad or oversized:
        if bad:
            print(f"FAIL: release safety paths detected: {', '.join(sorted(set(bad)))}")
        if oversized:
            print(f"FAIL: oversized CSV/parquet files detected: {', '.join(oversized)}")
        return False
    print("PASS: git safety scan found no forbidden environment, cache, temporary, or oversized data paths")
    return True


def main() -> int:
    python = sys.executable
    steps = [
        run("JavaScript syntax", [NPM, "run", "check:js"]),
        run("Python compile", [python, "-m", "compileall", "src", "scripts"]),
        run("Data status", [NPM, "run", "check:data"]),
        run("Player props contracts", [NPM, "run", "check:props"]),
        run("Integrity contract", [python, "scripts/check_data_integrity.py"]),
        required_bundle_files(),
        run("Web bundle", [NPM, "run", "build:web"]),
        git_safety(),
    ]
    if all(steps):
        print(f"\nRELEASE VERIFY PASS: LineLens Sports {APP_VERSION} is release-check clean.")
        return 0
    print("\nRELEASE VERIFY FAIL: fix the failed release checks before tagging.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
