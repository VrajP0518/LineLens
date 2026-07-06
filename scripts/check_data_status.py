"""Summarize LineLens local data readiness without downloading live data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return {"_error": f"Invalid JSON: {exc}"}


def mode_for_prediction(path: Path) -> dict[str, Any]:
    payload = load_json(path)
    meta = payload.get("metadata") or payload.get("meta") or {}
    games = payload.get("games") or []
    if payload.get("_error"):
        status = "failed"
    elif not payload:
        status = "missing"
    elif meta.get("real_data") is True and games:
        status = "real_cached"
    elif meta.get("prediction_mode") == "schedule_only":
        status = "schedule_only"
    elif meta.get("real_data") is False:
        status = "missing"
    else:
        status = "missing"
    return {
        "path": str(path.relative_to(ROOT)),
        "status": status,
        "games": len(games),
        "prediction_mode": meta.get("prediction_mode"),
        "model_type": meta.get("model_type"),
        "reason": meta.get("reason"),
        "error": payload.get("_error"),
    }


def main() -> int:
    bootstrap = load_json(DATA_DIR / "bootstrap_status.json")
    startup = load_json(DATA_DIR / "startup_status.json")
    refresh = load_json(DATA_DIR / "refresh_status.json")
    report = load_json(DATA_DIR / "reports" / "model_report.json")
    summary = {
        "bootstrap": {
            "status": bootstrap.get("status", "missing"),
            "python_version": bootstrap.get("python_version"),
            "mlb_ready": bootstrap.get("mlb_ready"),
            "nfl_ready": bootstrap.get("nfl_ready"),
            "nfl_error": bootstrap.get("nfl_error"),
        },
        "startup": {
            "status": startup.get("status", "missing"),
            "mlb_ready": startup.get("mlb_ready"),
            "nfl_ready": startup.get("nfl_ready"),
            "error": startup.get("error"),
        },
        "refresh": refresh.get("sports", {}),
        "predictions": {
            "NFL": mode_for_prediction(DATA_DIR / "predictions" / "nfl_predictions.json"),
            "MLB": mode_for_prediction(DATA_DIR / "predictions" / "mlb_predictions.json"),
            "MLB_BACKTEST": mode_for_prediction(DATA_DIR / "predictions" / "mlb_backtest_predictions.json"),
        },
        "reports": {
            "status": "real_cached" if report and not report.get("_error") else "missing",
            "generated_at": (report.get("metadata") or {}).get("generated_at") if report else None,
            "error": report.get("_error"),
        },
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
