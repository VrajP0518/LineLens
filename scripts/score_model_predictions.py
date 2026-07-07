"""Score logged model predictions and update model record summaries."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
TRACKING_DIR = ROOT / "data" / "tracking"
RAW_MLB_DIR = ROOT / "data" / "raw" / "mlb"
PREDICTIONS_DIR = ROOT / "data" / "predictions"
LOG_JSON = TRACKING_DIR / "model_predictions_log.json"
LOG_JS = TRACKING_DIR / "model_predictions_log.js"
RECORD_JSON = TRACKING_DIR / "model_record.json"
RECORD_JS = TRACKING_DIR / "model_record.js"
APP_VERSION = "v0.7.0"


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


def team_abbrev(side: dict[str, Any]) -> str:
    team = side.get("team", {})
    return team.get("abbreviation") or team.get("teamCode") or team.get("fileCode") or team.get("name", "UNK")


def status_label(game: dict[str, Any]) -> str:
    status = game.get("status", {})
    return status.get("detailedState") or status.get("abstractGameState") or "Pending"


def mlb_result_map() -> dict[str, dict[str, Any]]:
    results: dict[str, dict[str, Any]] = {}
    for path in sorted(RAW_MLB_DIR.glob("*.json")):
        payload = load_json(path)
        for day in payload.get("dates", []):
            for game in day.get("games", []):
                teams = game.get("teams", {})
                home = teams.get("home", {})
                away = teams.get("away", {})
                home_score = home.get("score")
                away_score = away.get("score")
                if home_score is None or away_score is None:
                    continue
                label = status_label(game)
                if "Final" not in label and "Completed" not in label:
                    continue
                home_code = team_abbrev(home)
                away_code = team_abbrev(away)
                results[str(game.get("gamePk"))] = {
                    "home": home_code,
                    "away": away_code,
                    "home_score": int(home_score),
                    "away_score": int(away_score),
                    "actual_winner": home_code if int(home_score) > int(away_score) else away_code,
                    "status": label,
                }
    return results


def summarize_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    wins = sum(1 for row in rows if row.get("model_result") == "win")
    losses = sum(1 for row in rows if row.get("model_result") == "loss")
    pushes = sum(1 for row in rows if row.get("model_result") == "push")
    pending = sum(1 for row in rows if row.get("model_result") in {None, "pending", "no_result"})
    decided = wins + losses
    return {
        "wins": wins,
        "losses": losses,
        "pushes": pushes,
        "pending": pending,
        "accuracy": None if decided == 0 else wins / decided,
        "sample_size": len(rows),
    }


def grouped_record(rows: list[dict[str, Any]], key: str) -> dict[str, Any]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        value = row.get(key) or "unknown"
        groups[str(value)].append(row)
    return {value: summarize_rows(group) for value, group in sorted(groups.items())}


def confidence_group(row: dict[str, Any]) -> str:
    confidence = row.get("confidence")
    try:
        value = float(confidence)
    except (TypeError, ValueError):
        return row.get("confidence_label") or "unknown"
    if value >= 0.65:
        return "65%+"
    if value >= 0.60:
        return "60-65%"
    if value >= 0.575:
        return "57.5-60%"
    if value >= 0.55:
        return "55-57.5%"
    if value >= 0.525:
        return "52.5-55%"
    return "50-52.5%"


def recent_rows(rows: list[dict[str, Any]], days: int) -> list[dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    kept = []
    for row in rows:
        value = row.get("game_date") or row.get("generated_at")
        if not value:
            continue
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            continue
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        if parsed >= cutoff:
            kept.append(row)
    return kept


def score_mlb_predictions(rows: list[dict[str, Any]]) -> tuple[int, int]:
    results = mlb_result_map()
    scored = 0
    pending = 0
    for row in rows:
        if row.get("sport") != "MLB":
            continue
        result = results.get(str(row.get("game_id")))
        if not result:
            row["result_status"] = "pending"
            if str(row.get("model_result", "")).lower() in {"win", "loss", "push"}:
                row["actual_winner"] = None
                row.pop("home_score", None)
                row.pop("away_score", None)
            row["model_result"] = "pending"
            pending += 1
            continue
        row["actual_winner"] = result["actual_winner"]
        row["home_score"] = result["home_score"]
        row["away_score"] = result["away_score"]
        row["result_status"] = "scored"
        row["model_result"] = "win" if row.get("model_pick") == result["actual_winner"] else "loss"
        scored += 1
    return scored, pending


def nfl_record() -> dict[str, Any]:
    payload = load_json(PREDICTIONS_DIR / "nfl_predictions.json")
    games = payload.get("games", [])
    rows = []
    for game in games:
        result = str(game.get("model_result") or "").lower()
        if result not in {"win", "loss", "push"}:
            continue
        rows.append(
            {
                "sport": "NFL",
                "model_result": result,
                "confidence_label": game.get("confidence"),
                "model_version": (payload.get("metadata") or payload.get("meta") or {}).get("version"),
                "game_date": str(game.get("season") or ""),
            }
        )
    return {"overall": summarize_rows(rows), "source": "data/predictions/nfl_predictions.json", "real_data": bool(rows)}


def build_record(log_payload: dict[str, Any], scored: int, pending: int) -> dict[str, Any]:
    rows = log_payload.get("predictions", [])
    mlb_rows = [row for row in rows if row.get("sport") == "MLB"]
    by_confidence: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in mlb_rows:
        by_confidence[confidence_group(row)].append(row)
    by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in mlb_rows:
        month = str(row.get("game_date", ""))[:7] or "unknown"
        by_month[month].append(row)
    return {
        "metadata": {
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": utc_now(),
            "real_data": True,
            "predictions_logged": len(rows),
            "predictions_scored_this_run": scored,
            "pending_predictions": pending,
        },
        "sports": {
            "MLB": {
                "overall": summarize_rows(mlb_rows),
                "by_model_version": grouped_record(mlb_rows, "model_version"),
                "by_confidence": {key: summarize_rows(group) for key, group in sorted(by_confidence.items())},
                "by_month": {key: summarize_rows(group) for key, group in sorted(by_month.items())},
                "recent_7_days": summarize_rows(recent_rows(mlb_rows, 7)),
                "recent_30_days": summarize_rows(recent_rows(mlb_rows, 30)),
            },
            "NFL": nfl_record(),
        },
    }


def main() -> int:
    payload = load_json(LOG_JSON) or {"metadata": {}, "predictions": []}
    payload.setdefault("predictions", [])
    scored, pending = score_mlb_predictions(payload["predictions"])
    payload["metadata"] = {
        "app": "LineLens Sports",
        "version": APP_VERSION,
        "generated_at": utc_now(),
        "real_data": True,
        "row_count": len(payload["predictions"]),
        "scored_this_run": scored,
        "pending": pending,
    }
    write_json_and_js(payload, LOG_JSON, LOG_JS, "__MODEL_PREDICTIONS_LOG__")
    record = build_record(payload, scored, pending)
    write_json_and_js(record, RECORD_JSON, RECORD_JS, "__MODEL_RECORD__")
    print(json.dumps(record["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
