"""Startup automation for LineLens Sports.

This script is the desktop-friendly entrypoint: prepare Python, refresh real MLB
predictions, and attempt NFL real-data recovery without fabricating rows.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
STATUS_JSON = DATA_DIR / "startup_status.json"
STATUS_JS = DATA_DIR / "startup_status.js"
BOOTSTRAP_JSON = DATA_DIR / "bootstrap_status.json"
REFRESH_JSON = DATA_DIR / "refresh_status.json"
MLB_MODEL = ROOT / "models" / "mlb_moneyline_model.joblib"
MLB_FEATURES = DATA_DIR / "processed" / "mlb" / "mlb_features_2021_2025.csv"
MLB_PREDICTIONS = DATA_DIR / "predictions" / "mlb_predictions.json"
NFL_PREDICTIONS = DATA_DIR / "predictions" / "nfl_predictions.json"
APP_VERSION = "v0.5.0"
VENV_PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def write_json_and_js(payload: dict[str, Any], json_path: Path, js_path: Path, variable: str) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    js_path.write_text(f"window.{variable} = {json.dumps(payload, separators=(',', ':'))};\n", encoding="utf-8")


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def run_step(name: str, command: list[str], timeout: int = 1200) -> dict[str, Any]:
    started = utc_now()
    print(f"[LineLens] {name}: {' '.join(command)}", flush=True)
    try:
        result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout, check=False)
        success = result.returncode == 0
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
    except Exception as exc:  # noqa: BLE001 - report the exact failing step to the UI.
        success = False
        stdout = ""
        stderr = f"{type(exc).__name__}: {exc}"
        result = None
    step = {
        "name": name,
        "command": " ".join(command),
        "status": "done" if success else "failed",
        "exit_code": None if result is None else result.returncode,
        "started_at": started,
        "finished_at": utc_now(),
        "stdout_tail": "\n".join(stdout.splitlines()[-60:]),
        "stderr_tail": "\n".join(stderr.splitlines()[-60:]),
    }
    print(stdout, flush=True) if stdout else None
    print(stderr, file=sys.stderr, flush=True) if stderr else None
    return step


def ensure_data_dirs() -> None:
    for folder in [
        DATA_DIR / "raw" / "mlb",
        DATA_DIR / "raw" / "nfl",
        DATA_DIR / "processed" / "mlb",
        DATA_DIR / "processed" / "nfl",
        DATA_DIR / "imports" / "nfl",
        DATA_DIR / "predictions",
        DATA_DIR / "reports",
    ]:
        folder.mkdir(parents=True, exist_ok=True)


def bootstrap_command() -> list[str]:
    if VENV_PYTHON.exists():
        return [str(VENV_PYTHON), "scripts/bootstrap_env.py"]
    if shutil.which("py"):
        return ["py", "-3.11", "scripts/bootstrap_env.py"]
    return [sys.executable, "scripts/bootstrap_env.py"]


def has_real_export(path: Path) -> bool:
    payload = load_json(path)
    meta = payload.get("metadata") or payload.get("meta") or {}
    return bool(meta.get("real_data") is True and payload.get("games"))


def update_refresh_sport_status(sport: str, status_name: str, message: str, *, used_cache: bool) -> None:
    refresh = load_json(REFRESH_JSON)
    refresh.setdefault("mode", "startup_auto")
    refresh["generated_at"] = utc_now()
    sports = refresh.setdefault("sports", {})
    sports[sport] = {
        "status": status_name,
        "message": message,
        "last_success_at": utc_now() if status_name in {"real_cached", "real_fresh", "model_generated"} else None,
        "used_cache": used_cache,
        "python": str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable,
    }
    write_json_and_js(refresh, DATA_DIR / "refresh_status.json", DATA_DIR / "refresh_status.js", "__REFRESH_STATUS__")


def has_mlb_model_predictions() -> bool:
    payload = load_json(MLB_PREDICTIONS)
    games = payload.get("games") or []
    return any(game.get("home_win_probability") is not None for game in games)


def orchestrate() -> dict[str, Any]:
    ensure_data_dirs()
    steps: list[dict[str, Any]] = []
    status: dict[str, Any] = {
        "metadata": {"app": "LineLens Sports", "version": APP_VERSION, "generated_at": utc_now()},
        "status": "running",
        "steps": steps,
        "mlb_ready": False,
        "nfl_ready": False,
        "nfl_requires_import": False,
        "manual_nfl_import_path": "data/imports/nfl/spread_dataset.parquet",
        "error": None,
    }

    bootstrap_step = run_step("Bootstrap Python environment", bootstrap_command(), timeout=1200)
    steps.append(bootstrap_step)
    bootstrap = load_json(BOOTSTRAP_JSON)
    status["bootstrap"] = {
        "status": bootstrap.get("status"),
        "python_path": bootstrap.get("python_path"),
        "python_version": bootstrap.get("python_version"),
        "mlb_ready": bootstrap.get("mlb_ready"),
        "nfl_ready": bootstrap.get("nfl_ready"),
        "nfl_error": bootstrap.get("nfl_error"),
    }
    if not bootstrap.get("mlb_ready"):
        status["status"] = "install_failed"
        status["error"] = bootstrap.get("error") or "Python bootstrap failed before MLB could run."
        write_json_and_js(status, STATUS_JSON, STATUS_JS, "__STARTUP_STATUS__")
        return status

    python_path = bootstrap.get("python_path") or sys.executable
    if not Path(python_path).exists() and "\\" in str(python_path):
        status["status"] = "env_missing"
        status["error"] = f"Bootstrapped Python path does not exist: {python_path}"
        write_json_and_js(status, STATUS_JSON, STATUS_JS, "__STARTUP_STATUS__")
        return status

    if not MLB_MODEL.exists() or not MLB_FEATURES.exists():
        steps.append(run_step("Generate MLB model and current predictions", [python_path, "scripts/refresh_data.py", "--sport", "mlb", "--mode", "all"], timeout=1800))
    else:
        steps.append(run_step("Refresh MLB current predictions", [python_path, "scripts/refresh_data.py", "--sport", "mlb", "--mode", "predict"], timeout=900))
    status["mlb_ready"] = has_mlb_model_predictions()
    if not status["mlb_ready"]:
        status["status"] = "failed"
        status["error"] = "MLB model refresh finished without model probabilities. Check data/refresh_status.json."
        write_json_and_js(status, STATUS_JSON, STATUS_JS, "__STARTUP_STATUS__")
        return status

    if has_real_export(NFL_PREDICTIONS):
        update_refresh_sport_status(
            "NFL",
            "real_cached",
            "NFL real export found; startup reused the cached real prediction export.",
            used_cache=True,
        )
        steps.append(
            {
                "name": "Check NFL real export",
                "command": "data/predictions/nfl_predictions.json",
                "status": "real_cached",
                "exit_code": 0,
                "started_at": utc_now(),
                "finished_at": utc_now(),
                "stdout_tail": "NFL real prediction export already exists; startup did not regenerate it.",
                "stderr_tail": "",
            }
        )
    else:
        steps.append(run_step("Attempt NFL real-data regeneration", [python_path, "scripts/refresh_data.py", "--sport", "nfl", "--mode", "real"], timeout=1800))

    status["nfl_ready"] = has_real_export(NFL_PREDICTIONS)
    status["nfl_requires_import"] = not status["nfl_ready"]
    refresh = load_json(REFRESH_JSON)
    status["refresh_status"] = refresh.get("sports", {})
    status["status"] = "real_fresh" if status["nfl_ready"] else "real_cached"
    if not status["nfl_ready"]:
        status["error"] = "NFL regeneration attempted but no real NFL export is available. Use data/imports/nfl/spread_dataset.parquet if sources are blocked."

    write_json_and_js(status, STATUS_JSON, STATUS_JS, "__STARTUP_STATUS__")
    return status


def main() -> int:
    status = orchestrate()
    print(json.dumps(status, indent=2))
    # MLB/model readiness is the fatal path for startup. NFL can remain a clear warning.
    return 0 if status.get("mlb_ready") else 1


if __name__ == "__main__":
    raise SystemExit(main())
