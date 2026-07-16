"""Lightweight Sprint 5 invariants; no network or model training."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORTS = [
    "live_reactions", "live_reaction_history", "personalized_feed", "preferences_schema",
    "alerts", "notification_status", "gamecast_timeline", "feed_health", "feed_diagnostics",
    "model_sensitivity", "model_disagreement", "model_lab_scenarios", "simulation_results",
    "widget_personalized_state",
]


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main() -> None:
    for name in EXPORTS:
        payload = load(f"data/sprint5/{name}.json")
        assert payload.get("schema") == "sprint5.v1", f"{name} schema mismatch"
        assert isinstance(payload, dict), f"{name} is not an object export"
    reactions = load("data/sprint5/live_reactions.json")
    assert reactions.get("schema") == "sprint5.v1"
    for row in reactions.get("reactions", []):
        assert row.get("sport") in {"MLB", "WNBA"}
        original = row.get("original_probability")
        assert original is None or 0 <= float(original) <= 1
        current = row.get("current_live_estimate")
        assert current is None or 0 <= float(current) <= 1
        if row.get("live_outlook") in {"Live estimate unavailable", "Feed stale", "Final — no live estimate"}:
            assert current is None and row.get("probability_change") is None
    health = load("data/sprint5/feed_health.json")
    assert health.get("stale_threshold_ms") == 180000
    assert load("data/sprint5/preferences_schema.json").get("local_only") is True
    assert load("data/sprint5/simulation_results.json").get("simulation_only") is True
    assert load("data/sprint5/widget_personalized_state.json").get("fallback")
    diagnostics = load("data/sprint5/feed_diagnostics.json")
    assert diagnostics.get("rules_evaluated", 0) >= diagnostics.get("alerts_created", 0)
    assert isinstance(load("data/sprint5/gamecast_timeline.json").get("timelines"), dict)
    print("Sprint 5 export invariants passed: immutability metadata, probability bounds, stale threshold, local preferences, simulation isolation, widget fallback.")


if __name__ == "__main__":
    main()
