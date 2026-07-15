"""Refresh quota-safe WNBA and MLB player prop markets.

Only compact normalized market rows are bundled. Provider payloads and secrets
never enter the export. Projection and publication diagnostics are completed by
the sport-specific exporters after these rows are refreshed.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.odds_provider import fetch_event_props, fetch_events, fetch_odds, fetch_propline_event_props, fetch_propline_events, fetch_sharpapi_props, odds_config_status
from src.shared.version import APP_VERSION
from scripts.odds_snapshots import normalize_name

ODDS_DIR = ROOT / "data" / "odds"
PROPS_JSON = ODDS_DIR / "player_props.json"
PROPS_JS = ODDS_DIR / "player_props.js"
HEALTH_JSON = ODDS_DIR / "odds_health.json"
HEALTH_JS = ODDS_DIR / "odds_health.js"
DIAGNOSTICS_JSON = ODDS_DIR / "props_matching_diagnostics.json"
DIAGNOSTICS_JS = ODDS_DIR / "props_matching_diagnostics.js"
PREDICTION_PATHS = {
    "WNBA": ROOT / "data" / "predictions" / "wnba_predictions.json",
    "MLB": ROOT / "data" / "predictions" / "mlb_predictions.json",
}
LIVE_JSON = ROOT / "data" / "live" / "live_scores.json"


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def write(payload: dict[str, Any], json_path: Path, js_path: Path, variable: str) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    json_path.write_text(text + "\n", encoding="utf-8")
    js_path.write_text(f"window.{variable} = {text};\n", encoding="utf-8")


def recent_snapshot(metadata: dict[str, Any], minutes: int) -> bool:
    if not (metadata.get("key_present") or metadata.get("sharp_key_present") or metadata.get("propline_key_present")):
        return False
    try:
        generated = str(metadata.get("generated_at") or "").replace("Z", "+00:00")
        age = datetime.now(timezone.utc) - datetime.fromisoformat(generated)
        return age < timedelta(minutes=max(1, minutes))
    except (TypeError, ValueError):
        return False


def current_games(sport: str) -> list[dict[str, Any]]:
    payload = load(PREDICTION_PATHS[sport], {})
    rows = payload.get("games", []) if isinstance(payload, dict) else []
    live = load(LIVE_JSON, {})
    rows += [row for row in (live.get("games", []) if isinstance(live, dict) else []) if str(row.get("sport") or "").upper() == sport]
    unique: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = str(row.get("game_id") or row.get("event_id") or "")
        if key:
            unique[key] = {**unique.get(key, {}), **row}
    return list(unique.values())


def event_matches_game(event: dict[str, Any], game: dict[str, Any]) -> bool:
    event_date = str(event.get("commence_time") or event.get("event_start_time") or "")[:10]
    game_dates = {str(game.get("game_date") or "")[:10], str(game.get("game_time") or "")[:10]}
    event_names = {normalize_name(event.get("home_team")), normalize_name(event.get("away_team"))}
    game_names = {normalize_name(game.get("home_display") or game.get("home")), normalize_name(game.get("away_display") or game.get("away"))}
    aliases = {"americanleague": "americanallstars", "nationalleague": "nationalallstars"}
    event_names = {aliases.get(value, value) for value in event_names}
    game_names = {aliases.get(value, value) for value in game_names}
    return event_date in game_dates and bool(event_names & game_names) and len(event_names & game_names) == 2


def prop_rows(event: dict[str, Any], sport: str, snapshot_at: str, selected_markets: list[str], provider_name: str = "The Odds API") -> tuple[list[dict[str, Any]], int, int]:
    rows: list[dict[str, Any]] = []
    received = 0
    rejected = 0
    for bookmaker in event.get("bookmakers", []) or []:
        bookmaker_name = bookmaker.get("title") or bookmaker.get("key")
        for market in bookmaker.get("markets", []) or []:
            market_key = str(market.get("key") or "")
            if market_key not in selected_markets:
                continue
            outcomes = market.get("outcomes", []) or []
            received += len(outcomes)
            grouped: dict[tuple[str, str, str], dict[str, Any]] = {}
            for outcome in outcomes:
                player_name = outcome.get("description") or outcome.get("name")
                side = outcome.get("name")
                line = outcome.get("point")
                if not player_name or side not in {"Over", "Under"} or line is None:
                    rejected += 1
                    continue
                key = (normalize_name(player_name), str(line), market_key)
                row = grouped.setdefault(key, {
                    "sport": sport,
                    "provider": provider_name,
                    "provider_event_id": event.get("id"),
                    "provider_event_time": event.get("commence_time"),
                    "provider_home_team": event.get("home_team"),
                    "provider_away_team": event.get("away_team"),
                    "player_name": player_name,
                    "normalized_player_id": normalize_name(player_name),
                    "market_key": market_key,
                    "normalized_market_key": market_key,
                    "line": float(line),
                    "snapshot_at": snapshot_at,
                    "freshness_status": "Current",
                    "availability_status": "unknown",
                    "bookmaker_update_at": market.get("last_update") or bookmaker.get("last_update"),
                    "bookmaker": bookmaker_name,
                })
                row["over_price" if side == "Over" else "under_price"] = outcome.get("price")
            rows.extend(row for row in grouped.values() if row.get("over_price") is not None or row.get("under_price") is not None)
    return rows, received, rejected


SHARP_MARKET_MAP = {
    "player_strikeouts": "pitcher_strikeouts",
    "player_hits": "batter_hits",
    "player_total_bases": "batter_total_bases",
    "player_home_runs": "batter_home_runs",
    "player_rbis": "batter_rbis",
    "player_walks": "batter_walks",
}


def sharpapi_prop_rows(rows: list[dict[str, Any]], sport: str, snapshot_at: str, selected_markets: list[str]) -> tuple[list[dict[str, Any]], int, int]:
    """Normalize SharpAPI's flat odds rows into LineLens player-market rows."""

    normalized_targets = set(selected_markets)
    grouped: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    received = 0
    rejected = 0
    for raw in rows:
        market_key = SHARP_MARKET_MAP.get(str(raw.get("market_type") or "").lower())
        if market_key not in normalized_targets:
            continue
        received += 1
        player_name = raw.get("player_name")
        side_value = str(raw.get("selection_type") or raw.get("selection") or "").lower()
        side = "Over" if "over" in side_value else "Under" if "under" in side_value else None
        line = raw.get("line")
        bookmaker = raw.get("sportsbook") or "SharpAPI"
        if not player_name or side is None or line is None:
            rejected += 1
            continue
        try:
            line_value = float(line)
        except (TypeError, ValueError):
            rejected += 1
            continue
        key = (normalize_name(player_name), str(line_value), market_key, str(bookmaker))
        row = grouped.setdefault(key, {
            "sport": sport,
            "provider": "SharpAPI",
            "provider_event_id": raw.get("event_id"),
            "provider_event_time": raw.get("event_start_time"),
            "provider_home_team": raw.get("home_team"),
            "provider_away_team": raw.get("away_team"),
            "player_name": player_name,
            "normalized_player_id": normalize_name(player_name),
            "market_key": market_key,
            "normalized_market_key": market_key,
            "line": line_value,
            "snapshot_at": snapshot_at,
            "freshness_status": "Current",
            "availability_status": "unknown",
            "bookmaker_update_at": raw.get("timestamp"),
            "bookmaker": bookmaker,
        })
        row["over_price" if side == "Over" else "under_price"] = raw.get("odds_american")
    return list(grouped.values()), received, rejected


