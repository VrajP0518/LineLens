"""Fetch optional real odds snapshots and join them to compact exports.

This script is intentionally failure-safe. LineLens works without odds; when
ODDS_API_KEY is missing or the provider fails, the existing snapshot file is
preserved and the metadata explains the status.
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import mean
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.odds_provider import fetch_odds, fetch_sharpapi_odds, odds_config_status
from src.shared.version import APP_VERSION


ODDS_DIR = ROOT / "data" / "odds"
ODDS_JSON = ODDS_DIR / "odds_snapshots.json"
ODDS_JS = ODDS_DIR / "odds_snapshots.js"
TEAM_METADATA = ROOT / "data" / "team_metadata.json"
MLB_PREDICTIONS_JSON = ROOT / "data" / "predictions" / "mlb_predictions.json"
MLB_PREDICTIONS_JS = ROOT / "data" / "predictions" / "mlb_predictions.js"
WNBA_PREDICTIONS_JSON = ROOT / "data" / "predictions" / "wnba_predictions.json"
WNBA_PREDICTIONS_JS = ROOT / "data" / "predictions" / "wnba_predictions.js"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return default


def write_json_js(payload: dict[str, Any], json_path: Path, js_path: Path, js_name: str) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    json_path.write_text(text + "\n", encoding="utf-8")
    js_path.write_text(f"window.{js_name} = {text};\n", encoding="utf-8")


def recent_snapshot(metadata: dict[str, Any], minutes: int) -> bool:
    """Keep normal odds refreshes inside the configured request budget."""
    if not (metadata.get("key_present") or metadata.get("sharp_key_present")):
        return False
    try:
        generated = str(metadata.get("generated_at") or "").replace("Z", "+00:00")
        age = datetime.now(timezone.utc) - datetime.fromisoformat(generated)
        return age < timedelta(minutes=max(1, minutes))
    except (TypeError, ValueError):
        return False


def normalize_name(value: Any) -> str:
    return "".join(ch for ch in str(value or "").lower() if ch.isalnum())


def team_aliases() -> dict[str, str]:
    payload = load_json(TEAM_METADATA, {"teams": []})
    aliases: dict[str, str] = {}
    for team in payload.get("teams", []):
        if team.get("sport") not in {"MLB", "WNBA", "NFL"}:
            continue
        code = str(team.get("abbreviation") or "").upper()
        if not code:
            continue
        for field in ["abbreviation", "full_name", "city", "name"]:
            value = team.get(field)
            if value:
                aliases[normalize_name(value)] = code
    return aliases


def american_implied(odds: int | float | None) -> float | None:
    if odds is None:
        return None
    value = float(odds)
    if value > 0:
        return 100 / (value + 100)
    if value < 0:
        return abs(value) / (abs(value) + 100)
    return None


def summarize_market(bookmakers: list[dict[str, Any]], market_key: str = "h2h") -> dict[str, Any]:
    home_prices: list[float] = []
    away_prices: list[float] = []
    books: list[dict[str, Any]] = []
    for book in bookmakers or []:
        for market in book.get("markets", []):
            if market.get("key") != market_key:
                continue
            outcomes = market.get("outcomes", [])
            if len(outcomes) < 2:
                continue
            row = {
                "book": book.get("title") or book.get("key"),
                "last_update": market.get("last_update") or book.get("last_update"),
                "outcomes": outcomes,
            }
            books.append(row)
            for outcome in outcomes:
                price = outcome.get("price")
                if price is None:
                    continue
                # Home/away assignment happens after the event names are known.
                outcome["_numeric_price"] = float(price)
    return {"books": books, "home_prices": home_prices, "away_prices": away_prices}


def normalize_event(event: dict[str, Any], sport: str, aliases: dict[str, str], generated_at: str) -> dict[str, Any]:
    home_name = event.get("home_team")
    away_name = event.get("away_team")
    home_code = aliases.get(normalize_name(home_name), str(home_name or "").upper())
    away_code = aliases.get(normalize_name(away_name), str(away_name or "").upper())
    home_prices: list[float] = []
    away_prices: list[float] = []
    spread_home_points: list[float] = []
    spread_away_points: list[float] = []
    spread_home_prices: list[float] = []
    spread_away_prices: list[float] = []
    total_points: list[float] = []
    total_prices: dict[str, list[float]] = {"Over": [], "Under": []}
    books: list[dict[str, Any]] = []
    spread_books: list[dict[str, Any]] = []

    for book in event.get("bookmakers", []) or []:
        for market in book.get("markets", []) or []:
            market_key = market.get("key")
            if market_key not in {"h2h", "spreads", "totals"}:
                continue
            book_row = {"book": book.get("title") or book.get("key"), "last_update": market.get("last_update"), "home": None, "away": None}
            for outcome in market.get("outcomes", []) or []:
                price = outcome.get("price")
                if price is None:
                    continue
                is_home = normalize_name(outcome.get("name")) == normalize_name(home_name)
                is_away = normalize_name(outcome.get("name")) == normalize_name(away_name)
                if market_key == "h2h":
                    if is_home:
                        home_prices.append(float(price))
                        book_row["home"] = price
                    elif is_away:
                        away_prices.append(float(price))
                        book_row["away"] = price
                elif is_home or is_away:
                    point = outcome.get("point")
                    if point is not None:
                        (spread_home_points if is_home else spread_away_points).append(float(point))
                    (spread_home_prices if is_home else spread_away_prices).append(float(price))
                    book_row["home" if is_home else "away"] = {"point": point, "price": price}
                elif market_key == "totals" and outcome.get("name") in {"Over", "Under"}:
                    point = outcome.get("point")
                    if point is not None:
                        total_points.append(float(point))
                    total_prices[str(outcome.get("name"))].append(float(price))
            (books if market_key == "h2h" else spread_books).append(book_row)

    home_consensus = round(mean(home_prices), 1) if home_prices else None
    away_consensus = round(mean(away_prices), 1) if away_prices else None
    commence = event.get("commence_time")
    game_date = str(commence)[:10] if commence else None
    snapshot_id = f"{sport}:{event.get('id')}:{generated_at}"
    return {
        "snapshot_id": snapshot_id,
        "sport": sport,
        "provider_event_id": event.get("id"),
        "snapshot_at": generated_at,
        "game_date": game_date,
        "commence_time": commence,
        "home": home_code,
        "away": away_code,
        "home_display": home_name,
        "away_display": away_name,
        "market": "h2h",
        "markets_available": sorted({market.get("key") for book in event.get("bookmakers", []) or [] for market in book.get("markets", []) or [] if market.get("key")} & {"h2h", "spreads", "totals"}),
        "bookmakers_count": len(event.get("bookmakers", []) or []),
        "moneyline_home_current": home_consensus,
        "moneyline_away_current": away_consensus,
        "best_home_moneyline": max(home_prices) if home_prices else None,
        "best_away_moneyline": max(away_prices) if away_prices else None,
        "spread_home_current": round(mean(spread_home_points), 1) if spread_home_points else None,
        "spread_away_current": round(mean(spread_away_points), 1) if spread_away_points else None,
        "spread_home_price_current": round(mean(spread_home_prices), 1) if spread_home_prices else None,
        "spread_away_price_current": round(mean(spread_away_prices), 1) if spread_away_prices else None,
        "total_current": round(mean(total_points), 1) if total_points else None,
        "total_over_price_current": round(mean(total_prices["Over"]), 1) if total_prices["Over"] else None,
        "total_under_price_current": round(mean(total_prices["Under"]), 1) if total_prices["Under"] else None,
        "market_implied_home": american_implied(home_consensus),
        "market_implied_away": american_implied(away_consensus),
        "books": books[:8],
        "spread_books": spread_books[:8],
        "source": event.get("_line_lens_source") or "The Odds API",
        "data_mode": "real_odds_snapshot",
        "freshness_status": "Current",
    }


def normalize_sharpapi_events(rows: list[dict[str, Any]], sport: str) -> list[dict[str, Any]]:
    """Convert SharpAPI's flat MLB rows into the event shape used by the exporter."""

    market_map = {"moneyline": "h2h", "run_line": "spreads", "total_runs": "totals"}
    events: dict[str, dict[str, Any]] = {}
    for row in rows:
        market_key = market_map.get(str(row.get("market_type") or "").lower())
        event_id = str(row.get("event_id") or "")
        if not market_key or not event_id:
            continue
        event = events.setdefault(event_id, {
            "id": event_id,
            "commence_time": row.get("event_start_time"),
            "home_team": row.get("home_team"),
            "away_team": row.get("away_team"),
            "bookmakers": [],
            "_line_lens_source": "SharpAPI",
        })
        bookmaker_name = str(row.get("sportsbook") or "SharpAPI")
        bookmaker = next((book for book in event["bookmakers"] if book.get("key") == bookmaker_name), None)
        if bookmaker is None:
            bookmaker = {"key": bookmaker_name, "title": bookmaker_name, "markets": []}
            event["bookmakers"].append(bookmaker)
        market = next((item for item in bookmaker["markets"] if item.get("key") == market_key), None)
        if market is None:
            market = {"key": market_key, "last_update": row.get("timestamp"), "outcomes": []}
            bookmaker["markets"].append(market)
        outcome = {
            "name": row.get("selection"),
            "price": row.get("odds_american"),
        }
        if row.get("line") is not None:
            outcome["point"] = row.get("line")
        market["outcomes"].append(outcome)
    return list(events.values())


