"""Refresh cached LineLens Sports prediction data.

This script is intentionally conservative: it updates exported JSON/JS files
when free/local sources are available, and writes a friendly status payload
when Python dependencies, internet, or model files are missing.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.odds_provider import fetch_odds, odds_config_status
from src.shared.mlb_teams import mlb_team_abbreviation, mlb_team_display_name
from src.shared.version import APP_VERSION

DATA_DIR = ROOT / "data"
RAW_MLB_DIR = DATA_DIR / "raw" / "mlb"
RAW_WNBA_DIR = DATA_DIR / "raw" / "wnba"
PREDICTIONS_DIR = DATA_DIR / "predictions"
STATUS_JSON = DATA_DIR / "refresh_status.json"
STATUS_JS = DATA_DIR / "refresh_status.js"
MLB_FEATURES = DATA_DIR / "processed" / "mlb" / "mlb_features_2021_2025.csv"
MLB_CURRENT_FEATURES = DATA_DIR / "processed" / "mlb" / "mlb_current_features.csv"
MLB_MODEL = ROOT / "models" / "mlb_moneyline_model.joblib"
WNBA_FEATURES = DATA_DIR / "processed" / "wnba" / "wnba_features_all.csv"
WNBA_CURRENT_FEATURES = DATA_DIR / "processed" / "wnba" / "wnba_current_features.csv"
WNBA_MODEL = ROOT / "models" / "wnba_moneyline_model.joblib"
LIVE_SCORES_JSON = DATA_DIR / "live" / "live_scores.json"
NFL_FEATURES = ROOT / "data" / "processed" / "nfl" / "spread_dataset.parquet"
NFL_IMPORT_FEATURES = ROOT / "data" / "imports" / "nfl" / "spread_dataset.parquet"
NFL_IMPORT_FEATURES_CSV = ROOT / "data" / "imports" / "nfl" / "spread_dataset.csv"
VENV_PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"


def mlb_history_bounds() -> tuple[int, int]:
    """Use every completed cached season while keeping the current season out of training."""

    latest_completed = date.today().year - 1
    cached = []
    for path in RAW_MLB_DIR.glob("history_*.json"):
        try:
            season = int(path.stem.split("_")[-1])
        except ValueError:
            continue
        if season <= latest_completed:
            cached.append(season)
    start = min(cached) if cached else 2021
    end = max(latest_completed, max(cached, default=start))
    return start, end


def wnba_history_bounds() -> tuple[int, int]:
    latest_completed = date.today().year - 1
    cached = []
    for path in RAW_WNBA_DIR.glob("schedule_*.json"):
        label = path.stem.split("_")[-1]
        try:
            season = int(label[:4])
        except ValueError:
            continue
        if season <= latest_completed:
            cached.append(season)
    start = min(cached) if cached else max(2021, latest_completed - 4)
    end = max(latest_completed, max(cached, default=start))
    return start, end
def pipeline_python() -> str:
    return str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable


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
    status["version"] = APP_VERSION
    status["odds"] = odds_config_status()
    STATUS_JSON.parent.mkdir(parents=True, exist_ok=True)
    STATUS_JSON.write_text(json.dumps(status, indent=2), encoding="utf-8")
    STATUS_JS.write_text(
        "window.__REFRESH_STATUS__ = " + json.dumps(status, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


def run_module(args: list[str], timeout: int = 300) -> subprocess.CompletedProcess[str]:
    command = [pipeline_python(), "-m", *args]
    env = os.environ.copy()
    env.setdefault("OMP_NUM_THREADS", "1")
    env.setdefault("OPENBLAS_NUM_THREADS", "1")
    env.setdefault("MKL_NUM_THREADS", "1")
    env.setdefault("LOKY_MAX_CPU_COUNT", "1")
    return subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout, check=False, env=env)


def run_python_script(args: list[str], timeout: int = 300) -> subprocess.CompletedProcess[str]:
    command = [pipeline_python(), *args]
    return subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout, check=False)


def run_model_scoring(status: dict[str, Any]) -> None:
    result = run_python_script(["scripts/score_model_predictions.py"], timeout=180)
    status["model_record"] = {
        "status": "real_fresh" if result.returncode == 0 else "failed",
        "message": (result.stdout or result.stderr or "Model scoring finished.").strip(),
        "last_run_at": utc_now(),
    }


def model_needs_refresh(model_path: Path, feature_path: Path, source_dir: Path, source_prefix: str, history_end: int) -> bool:
    """Return whether a trained artifact is missing or older than its local inputs."""
    if not model_path.exists() or not feature_path.exists():
        return True
    model_mtime = model_path.stat().st_mtime
    if feature_path.stat().st_mtime > model_mtime:
        return True
    for source in source_dir.glob(f"{source_prefix}*.json"):
        label = source.stem.removeprefix(source_prefix)
        try:
            season = int(label[:4])
        except ValueError:
            continue
        if season <= history_end and source.stat().st_mtime > model_mtime:
            return True
    return False


def missing_dependency_message(stderr: str, stdout: str = "") -> str:
    combined = f"{stderr}\n{stdout}"
    if sys.version_info >= (3, 14):
        return "nfl-data-py requires Python 3.11/older numpy stack. Current Python was 3.14. Use py -3.11."
    if "ModuleNotFoundError: No module named 'typer'" in combined:
        return "Missing dependency typer. Activate venv and run pip install -r requirements.txt."
    if "WinError 10061" in combined or "ConnectionRefusedError" in combined:
        return "Network/source unavailable: connection refused while downloading required data. Retry when nfl-data-py/nflverse source access is available."
    if "ModuleNotFoundError" in combined:
        return combined.strip()
    return (stderr or stdout or "Command failed.").strip()


def nfl_manual_import_hint() -> str:
    return (
        "Manual recovery: copy a known-good spread dataset to "
        "data/imports/nfl/spread_dataset.parquet, then run npm run refresh:nfl:real."
    )


def empty_prediction_payload(sport: str, *, target: str, reason: str, prediction_mode: str = "missing") -> dict[str, Any]:
    return {
        "metadata": {
            "sport": sport,
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": utc_now(),
            "model_type": "missing",
            "target": target,
            "row_count": 0,
            "real_data": False,
            "prediction_mode": prediction_mode,
            "reason": reason,
        },
        "games": [],
    }


def write_empty_prediction(sport: str, variable: str, json_name: str, *, target: str, reason: str, prediction_mode: str = "missing") -> None:
    write_json_and_js(
        empty_prediction_payload(sport, target=target, reason=reason, prediction_mode=prediction_mode),
        PREDICTIONS_DIR / json_name,
        PREDICTIONS_DIR / json_name.replace(".json", ".js"),
        variable,
    )


def has_real_prediction_export(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False
    meta = payload.get("metadata") or payload.get("meta") or {}
    return bool(meta.get("real_data") is True and payload.get("games"))


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
    last_success = utc_now() if state in {"success", "schedule_only", "model_generated", "real_fresh", "real_cached"} else None
    sports[sport] = {
        "status": state,
        "message": message,
        "last_success_at": last_success,
        "used_cache": used_cache,
        "python": python or pipeline_python(),
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


def parse_mlb_target_date(target_date: str | None) -> date:
    if target_date in {None, "today"}:
        return date.today()
    return date.fromisoformat(str(target_date)[:10])


def default_mlb_predict_range(target_date: str | None, date_range: list[str] | None) -> list[str] | None:
    if date_range:
        return date_range
    day = parse_mlb_target_date(target_date)
    return [(day - timedelta(days=1)).isoformat(), (day + timedelta(days=1)).isoformat()]


def load_cached_mlb_schedule(target_date: str | None, date_range: list[str] | None) -> tuple[dict[str, Any], Path] | None:
    if date_range:
        start = date.fromisoformat(date_range[0])
        end = date.fromisoformat(date_range[1])
        dates = [start + timedelta(days=offset) for offset in range((end - start).days + 1)]
    else:
        dates = [parse_mlb_target_date(target_date)]

    payload = {
        "copyright": None,
        "totalItems": 0,
        "totalEvents": 0,
        "totalGames": 0,
        "totalGamesInProgress": 0,
        "dates": [],
    }
    used_paths: list[Path] = []
    for day in dates:
        path = RAW_MLB_DIR / f"schedule_{day.isoformat()}.json"
        if not path.exists():
            continue
        cached = json.loads(path.read_text(encoding="utf-8"))
        payload["copyright"] = payload["copyright"] or cached.get("copyright")
        payload["dates"].extend(cached.get("dates", []))
        payload["totalItems"] += int(cached.get("totalItems") or 0)
        payload["totalEvents"] += int(cached.get("totalEvents") or 0)
        payload["totalGames"] += int(cached.get("totalGames") or 0)
        payload["totalGamesInProgress"] += int(cached.get("totalGamesInProgress") or 0)
        used_paths.append(path)

    if not payload["dates"]:
        return None
    start_label = dates[0].isoformat()
    end_label = dates[-1].isoformat()
    raw_path = RAW_MLB_DIR / f"schedule_combined_{start_label}_{end_label}.json"
    raw_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload, raw_path


def team_abbrev(side: dict[str, Any]) -> str:
    return mlb_team_abbreviation(side)


def team_name(side: dict[str, Any]) -> str:
    return mlb_team_display_name(side)


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
                    "game_date": str(day.get("date") or game.get("officialDate") or game.get("gameDate") or "")[:10],
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
            "version": APP_VERSION,
            "real_data": True,
            "generated_at": utc_now(),
            "model_type": "schedule_only",
            "target": "home_win",
            "row_count": len(games),
            "mode": "schedule",
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
        odds = fetch_odds("MLB")
        payload["metadata"]["odds_status"] = odds.message
        payload["metadata"]["odds_provider"] = odds.provider
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
            "schedule_only",
            f"MLB schedule refreshed from MLB Stats API with {count} games. No probabilities were generated unless a trained model export is available. {odds.message}",
            used_cache=False,
        )
    except Exception as exc:  # noqa: BLE001 - surface a friendly runtime status
        update_sport_status(
            status,
            "MLB",
            "failed",
            f"MLB current schedule refresh failed: {type(exc).__name__}: {exc}",
            used_cache=True,
        )


def refresh_mlb_train(status: dict[str, Any]) -> bool:
    history_start, history_end = mlb_history_bounds()
    # Keep the canonical artifact path stable for the exporter/UI while the
    # metadata and status record the actual dynamic season window.
    feature_file = "data/processed/mlb/mlb_features_2021_2025.csv"
    steps = [
        (["src.mlb.data_ingest_mlb", "history", "--start-season", str(history_start), "--end-season", str(history_end)], 420),
        (["src.mlb.feature_builder_mlb", "build-history", "--start-season", str(history_start), "--end-season", str(history_end), "--output-file", feature_file], 300),
        (
            [
                "src.mlb.train_model_mlb",
                "--features-file",
                feature_file,
                "--train-start-season",
                str(history_start),
                "--train-end-season",
                str(history_end - 1),
                "--test-season",
                str(history_end),
            ],
            300,
        ),
        (
            [
                "src.mlb.export_predictions_mlb",
                "backtest",
                "--features-file",
                feature_file,
                "--season",
                str(history_end),
            ],
            180,
        ),
    ]
    try:
        for args, timeout in steps:
            result = run_module(args, timeout=timeout)
            if result.returncode != 0:
                message = missing_dependency_message(result.stderr, result.stdout)
                update_sport_status(status, "MLB", "failed", message, used_cache=True)
                return False
        update_sport_status(
            status,
            "MLB",
            "model_generated",
            f"MLB retrained across all cached completed seasons {history_start}-{history_end - 1}, held out {history_end}, then refit for production on {history_start}-{history_end}.",
            used_cache=False,
        )
        status.setdefault("training", {})["MLB"] = {
            "policy": "all_cached_completed_seasons_with_latest_season_holdout_then_full_production_refit",
            "history_start": history_start,
            "history_end": history_end,
            "evaluation_holdout": history_end,
            "production_train_end": history_end,
            "feature_file": feature_file,
            "last_run_at": utc_now(),
        }
        return True
    except Exception as exc:  # noqa: BLE001
        update_sport_status(status, "MLB", "failed", f"{type(exc).__name__}: {exc}", used_cache=True)
        return False


def refresh_mlb_export(status: dict[str, Any]) -> None:
    if not MLB_FEATURES.exists() or not MLB_MODEL.exists():
        update_sport_status(
            status,
            "MLB",
            "failed",
            "MLB model export skipped because historical features or model artifact are missing. Run npm run refresh:mlb:train.",
            used_cache=True,
        )
        return
    result = run_module(
        [
            "src.mlb.export_predictions_mlb",
            "export",
            "--features-file",
            "data/processed/mlb/mlb_features_2021_2025.csv",
            "--season",
            str(date.today().year),
            "--no-write-empty-if-missing",
        ],
        timeout=180,
    )
    if result.returncode != 0:
        update_sport_status(status, "MLB", "failed", (result.stderr or result.stdout).strip(), used_cache=True)
        return
    update_sport_status(status, "MLB", "model_generated", "MLB model prediction export refreshed from local artifact.", used_cache=False)


def refresh_mlb_history(status: dict[str, Any], *, force: bool = False) -> bool:
    history_start, history_end = mlb_history_bounds()
    args = ["src.mlb.data_ingest_mlb", "history", "--start-season", str(history_start), "--end-season", str(history_end)]
    if force:
        args.append("--force")
    result = run_module(args, timeout=420)
    if result.returncode != 0:
        update_sport_status(status, "MLB", "failed", missing_dependency_message(result.stderr, result.stdout), used_cache=True)
        return False
    update_sport_status(status, "MLB", "real_cached", f"MLB historical regular-season data cache is available for {history_start}-{history_end}.", used_cache=False)
    return True


def refresh_mlb_predict(status: dict[str, Any], target_date: str | None, date_range: list[str] | None) -> None:
    used_cached_schedule = False
    schedule_range = default_mlb_predict_range(target_date, date_range)
    try:
        schedule, raw_path = fetch_mlb_schedule(target_date, schedule_range)
    except Exception as exc:  # noqa: BLE001
        cached_schedule = load_cached_mlb_schedule(target_date, schedule_range)
        if cached_schedule is None:
            update_sport_status(status, "MLB", "failed", f"MLB current schedule fetch failed: {type(exc).__name__}: {exc}", used_cache=True)
            return
        schedule, raw_path = cached_schedule
        used_cached_schedule = True

    if not MLB_MODEL.exists() or not MLB_FEATURES.exists():
        payload = mlb_schedule_payload(schedule, raw_path)
        payload["metadata"]["reason"] = "Schedule only - train model to generate predictions."
        write_json_and_js(payload, PREDICTIONS_DIR / "mlb_predictions.json", PREDICTIONS_DIR / "mlb_predictions.js", "__MLB_PREDICTIONS__")
        update_sport_status(status, "MLB", "schedule_only", "MLB schedule loaded, but model/features are missing. Run npm run refresh:mlb:all for real predictions.", used_cache=False)
        return

    history_start, history_end = mlb_history_bounds()
    result = run_module(
        [
            "src.mlb.feature_builder_mlb",
            "build-current",
            "--season",
            str(date.today().year),
            "--start-season",
            str(history_start),
            "--end-season",
            str(history_end),
            "--schedule-file",
            str(raw_path.relative_to(ROOT)),
        ],
        timeout=180,
    )
    if result.returncode != 0:
        update_sport_status(status, "MLB", "failed", (result.stderr or result.stdout or "MLB current feature build failed.").strip(), used_cache=True)
        return

    result = run_module(
        [
            "src.mlb.export_predictions_mlb",
            "export",
            "--features-file",
            "data/processed/mlb/mlb_current_features.csv",
            "--model-file",
            "models/mlb_moneyline_model.joblib",
            "--season",
            str(date.today().year),
            "--no-write-empty-if-missing",
        ],
        timeout=180,
    )
    if result.returncode != 0:
        update_sport_status(status, "MLB", "failed", (result.stderr or result.stdout or "MLB current prediction export failed.").strip(), used_cache=True)
        return
    update_sport_status(
        status,
        "MLB",
        "model_generated",
        "MLB model predictions generated"
        + (" from cached schedule after live fetch failed." if used_cached_schedule else " from current schedule."),
        used_cache=used_cached_schedule,
    )


def refresh_wnba_history(status: dict[str, Any], *, force: bool = False) -> bool:
    history_start, history_end = wnba_history_bounds()
    args = ["src.wnba.data_ingest_wnba", "history", "--start-season", str(history_start), "--end-season", str(history_end)]
    if force:
        args.append("--force")
    result = run_module(args, timeout=900)
    if result.returncode != 0:
        update_sport_status(status, "WNBA", "failed", missing_dependency_message(result.stderr, result.stdout), used_cache=True)
        return False
    update_sport_status(status, "WNBA", "real_cached", f"WNBA schedule/results history is available for {history_start}-{history_end} from ESPN.", used_cache=False)
    return True


def refresh_wnba_train(status: dict[str, Any]) -> bool:
    history_start, history_end = wnba_history_bounds()
    feature_file = "data/processed/wnba/wnba_features_all.csv"
    steps = [
        (["src.wnba.data_ingest_wnba", "history", "--start-season", str(history_start), "--end-season", str(history_end)], 900),
        (["src.wnba.feature_builder_wnba", "build-history", "--start-season", str(history_start), "--end-season", str(history_end), "--output-file", feature_file], 300),
        (["src.wnba.train_model_wnba", "--features-file", feature_file, "--train-end-season", str(history_end - 1), "--test-season", str(history_end)], 300),
        (["src.wnba.export_predictions_wnba", "backtest", "--features-file", feature_file, "--season", str(history_end)], 180),
    ]
    try:
        for args, timeout in steps:
            result = run_module(args, timeout=timeout)
            if result.returncode != 0:
                update_sport_status(status, "WNBA", "schedule_only", missing_dependency_message(result.stderr, result.stdout), used_cache=True)
                return False
        update_sport_status(status, "WNBA", "model_generated", f"WNBA model candidates retrained with {history_end} as the chronological holdout and full-history production refit.", used_cache=False)
        status.setdefault("training", {})["WNBA"] = {
            "policy": "score_only_team_form_elo_with_latest_completed_season_holdout",
            "history_start": history_start, "history_end": history_end, "evaluation_holdout": history_end,
            "production_train_end": history_end, "feature_file": feature_file, "last_run_at": utc_now(),
        }
        return True
    except Exception as exc:  # noqa: BLE001
        update_sport_status(status, "WNBA", "schedule_only", f"{type(exc).__name__}: {exc}", used_cache=True)
        return False


def write_live_wnba_schedule_fallback(day: str, raw_path: Path) -> bool:
    """Reuse the bundled real ESPN live export when a direct refresh is unavailable."""
    if not LIVE_SCORES_JSON.exists():
        return False
    try:
        payload = json.loads(LIVE_SCORES_JSON.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    games = []
    for source in payload.get("games") or []:
        if str(source.get("sport") or "").upper() != "WNBA" or str(source.get("game_date") or "")[:10] != day:
            continue
        status = str(source.get("status") or source.get("status_detail") or "Scheduled")
        completed = any(marker in status.lower() for marker in ("final", "completed", "ft"))
        home_score = source.get("home_score")
        away_score = source.get("away_score")
        home_win = None
        if completed and home_score is not None and away_score is not None:
            home_win = 1 if float(home_score) > float(away_score) else 0
        games.append({
            "sport": "WNBA", "season": int(day[:4]), "game_date": day,
            "game_id": str(source.get("game_id") or source.get("id") or ""),
            "home": source.get("home"), "away": source.get("away"),
            "home_display": source.get("home_display") or source.get("home"),
            "away_display": source.get("away_display") or source.get("away"),
            "venue": source.get("venue"), "status": status, "completed": completed,
            "home_score": home_score, "away_score": away_score, "home_win": home_win,
            "source": "Bundled ESPN live scoreboard export",
        })
    if not games:
        return False
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_text(json.dumps({
        "metadata": {"sport": "WNBA", "season": int(day[:4]), "generated_at": utc_now(), "source": "Bundled ESPN live scoreboard export", "real_data": True, "row_count": len(games)},
        "games": games,
    }, indent=2), encoding="utf-8")
    return True


def refresh_wnba_predict(status: dict[str, Any], target_date: str | None) -> None:
    day = date.today().isoformat() if target_date in {None, "today"} else str(target_date)[:10]
    raw_path = RAW_WNBA_DIR / f"schedule_{day}.json"
    try:
        result = run_module(["src.wnba.data_ingest_wnba", "current", "--date", day], timeout=120)
        used_cache = False
        if result.returncode != 0:
            used_cache = write_live_wnba_schedule_fallback(day, raw_path) or raw_path.exists()
        if result.returncode != 0 and not used_cache:
            detail = (result.stderr or result.stdout or "ESPN scoreboard request failed.").strip()
            update_sport_status(status, "WNBA", "schedule_only", detail if detail.startswith("WNBA source unavailable:") else f"WNBA source unavailable: {detail}", used_cache=True)
            return
    except Exception as exc:  # noqa: BLE001
        used_cache = raw_path.exists()
        if not used_cache:
            used_cache = write_live_wnba_schedule_fallback(day, raw_path)
        if not used_cache:
            update_sport_status(status, "WNBA", "schedule_only", f"WNBA current source unavailable: {type(exc).__name__}: {exc}", used_cache=True)
            return
    history_start, history_end = wnba_history_bounds()
    build = run_module(["src.wnba.feature_builder_wnba", "build-current", "--season", str(day[:4]), "--start-season", str(history_start), "--end-season", str(day[:4]), "--output-file", "data/processed/wnba/wnba_current_features.csv"], timeout=300)
    if build.returncode != 0:
        update_sport_status(status, "WNBA", "schedule_only", (build.stderr or build.stdout or "WNBA current feature build returned no rows.").strip(), used_cache=used_cache)
        return
    if not WNBA_MODEL.exists():
        update_sport_status(status, "WNBA", "schedule_only", "WNBA schedule is loaded. Train the Raikou/Entei/Suicune candidates before model probabilities can be shown.", used_cache=used_cache)
        return
    export = run_module(["src.wnba.export_predictions_wnba", "export", "--features-file", "data/processed/wnba/wnba_current_features.csv", "--model-file", "models/wnba_moneyline_model.joblib", "--season", day[:4]], timeout=180)
    if export.returncode != 0:
        update_sport_status(status, "WNBA", "schedule_only", (export.stderr or export.stdout or "WNBA prediction export failed.").strip(), used_cache=used_cache)
        return
    update_sport_status(status, "WNBA", "model_generated", "WNBA current model probabilities refreshed from real ESPN schedule rows." + (" Cached source used." if used_cache else ""), used_cache=used_cache)


def first_existing(paths: list[Path]) -> Path | None:
    return next((path for path in paths if path.exists()), None)


def import_nfl_features_if_available(status: dict[str, Any]) -> bool:
    if not NFL_IMPORT_FEATURES.exists() and not NFL_IMPORT_FEATURES_CSV.exists():
        return False
    NFL_FEATURES.parent.mkdir(parents=True, exist_ok=True)
    if NFL_IMPORT_FEATURES.exists():
        shutil.copy2(NFL_IMPORT_FEATURES, NFL_FEATURES)
        source = "data/imports/nfl/spread_dataset.parquet"
    else:
        import pandas as pd

        df = pd.read_csv(NFL_IMPORT_FEATURES_CSV)
        df.to_parquet(NFL_FEATURES, index=False)
        source = "data/imports/nfl/spread_dataset.csv"
    update_sport_status(
        status,
        "NFL",
        "real_cached",
        f"Imported local NFL processed feature dataset from {source}.",
        used_cache=False,
    )
    return True


def refresh_nfl(status: dict[str, Any], *, require_real: bool = False) -> None:
    odds = fetch_odds("NFL")
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

    rebuilt = False
    if not features:
        imported = import_nfl_features_if_available(status)
        rebuilt = imported or rebuild_nfl_processed_dataset(status)
        features = first_existing(
            [
                ROOT / "data" / "processed" / "nfl" / "spread_dataset.parquet",
                ROOT / "data" / "processed" / "spread_dataset.parquet",
            ]
        )
        if not rebuilt and not features:
            write_empty_prediction(
                "NFL",
                "__NFL_PREDICTIONS__",
                "nfl_predictions.json",
                target="home_cover",
                reason=f"No real export has been generated yet. NFL rebuild failed; see data/refresh_status.json. {nfl_manual_import_hint()}",
                prediction_mode="missing",
            )
            return

    if not features or not model:
        missing = []
        if not features:
            missing.append("processed NFL feature file data/processed/nfl/spread_dataset.parquet or data/processed/spread_dataset.parquet")
        if not model:
            missing.append("NFL model models/nfl_spread_model.joblib, models/spread_model.joblib, or spread_model.joblib")
        write_empty_prediction(
            "NFL",
            "__NFL_PREDICTIONS__",
            "nfl_predictions.json",
            target="home_cover",
            reason=f"No real export has been generated yet. Missing: {', '.join(missing)}",
            prediction_mode="missing",
        )
        update_sport_status(
            status,
            "NFL",
            "dependency_missing" if require_real else "missing",
            f"NFL real export unavailable. Missing: {', '.join(missing)}. {odds.message} {nfl_manual_import_hint()}",
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
        result = subprocess.run([pipeline_python(), *command[1:]], cwd=ROOT, text=True, capture_output=True, timeout=180, check=False)
        if result.returncode != 0:
            message = missing_dependency_message(result.stderr, result.stdout)
            update_sport_status(status, "NFL", "failed", f"NFL export failed: {message}", used_cache=True)
            return
        normalize_nfl_export(PREDICTIONS_DIR / "nfl_predictions.json", PREDICTIONS_DIR / "nfl_predictions.js")
        count = len(json.loads((PREDICTIONS_DIR / "nfl_predictions.json").read_text(encoding="utf-8")).get("games", []))
        update_sport_status(
            status,
            "NFL",
            "real_fresh",
            f"{'Processed NFL dataset missing. Rebuilt locally, then exported' if rebuilt else 'Found existing NFL processed dataset. Exported'} {count} real historical predictions.",
            used_cache=False,
        )
    except Exception as exc:  # noqa: BLE001
        update_sport_status(
            status,
            "NFL",
            "failed",
            f"NFL export failed: {type(exc).__name__}: {exc}",
            used_cache=True,
        )


def rebuild_nfl_processed_dataset(status: dict[str, Any]) -> bool:
    steps = [
        (["data_ingest.py", "schedules", "--start-season", "2018", "--end-season", "2025"], 300),
        (["data_ingest.py", "pbp", "--start-season", "2018", "--end-season", "2025"], 1200),
        (["data_ingest.py", "weekly", "--start-season", "2018", "--end-season", "2025"], 600),
        (
            [
                "feature_builder.py",
                "--start-season",
                "2018",
                "--end-season",
                "2025",
                "--output-file",
                "data/processed/nfl/spread_dataset.parquet",
            ],
            900,
        ),
    ]
    for args, timeout in steps:
        result = run_python_script(args, timeout=timeout)
        if result.returncode != 0:
            message = missing_dependency_message(result.stderr, result.stdout)
            state = "source_refused" if "connection refused" in message.lower() else "failed"
            update_sport_status(
                status,
                "NFL",
                state,
                f"NFL rebuild failed while running {' '.join(args)}: {message} {nfl_manual_import_hint()} Source order: local import, existing processed parquet, nfl-data-py, direct nflverse-data CSV, optional nflreadpy schedule fallback.",
                used_cache=True,
            )
            return False
    return NFL_FEATURES.exists()

def normalize_nfl_export(json_path: Path, js_path: Path) -> None:
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    games = payload.get("games", [])
    for game in games:
        probability = game.get("home_cover_probability", game.get("model_home_cover"))
        game["sport"] = "NFL"
        game["home_cover_probability"] = probability
        game["away_cover_probability"] = None if probability is None else 1 - probability
        game["model_pick"] = game.get("model_pick") or (game.get("home") if (probability or 0) >= 0.5 else game.get("away"))
        game["prediction_mode"] = "historical_backtest"
        if "home_cover" in game and game.get("home_cover") in (0, 1):
            picked_home = probability is not None and probability >= 0.5
            actual_home = int(game["home_cover"]) == 1
            game["model_result"] = "Win" if picked_home == actual_home else "Loss"
            game["completed"] = True
    games = append_nfl_postseason_supplements(games)
    payload["metadata"] = {
        "sport": "NFL",
        "app": "LineLens Sports",
        "version": APP_VERSION,
        "real_data": True,
        "prediction_mode": "historical_backtest",
        "generated_at": utc_now(),
        "model_type": "existing_project_pipeline",
        "source": "nfl-data-py / existing project pipeline",
        "season_min": min([int(game.get("season")) for game in games if game.get("season") is not None], default=None),
        "season_max": max([int(game.get("season")) for game in games if game.get("season") is not None], default=None),
        "row_count": len(games),
    }
    write_json_and_js(payload, json_path, js_path, "__NFL_PREDICTIONS__")


def append_nfl_postseason_supplements(games: list[dict[str, Any]]) -> list[dict[str, Any]]:
    existing_ids = {str(game.get("id") or game.get("game_id")) for game in games}
    supplements = [
        {
            "id": "2025_POST_SB_LX_SEA_NE",
            "game_id": "2025_POST_SB_LX_SEA_NE",
            "sport": "NFL",
            "season": 2025,
            "week": 23,
            "week_label": "Super Bowl LX",
            "season_type": "POST",
            "game_date": "2026-02-08",
            "status": "Final",
            "status_detail": "Super Bowl LX",
            "home": "NE",
            "away": "SEA",
            "home_display": "New England Patriots",
            "away_display": "Seattle Seahawks",
            "home_score": 13.0,
            "away_score": 29.0,
            "spread_line": 4.5,
            "home_cover": 0,
            "cover_margin": -11.5,
            "home_cover_probability": None,
            "away_cover_probability": None,
            "model_home_cover": None,
            "model_pick": "-",
            "result": "Seattle won",
            "actual_result": "Seattle won 29-13",
            "model_result": "No logged pick",
            "completed": True,
            "prediction_mode": "postseason_result_supplement",
            "source": "Verified postseason result supplement",
            "source_url": "https://en.wikipedia.org/wiki/Super_Bowl_LX",
            "trend": {"labels": ["Win %", "Point diff", "Off EPA", "Def EPA", "Pass rate"], "home": [], "away": []},
        }
    ]
    for row in supplements:
        if row["id"] not in existing_ids:
            games.append(row)
    return games


def refresh_startup(status: dict[str, Any]) -> None:
    if has_real_prediction_export(PREDICTIONS_DIR / "nfl_predictions.json"):
        update_sport_status(status, "NFL", "real_cached", "NFL real export found; skipping rebuild.", used_cache=True)
    else:
        refresh_nfl(status, require_real=True)
    mlb_history_end = mlb_history_bounds()[1]
    if model_needs_refresh(MLB_MODEL, MLB_FEATURES, RAW_MLB_DIR, "history_", mlb_history_end):
        if not refresh_mlb_train(status):
            return
    refresh_mlb_predict(status, None, None)
    wnba_history_end = wnba_history_bounds()[1]
    if model_needs_refresh(WNBA_MODEL, WNBA_FEATURES, RAW_WNBA_DIR, "schedule_", wnba_history_end):
        refresh_wnba_train(status)
    refresh_wnba_predict(status, None)
    run_model_scoring(status)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sport", choices=["all", "nfl", "mlb", "wnba"], default="all")
    parser.add_argument("--mode", choices=["current", "history", "train", "predict", "export", "real", "startup", "all"], default="current")
    parser.add_argument("--date", default="today", help="MLB schedule date, or 'today'.")
    parser.add_argument("--date-range", nargs=2, metavar=("START", "END"), help="MLB schedule date range.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    status = load_status()
    status["mode"] = args.mode

    if args.mode == "startup":
        refresh_startup(status)
    elif args.sport in {"all", "mlb"} and args.mode == "history":
        refresh_mlb_history(status)
    elif args.sport in {"all", "mlb"} and args.mode in {"train", "all", "real"}:
        mlb_trained = refresh_mlb_train(status)
        if args.mode in {"all", "real"} and not mlb_trained:
            write_status(status)
            requested = "NFL and MLB" if args.sport == "all" else args.sport.upper()
            print(f"Refresh finished for {requested}. Status written to data/refresh_status.json")
            return
    if args.sport in {"all", "mlb"} and args.mode in {"current"}:
        refresh_mlb(status, args.date, args.date_range)
    if args.sport in {"all", "mlb"} and args.mode in {"predict", "all", "real"}:
        refresh_mlb_predict(status, args.date, args.date_range)
        run_model_scoring(status)
    if args.sport in {"all", "mlb"} and args.mode == "export":
        refresh_mlb_export(status)
    if args.sport in {"all", "nfl"} and args.mode in {"current", "export", "real", "all"}:
        refresh_nfl(status, require_real=args.mode in {"real", "all"})
    if args.sport in {"all", "wnba"} and args.mode == "history":
        refresh_wnba_history(status)
    if args.sport in {"all", "wnba"} and args.mode in {"train", "all", "real"}:
        refresh_wnba_train(status)
    if args.sport in {"all", "wnba"} and args.mode in {"current", "predict", "all", "real"}:
        refresh_wnba_predict(status, args.date)
        run_model_scoring(status)

    write_status(status)
    requested = "NFL, MLB, and WNBA" if args.sport == "all" else args.sport.upper()
    print(f"Refresh finished for {requested}. Status written to data/refresh_status.json")


if __name__ == "__main__":
    main()
