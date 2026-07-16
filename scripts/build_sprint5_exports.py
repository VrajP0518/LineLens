"""Build compact, privacy-safe Sprint 5 exports from existing local data.

The script intentionally omits raw play-by-play, API responses, private
preferences, credentials, and model artifacts. It is safe to run after a
manual live refresh.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "sprint5"
NOW = datetime.now(timezone.utc).isoformat()


def load(name: str, default):
    path = ROOT / name
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def rows(payload):
    return payload.get("games", []) if isinstance(payload, dict) else []


def game_id(row):
    return str(row.get("game_id") or row.get("espn_event_id") or row.get("id") or "")


def sport(row):
    return str(row.get("sport") or row.get("competition") or "MLB").upper()


def write_export(stem: str, payload: dict, global_name: str):
    OUT.mkdir(parents=True, exist_ok=True)
    compact = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    (OUT / f"{stem}.json").write_text(compact + "\n", encoding="utf-8")
    (OUT / f"{stem}.js").write_text(f"window.{global_name} = {compact};\n", encoding="utf-8")


def main():
    live = load("data/live/live_scores.json", {})
    mlb = load("data/predictions/mlb_predictions.json", {})
    wnba = load("data/predictions/wnba_predictions.json", {})
    mlb_report = load("data/reports/mlb_feature_summary.json", {})
    wnba_report = load("data/reports/wnba_feature_summary.json", {})
    live_rows = [dict(row, sport=sport(row)) for row in rows(live) if sport(row) in {"MLB", "WNBA"}]
    predictions = [dict(row, sport="MLB") for row in rows(mlb)] + [dict(row, sport="WNBA") for row in rows(wnba)]
    by_key = {(sport(row), game_id(row)): row for row in predictions}
    live_by_key = {(sport(row), game_id(row)): row for row in live_rows}
    reactions = []
    for original in predictions:
        current = live_by_key.get((sport(original), game_id(original)))
        original_probability = original.get("home_win_probability", original.get("model_home_win"))
        if not isinstance(original_probability, (float, int)):
            continue
        reactions.append({
            "schema": "sprint5.v1", "game_id": game_id(current), "sport": sport(current),
            "original_model_id": original.get("model_name", "not declared"),
            "original_probability": original_probability,
            "original_predicted_team": original.get("model_pick") or (original.get("home") if original_probability >= 0.5 else original.get("away")),
            "original_prediction_timestamp": original.get("generated_at"),
            "current_live_estimate": None,
            "probability_change": None,
            "live_outlook": "Live estimate unavailable",
            "source_status": (current or {}).get("source_status") or (current or {}).get("source") or "no joined live row",
            "latest_update_timestamp": (current or {}).get("updated_at") or (current or {}).get("generated_at"),
        })
    write_export("live_reactions", {"schema": "sprint5.v1", "generated_at": NOW, "reactions": reactions}, "__SPRINT5_LIVE_REACTIONS__")
    write_export("live_reaction_history", {"schema": "sprint5.v1", "generated_at": NOW, "history": reactions}, "__SPRINT5_LIVE_REACTION_HISTORY__")
    write_export("personalized_feed", {"schema": "sprint5.v1", "generated_at": NOW, "sections": {"live_now": [row for row in live_rows if "progress" in str(row.get("status", "")).lower()]}}, "__SPRINT5_PERSONALIZED_FEED__")
    write_export("preferences_schema", {"schema": "sprint5.v1", "storage": "linelens.preferences.v1", "local_only": True, "fields": ["favoriteSports", "favoriteTeams", "favoritePlayers", "preferredModels", "minProbability", "minConsensus", "preferredPropMarkets", "showHistorical", "liveOnly", "alertPreferences"]}, "__SPRINT5_PREFERENCES_SCHEMA__")
    write_export("alerts", {"schema": "sprint5.v1", "generated_at": NOW, "alerts": []}, "__SPRINT5_ALERTS__")
    write_export("notification_status", {"schema": "sprint5.v1", "unread": 0, "native_notifications": "deferred", "local_center": True}, "__SPRINT5_NOTIFICATION_STATUS__")
    timelines = {f"{sport(row)}:{game_id(row)}": {"schema": "sprint5.v1", "events": []} for row in live_rows}
    write_export("gamecast_timeline", {"schema": "sprint5.v1", "generated_at": NOW, "timelines": timelines}, "__SPRINT5_GAMECAST_TIMELINE__")
    meta = live.get("metadata", {}) if isinstance(live, dict) else {}
    write_export("feed_health", {"schema": "sprint5.v1", "provider": meta.get("source") or meta.get("provider") or "ESPN scoreboard export", "provider_timestamp": meta.get("generated_at"), "stale_threshold_ms": 180000, "status": "Unknown"}, "__SPRINT5_FEED_HEALTH__")
    write_export("feed_diagnostics", {"schema": "sprint5.v1", "duplicate_events_removed": 0, "out_of_order_events": 0, "score_regression_detected": False, "fallback": "bundled export"}, "__SPRINT5_FEED_DIAGNOSTICS__")
    sensitivity = []
    for name, report, current_sport in (("MLB", mlb_report, "MLB"), ("WNBA", wnba_report, "WNBA")):
        features = report.get("features", report.get("rows", [])) if isinstance(report, dict) else []
        if isinstance(features, int):
            features = report.get("features_used_by_model", [])
        if isinstance(features, dict):
            features = [name for group in features.values() if isinstance(group, dict) for name in group.get("features", [])]
        for index, feature in enumerate(features[:12]):
            if isinstance(feature, dict):
                sensitivity.append({"sport": current_sport, "feature": feature.get("feature") or feature.get("label") or feature.get("name"), "tier": "High" if index < 4 else "Medium" if index < 8 else "Low", "confidence": "Exported summary"})
    write_export("model_sensitivity", {"schema": "sprint5.v1", "generated_at": NOW, "rows": sensitivity}, "__SPRINT5_MODEL_SENSITIVITY__")
    write_export("model_disagreement", {"schema": "sprint5.v1", "generated_at": NOW, "rows": []}, "__SPRINT5_MODEL_DISAGREEMENT__")
    write_export("model_lab_scenarios", {"schema": "sprint5.v1", "simulation_only": True, "scenarios": []}, "__SPRINT5_MODEL_LAB_SCENARIOS__")
    write_export("simulation_results", {"schema": "sprint5.v1", "simulation_only": True, "results": []}, "__SPRINT5_SIMULATION_RESULTS__")
    write_export("widget_personalized_state", {"schema": "sprint5.v1", "modes": ["live_watched_games", "next_watched_game", "new_qualified_props", "latest_alert"], "fallback": "existing score/prediction view"}, "__SPRINT5_WIDGET_PERSONALIZED_STATE__")
    print(f"Built {len(list(OUT.glob('*.json')))} Sprint 5 JSON exports in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
