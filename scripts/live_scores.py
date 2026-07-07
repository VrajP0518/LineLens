"""Export compact live score data for the LineLens desktop widget.

This script uses real public/free data only. MLB live schedule/feed data comes
from MLB Stats API. NFL live play data is not sourced in this iteration, so NFL
rows are limited to existing exported LineLens prediction rows when available.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:  # pragma: no cover - validation environments may vary.
    requests = None  # type: ignore[assignment]


ROOT = Path(__file__).resolve().parents[1]
LIVE_DIR = ROOT / "data" / "live"
LIVE_JSON = LIVE_DIR / "live_scores.json"
LIVE_JS = LIVE_DIR / "live_scores.js"
PREDICTIONS_DIR = ROOT / "data" / "predictions"
RAW_MLB_DIR = ROOT / "data" / "raw" / "mlb"
MLB_PREDICTIONS = PREDICTIONS_DIR / "mlb_predictions.json"
MLB_BACKTEST = PREDICTIONS_DIR / "mlb_backtest_predictions.json"
NFL_PREDICTIONS = PREDICTIONS_DIR / "nfl_predictions.json"
MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule"
MLB_LIVE_URL = "https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
APP_VERSION = "v0.7.0"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def today_iso() -> str:
    return datetime.now().date().isoformat()


def parse_iso_date(value: str | None) -> date:
    if not value:
        return datetime.now().date()
    return datetime.strptime(value[:10], "%Y-%m-%d").date()


def date_range(start: date, end: date) -> list[date]:
    days = (end - start).days
    return [start + timedelta(days=offset) for offset in range(days + 1)]


def clean(value: Any) -> Any:
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items()}
    if isinstance(value, list):
        return [clean(item) for item in value]
    return value


def write_json_and_js(payload: dict[str, Any]) -> None:
    LIVE_DIR.mkdir(parents=True, exist_ok=True)
    cleaned = clean(payload)
    LIVE_JSON.write_text(json.dumps(cleaned, indent=2, allow_nan=False), encoding="utf-8")
    LIVE_JS.write_text(
        "window.__LIVE_SCORES__ = "
        + json.dumps(cleaned, separators=(",", ":"), allow_nan=False)
        + ";\n",
        encoding="utf-8",
    )


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def safe_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def normalize_team(value: Any) -> str:
    return str(value or "UNK").strip().upper()


def team_code(team: dict[str, Any]) -> str:
    return normalize_team(
        team.get("abbreviation")
        or team.get("teamCode")
        or team.get("fileCode")
        or team.get("name")
    )


def pitcher_name(entry: dict[str, Any]) -> str | None:
    pitcher = entry.get("probablePitcher") or {}
    return pitcher.get("fullName") or pitcher.get("name")


def model_tier(probability: float | None, edge: float | None) -> str:
    score = probability if probability is not None else 0.5
    confidence = max(score, 1 - score)
    if confidence >= 0.65 or (edge is not None and abs(edge) >= 0.15):
        return "Hot Pick"
    if confidence >= 0.60 or (edge is not None and abs(edge) >= 0.10):
        return "Strong Edge"
    if confidence >= 0.55 or (edge is not None and abs(edge) >= 0.05):
        return "Model Lean"
    return "Normal"


def row_game_id(game: dict[str, Any]) -> str:
    return str(game.get("game_id") or game.get("gamePk") or game.get("id") or "")


def prediction_key(game: dict[str, Any]) -> str:
    game_id = row_game_id(game)
    if game_id:
        return f"id:{game_id}"
    return (
        f"fallback:{game.get('game_date')}:"
        f"{normalize_team(game.get('away'))}:{normalize_team(game.get('home'))}"
    )


def prediction_indexes() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    mlb_payload = load_json(MLB_PREDICTIONS)
    nfl_payload = load_json(NFL_PREDICTIONS)
    mlb: dict[str, dict[str, Any]] = {}
    nfl: dict[str, dict[str, Any]] = {}
    for game in mlb_payload.get("games", []):
        mlb[prediction_key(game)] = game
        mlb[
            f"fallback:{game.get('game_date')}:"
            f"{normalize_team(game.get('away'))}:{normalize_team(game.get('home'))}"
        ] = game
    for game in nfl_payload.get("games", []):
        nfl[prediction_key(game)] = game
        nfl[
            f"fallback:{game.get('season')}:{game.get('week')}:"
            f"{normalize_team(game.get('away'))}:{normalize_team(game.get('home'))}"
        ] = game
        nfl[
            f"fallback:{game.get('game_date')}:"
            f"{normalize_team(game.get('away'))}:{normalize_team(game.get('home'))}"
        ] = game
    return mlb, nfl


def find_mlb_prediction(
    game_id: str,
    game_date: str | None,
    away: str,
    home: str,
    index: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    return index.get(f"id:{game_id}") or index.get(
        f"fallback:{game_date}:{normalize_team(away)}:{normalize_team(home)}"
    )


def no_model_payload(reason: str = "No LineLens prediction matched this game") -> dict[str, Any]:
    return {
        "prediction_available": False,
        "label": "No model pick",
        "prediction_status": "no_prediction",
        "source": reason,
    }


def model_payload(prediction: dict[str, Any] | None) -> dict[str, Any]:
    if not prediction or not prediction.get("model_pick"):
        return no_model_payload("Schedule-only row or no exported model prediction")
    home_probability = safe_float(prediction.get("home_win_probability") or prediction.get("model_home_win"))
    away_probability = safe_float(prediction.get("away_win_probability"))
    if away_probability is None and home_probability is not None:
        away_probability = 1 - home_probability
    edge = safe_float(prediction.get("edge"))
    if edge is None and home_probability is not None:
        edge = abs(home_probability - 0.5)
    confidence_score = safe_float(prediction.get("confidence_score"))
    if confidence_score is None:
        values = [value for value in [home_probability, away_probability] if value is not None]
        confidence_score = max(values) if values else None
    return clean(
        {
            "prediction_available": True,
            "pick": prediction.get("model_pick"),
            "home_win_probability": home_probability,
            "away_win_probability": away_probability,
            "edge": edge,
            "confidence": prediction.get("confidence"),
            "confidence_score": confidence_score,
            "confidence_label": model_tier(confidence_score, edge),
            "top_factor": prediction.get("top_factor_label")
            or (prediction.get("explanation") or {}).get("top_factors", [{}])[0].get("label"),
            "source": "LineLens prediction export",
            "prediction_status": "prediction_joined",
        }
    )


def status_bucket(status: str) -> str:
    normalized = status.lower()
    if "final" in normalized or "completed" in normalized:
        return "Final"
    if "progress" in normalized or "live" in normalized or "warmup" in normalized:
        return "In Progress"
    if "postponed" in normalized or "delayed" in normalized:
        return status
    return "Scheduled"


def format_count(count: dict[str, Any] | None) -> str | None:
    if not count:
        return None
    balls = count.get("balls")
    strikes = count.get("strikes")
    if balls is None or strikes is None:
        return None
    return f"{balls}-{strikes}"


def play_from_mlb(play: dict[str, Any]) -> dict[str, Any]:
    about = play.get("about", {})
    result = play.get("result", {})
    count = play.get("count", {})
    return clean(
        {
            "inning": about.get("inning"),
            "half": about.get("halfInning"),
            "description": result.get("description"),
            "event": result.get("event"),
            "count": format_count(count),
            "outs": count.get("outs"),
            "timestamp": about.get("endTime") or about.get("startTime"),
        }
    )


def extract_live_bits(game_pk: str) -> dict[str, Any]:
    if requests is None:
        return {"plays": [], "latest_play": None, "live_error": "requests package missing"}
    response = requests.get(MLB_LIVE_URL.format(game_pk=game_pk), timeout=20)
    response.raise_for_status()
    payload = response.json()
    live = payload.get("liveData", {})
    plays = live.get("plays", {})
    all_plays = plays.get("allPlays", [])
    current = plays.get("currentPlay") or (all_plays[-1] if all_plays else {})
    linescore = live.get("linescore", {})
    offense = linescore.get("offense", {})
    return clean(
        {
            "balls": (current.get("count") or {}).get("balls"),
            "strikes": (current.get("count") or {}).get("strikes"),
            "outs": linescore.get("outs")
            if linescore.get("outs") is not None
            else (current.get("count") or {}).get("outs"),
            "bases": {
                "first": bool(offense.get("first")),
                "second": bool(offense.get("second")),
                "third": bool(offense.get("third")),
            },
            "latest_play": (current.get("result") or {}).get("description"),
            "plays": [play_from_mlb(play) for play in all_plays[-20:]][::-1],
        }
    )


def mlb_game_from_schedule(
    game: dict[str, Any],
    predictions: dict[str, dict[str, Any]],
    source_status: str = "live_fresh",
) -> dict[str, Any]:
    teams = game.get("teams", {})
    home_entry = teams.get("home", {})
    away_entry = teams.get("away", {})
    home_team = home_entry.get("team", {})
    away_team = away_entry.get("team", {})
    home = team_code(home_team)
    away = team_code(away_team)
    game_id = str(game.get("gamePk"))
    game_date = str(game.get("officialDate") or game.get("gameDate", ""))[:10] or None
    status = (game.get("status") or {}).get("detailedState") or (game.get("status") or {}).get(
        "abstractGameState"
    ) or "Scheduled"
    linescore = game.get("linescore") or {}
    prediction = find_mlb_prediction(game_id, game_date, away, home, predictions)
    model = model_payload(prediction)
    row: dict[str, Any] = {
        "sport": "MLB",
        "game_id": game_id,
        "game_date": game_date,
        "status": status_bucket(status),
        "status_detail": status,
        "source": "MLB Stats API",
        "source_status": source_status,
        "data_mode": "prediction_joined" if model.get("prediction_available") else "schedule_only",
        "away": away,
        "home": home,
        "away_display": away_team.get("name") or away,
        "home_display": home_team.get("name") or home,
        "away_score": away_entry.get("score"),
        "home_score": home_entry.get("score"),
        "inning": linescore.get("currentInning"),
        "inning_state": linescore.get("inningState"),
        "outs": linescore.get("outs"),
        "balls": None,
        "strikes": None,
        "bases": None,
        "game_time": game.get("gameDate"),
        "probable_pitchers": {
            "away": pitcher_name(away_entry),
            "home": pitcher_name(home_entry),
        },
        "latest_play": None,
        "model": model,
        "plays": [],
    }
    if row["status"] == "In Progress":
        try:
            row.update(extract_live_bits(game_id))
        except Exception as error:  # noqa: BLE001 - expose clean degraded state.
            row["live_error"] = f"Pitch-by-pitch unavailable: {error}"
    return clean(row)


def games_from_schedule_payload(
    payload: dict[str, Any],
    predictions: dict[str, dict[str, Any]],
    source_status: str,
) -> list[dict[str, Any]]:
    games: list[dict[str, Any]] = []
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            games.append(mlb_game_from_schedule(game, predictions, source_status))
    return games


def cache_schedule_payload(payload: dict[str, Any]) -> None:
    RAW_MLB_DIR.mkdir(parents=True, exist_ok=True)
    for day in payload.get("dates", []):
        date_value = day.get("date")
        if not date_value:
            continue
        daily_payload = {
            "copyright": payload.get("copyright"),
            "totalItems": day.get("totalItems"),
            "totalEvents": day.get("totalEvents"),
            "totalGames": day.get("totalGames"),
            "totalGamesInProgress": day.get("totalGamesInProgress"),
            "dates": [day],
        }
        (RAW_MLB_DIR / f"schedule_{date_value}.json").write_text(
            json.dumps(clean(daily_payload), indent=2, allow_nan=False),
            encoding="utf-8",
        )


def fetch_mlb_games(
    start_date: date,
    end_date: date,
    predictions: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    if requests is None:
        return [], ["requests package is missing; MLB live feed unavailable"]
    response = requests.get(
        MLB_SCHEDULE_URL,
        params={
            "sportId": 1,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "hydrate": "probablePitcher,linescore",
        },
        timeout=25,
    )
    response.raise_for_status()
    payload = response.json()
    cache_schedule_payload(payload)
    return games_from_schedule_payload(payload, predictions, "live_fresh"), []


def cached_mlb_games(
    start_date: date,
    end_date: date,
    predictions: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    games: list[dict[str, Any]] = []
    for day in date_range(start_date, end_date):
        path = RAW_MLB_DIR / f"schedule_{day.isoformat()}.json"
        if not path.exists():
            continue
        games.extend(games_from_schedule_payload(load_json(path), predictions, "live_cached"))
    return games


def unique_prediction_rows(index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for game in index.values():
        key = prediction_key(game)
        if key in seen:
            continue
        seen.add(key)
        rows.append(game)
    return rows


def fallback_mlb_from_predictions(
    predictions: dict[str, dict[str, Any]],
    start_date: date,
    end_date: date,
) -> list[dict[str, Any]]:
    games = []
    for game in unique_prediction_rows(predictions):
        raw_date = game.get("game_date")
        if raw_date:
            try:
                game_day = parse_iso_date(str(raw_date))
            except ValueError:
                game_day = None
            if game_day and not (start_date <= game_day <= end_date):
                continue
        model = model_payload(game)
        games.append(
            clean(
                {
                    "sport": "MLB",
                    "game_id": row_game_id(game),
                    "game_date": game.get("game_date"),
                    "status": game.get("status") or "Scheduled",
                    "status_detail": game.get("status") or "Scheduled",
                    "source": "LineLens prediction export",
                    "source_status": "prediction_export_fallback",
                    "data_mode": "prediction_joined" if model.get("prediction_available") else "schedule_only",
                    "away": normalize_team(game.get("away")),
                    "home": normalize_team(game.get("home")),
                    "away_display": game.get("away_display") or game.get("away"),
                    "home_display": game.get("home_display") or game.get("home"),
                    "away_score": game.get("away_score"),
                    "home_score": game.get("home_score"),
                    "game_time": game.get("game_time") or game.get("game_date"),
                    "probable_pitchers": {
                        "away": game.get("away_probable_pitcher"),
                        "home": game.get("home_probable_pitcher"),
                    },
                    "latest_play": None,
                    "plays": [],
                    "model": model,
                    "live_note": "Showing exported LineLens MLB row because live schedule refresh was unavailable.",
                }
            )
        )
    return sorted(games, key=lambda row: (row.get("game_date") or "", row.get("game_time") or ""))[:80]


def fallback_recent_backtest(limit: int = 20) -> list[dict[str, Any]]:
    payload = load_json(MLB_BACKTEST)
    rows = payload.get("games", [])
    if not rows:
        return []
    completed = [row for row in rows if row.get("game_date") and row.get("model_pick")]
    completed = sorted(completed, key=lambda row: str(row.get("game_date")), reverse=True)[:limit]
    games = []
    for game in completed:
        model = model_payload(game)
        games.append(
            clean(
                {
                    "sport": "MLB",
                    "game_id": row_game_id(game),
                    "game_date": game.get("game_date"),
                    "status": game.get("status") or "Final",
                    "status_detail": f"{game.get('status') or 'Final'} - historical backtest",
                    "source": "LineLens MLB backtest export",
                    "source_status": "historical_backtest_fallback",
                    "data_mode": "backtest",
                    "away": normalize_team(game.get("away")),
                    "home": normalize_team(game.get("home")),
                    "away_display": game.get("away_display") or game.get("away"),
                    "home_display": game.get("home_display") or game.get("home"),
                    "away_score": game.get("away_score"),
                    "home_score": game.get("home_score"),
                    "game_time": game.get("game_date"),
                    "probable_pitchers": {
                        "away": game.get("away_probable_pitcher"),
                        "home": game.get("home_probable_pitcher"),
                    },
                    "latest_play": None,
                    "plays": [],
                    "model": model,
                    "model_result": game.get("model_result"),
                    "live_note": "Historical MLB backtest row; not counted as live model record.",
                }
            )
        )
    return games


def fallback_nfl_from_predictions(predictions: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows = unique_prediction_rows(predictions)
    if not rows:
        return []
    rows = sorted(rows, key=lambda game: (game.get("season") or 0, game.get("week") or 0), reverse=True)[:24]
    games = []
    for game in rows:
        probability = safe_float(game.get("home_cover_probability") or game.get("cover_probability"))
        edge = safe_float(game.get("edge"))
        pick = game.get("model_pick")
        games.append(
            clean(
                {
                    "sport": "NFL",
                    "game_id": row_game_id(game),
                    "game_date": game.get("game_date"),
                    "season": game.get("season"),
                    "week": game.get("week"),
                    "status": game.get("status") or game.get("result") or "Exported Prediction",
                    "status_detail": "NFL live feed unavailable. Showing exported prediction data.",
                    "source": "LineLens NFL prediction export",
                    "source_status": "nfl_live_unavailable",
                    "data_mode": "historical_prediction" if pick else "no_prediction",
                    "away": normalize_team(game.get("away")),
                    "home": normalize_team(game.get("home")),
                    "away_score": game.get("away_score"),
                    "home_score": game.get("home_score"),
                    "model": {
                        "prediction_available": bool(pick),
                        "pick": pick,
                        "home_win_probability": probability,
                        "edge": edge,
                        "confidence": game.get("confidence"),
                        "confidence_label": model_tier(probability, edge),
                        "source": "LineLens NFL prediction export",
                        "prediction_status": "prediction_joined" if pick else "no_prediction",
                        "label": None if pick else "No model pick",
                    },
                    "model_result": game.get("model_result"),
                    "plays": [],
                    "live_note": "NFL live feed unavailable; showing exported prediction data.",
                }
            )
        )
    return games


def dedupe_games(games: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for game in games:
        key = (
            f"{game.get('sport')}:{game.get('game_id')}"
            if game.get("game_id")
            else f"{game.get('sport')}:{game.get('game_date')}:{game.get('away')}:{game.get('home')}"
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(game)
    return deduped


def build_payload(center_date: str, days_back: int, days_forward: int) -> dict[str, Any]:
    selected = parse_iso_date(center_date)
    start_date = selected - timedelta(days=days_back)
    end_date = selected + timedelta(days=days_forward)
    mlb_predictions, nfl_predictions = prediction_indexes()
    warnings: list[str] = []
    source_status = "live_fresh"
    mlb_games: list[dict[str, Any]] = []
    try:
        mlb_games, feed_warnings = fetch_mlb_games(start_date, end_date, mlb_predictions)
        warnings.extend(feed_warnings)
    except Exception as error:  # noqa: BLE001 - clean fallback is required.
        source_status = "source_failed"
        warnings.append(f"MLB Stats API refresh failed: {error}")
        mlb_games = cached_mlb_games(start_date, end_date, mlb_predictions)
        if mlb_games:
            source_status = "live_cached"
            warnings.append("Using cached MLB schedule files from data/raw/mlb.")
    prediction_fallback = fallback_mlb_from_predictions(mlb_predictions, start_date, end_date)
    if not mlb_games:
        mlb_games = prediction_fallback
        if mlb_games and source_status == "source_failed":
            warnings.append("Using current LineLens MLB prediction export as schedule fallback.")
    else:
        mlb_games = dedupe_games(mlb_games + prediction_fallback)
    if not mlb_games:
        backtest = fallback_recent_backtest()
        if backtest:
            mlb_games = backtest
            warnings.append("Using recent MLB backtest finals as last-resort display fallback.")
    nfl_games = fallback_nfl_from_predictions(nfl_predictions)
    games = dedupe_games(mlb_games + nfl_games)
    if not games and source_status == "live_fresh":
        source_status = "missing"
    return {
        "metadata": {
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": utc_now(),
            "real_data": True,
            "source": "MLB Stats API + LineLens prediction exports",
            "sports": sorted({game.get("sport") for game in games if game.get("sport")}),
            "refresh_mode": "live",
            "source_status": source_status,
            "data_window": {
                "center_date": selected.isoformat(),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_back": days_back,
                "days_forward": days_forward,
            },
            "row_count": len(games),
            "warnings": warnings,
        },
        "games": games,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh LineLens live widget scores.")
    parser.add_argument("--date", default=today_iso(), help="Center schedule date in YYYY-MM-DD format.")
    parser.add_argument("--days-back", type=int, default=3, help="Days before the center date to include.")
    parser.add_argument("--days-forward", type=int, default=3, help="Days after the center date to include.")
    args = parser.parse_args()
    payload = build_payload(args.date, max(args.days_back, 0), max(args.days_forward, 0))
    write_json_and_js(payload)
    print(json.dumps(payload["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
