"""Export compact live score data for the LineLens desktop widget.

This script uses real public/free data only. MLB live schedule/feed data comes
from MLB Stats API. NFL live play data is not sourced in this iteration, so NFL
rows are limited to existing exported LineLens prediction rows when available.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
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
MLB_PREDICTIONS = PREDICTIONS_DIR / "mlb_predictions.json"
NFL_PREDICTIONS = PREDICTIONS_DIR / "nfl_predictions.json"
MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule"
MLB_LIVE_URL = "https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
APP_VERSION = "v0.7.0"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def today_iso() -> str:
    return datetime.now().date().isoformat()


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


def team_code(team: dict[str, Any]) -> str:
    return (
        team.get("abbreviation")
        or team.get("teamCode")
        or team.get("fileCode")
        or team.get("name")
        or "UNK"
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


def prediction_key(game: dict[str, Any]) -> str:
    game_id = game.get("game_id") or game.get("id")
    if game_id:
        return f"id:{game_id}"
    return f"fallback:{game.get('game_date')}:{game.get('away')}:{game.get('home')}"


def prediction_indexes() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    mlb_payload = load_json(MLB_PREDICTIONS)
    nfl_payload = load_json(NFL_PREDICTIONS)
    mlb: dict[str, dict[str, Any]] = {}
    nfl: dict[str, dict[str, Any]] = {}
    for game in mlb_payload.get("games", []):
        mlb[prediction_key(game)] = game
        mlb[f"fallback:{game.get('game_date')}:{game.get('away')}:{game.get('home')}"] = game
    for game in nfl_payload.get("games", []):
        nfl[prediction_key(game)] = game
        nfl[f"fallback:{game.get('season')}:{game.get('week')}:{game.get('away')}:{game.get('home')}"] = game
    return mlb, nfl


def find_mlb_prediction(
    game_id: str,
    game_date: str | None,
    away: str,
    home: str,
    index: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    return index.get(f"id:{game_id}") or index.get(f"fallback:{game_date}:{away}:{home}")


def model_payload(prediction: dict[str, Any] | None) -> dict[str, Any] | None:
    if not prediction:
        return None
    home_probability = safe_float(prediction.get("home_win_probability") or prediction.get("model_home_win"))
    away_probability = safe_float(prediction.get("away_win_probability"))
    if away_probability is None and home_probability is not None:
        away_probability = 1 - home_probability
    edge = safe_float(prediction.get("edge"))
    if edge is None and home_probability is not None:
        edge = abs(home_probability - 0.5)
    return clean(
        {
            "pick": prediction.get("model_pick"),
            "home_win_probability": home_probability,
            "away_win_probability": away_probability,
            "edge": edge,
            "confidence": prediction.get("confidence"),
            "confidence_score": safe_float(prediction.get("confidence_score")),
            "confidence_label": model_tier(home_probability, edge),
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
            "outs": linescore.get("outs") if linescore.get("outs") is not None else (current.get("count") or {}).get("outs"),
            "bases": {
                "first": bool(offense.get("first")),
                "second": bool(offense.get("second")),
                "third": bool(offense.get("third")),
            },
            "latest_play": (current.get("result") or {}).get("description"),
            "plays": [play_from_mlb(play) for play in all_plays[-20:]][::-1],
        }
    )


def mlb_game_from_schedule(game: dict[str, Any], predictions: dict[str, dict[str, Any]]) -> dict[str, Any]:
    teams = game.get("teams", {})
    home_entry = teams.get("home", {})
    away_entry = teams.get("away", {})
    home_team = home_entry.get("team", {})
    away_team = away_entry.get("team", {})
    home = team_code(home_team)
    away = team_code(away_team)
    game_id = str(game.get("gamePk"))
    game_date = str(game.get("gameDate", ""))[:10] or None
    status = (game.get("status") or {}).get("detailedState") or (game.get("status") or {}).get("abstractGameState") or "Scheduled"
    linescore = game.get("linescore") or {}
    prediction = find_mlb_prediction(game_id, game_date, away, home, predictions)
    row: dict[str, Any] = {
        "sport": "MLB",
        "game_id": game_id,
        "game_date": game_date,
        "status": status_bucket(status),
        "status_detail": status,
        "source_status": "live_fresh",
        "away": away,
        "home": home,
        "away_display": away_team.get("name") or away,
        "home_display": home_team.get("name") or home,
        "away_score": away_entry.get("score"),
        "home_score": home_entry.get("score"),
        "inning": linescore.get("currentInning"),
        "inning_state": linescore.get("inningState"),
        "outs": linescore.get("outs"),
        "game_time": game.get("gameDate"),
        "probable_pitchers": {
            "away": pitcher_name(away_entry),
            "home": pitcher_name(home_entry),
        },
        "model": model_payload(prediction),
        "plays": [],
    }
    if row["model"] is None:
        row["model"] = {"prediction_status": "no_prediction", "source": "No LineLens prediction matched this game"}
    if row["status"] == "In Progress":
        try:
            row.update(extract_live_bits(game_id))
        except Exception as error:  # noqa: BLE001 - expose clean degraded state.
            row["live_error"] = f"Pitch-by-pitch unavailable: {error}"
    return clean(row)


def fetch_mlb_games(date: str, predictions: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    if requests is None:
        return [], ["requests package is missing; MLB live feed unavailable"]
    response = requests.get(
        MLB_SCHEDULE_URL,
        params={"sportId": 1, "date": date, "hydrate": "probablePitcher,linescore"},
        timeout=25,
    )
    response.raise_for_status()
    payload = response.json()
    games: list[dict[str, Any]] = []
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            games.append(mlb_game_from_schedule(game, predictions))
    return games, []


def fallback_mlb_from_predictions(predictions: dict[str, dict[str, Any]], date: str) -> list[dict[str, Any]]:
    rows = list({id(game): game for game in predictions.values()}.values())
    if not rows:
        return []
    dates = sorted({str(game.get("game_date")) for game in rows if game.get("game_date")})
    selected_date = date if date in dates else next((item for item in dates if item > date), dates[-1] if dates else date)
    games = []
    for game in rows:
        if str(game.get("game_date")) != selected_date:
            continue
        model = model_payload(game)
        games.append(
            clean(
                {
                    "sport": "MLB",
                    "game_id": str(game.get("game_id") or game.get("id") or ""),
                    "game_date": game.get("game_date"),
                    "status": game.get("status") or "Scheduled",
                    "status_detail": game.get("status") or "Scheduled",
                    "source_status": "source_failed_prediction_fallback",
                    "away": game.get("away"),
                    "home": game.get("home"),
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
                    "model": model or {"prediction_status": "no_prediction"},
                    "live_note": "MLB live feed unavailable; showing exported LineLens prediction data.",
                }
            )
        )
    return games[:20]


def fallback_nfl_from_predictions(predictions: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows = list({id(game): game for game in predictions.values()}.values())
    if not rows:
        return []
    rows = sorted(rows, key=lambda game: (game.get("season") or 0, game.get("week") or 0), reverse=True)[:12]
    games = []
    for game in rows:
        probability = safe_float(game.get("home_cover_probability") or game.get("cover_probability"))
        edge = safe_float(game.get("edge"))
        games.append(
            clean(
                {
                    "sport": "NFL",
                    "game_id": str(game.get("game_id") or game.get("id") or ""),
                    "game_date": game.get("game_date"),
                    "season": game.get("season"),
                    "week": game.get("week"),
                    "status": game.get("status") or game.get("result") or "Exported Prediction",
                    "status_detail": "NFL live feed unavailable. Showing exported prediction data.",
                    "source_status": "nfl_live_unavailable",
                    "away": game.get("away"),
                    "home": game.get("home"),
                    "away_score": game.get("away_score"),
                    "home_score": game.get("home_score"),
                    "model": {
                        "pick": game.get("model_pick"),
                        "home_win_probability": probability,
                        "edge": edge,
                        "confidence": game.get("confidence"),
                        "confidence_label": model_tier(probability, edge),
                        "source": "LineLens NFL prediction export",
                        "prediction_status": "prediction_joined" if game.get("model_pick") else "no_prediction",
                    },
                    "plays": [],
                    "live_note": "NFL live feed unavailable; showing exported prediction data.",
                }
            )
        )
    return games


def build_payload(date: str) -> dict[str, Any]:
    mlb_predictions, nfl_predictions = prediction_indexes()
    warnings: list[str] = []
    source_status = "live_fresh"
    try:
        mlb_games, feed_warnings = fetch_mlb_games(date, mlb_predictions)
        warnings.extend(feed_warnings)
    except Exception as error:  # noqa: BLE001 - clean fallback is required.
        source_status = "source_failed"
        warnings.append(f"MLB Stats API refresh failed: {error}")
        mlb_games = fallback_mlb_from_predictions(mlb_predictions, date)
    nfl_games = fallback_nfl_from_predictions(nfl_predictions)
    games = mlb_games + nfl_games
    if not games and source_status == "live_fresh":
        source_status = "schedule_only"
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
            "row_count": len(games),
            "warnings": warnings,
        },
        "games": games,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh LineLens live widget scores.")
    parser.add_argument("--date", default=today_iso(), help="Schedule date in YYYY-MM-DD format.")
    args = parser.parse_args()
    payload = build_payload(args.date)
    write_json_and_js(payload)
    print(json.dumps(payload["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
