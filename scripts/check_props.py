"""Lightweight WNBA player-prop contracts without network calls."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(relative: str) -> dict:
    path = ROOT / relative
    if not path.exists():
        raise AssertionError(f"missing prop export: {relative}")
    return json.loads(path.read_text(encoding="utf-8"))


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)
    print(f"PASS: {message}")


def main() -> int:
    props = load("data/odds/player_props.json")
    predictions = load("data/predictions/wnba_prop_predictions.json")
    mlb_predictions = load("data/predictions/mlb_prop_predictions.json")
    log = load("data/tracking/prop_prediction_log.json")
    registry = load("data/reports/wnba_prop_model_registry.json")
    health = load("data/odds/odds_health.json")
    diagnostics = load("data/odds/props_matching_diagnostics.json")
    availability = load("data/odds/wnba_availability.json")
    markets = props.get("markets", [])
    rows = predictions.get("predictions", [])
    candidates = predictions.get("candidate_predictions", [])
    log_rows = log.get("predictions", [])
    market_metadata = props.get("metadata", {})
    markets_by_sport = market_metadata.get("markets_by_sport", {})
    if markets_by_sport:
        check(set(markets_by_sport.get("WNBA", [])) == {"player_points", "player_rebounds", "player_assists"}, "WNBA prop markets are points, rebounds, and assists")
        check(set(markets_by_sport.get("MLB", [])) == {"pitcher_strikeouts", "batter_hits", "batter_total_bases"}, "MLB prop market scope is explicit")
    else:
        check(set(market_metadata.get("markets", [])) == {"player_points", "player_rebounds", "player_assists"}, "supported prop markets are points, rebounds, and assists")
    check(len(rows) <= 10, "published prop export never exceeds ten rows")
    check(len({row.get("prediction_id") for row in rows}) == len(rows), "published prop prediction IDs are unique")
    check(len({row.get("prediction_id") for row in candidates}) == len(candidates), "candidate prop prediction IDs are unique")
    check(all(row.get("candidate_only") is True for row in candidates), "candidate props are explicitly non-publishable")
    check(not ({row.get("prediction_id") for row in rows} & {row.get("prediction_id") for row in candidates}), "published and candidate prop IDs do not overlap")
    check(len({row.get("prediction_id") for row in log_rows}) == len(log_rows), "prop log prediction IDs are unique")
    check(all(0 <= float(row["probability"]) <= 1 for row in rows if row.get("probability") is not None), "prop probabilities stay within 0..1")
    check(all(0 <= float(row["probability"]) <= 1 for row in candidates if row.get("probability") is not None), "candidate probabilities stay within 0..1")
    check(all(row.get("original_line", row.get("line")) is not None for row in log_rows), "original prop lines are retained")
    check(all(row.get("original_line", row.get("line")) == row.get("line") or row.get("line") is None for row in log_rows), "scoring does not overwrite original prop lines")
    check(all(row.get("market_key") in {"player_points", "player_rebounds", "player_assists"} for row in rows + candidates), "WNBA prop market keys are normalized")
    mlb_rows = mlb_predictions.get("predictions", [])
    mlb_candidates = mlb_predictions.get("candidate_predictions", [])
    check(len(mlb_rows) <= 10, "MLB published prop export never exceeds ten rows")
    check(all(row.get("sport") == "MLB" for row in mlb_rows + mlb_candidates), "MLB prop rows are sport-labeled")
    check(all(row.get("market_key") in {"pitcher_strikeouts", "batter_hits", "batter_total_bases"} for row in mlb_rows + mlb_candidates), "MLB prop market keys are normalized")
    check(all(row.get("candidate_only") is True for row in mlb_candidates), "MLB candidates are explicitly non-publishable")
    check(all(row.get("result", "Pending") in {"Won", "Lost", "Push", "Void", "DNP", "Pending", "Data unresolved"} for row in log_rows), "prop results use documented states")
    check(all("future" not in str(row).lower() for row in rows), "published props do not expose future feature markers")
    check(registry.get("metadata", {}).get("production_ready") is False or registry.get("models"), "prop registry does not claim production without artifacts")
    check(health.get("metadata", {}).get("key_present") is False or "quota" in health.get("metadata", {}), "odds key/quota state is explicit without exposing the key")
    check("minimum_refresh_minutes" in health.get("metadata", {}).get("cache_policy", {}), "odds refresh interval is exported")
    check(isinstance(diagnostics.get("sports"), dict), "event and market matching diagnostics are bundled")
    check(set(diagnostics.get("sports", {})).issubset({"WNBA", "MLB"}), "prop diagnostics stay separated by sport")
    check(availability.get("metadata", {}).get("source_url") == "https://www.wnba.com/wnba-injury-report", "WNBA availability source is official and explicit")
    check(all(row.get("availability_status") in {"out", "questionable", "probable", "doubtful", "confirmed_active"} for row in availability.get("players", [])), "WNBA availability statuses use the normalized contract")
    check((ROOT / "src/wnba/props_dataset.py").exists(), "leakage-safe prop dataset builder is bundled")
    check("rolling values exclude the game" in (ROOT / "src/wnba/props_dataset.py").read_text(encoding="utf-8"), "rolling feature leakage policy is documented")
    print("Player props contract PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}")
        raise SystemExit(1)
