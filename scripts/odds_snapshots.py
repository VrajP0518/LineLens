"""Fetch optional real odds snapshots and join them to compact exports.

This script is intentionally failure-safe. LineLens works without odds; when
ODDS_API_KEY is missing or the provider fails, the existing snapshot file is
preserved and the metadata explains the status.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.odds_provider import fetch_odds, odds_config_status


ODDS_DIR = ROOT / "data" / "odds"
ODDS_JSON = ODDS_DIR / "odds_snapshots.json"
ODDS_JS = ODDS_DIR / "odds_snapshots.js"
TEAM_METADATA = ROOT / "data" / "team_metadata.json"
MLB_PREDICTIONS_JSON = ROOT / "data" / "predictions" / "mlb_predictions.json"
MLB_PREDICTIONS_JS = ROOT / "data" / "predictions" / "mlb_predictions.js"


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


def normalize_name(value: Any) -> str:
    return "".join(ch for ch in str(value or "").lower() if ch.isalnum())


def team_aliases() -> dict[str, str]:
    payload = load_json(TEAM_METADATA, {"teams": []})
    aliases: dict[str, str] = {}
    for team in payload.get("teams", []):
        if team.get("sport") not in {"MLB", "NFL"}:
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
    books: list[dict[str, Any]] = []

    for book in event.get("bookmakers", []) or []:
        for market in book.get("markets", []) or []:
            if market.get("key") != "h2h":
                continue
            book_row = {"book": book.get("title") or book.get("key"), "last_update": market.get("last_update"), "home": None, "away": None}
            for outcome in market.get("outcomes", []) or []:
                price = outcome.get("price")
                if price is None:
                    continue
                if normalize_name(outcome.get("name")) == normalize_name(home_name):
                    home_prices.append(float(price))
                    book_row["home"] = price
                elif normalize_name(outcome.get("name")) == normalize_name(away_name):
                    away_prices.append(float(price))
                    book_row["away"] = price
            books.append(book_row)

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
        "bookmakers_count": len(event.get("bookmakers", []) or []),
        "moneyline_home_current": home_consensus,
        "moneyline_away_current": away_consensus,
        "best_home_moneyline": max(home_prices) if home_prices else None,
        "best_away_moneyline": max(away_prices) if away_prices else None,
        "market_implied_home": american_implied(home_consensus),
        "market_implied_away": american_implied(away_consensus),
        "books": books[:8],
        "source": "The Odds API",
        "data_mode": "real_odds_snapshot",
    }


def snapshot_key(row: dict[str, Any]) -> tuple[str, str | None, str | None, str | None]:
    return (str(row.get("sport") or ""), row.get("game_date"), row.get("home"), row.get("away"))


def apply_mlb_odds_to_predictions(snapshots: list[dict[str, Any]]) -> int:
    payload = load_json(MLB_PREDICTIONS_JSON, None)
    if not isinstance(payload, dict) or not isinstance(payload.get("games"), list):
        return 0
    by_game = {snapshot_key(row): row for row in snapshots if row.get("sport") == "MLB"}
    updated = 0
    for game in payload.get("games", []):
        key = ("MLB", game.get("game_date"), game.get("home"), game.get("away"))
        odds = by_game.get(key)
        if not odds:
            continue
        game["moneyline_home"] = odds.get("moneyline_home_current")
        game["moneyline_away"] = odds.get("moneyline_away_current")
        game["moneyline_home_current"] = odds.get("moneyline_home_current")
        game["moneyline_away_current"] = odds.get("moneyline_away_current")
        game["market_implied_home"] = odds.get("market_implied_home")
        game["market_implied_away"] = odds.get("market_implied_away")
        if game.get("home_win_probability") is not None and odds.get("market_implied_home") is not None:
            game["market_edge_home"] = round(float(game["home_win_probability"]) - float(odds["market_implied_home"]), 4)
        game["odds_status"] = "real_odds_snapshot"
        game["odds_snapshot_at"] = odds.get("snapshot_at")
        updated += 1
    if updated:
        write_json_js(payload, MLB_PREDICTIONS_JSON, MLB_PREDICTIONS_JS, "__MLB_PREDICTIONS__")
    return updated


def configured_sports(config: dict[str, Any]) -> list[str]:
    raw = str(config.get("sports") or "MLB,NFL")
    sports = [part.strip().upper() for part in raw.replace(";", ",").split(",") if part.strip()]
    return [sport for sport in sports if sport in {"MLB", "NFL"}] or ["MLB"]


def main() -> int:
    generated_at = utc_now()
    config = odds_config_status()
    existing = load_json(ODDS_JSON, {"snapshots": []})
    previous = existing.get("snapshots", []) if isinstance(existing, dict) else []
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
        }
        if result.status == "success":
            new_snapshots.extend(normalize_event(event, sport, aliases, generated_at) for event in result.data)

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
    updated_predictions = apply_mlb_odds_to_predictions(new_snapshots)

    if interrupted:
        source_status = "interrupted"
    else:
        source_status = "success" if new_snapshots else ("missing_key" if not config.get("key_present") else "failed_or_empty")
    payload = {
        "metadata": {
            "app": "LineLens Sports",
            "version": "v1.0.0",
            "generated_at": generated_at,
            "real_data": bool(snapshots),
            "new_real_data": bool(new_snapshots),
            "provider": config.get("provider"),
            "source": "The Odds API",
            "source_status": source_status,
            "snapshot_count": len(snapshots),
            "new_snapshot_count": len(new_snapshots),
            "mlb_predictions_joined": updated_predictions,
            "sports_requested": configured_sports(config),
            "timeout_seconds": config.get("timeout_seconds"),
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