def snapshot_key(row: dict[str, Any]) -> tuple[str, str | None, str | None, str | None]:
    return (str(row.get("sport") or ""), row.get("game_date"), row.get("home"), row.get("away"))


def odds_row_for_game(game: dict[str, Any], snapshots: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Match a prediction to one odds row without crossing a real matchup.

    Prediction exports use the sport's local calendar date while The Odds API
    commonly serializes ``game_date`` from the UTC commence timestamp. Exact
    date matches win. A one-day fallback is allowed only when the same
    sport/home/away matchup has one unambiguous nearby date, which handles the
    UTC boundary without risking consecutive-game misjoins.
    """

    sport = str(game.get("sport") or "")
    home = game.get("home")
    away = game.get("away")
    game_date = game.get("game_date")
    matchup = [
        row for row in snapshots
        if str(row.get("sport") or "") == sport
        and row.get("home") == home
        and row.get("away") == away
    ]
    if not matchup:
        return None

    exact = [row for row in matchup if row.get("game_date") == game_date]
    if exact:
        return exact[-1]

    try:
        target = date.fromisoformat(str(game_date))
    except (TypeError, ValueError):
        return None

    nearby = []
    for row in matchup:
        try:
            row_date = date.fromisoformat(str(row.get("game_date")))
        except (TypeError, ValueError):
            continue
        if abs((row_date - target).days) <= 1:
            nearby.append(row)
    if not nearby or len({row.get("game_date") for row in nearby}) != 1:
        return None
    return nearby[-1]


def apply_odds_to_predictions(snapshots: list[dict[str, Any]]) -> int:
    updated = 0
    targets = {
        "MLB": (MLB_PREDICTIONS_JSON, MLB_PREDICTIONS_JS, "__MLB_PREDICTIONS__"),
        "WNBA": (WNBA_PREDICTIONS_JSON, WNBA_PREDICTIONS_JS, "__WNBA_PREDICTIONS__"),
    }
    for sport, (json_path, js_path, variable) in targets.items():
        payload = load_json(json_path, None)
        if not isinstance(payload, dict) or not isinstance(payload.get("games"), list):
            continue
        changed = 0
        for game in payload.get("games", []):
            odds = odds_row_for_game(game, snapshots)
            if not odds:
                continue
            for field in ("moneyline_home_current", "moneyline_away_current", "spread_home_current", "spread_away_current", "spread_home_price_current", "spread_away_price_current", "total_current", "total_over_price_current", "total_under_price_current", "market_implied_home", "market_implied_away"):
                game[field] = odds.get(field)
            game["moneyline_home"] = odds.get("moneyline_home_current")
            game["moneyline_away"] = odds.get("moneyline_away_current")
            if game.get("home_win_probability") is not None and odds.get("market_implied_home") is not None:
                game["market_edge_home"] = round(float(game["home_win_probability"]) - float(odds["market_implied_home"]), 4)
            game["odds_status"] = "real_odds_snapshot"
            game["odds_snapshot_at"] = odds.get("snapshot_at")
            game["odds_provider_event_id"] = odds.get("provider_event_id")
            changed += 1
        if changed:
            write_json_js(payload, json_path, js_path, variable)
            updated += changed
    return updated


def configured_sports(config: dict[str, Any]) -> list[str]:
    raw = str(config.get("sports") or "MLB,NFL")
    sports = [part.strip().upper() for part in raw.replace(";", ",").split(",") if part.strip()]
    return [sport for sport in sports if sport in {"MLB", "WNBA", "NFL"}] or ["MLB"]


def main() -> int:
    generated_at = utc_now()
    config = odds_config_status()
    existing = load_json(ODDS_JSON, {"snapshots": []})
    previous = existing.get("snapshots", []) if isinstance(existing, dict) else []
    if recent_snapshot(existing.get("metadata", {}) if isinstance(existing, dict) else {}, int(config.get("min_refresh_minutes") or 10)):
        cached = dict(existing)
        metadata = dict(cached.get("metadata", {}))
        metadata["source_status"] = "cache_interval"
        metadata["note"] = "Previous successful odds snapshot is inside the configured refresh interval; cached snapshots were preserved."
        # A model refresh can run immediately before this command. Re-apply
        # the still-valid cached lines so newly exported predictions do not
        # incorrectly show odds as unavailable just because the provider call
        # was skipped by the refresh interval.
        metadata["predictions_joined"] = apply_odds_to_predictions(cached.get("snapshots", []))
        cached["metadata"] = metadata
        write_json_js(cached, ODDS_JSON, ODDS_JS, "__ODDS_SNAPSHOTS__")
        print(json.dumps(metadata, indent=2))
        return 0
    aliases = team_aliases()
    new_snapshots: list[dict[str, Any]] = []
    sport_status: dict[str, Any] = {}

    interrupted = False
    for sport in configured_sports(config):
        try:
            result = fetch_odds(sport)
        except KeyboardInterrupt:
            interrupted = True
            sport_status[sport] = {
                "status": "interrupted",
                "message": "Odds refresh interrupted by user. Preserving cached snapshots.",
                "enabled": bool(config.get("enabled")),
                "provider": str(config.get("provider") or "the_odds_api"),
                "events": 0,
            }
            break
        sport_status[sport] = {
            "status": result.status,
            "message": result.message,
            "enabled": result.enabled,
            "provider": result.provider,
            "events": len(result.data),
            "requests_remaining": (result.headers or {}).get("x-requests-remaining"),
            "requests_used": (result.headers or {}).get("x-requests-used"),
            "cost_last_request": (result.headers or {}).get("x-requests-last"),
        }
        if result.status == "success":
            new_snapshots.extend(normalize_event(event, sport, aliases, generated_at) for event in result.data[: int(config.get("max_events") or 32)])
        # SharpAPI is a real MLB fallback for both main markets and player
        # props. Keep The Odds API primary when it returns event rows.
        if sport == "MLB" and not result.data and config.get("sharp_key_present"):
            sharp_result = fetch_sharpapi_odds("MLB", "main")
            sharp_events = normalize_sharpapi_events(sharp_result.data, "MLB") if sharp_result.status == "success" and isinstance(sharp_result.data, list) else []
            sport_status[sport]["sharp_fallback"] = {
                "status": sharp_result.status,
                "provider": "SharpAPI",
                "events": len(sharp_events),
                "rows": len(sharp_result.data) if isinstance(sharp_result.data, list) else 0,
                "requests_remaining": (sharp_result.headers or {}).get("x-ratelimit-remaining"),
            }
            new_snapshots.extend(normalize_event(event, sport, aliases, generated_at) for event in sharp_events[: int(config.get("max_events") or 32)])

    merged = previous + new_snapshots
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for row in reversed(merged):
        key = row.get("snapshot_id") or json.dumps(snapshot_key(row))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)
    snapshots = list(reversed(deduped))[-600:]
    updated_predictions = apply_odds_to_predictions(new_snapshots)

    if interrupted:
        source_status = "interrupted"
    else:
        source_status = "success" if new_snapshots else ("missing_key" if not (config.get("key_present") or config.get("sharp_key_present")) else "failed_or_empty")
    sources = sorted({str(row.get("source")) for row in new_snapshots if row.get("source")})
    payload = {
        "metadata": {
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": generated_at,
            "real_data": bool(snapshots),
            "new_real_data": bool(new_snapshots),
            "provider": config.get("provider"),
            "source": " + ".join(sources) if sources else "The Odds API",
            "source_status": source_status,
            "snapshot_count": len(snapshots),
            "new_snapshot_count": len(new_snapshots),
            "mlb_predictions_joined": updated_predictions,
            "sports_requested": configured_sports(config),
            "timeout_seconds": config.get("timeout_seconds"),
            "region": config.get("region"),
            "limits": {
                "max_events": config.get("max_events"),
                "max_prop_markets": config.get("max_prop_markets"),
                "min_refresh_minutes": config.get("min_refresh_minutes"),
                "preferred_bookmakers": config.get("preferred_bookmakers"),
            },
            "quota": {
                "requests_remaining": next((row.get("requests_remaining") for row in sport_status.values() if row.get("requests_remaining") is not None), None),
                "requests_used": next((row.get("requests_used") for row in sport_status.values() if row.get("requests_used") is not None), None),
                "cost_last_request": next((row.get("cost_last_request") for row in sport_status.values() if row.get("cost_last_request") is not None), None),
            },
            "sharp_key_present": bool(config.get("sharp_key_present")),
            "note": "Odds are optional. Missing odds never fabricate lines, movement, or CLV.",
        },
        "sports": sport_status,
        "snapshots": snapshots,
    }
    write_json_js(payload, ODDS_JSON, ODDS_JS, "__ODDS_SNAPSHOTS__")
    print(json.dumps(payload["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
