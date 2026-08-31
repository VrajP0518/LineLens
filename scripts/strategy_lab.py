"""Build a reproducible, export-only Strategy Lab summary from the ledger."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
LOG_PATH = ROOT / "data/tracking/model_predictions_log.json"
OUTPUT_JSON = ROOT / "data/reports/strategy_lab.json"
OUTPUT_JS = ROOT / "data/reports/strategy_lab.js"


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def probability(row: dict[str, Any]) -> float | None:
    value = row.get("home_win_probability", row.get("model_home_win"))
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    return value if 0 < value < 1 else None


def metric_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    decided = [row for row in rows if str(row.get("model_result") or row.get("result_status") or "").lower() in {"win", "loss", "push"}]
    wins = sum(str(row.get("model_result") or row.get("result_status") or "").lower() == "win" for row in decided)
    losses = sum(str(row.get("model_result") or row.get("result_status") or "").lower() == "loss" for row in decided)
    pushes = sum(str(row.get("model_result") or row.get("result_status") or "").lower() == "push" for row in decided)
    brier_values: list[float] = []
    log_loss_values: list[float] = []
    for row in decided:
        p = probability(row)
        if p is None:
            continue
        pick = str(row.get("model_pick") or "").upper()
        home = str(row.get("home") or "").upper()
        pick_probability = p if pick == home else 1 - p
        actual = 1 if str(row.get("model_result") or row.get("result_status") or "").lower() == "win" else 0
        brier_values.append((pick_probability - actual) ** 2)
        bounded = max(0.0001, min(0.9999, pick_probability))
        log_loss_values.append(-(actual * math.log(bounded) + (1 - actual) * math.log(1 - bounded)))
    return {
        "sample": len(decided),
        "wins": wins,
        "losses": losses,
        "pushes": pushes,
        "pending": len(rows) - len(decided),
        "win_rate": round(wins / max(1, wins + losses), 6) if wins + losses else None,
        "brier_score": round(sum(brier_values) / len(brier_values), 6) if brier_values else None,
        "log_loss": round(sum(log_loss_values) / len(log_loss_values), 6) if log_loss_values else None,
    }


def main() -> int:
    payload = load(LOG_PATH, {})
    rows = payload.get("predictions", []) if isinstance(payload, dict) else []
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        sport = str(row.get("sport") or "MLB").upper()
        model = str(row.get("model_name") or row.get("model_id") or "Unknown model")
        groups[(sport, model)].append(row)
    summaries = [{"sport": sport, "model": model, **metric_rows(items)} for (sport, model), items in sorted(groups.items())]
    recent = sorted(rows, key=lambda row: str(row.get("game_date") or row.get("generated_at") or ""), reverse=True)[:30]
    previous = sorted(rows, key=lambda row: str(row.get("game_date") or row.get("generated_at") or ""), reverse=True)[30:60]
    result = {
        "metadata": {
            "schema_version": "linelens.strategy.v1",
            "generated_at": now(),
            "status": "ready" if rows else "no_ledger",
            "source": "model prediction ledger",
            "provenance": {"ledger": "data/tracking/model_predictions_log.json", "reproducible": True},
            "note": "Metrics use logged results only. Missing odds and unscored rows are never inferred.",
        },
        "models": summaries,
        "recent_window": metric_rows(recent),
        "previous_window": metric_rows(previous),
    }
    text = json.dumps(result, indent=2, ensure_ascii=False)
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(text + "\n", encoding="utf-8")
    OUTPUT_JS.write_text(f"window.__STRATEGY_LAB__ = {text};\n", encoding="utf-8")
    print(json.dumps(result["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
