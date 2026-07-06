"""Refresh cached LineLens Sports prediction data.

This script is intentionally conservative: it updates exported JSON/JS files
when free/local sources are available, and writes a friendly status payload
when Python dependencies, internet, or model files are missing.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.odds_provider import fetch_odds, odds_config_status

DATA_DIR = ROOT / "data"
RAW_MLB_DIR = DATA_DIR / "raw" / "mlb"
PREDICTIONS_DIR = DATA_DIR / "predictions"
STATUS_JSON = DATA_DIR / "refresh_status.json"
STATUS_JS = DATA_DIR / "refresh_status.js"
MLB_FEATURES = DATA_DIR / "processed" / "mlb" / "mlb_features_2021_2025.csv"
MLB_CURRENT_FEATURES = DATA_DIR / "processed" / "mlb" / "mlb_current_features.csv"
MLB_MODEL = ROOT / "models" / "mlb_moneyline_model.joblib"
NFL_FEATURES = ROOT / "data" / "processed" / "nfl" / "spread_dataset.parquet"
NFL_IMPORT_FEATURES = ROOT / "data" / "imports" / "nfl" / "spread_dataset.parquet"
NFL_IMPORT_FEATURES_CSV = ROOT / "data" / "imports" / "nfl" / "spread_dataset.csv"
VENV_PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"
APP_VERSION = "v0.6.0"


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
    status["odds"] = odds_config_status()
    STATUS_JSON.parent.mkdir(parents=True, exist_ok=True)
    STATUS_JSON.write_text(json.dumps(status, indent=2), encoding="utf-8")
    STATUS_JS.write_text(
        "window.__REFRESH_STATUS__ = " + json.dumps(status, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


def run_module(args: list[str], timeout: int = 300) -> subprocess.CompletedProcess[str]:
    command = [pipeline_python(), "-m", *args]
    return subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout, check=False)


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
    steps = [
        (["src.mlb.data_ingest_mlb", "history", "--start-season", "2021", "--end-season", "2025"], 420),
        (["src.mlb.feature_builder_mlb", "build-history", "--start-season", "2021", "--end-season", "2025"], 300),
        (
            [
                "src.mlb.train_model_mlb",
                "--features-file",
                "data/processed/mlb/mlb_features_2021_2025.csv",
                "--train-start-season",
                "2021",
                "--train-end-season",
                "2024",
                "--test-season",
                "2025",
            ],
            300,
        ),
        (
            [
                "src.mlb.export_predictions_mlb",
                "backtest",
                "--features-file",
                "data/processed/mlb/mlb_features_2021_2025.csv",
                "--season",
                "2025",
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
            "MLB historical model trained on 2021-2024, tested on 2025, and backtest export refreshed.",
            used_cache=False,
        )
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
    args = ["src.mlb.data_ingest_mlb", "history", "--start-season", "2021", "--end-season", "2025"]
    if force:
        args.append("--force")
    result = run_module(args, timeout=420)
    if result.returncode != 0:
        update_sport_status(status, "MLB", "failed", missing_dependency_message(result.stderr, result.stdout), used_cache=True)
        return False
    update_sport_status(status, "MLB", "real_cached", "MLB historical regular-season data cache is available for 2021-2025.", used_cache=False)
    return True


def refresh_mlb_predict(status: dict[str, Any], target_date: str | None, date_range: list[str] | None) -> None:
    used_cached_schedule = False
    try:
        schedule, raw_path = fetch_mlb_schedule(target_date, date_range)
    except Exception as exc:  # noqa: BLE001
        cached = sorted(RAW_MLB_DIR.glob("schedule_*.json"))
        if not cached:
            update_sport_status(status, "MLB", "failed", f"MLB current schedule fetch failed: {type(exc).__name__}: {exc}", used_cache=True)
            return
        raw_path = cached[-1]
        schedule = json.loads(raw_path.read_text(encoding="utf-8"))
        used_cached_schedule = True

    if not MLB_MODEL.exists() or not MLB_FEATURES.exists():
        payload = mlb_schedule_payload(schedule, raw_path)
        payload["metadata"]["reason"] = "Schedule only - train model to generate predictions."
        write_json_and_js(payload, PREDICTIONS_DIR / "mlb_predictions.json", PREDICTIONS_DIR / "mlb_predictions.js", "__MLB_PREDICTIONS__")
        update_sport_status(status, "MLB", "schedule_only", "MLB schedule loaded, but model/features are missing. Run npm run refresh:mlb:all for real predictions.", used_cache=False)
        return

    result = run_module(
        [
            "src.mlb.feature_builder_mlb",
            "build-current",
            "--season",
            str(date.today().year),
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
        (["data_ingest.py", "schedules", "--start-season", "2018", "--end-season", "2024"], 300),
        (["data_ingest.py", "pbp", "--start-season", "2018", "--end-season", "2024"], 1200),
        (["data_ingest.py", "weekly", "--start-season", "2018", "--end-season", "2024"], 600),
        (
            [
                "feature_builder.py",
                "--start-season",
                "2018",
                "--end-season",
                "2024",
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


def refresh_startup(status: dict[str, Any]) -> None:
    if has_real_prediction_export(PREDICTIONS_DIR / "nfl_predictions.json"):
        update_sport_status(status, "NFL", "real_cached", "NFL real export found; skipping rebuild.", used_cache=True)
    else:
        refresh_nfl(status, require_real=True)
    if not MLB_MODEL.exists() or not MLB_FEATURES.exists():
        if not refresh_mlb_train(status):
            return
    refresh_mlb_predict(status, None, None)
    run_model_scoring(status)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sport", choices=["all", "nfl", "mlb"], default="all")
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

    write_status(status)
    requested = "NFL and MLB" if args.sport == "all" else args.sport.upper()
    print(f"Refresh finished for {requested}. Status written to data/refresh_status.json")


if __name__ == "__main__":
    main()