def diagnostic_base(generated_at: str, config: dict[str, Any], selected_by_sport: dict[str, list[str]]) -> dict[str, Any]:
    return {
        "metadata": {
            "app": "LineLens Sports", "version": APP_VERSION, "generated_at": generated_at,
            "provider": config.get("provider"), "key_present": bool(config.get("key_present")), "sharp_key_present": bool(config.get("sharp_key_present")), "propline_key_present": bool(config.get("propline_key_present")),
            "minimum_refresh_minutes": config.get("min_refresh_minutes"),
            "maximum_events": config.get("max_events"), "maximum_markets_per_event": config.get("max_prop_markets"),
            "markets_by_sport": selected_by_sport,
        },
        "sports": {},
    }


def main() -> int:
    generated_at = now()
    config = odds_config_status()
    previous = load(PROPS_JSON, {"metadata": {}, "markets": []})
    previous_markets = previous.get("markets", []) if isinstance(previous, dict) else []
    selected_by_sport = {
        "WNBA": [part.strip() for part in str(config.get("prop_markets") or "").split(",") if part.strip()][: int(config.get("max_prop_markets") or 3)],
        "MLB": [part.strip() for part in str(config.get("mlb_prop_markets") or "").split(",") if part.strip()][: int(config.get("max_prop_markets") or 3)],
    }
    selected_markets = sorted({market for values in selected_by_sport.values() for market in values})
    health = {"metadata": {"app": "LineLens Sports", "version": APP_VERSION, "generated_at": generated_at, "provider": config.get("provider"), "region": config.get("region"), "status": "bundled_snapshot" if previous_markets else "no_api_key", "key_present": bool(config.get("key_present")), "sharp_key_present": bool(config.get("sharp_key_present")), "propline_key_present": bool(config.get("propline_key_present")), "markets": selected_markets, "markets_by_sport": selected_by_sport, "cache_policy": {"minimum_refresh_minutes": config.get("min_refresh_minutes"), "maximum_events": config.get("max_events"), "maximum_markets_per_event": config.get("max_prop_markets")}, "quota": {}}, "sports": {}}
    diagnostics = diagnostic_base(generated_at, config, selected_by_sport)
    if not config.get("any_key_present"):
        payload = {"metadata": {"app": "LineLens Sports", "version": APP_VERSION, "generated_at": generated_at, "sports": ["WNBA", "MLB"], "real_data": bool(previous_markets), "status": "no_api_key", "markets": selected_markets, "markets_by_sport": selected_by_sport, "source": "The Odds API", "note": "No player props are published without a configured API key and matched real lines."}, "markets": previous_markets}
        for sport in selected_by_sport:
            diagnostics["sports"][sport] = {"status": "API key unavailable", "events_received": 0, "events_matched": 0, "events_unmatched": 0, "markets_received": 0, "markets_normalized": 0, "markets_rejected": 0, "unmatched_events": []}
        write(payload, PROPS_JSON, PROPS_JS, "__PLAYER_PROPS__")
        write(health, HEALTH_JSON, HEALTH_JS, "__ODDS_HEALTH__")
        write(diagnostics, DIAGNOSTICS_JSON, DIAGNOSTICS_JS, "__PROPS_MATCHING_DIAGNOSTICS__")
        print(json.dumps(health["metadata"], indent=2))
        return 0
    if recent_snapshot(previous.get("metadata", {}) if isinstance(previous, dict) else {}, int(config.get("min_refresh_minutes") or 10)):
        health["metadata"]["status"] = "cache_interval"
        diagnostics["metadata"]["status"] = "cache_interval"
        write(health, HEALTH_JSON, HEALTH_JS, "__ODDS_HEALTH__")
        write(diagnostics, DIAGNOSTICS_JSON, DIAGNOSTICS_JS, "__PROPS_MATCHING_DIAGNOSTICS__")
        print(json.dumps(health["metadata"], indent=2))
        return 0

    markets: list[dict[str, Any]] = []
    for sport, sport_markets in selected_by_sport.items():
        result = fetch_odds(sport, markets="h2h,spreads,totals")
        health["metadata"].setdefault("normal_event_status", {})[sport] = result.status
        health["metadata"]["quota"] = result.headers or health["metadata"].get("quota", {})
        games = current_games(sport)
        events_result = fetch_events(sport) if result.status in {"success", "failed_or_empty", "provider_error", "provider_unavailable"} else result
        health["metadata"].setdefault("event_discovery_status", {})[sport] = events_result.status
        # /odds may include bookmaker data while /events may be the only place
        # an upcoming game is discoverable. Keep the richer /odds row when the
        # same provider event appears in both responses.
        events_by_id: dict[str, dict[str, Any]] = {}
        for event in (result.data if result.status == "success" else []) + (events_result.data if events_result.status == "success" else []):
            event_id = str(event.get("id") or "")
            if event_id:
                events_by_id[event_id] = {**events_by_id.get(event_id, {}), **event}
        events = list(events_by_id.values())
        matched = [event for event in events if any(event_matches_game(event, game) for game in games)]
        unmatched = [event for event in events if event not in matched]
        sport_diag: dict[str, Any] = {"status": result.status if result.status != "success" else "success", "events_received": len(events), "events_matched": len(matched), "events_unmatched": len(unmatched), "event_discovery_status": events_result.status, "markets_received": 0, "markets_normalized": 0, "markets_rejected": 0, "players_received": 0, "players_matched": 0, "players_unmatched": 0, "unmatched_events": []}
        for event in unmatched:
            provider_names = [event.get("away_team"), event.get("home_team")]
            sport_diag["unmatched_events"].append({"provider_event_id": event.get("id"), "event_time": event.get("commence_time"), "provider_teams": provider_names, "normalized_value": [normalize_name(name) for name in provider_names], "closest_line_lens_match": None, "rejection_reason": "Event could not be matched"})
        for event in matched:
            prop_result = fetch_event_props(sport, str(event.get("id") or ""), sport_markets)
            health.setdefault("metadata", {}).setdefault("prop_requests", []).append({"sport": sport, "event_id": event.get("id"), "status": prop_result.status, "markets": sport_markets, "quota": prop_result.headers or {}})
            if prop_result.status != "success":
                continue
            event_markets, received_count, rejected_count = prop_rows(prop_result.data if isinstance(prop_result.data, dict) else {}, sport, generated_at, sport_markets)
            sport_diag["markets_received"] += received_count
            sport_diag["markets_rejected"] += rejected_count
            sport_diag["markets_normalized"] += len(event_markets)
            sport_diag["players_received"] += len({row.get("normalized_player_id") for row in event_markets})
            matched_game = next((game for game in games if event_matches_game(event, game)), None)
            for row in event_markets:
                if matched_game:
                    row.update({"game_id": matched_game.get("game_id"), "game_date": matched_game.get("game_date"), "game_time": matched_game.get("game_time"), "line_lens_home": matched_game.get("home"), "line_lens_away": matched_game.get("away")})
                markets.append(row)
        # The Odds API remains primary. SharpAPI is an optional MLB-only
        # fallback for real player markets when the primary provider has no
        # normalized rows. It is never used to synthesize a line or replace a
        # richer primary-provider response.
        if sport == "MLB" and sport_diag["markets_normalized"] == 0 and config.get("sharp_key_present"):
            sharp_result = fetch_sharpapi_props("MLB", sport_markets)
            sharp_rows = sharp_result.data if sharp_result.status == "success" and isinstance(sharp_result.data, list) else []
            health.setdefault("metadata", {}).setdefault("prop_requests", []).append({"sport": "MLB", "provider": "SharpAPI", "status": sharp_result.status, "markets": sport_markets, "quota": sharp_result.headers or {}, "rows_received": len(sharp_rows)})
            sharp_by_event: dict[str, list[dict[str, Any]]] = {}
            for sharp_row in sharp_rows:
                sharp_by_event.setdefault(str(sharp_row.get("event_id") or ""), []).append(sharp_row)
            sharp_matched = 0
            sharp_unmatched = 0
            sharp_received = 0
            sharp_rejected = 0
            for event_id, event_rows in sharp_by_event.items():
                event = event_rows[0]
                if not any(event_matches_game(event, game) for game in games):
                    sharp_unmatched += 1
                    continue
                sharp_matched += 1
                event_markets, received_count, rejected_count = sharpapi_prop_rows(event_rows, "MLB", generated_at, sport_markets)
                sharp_received += received_count
                sharp_rejected += rejected_count
                sport_diag["markets_normalized"] += len(event_markets)
                sport_diag["markets_received"] += received_count
                sport_diag["markets_rejected"] += rejected_count
                sport_diag["players_received"] += len({row.get("normalized_player_id") for row in event_markets})
                matched_game = next((game for game in games if event_matches_game(event, game)), None)
                for row in event_markets:
                    if matched_game:
                        row.update({"game_id": matched_game.get("game_id"), "game_date": matched_game.get("game_date"), "game_time": matched_game.get("game_time"), "line_lens_home": matched_game.get("home"), "line_lens_away": matched_game.get("away")})
                    markets.append(row)
            sport_diag["sharp_fallback_provider"] = "SharpAPI"
            sport_diag["sharp_fallback_status"] = sharp_result.status
            sport_diag["sharp_rows_received"] = len(sharp_rows)
            sport_diag["sharp_events_matched"] = sharp_matched
            sport_diag["sharp_events_unmatched"] = sharp_unmatched
            sport_diag["sharp_markets_received"] = sharp_received
            sport_diag["sharp_markets_rejected"] = sharp_rejected

        # PropLine is a second optional MLB-only fallback. It runs only when
        # both primary providers have no normalized player rows.
        if sport == "MLB" and sport_diag["markets_normalized"] == 0 and config.get("propline_key_present"):
            fallback_events_result = fetch_propline_events("MLB")
            fallback_events = fallback_events_result.data if fallback_events_result.status == "success" and isinstance(fallback_events_result.data, list) else []
            fallback_matched = [event for event in fallback_events if any(event_matches_game(event, game) for game in games)]
            sport_diag["fallback_provider"] = "PropLine"
            sport_diag["fallback_event_discovery_status"] = fallback_events_result.status
            sport_diag["fallback_events_received"] = len(fallback_events)
            sport_diag["fallback_events_matched"] = len(fallback_matched)
            for event in fallback_matched:
                prop_result = fetch_propline_event_props("MLB", str(event.get("id") or ""), sport_markets)
                health.setdefault("metadata", {}).setdefault("prop_requests", []).append({"sport": "MLB", "provider": "PropLine", "event_id": event.get("id"), "status": prop_result.status, "markets": sport_markets})
                if prop_result.status != "success":
                    continue
                event_markets, received_count, rejected_count = prop_rows(prop_result.data if isinstance(prop_result.data, dict) else {}, "MLB", generated_at, sport_markets, "PropLine")
                sport_diag["markets_received"] += received_count
                sport_diag["markets_rejected"] += rejected_count
                sport_diag["markets_normalized"] += len(event_markets)
                sport_diag["players_received"] += len({row.get("normalized_player_id") for row in event_markets})
                matched_game = next((game for game in games if event_matches_game(event, game)), None)
                for row in event_markets:
                    if matched_game:
                        row.update({"game_id": matched_game.get("game_id"), "game_date": matched_game.get("game_date"), "game_time": matched_game.get("game_time"), "line_lens_home": matched_game.get("home"), "line_lens_away": matched_game.get("away")})
                    markets.append(row)
        diagnostics["sports"][sport] = sport_diag
        health["sports"][sport] = {"events_received": len(events), "events_matched": len(matched), "events_unmatched": len(unmatched), "markets_normalized": sport_diag["markets_normalized"]}
    market_count_by_sport = {sport: sum(1 for row in markets if row.get("sport") == sport) for sport in selected_by_sport}
    providers = sorted({str(row.get("provider") or "") for row in markets if row.get("provider")})
    payload = {"metadata": {"app": "LineLens Sports", "version": APP_VERSION, "generated_at": generated_at, "sports": ["WNBA", "MLB"], "real_data": bool(markets), "status": "success" if markets else "no_market_available", "markets": selected_markets, "markets_by_sport": selected_by_sport, "market_count_by_sport": market_count_by_sport, "source": " + ".join(providers) if providers else "The Odds API", "providers": providers, "note": "Only selected event-specific player markets are requested; no historical lines are fabricated."}, "markets": markets or previous_markets}
    health["metadata"]["status"] = payload["metadata"]["status"]
    health["metadata"]["market_count"] = len(markets)
    write(payload, PROPS_JSON, PROPS_JS, "__PLAYER_PROPS__")
    write(health, HEALTH_JSON, HEALTH_JS, "__ODDS_HEALTH__")
    write(diagnostics, DIAGNOSTICS_JSON, DIAGNOSTICS_JS, "__PROPS_MATCHING_DIAGNOSTICS__")
    print(json.dumps(health["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
