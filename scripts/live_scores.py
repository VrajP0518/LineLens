"""Export compact live score data for the LineLens desktop widget.

This script uses real public/free data only. ESPN's public scoreboard endpoints
provide fast score/status rows for MLB/NFL. MLB Stats API remains the baseball
fallback and richer pitch-by-pitch source. Predictions are joined from existing
LineLens exports, so model data can stay daily/stable while scores refresh often.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:  # pragma: no cover - validation environments may vary.
    requests = None  # type: ignore[assignment]


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.mlb_teams import mlb_team_abbreviation
from src.shared.version import APP_VERSION

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
ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard"
ESPN_SUMMARY_URL = "https://site.web.api.espn.com/apis/site/v2/sports/{sport}/{league}/summary"

ESPN_SPORTS = {
    "MLB": {"sport": "baseball", "league": "mlb"},
    "NFL": {"sport": "football", "league": "nfl"},
}
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
    return mlb_team_abbreviation(team)


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


def nfl_model_payload(prediction: dict[str, Any] | None) -> dict[str, Any]:
    if not prediction or not prediction.get("model_pick"):
        return no_model_payload("No exported NFL model prediction matched this live row")
    probability = safe_float(prediction.get("home_cover_probability") or prediction.get("cover_probability"))
    edge = safe_float(prediction.get("edge"))
    pick = prediction.get("model_pick")
    return clean(
        {
            "prediction_available": bool(pick),
            "pick": pick,
            "home_win_probability": probability,
            "edge": edge,
            "confidence": prediction.get("confidence"),
            "confidence_label": model_tier(probability, edge),
            "source": "LineLens NFL prediction export",
            "prediction_status": "prediction_joined" if pick else "no_prediction",
            "label": None if pick else "No model pick",
        }
    )


def find_nfl_prediction(
    game_id: str,
    game_date: str | None,
    away: str,
    home: str,
    index: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    return index.get(f"id:{game_id}") or index.get(
        f"fallback:{game_date}:{normalize_team(away)}:{normalize_team(home)}"
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


def espn_request(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    if requests is None:
        raise RuntimeError("requests package missing")
    response = requests.get(
        url,
        params=params or {},
        timeout=12,
        headers={
            "User-Agent": "LineLensSports/1.0 (+https://github.com/VrajP0518/LineLens)",
            "Accept": "application/json",
        },
    )
    response.raise_for_status()
    return response.json()


def espn_scoreboard(sport: str, target_date: date | None = None) -> dict[str, Any]:
    config = ESPN_SPORTS[sport]
    url = ESPN_SCOREBOARD_URL.format(**config)
    params: dict[str, Any] = {"limit": 1000}
    if target_date:
        params["dates"] = target_date.strftime("%Y%m%d")
    return espn_request(url, params)


def espn_summary(sport: str, event_id: str) -> dict[str, Any]:
    config = ESPN_SPORTS[sport]
    return espn_request(ESPN_SUMMARY_URL.format(**config), {"event": event_id, "region": "us", "lang": "en"})


def espn_team_code(team: dict[str, Any], sport: str) -> str:
    abbreviation = normalize_team(team.get("abbreviation"))
    if sport == "MLB":
        return mlb_team_abbreviation({"abbreviation": abbreviation, "name": team.get("displayName") or team.get("name")})
    return abbreviation


def espn_competitor_map(competition: dict[str, Any], sport: str) -> dict[str, dict[str, Any]]:
    mapped: dict[str, dict[str, Any]] = {}
    for competitor in competition.get("competitors", []):
        side = competitor.get("homeAway")
        if side in {"home", "away"}:
            mapped[side] = competitor
    return mapped


def espn_competitor_score(competitor: dict[str, Any] | None) -> int | None:
    if not competitor:
        return None
    value = competitor.get("score")
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def espn_probable_pitcher(competitor: dict[str, Any] | None) -> str | None:
    if not competitor:
        return None
    for probable in competitor.get("probables") or []:
        athlete = probable.get("athlete") or {}
        name = athlete.get("displayName") or athlete.get("fullName")
        if name:
            return name
    return None


def espn_situation(competition: dict[str, Any], sport: str) -> dict[str, Any]:
    situation = competition.get("situation") or {}
    if sport == "MLB":
        return clean(
            {
                "balls": situation.get("balls"),
                "strikes": situation.get("strikes"),
                "outs": situation.get("outs"),
                "bases": {
                    "first": bool(situation.get("onFirst") or situation.get("runnerOnFirst")),
                    "second": bool(situation.get("onSecond") or situation.get("runnerOnSecond")),
                    "third": bool(situation.get("onThird") or situation.get("runnerOnThird")),
                },
            }
        )
    return clean(
        {
            "down_distance": situation.get("downDistanceText") or situation.get("shortDownDistanceText"),
            "possession": ((situation.get("possession") or {}).get("displayName") if isinstance(situation.get("possession"), dict) else situation.get("possession")),
            "yard_line": situation.get("yardLine"),
            "last_play": (situation.get("lastPlay") or {}).get("text") if isinstance(situation.get("lastPlay"), dict) else None,
        }
    )


def espn_play_row(play: dict[str, Any], sport: str) -> dict[str, Any]:
    period = play.get("period") or {}
    if sport == "MLB":
        period_number = period.get("number")
        return clean(
            {
                "inning": period_number,
                "half": play.get("type", {}).get("abbreviation") or period.get("displayValue"),
                "description": play.get("text") or play.get("headline"),
                "event": (play.get("type") or {}).get("text"),
                "count": play.get("count"),
                "outs": play.get("outs"),
                "timestamp": play.get("wallclock") or play.get("modified"),
                "source": "ESPN summary",
            }
        )
    return clean(
        {
            "quarter": period.get("number"),
            "clock": play.get("clock", {}).get("displayValue") if isinstance(play.get("clock"), dict) else play.get("clock"),
            "description": play.get("text") or play.get("headline"),
            "event": (play.get("type") or {}).get("text"),
            "timestamp": play.get("wallclock") or play.get("modified"),
            "source": "ESPN summary",
        }
    )


def espn_summary_bits(sport: str, event_id: str) -> dict[str, Any]:
    try:
        payload = espn_summary(sport, event_id)
    except Exception as error:  # noqa: BLE001 - live summaries are best effort.
        return {"plays": [], "espn_summary_error": str(error)}
    plays = payload.get("plays") or []
    normalized = [espn_play_row(play, sport) for play in plays[-20:]][::-1]
    latest = next((play.get("description") for play in normalized if play.get("description")), None)
    return clean(
        {
            "latest_play": latest,
            "plays": normalized,
            "espn_summary_available": bool(normalized),
        }
    )


def game_from_espn_event(
    event: dict[str, Any],
    sport: str,
    mlb_predictions: dict[str, dict[str, Any]],
    nfl_predictions: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    competition = (event.get("competitions") or [{}])[0]
    competitors = espn_competitor_map(competition, sport)
    home_competitor = competitors.get("home")
    away_competitor = competitors.get("away")
    if not home_competitor or not away_competitor:
        return None
    home_team = home_competitor.get("team") or {}
    away_team = away_competitor.get("team") or {}
    home = espn_team_code(home_team, sport)
    away = espn_team_code(away_team, sport)
    event_id = str(event.get("id") or competition.get("id") or "")
    game_date = str(event.get("date") or competition.get("date") or "")[:10] or None
    status_type = (competition.get("status") or {}).get("type") or {}
    status_detail = (
        status_type.get("shortDetail")
        or status_type.get("detail")
        or status_type.get("description")
        or event.get("status", {}).get("type", {}).get("description")
        or "Scheduled"
    )
    status = status_bucket(str(status_detail))
    if status_type.get("completed") is True:
        status = "Final"

    if sport == "MLB":
        prediction = find_mlb_prediction(event_id, game_date, away, home, mlb_predictions)
        model = model_payload(prediction)
    else:
        prediction = find_nfl_prediction(event_id, game_date, away, home, nfl_predictions)
        model = nfl_model_payload(prediction)

    situation = espn_situation(competition, sport)
    row: dict[str, Any] = {
        "sport": sport,
        "game_id": event_id,
        "espn_event_id": event_id,
        "game_date": game_date,
        "status": status,
        "status_detail": status_detail,
        "source": "ESPN Scoreboard API",
        "source_status": "espn_live_fresh",
        "data_mode": "prediction_joined" if model.get("prediction_available") else "schedule_only",
        "away": away,
        "home": home,
        "away_display": away_team.get("displayName") or away_team.get("name") or away,
        "home_display": home_team.get("displayName") or home_team.get("name") or home,
        "away_score": espn_competitor_score(away_competitor),
        "home_score": espn_competitor_score(home_competitor),
        "game_time": event.get("date") or competition.get("date"),
        "model": model,
        "plays": [],
        "latest_play": situation.get("last_play"),
        "espn_links": [link.get("href") for link in event.get("links", []) if link.get("href")],
    }

    if sport == "MLB":
        row.update(
            {
                "inning": (competition.get("status") or {}).get("period"),
                "inning_state": status_detail.split(" ", 1)[0] if status == "In Progress" else None,
                "balls": situation.get("balls"),
                "strikes": situation.get("strikes"),
                "outs": situation.get("outs"),
                "bases": situation.get("bases"),
                "probable_pitchers": {
                    "away": espn_probable_pitcher(away_competitor),
                    "home": espn_probable_pitcher(home_competitor),
                },
            }
        )
    else:
        row.update(
            {
                "period": (competition.get("status") or {}).get("period"),
                "clock": ((competition.get("status") or {}).get("displayClock")),
                "down_distance": situation.get("down_distance"),
                "possession": situation.get("possession"),
                "yard_line": situation.get("yard_line"),
                "live_note": None if status == "In Progress" else "ESPN scoreboard row; detailed NFL play feed is best-effort.",
            }
        )

    if status == "In Progress":
        row.update(espn_summary_bits(sport, event_id))
    return clean(row)


def fetch_espn_games(
    start_date: date,
    end_date: date,
    mlb_predictions: dict[str, dict[str, Any]],
    nfl_predictions: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    warnings: list[str] = []
    games: list[dict[str, Any]] = []

    if requests is None:
        return [], ["requests package is missing; ESPN live feed unavailable"]

    for day in date_range(start_date, end_date):
        try:
            payload = espn_scoreboard("MLB", day)
            for event in payload.get("events", []):
                row = game_from_espn_event(event, "MLB", mlb_predictions, nfl_predictions)
                if row:
                    games.append(row)
        except Exception as error:  # noqa: BLE001 - keep MLB Stats API fallback alive.
            warnings.append(f"ESPN MLB scoreboard failed for {day.isoformat()}: {error}")

    try:
        payload = espn_scoreboard("NFL")
        for event in payload.get("events", []):
            row = game_from_espn_event(event, "NFL", mlb_predictions, nfl_predictions)
            if row:
                games.append(row)
    except Exception as error:  # noqa: BLE001 - NFL can fall back to exports.
        warnings.append(f"ESPN NFL scoreboard failed: {error}")

    return games, warnings


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
        start_time = str(game.get("game_time") or "")[:16]
        keys = [
            f"id:{game.get('sport')}:{game.get('game_id')}" if game.get("game_id") else "",
            f"match:{game.get('sport')}:{game.get('game_date')}:{game.get('away')}:{game.get('home')}:{start_time}",
        ]
        if any(key and key in seen for key in keys):
            continue
        for key in keys:
            if key:
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
    espn_games: list[dict[str, Any]] = []
    mlb_games: list[dict[str, Any]] = []
    try:
        espn_games, espn_warnings = fetch_espn_games(start_date, end_date, mlb_predictions, nfl_predictions)
        warnings.extend(espn_warnings)
        if espn_games:
            source_status = "espn_live_fresh"
    except Exception as error:  # noqa: BLE001 - ESPN is a fast overlay, not the only source.
        warnings.append(f"ESPN live scoreboard refresh failed: {error}")
    try:
        mlb_games, feed_warnings = fetch_mlb_games(start_date, end_date, mlb_predictions)
        warnings.extend(feed_warnings)
    except Exception as error:  # noqa: BLE001 - clean fallback is required.
        if not espn_games:
            source_status = "source_failed"
        warnings.append(f"MLB Stats API refresh failed: {error}")
        mlb_games = cached_mlb_games(start_date, end_date, mlb_predictions)
        if mlb_games:
            source_status = "espn_live_fresh" if espn_games else "live_cached"
            warnings.append("Using cached MLB schedule files from data/raw/mlb.")
    prediction_fallback = fallback_mlb_from_predictions(mlb_predictions, start_date, end_date)
    espn_mlb_games = [game for game in espn_games if game.get("sport") == "MLB"]
    mlb_source_games = dedupe_games(espn_mlb_games + mlb_games)
    if not mlb_source_games:
        mlb_games = prediction_fallback
        if mlb_games and source_status == "source_failed":
            warnings.append("Using current LineLens MLB prediction export as schedule fallback.")
    else:
        mlb_games = dedupe_games(mlb_source_games + prediction_fallback)
    if not mlb_games:
        backtest = fallback_recent_backtest()
        if backtest:
            mlb_games = backtest
            warnings.append("Using recent MLB backtest finals as last-resort display fallback.")
    espn_nfl_games = [game for game in espn_games if game.get("sport") == "NFL"]
    nfl_games = dedupe_games(espn_nfl_games + fallback_nfl_from_predictions(nfl_predictions))
    games = dedupe_games(mlb_games + nfl_games)
    if not games and source_status == "live_fresh":
        source_status = "missing"
    return {
        "metadata": {
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": utc_now(),
            "real_data": True,
            "source": "ESPN Scoreboard API + MLB Stats API + LineLens prediction exports",
            "sports": sorted({game.get("sport") for game in games if game.get("sport")}),
            "refresh_mode": "live",
            "source_status": source_status,
            "live_poll_seconds_recommended": 15,
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
