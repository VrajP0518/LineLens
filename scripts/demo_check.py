"""Run a safe release/demo readiness check for bundled LineLens assets."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PROJECT_PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"
PYTHON = str(PROJECT_PYTHON) if PROJECT_PYTHON.exists() else sys.executable


def run_step(label: str, command: list[str]) -> bool:
    print(f"\n[{label}] {' '.join(command)}")
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.stderr.strip():
        print(result.stderr.strip())
    if result.returncode == 0:
        print(f"PASS: {label}")
        return True
    print(f"FAIL: {label} exited with {result.returncode}")
    return False


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def count_rows(payload: dict[str, Any]) -> int:
    if isinstance(payload.get("games"), list):
        return len(payload["games"])
    if isinstance(payload.get("predictions"), list):
        return len(payload["predictions"])
    if isinstance(payload.get("models"), list):
        return len(payload["models"])
    if isinstance(payload.get("snapshots"), list):
        return len(payload["snapshots"])
    return 1 if payload else 0


def check_file(path: str, label: str, min_rows: int = 1) -> bool:
    full = ROOT / path
    if not full.exists():
        print(f"FAIL: {label} missing at {path}")
        return False
    try:
        payload = load_json(full)
    except json.JSONDecodeError as exc:
        print(f"FAIL: {label} invalid JSON at {path}: {exc}")
        return False
    rows = count_rows(payload)
    if rows < min_rows:
        print(f"FAIL: {label} has {rows} rows, expected at least {min_rows}")
        return False
    print(f"PASS: {label} present at {path} ({rows} rows)")
    return True


def check_data_files() -> bool:
    print("\n[Bundled demo data]")
    checks = [
        ("data/app_metadata.json", "App metadata", 1),
        ("data/predictions/mlb_predictions.json", "MLB predictions", 1),
        ("data/predictions/mlb_backtest_predictions.json", "MLB backtest predictions", 1),
        ("data/predictions/nfl_predictions.json", "NFL predictions", 1),
        ("data/live/live_scores.json", "Live widget data", 1),
        ("data/reports/model_report.json", "Model report", 1),
        ("data/reports/mlb_model_comparison.json", "MLB model comparison", 1),
        ("data/reports/mlb_feature_summary.json", "MLB feature summary", 1),
        ("data/tracking/model_record.json", "Model record", 1),
        ("data/tracking/model_predictions_log.json", "Prediction log", 1),
        ("data/models/model_registry.json", "Model registry", 1),
    ]
    return all(check_file(*item) for item in checks)


def check_optional_files() -> None:
    print("\n[Optional data]")
    optional = [
        ("data/odds/odds_snapshots.json", "Odds snapshots"),
    ]
    for path, label in optional:
        full = ROOT / path
        if not full.exists():
            print(f"WARN: {label} missing at {path}; run npm run refresh:odds when ODDS_API_KEY is configured.")
            continue
        try:
            payload = load_json(full)
        except json.JSONDecodeError as exc:
            print(f"WARN: {label} invalid JSON at {path}: {exc}")
            continue
        rows = count_rows(payload)
        status = payload.get("metadata", {}).get("source_status", "unknown")
        print(f"PASS: {label} present at {path} ({rows} rows, status: {status})")


def main() -> int:
    steps = [
        run_step("JavaScript syntax", ["node", "--check", "app.js"])
        and run_step("Widget JavaScript syntax", ["node", "--check", "widget.js"]),
        run_step("Python compile", [PYTHON, "-m", "compileall", "src", "scripts"]),
        check_data_files(),
        run_step("Build web dist", [PYTHON, "scripts/build_web_dist.py"]),
    ]
    check_optional_files()
    if all(steps):
        print("\nDEMO CHECK PASS: LineLens Sports bundled demo assets are ready.")
        return 0
    print("\nDEMO CHECK FAIL: Fix the failed checks above before demo/release.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
