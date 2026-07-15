"""Score published WNBA and MLB props from real final player statistics.

The scorer only adds result/closing fields to an immutable prediction row. It
never replaces the original line, odds, projection, probability, or timestamp.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.mlb.props_dataset import source_rows as mlb_source_rows
from src.wnba.props_dataset import source_rows as wnba_source_rows

LOG_JSON = ROOT / "data" / "tracking" / "prop_prediction_log.json"
LOG_JS = ROOT / "data" / "tracking" / "prop_prediction_log.js"
RECORD_JSON = ROOT / "data" / "tracking" / "prop_record.json"
RECORD_JS = ROOT / "data" / "tracking" / "prop_record.js"
PREDICTION_FILES = {
    "WNBA": ROOT / "data" / "predictions" / "wnba_prop_predictions.json",
    "MLB": ROOT / "data" / "predictions" / "mlb_prop_predictions.json",
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def write(payload: dict[str, Any], json_path: Path, js_path: Path, variable: str) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    json_path.write_text(text + "\n", encoding="utf-8")
    js_path.write_text(f"window.{variable} = {text};\n", encoding="utf-8")


def same_player(prediction: dict[str, Any], row: dict[str, Any]) -> bool:
    prediction_id = str(prediction.get("player_id") or "")
    row_id = str(row.get("player_id") or "")
    if prediction_id and row_id and prediction_id == row_id:
        return True
    # Odds providers commonly expose a normalized name when they do not expose
    # a stable player ID. Name matching is allowed only with exact normalized
    # text and the same sport/date/game; unresolved names remain pending.
    return str(prediction.get("player_name") or "").strip().casefold() == str(row.get("player_name") or "").strip().casefold()


def match_stat(prediction: dict[str, Any], row: dict[str, Any]) -> float | None:
    if str(prediction.get("sport") or "").upper() != str(row.get("sport") or "").upper():
        return None
    if str(prediction.get("game_date") or "")[:10] != str(row.get("game_date") or "")[:10]:
        return None
    if prediction.get("game_id") and row.get("game_id") and str(prediction.get("game_id")) != str(row.get("game_id")):
        return None
    if not same_player(prediction, row):
        return None
    market = str(prediction.get("market_key") or "")
    target = market.replace("player_", "")
    value = row.get(target)
    if value is None and target in {"pitcher_strikeouts", "batter_hits", "batter_total_bases"}:
        value = row.get(target)
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def result_for(prediction: dict[str, Any], actual: float | None, row: dict[str, Any] | None) -> str:
    if row is None or actual is None:
        return "Pending"
    if str(prediction.get("sport")) == "WNBA" and row.get("minutes") is not None and float(row.get("minutes") or 0) == 0:
        return "DNP"
    if str(prediction.get("sport")) == "MLB":
        role = str(row.get("player_role") or "").lower()
        if role in {"dnp", "inactive", "scratched"}:
            return "DNP"
    line = float(prediction["line"])
    if actual == line:
        return "Push"
    won = actual > line if prediction.get("side") == "Over" else actual < line
    return "Won" if won else "Lost"


def autopsy_classification(prediction: dict[str, Any], result: str, actual: float | None, row: dict[str, Any] | None) -> str | None:
    if result in {"Pending", "Void"}:
        return None
    availability = str(prediction.get("availability_status") or "").lower()
    if result == "DNP":
        return "Availability change" if availability in {"changed", "late_out", "out"} else "DNP / Void"
    if availability in {"changed", "late_out", "out"}:
        return "Availability change"
    try:
        error = abs(float(actual) - float(prediction.get("projection")))
        sigma = float(prediction.get("sigma") or prediction.get("projection_uncertainty") or 0)
        return "Expected result" if result == "Won" else "Correct process, wrong result" if sigma and error <= sigma else "Model weakness"
    except (TypeError, ValueError):
        return "Insufficient context"


def row_stats(row: dict[str, Any]) -> dict[str, Any]:
    return {key: row.get(key) for key in ("minutes", "plate_appearances", "innings_pitched", "points", "rebounds", "assists", "pitcher_strikeouts", "batter_hits", "batter_total_bases", "player_role") if row.get(key) is not None}


def market_match(prediction: dict[str, Any], market: dict[str, Any]) -> bool:
    if str(prediction.get("sport") or "").upper() != str(market.get("sport") or "").upper():
        return False
    if str(prediction.get("event_id") or "") != str(market.get("provider_event_id") or ""):
        return False
    if str(prediction.get("market_key") or "") != str(market.get("market_key") or ""):
        return False
    prediction_player = str(prediction.get("player_id") or prediction.get("player_name") or "").casefold()
    market_player = str(market.get("player_id") or market.get("normalized_player_id") or market.get("player_name") or "").casefold()
    return bool(prediction_player and prediction_player == market_player)


def bucket_record(rows: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    output: dict[str, dict[str, int]] = defaultdict(lambda: {"wins": 0, "losses": 0, "pushes": 0, "voids": 0, "dnp": 0, "pending": 0})
    for row in rows:
        result = str(row.get("result") or "Pending").lower()
        key = {"won": "wins", "lost": "losses", "push": "pushes", "void": "voids", "dnp": "dnp", "pending": "pending"}.get(result)
        if key:
            output[str(row.get("market_key") or "unknown")][key] += 1
    return dict(output)


def record(rows: list[dict[str, Any]]) -> dict[str, Any]:
    scored = [row for row in rows if row.get("result") in {"Won", "Lost", "Push"}]
    summary = {"wins": sum(row.get("result") == "Won" for row in scored), "losses": sum(row.get("result") == "Lost" for row in scored), "pushes": sum(row.get("result") == "Push" for row in scored), "voids": sum(row.get("result") == "Void" for row in rows), "dnp": sum(row.get("result") == "DNP" for row in rows), "pending": sum(row.get("result") == "Pending" for row in rows), "scored": len(scored)}
    by_sport: dict[str, dict[str, Any]] = {}
    for sport in ("WNBA", "MLB"):
        sport_rows = [row for row in rows if row.get("sport") == sport]
        sport_scored = [row for row in sport_rows if row.get("result") in {"Won", "Lost", "Push"}]
        by_sport[sport] = {"wins": sum(row.get("result") == "Won" for row in sport_scored), "losses": sum(row.get("result") == "Lost" for row in sport_scored), "pushes": sum(row.get("result") == "Push" for row in sport_scored), "voids": sum(row.get("result") == "Void" for row in sport_rows), "dnp": sum(row.get("result") == "DNP" for row in sport_rows), "pending": sum(row.get("result") == "Pending" for row in sport_rows), "scored": len(sport_scored), "by_market": bucket_record(sport_rows)}
    return {"metadata": {"sports": ["WNBA", "MLB"], "generated_at": now(), "source": "prop_prediction_log.json", "records_are_separate_from_projection_error": True, "immutable_original_fields": ["original_line", "original_price", "projection", "probability", "prediction_timestamp"]}, "overall": summary, "by_sport": by_sport, "by_market": bucket_record(rows), "projection_error": {"status": "available" if scored else "insufficient_sample", "note": "Projection error is separate from prop pick record."}, "calibration": {"status": "insufficient_sample", "note": "Probability calibration requires enough real sportsbook line outcomes."}, "closing_line": {"status": "available" if any(row.get("closing_line") is not None for row in rows) else "insufficient_sample"}}


def main() -> int:
    existing = load(LOG_JSON, {"metadata": {}, "predictions": []})
    by_id = {row.get("prediction_id"): row for row in existing.get("predictions", []) if row.get("prediction_id")}
    for sport, path in PREDICTION_FILES.items():
        payload = load(path, {})
        for prediction in payload.get("predictions", []) if isinstance(payload, dict) else []:
            prediction = {**prediction, "sport": sport}
            by_id.setdefault(prediction.get("prediction_id"), {**prediction, "result": "Pending", "scored_at": None})
    market_payload = load(ROOT / "data/odds/player_props.json", {})
    market_rows = market_payload.get("markets", []) if isinstance(market_payload, dict) else []
    wnba_paths = sorted((ROOT / "data/raw/wnba").glob("player_boxscore*.json")) + sorted((ROOT / "data/raw/wnba").glob("boxscore*.json")) + sorted((ROOT / "data/raw/wnba").glob("player_boxscore*.csv")) + sorted((ROOT / "data/raw/wnba").glob("boxscore*.csv"))
    mlb_paths = sorted((ROOT / "data/raw/mlb").glob("player_game*.json")) + sorted((ROOT / "data/raw/mlb").glob("player_game*.csv")) + sorted((ROOT / "data/raw/mlb").glob("player_boxscore*.json")) + sorted((ROOT / "data/raw/mlb").glob("player_boxscore*.csv"))
    finals = wnba_source_rows(wnba_paths, include_dnp=True) + mlb_source_rows(mlb_paths)
    for row in by_id.values():
        row.setdefault("closing_line", None)
        row.setdefault("closing_price", None)
        row.setdefault("closing_odds_snapshot_at", None)
        row.setdefault("closing_line_status", "not_captured")
        if row.get("result") in {"Won", "Lost", "Push", "Void", "DNP"}:
            continue
        closing_market = next((market for market in market_rows if market_match(row, market)), None)
        if closing_market and closing_market.get("closing_line") is not None:
            row["closing_line"] = closing_market.get("closing_line")
            row["closing_price"] = closing_market.get("closing_price")
            row["closing_odds_snapshot_at"] = closing_market.get("closing_odds_snapshot_at") or closing_market.get("snapshot_at")
            row["closing_line_status"] = "captured"
        matches = [final for final in finals if match_stat(row, final)]
        actual = match_stat(row, matches[0]) if matches else None
        result = result_for(row, actual, matches[0] if matches else None)
        if result != "Pending":
            row["result"] = result
            row["actual_stat"] = actual
            row["final_stat_source"] = matches[0].get("source") if matches else None
            row["final_stat_context"] = row_stats(matches[0]) if matches else {}
            row["prediction_error"] = round(actual - float(row.get("projection")), 4) if actual is not None and row.get("projection") is not None else None
            row["autopsy_classification"] = autopsy_classification(row, result, actual, matches[0] if matches else None)
            row["scored_at"] = now()
    ordered = sorted(by_id.values(), key=lambda item: (str(item.get("prediction_timestamp") or ""), str(item.get("prediction_id") or "")))
    payload = {"metadata": {"sports": ["WNBA", "MLB"], "generated_at": now(), "immutable_original_line": True, "duplicate_policy": "prediction_id unique; original line/price/timestamp never overwritten", "source": "real final player-game exports"}, "predictions": ordered}
    write(payload, LOG_JSON, LOG_JS, "__PROP_PREDICTION_LOG__")
    write(record(ordered), RECORD_JSON, RECORD_JS, "__PROP_RECORD__")
    print(json.dumps({"rows": len(ordered), "scored": sum(row.get("result") in {"Won", "Lost", "Push"} for row in ordered)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
