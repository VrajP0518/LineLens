"""Fetch authoritative results for logged predictions that are still pending."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from live_scores import (  # noqa: E402
    clean,
    espn_scoreboard,
    fetch_mlb_games,
    game_from_espn_event,
    prediction_indexes,
)

LOG_PATH = ROOT / "data" / "tracking" / "model_predictions_log.json"
RESULT_HISTORY = ROOT / "data" / "live" / "result_history.json"
RESULT_HISTORY_JS = ROOT / "data" / "live" / "result_history.js"
SCORED_RESULTS = {"win", "loss", "push"}
SUPPORTED_SPORTS = {"MLB", "WNBA"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def pending_dates(max_age_days: int) -> dict[str, list[date]]:
    payload = load_json(LOG_PATH)
    cutoff = date.today() - timedelta(days=max_age_days)
    dates: dict[str, set[date]] = {sport: set() for sport in SUPPORTED_SPORTS}
    for row in payload.get("predictions", []):
        sport = str(row.get("sport") or "").upper()
        result = str(row.get("model_result") or row.get("result") or "pending").lower()
        if sport not in dates or result in SCORED_RESULTS or result in {"no_result", "excluded"}:
            continue
        raw = str(row.get("game_date") or "")[:10]
        try:
            game_day = date.fromisoformat(raw)
        except ValueError:
            continue
        if cutoff <= game_day <= date.today():
            dates[sport].add(game_day)
    return {sport: sorted(values) for sport, values in dates.items()}


def result_key(game: dict[str, Any]) -> str:
    game_id = str(game.get("game_id") or game.get("espn_event_id") or game.get("id") or "")
    if game_id:
        return f"{game.get('sport')}:{game_id}"
    return f"{game.get('sport')}:{str(game.get('game_date') or game.get('game_time') or '')[:10]}:{game.get('away')}:{game.get('home')}"


def fetch_results(max_age_days: int) -> tuple[list[dict[str, Any]], list[str]]:
    dates = pending_dates(max_age_days)
    mlb_predictions, nfl_predictions, wnba_predictions = prediction_indexes()
    warnings: list[str] = []
    games: list[dict[str, Any]] = []

    mlb_dates = dates["MLB"]
    if mlb_dates:
        try:
            mlb_games, mlb_warnings = fetch_mlb_games(mlb_dates[0], mlb_dates[-1], mlb_predictions)
            wanted = set(mlb_dates)
            games.extend(
                game for game in mlb_games
                if date.fromisoformat(str(game.get("game_date") or "")[:10]) in wanted
            )
            warnings.extend(mlb_warnings)
        except Exception as error:  # noqa: BLE001 - preserve prior verified history on a provider outage.
            warnings.append(f"MLB pending-result refresh failed: {error}")

    for game_day in dates["WNBA"]:
        try:
            payload = espn_scoreboard("WNBA", game_day)
            for event in payload.get("events", []):
                row = game_from_espn_event(event, "WNBA", mlb_predictions, nfl_predictions, wnba_predictions)
                if row:
                    games.append(row)
        except Exception as error:  # noqa: BLE001 - one date must not erase the other settled dates.
            warnings.append(f"WNBA result refresh failed for {game_day}: {error}")
    return games, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-age-days", type=int, default=400)
    parser.add_argument("--strict", action="store_true", help="Fail when pending dates exist but every provider request fails.")
    args = parser.parse_args()

    requested = pending_dates(max(args.max_age_days, 1))
    fresh, warnings = fetch_results(max(args.max_age_days, 1))
    previous = load_json(RESULT_HISTORY).get("games", [])
    merged: dict[str, dict[str, Any]] = {result_key(game): game for game in previous}
    for game in fresh:
        merged[result_key(game)] = game
    games = sorted(merged.values(), key=lambda game: (str(game.get("game_date") or game.get("game_time") or ""), result_key(game)))
    payload = clean({
        "metadata": {
            "generated_at": utc_now(),
            "real_data": True,
            "source": "MLB Stats API and ESPN Scoreboard API",
            "status": "success" if fresh else "cached" if previous else "unavailable",
            "pending_dates_requested": {sport: [value.isoformat() for value in values] for sport, values in requested.items()},
            "fresh_rows": len(fresh),
            "row_count": len(games),
            "warnings": warnings,
        },
        "games": games,
    })
    RESULT_HISTORY.parent.mkdir(parents=True, exist_ok=True)
    RESULT_HISTORY.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    RESULT_HISTORY_JS.write_text(f"window.__RESULT_HISTORY__ = {json.dumps(payload, separators=(',', ':'), allow_nan=False)};\n", encoding="utf-8")
    print(json.dumps(payload["metadata"], indent=2))
    if args.strict and any(requested.values()) and not fresh and not previous:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
