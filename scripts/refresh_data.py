"""Refresh cached LineLens Sports prediction data.

This script is intentionally conservative: it updates exported JSON/JS files
when free/local sources are available, and writes a friendly status payload
when Python dependencies, internet, or model files are missing.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
RAW_MLB_DIR = DATA_DIR / "raw" / "mlb"
PREDICTIONS_DIR = DATA_DIR / "predictions"
STATUS_JSON = DATA_DIR / "refresh_status.json"
STATUS_JS = DATA_DIR / "refresh_status.js"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def write_json_and_js(payload: dict[str, Any], json_path: Path, js_path: Path, variable: str) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    js_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2)
    json_path.write_text(text, encoding="utf-8")
    js_path.write_text(f"window.{variable} = {json.dumps(payload, separators=(',', ':'))};\n", encoding="utf-8")


def load_status() -> dict[str, Any]:
    if STATUS_JSON.exists():
        try:
            return json.loads(STATUS_JSON.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"generated_at": None, "mode": "runtime", "sports": {}}


def write_status(status: dict[str, Any]) -> None:
    status["generated_at"] = utc_now()
    STATUS_JSON.parent.mkdir(parents=True, exist_ok=True)
    STATUS_JSON.write_text(json.dumps(status, indent=2), encoding="utf-8")
    STATUS_JS.write_text(
        "window.__REFRESH_STATUS__ = " + json.dumps(status, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


def update_sport_status(
    status: dict[str, Any],
    sport: str,
    state: str,
    message: str,
    *,
    used_cache: bool,
    python: str | None = None,
) -> None:
    sports = status.setdefault("sports", {})
    previous = sports.get(sport, {})
    last_success = utc_now() if state in {"success", "offseason"} else previous.get("last_success_at")
    sports[sport] = {
        "status": state,
        "message": message,
        "last_success_at": last_success,
        "used_cache": used_cache,
        "python": python or sys.executable,
    }


def fetch_mlb_schedule(target_date: str | None, date_range: list[str] | None) -> tuple[dict[str, Any], Path]:
    params = {"sportId": 1, "hydrate": "probablePitcher,team,linescore"}
    if date_range:
        params["startDate"] = date_range[0]
        params["endDate"] = date_range[1]
        cache_name = f"schedule_{date_range[0]}_{date_range[1]}.json"
    else:
        day = date.today().isoformat() if target_date in {None, "today"} else target_date
        params["date"] = day
        cache_name = f"schedule_{day}.json"

    url = "https://statsapi.mlb.com/api/v1/schedule?" + urlencode(params)
    with urlopen(url, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))

    RAW_MLB_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = RAW_MLB_DIR / cache_name
    raw_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload, raw_path


def team_abbrev(side: dict[str, Any]) -> str:
    team = side.get("team", {})
    return team.get("abbreviation") or team.get("teamCode") or team.get("fileCode") or team.get("name", "UNK")


def team_name(side: dict[str, Any]) -> str:
    team = side.get("team", {})
    return team.get("name") or team_abbrev(side)


def pitcher_name(side: dict[str, Any]) -> str | None:
    pitcher = side.get("probablePitcher") or {}
    return pitcher.get("fullName")


def score(side: dict[str, Any]) -> int | None:
    value = side.get("score")
    return int(value) if isinstance(value, int) else None


def status_label(game: dict[str, Any]) -> str:
    status = game.get("status", {})
    return status.get("detailedState") or status.get("abstractGameState") or "Pending"


def mlb_schedule_payload(schedule: dict[str, Any], raw_path: Path) -> dict[str, Any]:
    games: list[dict[str, Any]] = []
    for day in schedule.get("dates", []):
        for game in day.get("games", []):
            teams = game.get("teams", {})
            home = teams.get("home", {})
            away = teams.get("away", {})
            home_score = score(home)
            away_score = score(away)
            home_code = team_abbrev(home)
            away_code = team_abbrev(away)
            game_status = status_label(game)
            result = "Pending"
            if home_score is not None and away_score is not None and "Final" in game_status:
                result = "Home won" if home_score > away_score else "Away won"

            games.append(
                {
                    "sport": "MLB",
                    "season": int(str(game.get("season") or date.today().year)),
                    "game_date": str(game.get("gameDate") or day.get("date") or "")[:10],
                    "game_id": str(game.get("gamePk")),
                    "home": home_code,
                    "away": away_code,
                    "home_display": team_name(home),
                    "away_display": team_name(away),
                    "venue": (game.get("venue") or {}).get("name"),
                    "home_score": home_score,
                    "away_score": away_score,
                    "status": game_status,
                    "home_win_probability": None,
                    "away_win_probability": None,
                    "model_pick": None,
                    "confidence": "Schedule only",
                    "prediction_mode": "schedule_only",
                    "edge": None,
                    "home_probable_pitcher": pitcher_name(home) or "TBD",
                    "away_probable_pitcher": pitcher_name(away) or "TBD",
                    "home_pitcher_summary": "Schedule loaded. Model features pending.",
                    "away_pitcher_summary": "Schedule loaded. Model features pending.",
                    "pitcher_edge": "Model pending",
                    "pitcher_data_status": "available" if pitcher_name(home) or pitcher_name(away) else "missing",
                    "moneyline_home": None,
                    "moneyline_away": None,
                    "market_implied_home": None,
                    "moneyline_home_open": None,
                    "moneyline_home_current": None,
                    "moneyline_home_close": None,
                    "moneyline_away_open": None,
                    "moneyline_away_current": None,
                    "moneyline_away_close": None,
                    "movement_label": "Line movement unavailable. Add odds provider later.",
                    "clv": None,
                    "clv_label": "CLV unavailable",
                    "result": result,
                    "trend": {
                        "labels": ["Win %", "Run diff", "Runs scored", "Runs allowed"],
                        "home": [None, None, None, None],
                        "away": [None, None, None, None],
                    },
                }
            )

    return {
        "metadata": {
            "sport": "MLB",
            "app": "LineLens Sports",
            "version": "v0.2.0",
            "generated_at": utc_now(),
            "model_type": "schedule_only",
            "target": "home_win",
            "row_count": len(games),
            "demo": False,
            "mode": "real",
            "prediction_mode": "schedule_only",
            "schedule_source": "MLB Stats API",
            "raw_schedule_file": str(raw_path.relative_to(ROOT)),
            "odds_status": "Optional odds API hooks only; no odds provider required.",
        },
        "games": games,
    }


def refresh_mlb(status: dict[str, Any], target_date: str | None, date_range: list[str] | None) -> None:
    try:
        schedule, raw_path = fetch_mlb_schedule(target_date, date_range)
        payload = mlb_schedule_payload(schedule, raw_path)
        write_json_and_js(
            payload,
            PREDICTIONS_DIR / "mlb_predictions.json",
            PREDICTIONS_DIR / "mlb_predictions.js",
            "__MLB_PREDICTIONS__",
        )
        count = len(payload["games"])
        update_sport_status(
            status,
            "MLB",
            "success",
            f"MLB schedule refreshed from MLB Stats API with {count} games. Model probabilities are schedule_only until a model export is available.",
            used_cache=False,
        )
    except Exception as exc:  # noqa: BLE001 - surface a friendly runtime status
        update_sport_status(
            status,
            "MLB",
            "failed",
            f"{type(exc).__name__}: {exc}. Showing cached/demo MLB predictions.",
            used_cache=True,
        )


def first_existing(paths: list[Path]) -> Path | None:
    return next((path for path in paths if path.exists()), None)


def refresh_nfl(status: dict[str, Any]) -> None:
    features = first_existing(
        [
            ROOT / "data" / "processed" / "nfl" / "spread_dataset.parquet",
            ROOT / "data" / "processed" / "spread_dataset.parquet",
        ]
    )
    model = first_existing(
        [
            ROOT / "models" / "nfl_spread_model.joblib",
            ROOT / "models" / "spread_model.joblib",
            ROOT / "spread_model.joblib",
        ]
    )

    if not features or not model:
        update_sport_status(
            status,
            "NFL",
            "offseason",
            "NFL data refresh checked local cache. No processed feature export was found; preserving cached/offseason payload.",
            used_cache=True,
        )
        return

    command = [
        sys.executable,
        "-m",
        "src.nfl.export_predictions_nfl",
        "--features-file",
        str(features.relative_to(ROOT)),
        "--model-file",
        str(model.relative_to(ROOT)),
        "--output-file",
        "data/predictions/nfl_predictions.json",
        "--js-out",
        "data/predictions/nfl_predictions.js",
    ]
    try:
        result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=120, check=False)
        if result.returncode != 0:
            message = (result.stderr or result.stdout or "NFL export command failed.").strip()
            update_sport_status(status, "NFL", "failed", f"{message} Showing cached NFL predictions.", used_cache=True)
            return
        update_sport_status(
            status,
            "NFL",
            "success",
            "NFL predictions refreshed from the cached nfl-data-py/export pipeline.",
            used_cache=False,
        )
    except Exception as exc:  # noqa: BLE001
        update_sport_status(
            status,
            "NFL",
            "failed",
            f"{type(exc).__name__}: {exc}. Showing cached NFL predictions.",
            used_cache=True,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sport", choices=["all", "nfl", "mlb"], default="all")
    parser.add_argument("--date", default="today", help="MLB schedule date, or 'today'.")
    parser.add_argument("--date-range", nargs=2, metavar=("START", "END"), help="MLB schedule date range.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    status = load_status()
    status["mode"] = "runtime"

    if args.sport in {"all", "mlb"}:
        refresh_mlb(status, args.date, args.date_range)
    if args.sport in {"all", "nfl"}:
        refresh_nfl(status)

    write_status(status)
    requested = "NFL and MLB" if args.sport == "all" else args.sport.upper()
    print(f"Refresh finished for {requested}. Status written to data/refresh_status.json")


if __name__ == "__main__":
    main()
