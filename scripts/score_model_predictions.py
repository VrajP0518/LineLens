"""Score logged model predictions and update model record summaries."""

from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.mlb_teams import mlb_team_abbreviation, normalize_mlb_abbrev
from src.shared.version import APP_VERSION

TRACKING_DIR = ROOT / "data" / "tracking"
RAW_MLB_DIR = ROOT / "data" / "raw" / "mlb"
PREDICTIONS_DIR = ROOT / "data" / "predictions"
REPORTS_DIR = ROOT / "data" / "reports"
LOG_JSON = TRACKING_DIR / "model_predictions_log.json"
LOG_JS = TRACKING_DIR / "model_predictions_log.js"
RECORD_JSON = TRACKING_DIR / "model_record.json"
RECORD_JS = TRACKING_DIR / "model_record.js"
MLB_BACKTEST = PREDICTIONS_DIR / "mlb_backtest_predictions.json"
NFL_PREDICTIONS = PREDICTIONS_DIR / "nfl_predictions.json"
MLB_COMPARISON = REPORTS_DIR / "mlb_model_comparison.json"
SCORED_RESULTS = {"win", "loss", "push"}
NON_DECISIVE_STATUS_MARKERS = ("postponed", "canceled", "cancelled", "suspended", "delayed", "delay")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def clean(value: Any) -> Any:
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items()}
    if isinstance(value, list):
        return [clean(item) for item in value]
    return value


def write_json_and_js(payload: dict[str, Any], json_path: Path, js_path: Path, variable: str) -> None:
    cleaned = clean(payload)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(cleaned, indent=2, allow_nan=False), encoding="utf-8")
    js_path.write_text(
        f"window.{variable} = {json.dumps(cleaned, separators=(',', ':'), allow_nan=False)};\n",
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


def normalize_result(value: Any) -> str:
    result = str(value or "").strip().lower()
    if result in {"won", "w"}:
        return "win"
    if result in {"lost", "l"}:
        return "loss"
    if result in {"tie"}:
        return "push"
    return result


def is_excluded_prediction(row: dict[str, Any]) -> bool:
    status = str(row.get("status_at_prediction") or row.get("status") or row.get("status_detail") or "").strip().lower()
    return row.get("prediction_mode") == "postseason_result_supplement" or any(marker in status for marker in NON_DECISIVE_STATUS_MARKERS)


def team_abbrev(side: dict[str, Any]) -> str:
    return mlb_team_abbreviation(side)


def status_label(game: dict[str, Any]) -> str:
    status = game.get("status", {})
    return status.get("detailedState") or status.get("abstractGameState") or "Pending"


def parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.fromisoformat(f"{value}T12:00:00+00:00")
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def mlb_result_map() -> dict[str, dict[str, Any]]:
    results: dict[str, dict[str, Any]] = {}
    for path in sorted(RAW_MLB_DIR.glob("*.json")):
        payload = load_json(path)
        for day in payload.get("dates", []):
            for game in day.get("games", []):
                teams = game.get("teams", {})
                home = teams.get("home", {})
                away = teams.get("away", {})
                home_score = home.get("score")
                away_score = away.get("score")
                if home_score is None or away_score is None:
                    continue
                label = status_label(game)
                if "Final" not in label and "Completed" not in label:
                    continue
                home_code = team_abbrev(home)
                away_code = team_abbrev(away)
                results[str(game.get("gamePk"))] = {
                    "home": home_code,
                    "away": away_code,
                    "home_score": int(home_score),
                    "away_score": int(away_score),
                    "actual_winner": home_code if int(home_score) > int(away_score) else away_code,
                    "status": label,
                    "game_date": game.get("officialDate") or str(game.get("gameDate", ""))[:10],
                }
    return results


def summarize_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    wins = sum(1 for row in rows if normalize_result(row.get("model_result")) == "win")
    losses = sum(1 for row in rows if normalize_result(row.get("model_result")) == "loss")
    pushes = sum(1 for row in rows if normalize_result(row.get("model_result")) == "push")
    pending = sum(1 for row in rows if normalize_result(row.get("model_result")) not in SCORED_RESULTS)
    decided = wins + losses
    return {
        "wins": wins,
        "losses": losses,
        "pushes": pushes,
        "pending": pending,
        "accuracy": None if decided == 0 else wins / decided,
        "sample_size": len(rows),
        "scored": wins + losses + pushes,
    }


def labeled_record(rows: list[dict[str, Any]], label: str, **extra: Any) -> dict[str, Any]:
    summary = summarize_rows(rows)
    summary.update({"label": label, **extra})
    return summary


def grouped_record(rows: list[dict[str, Any]], key: str) -> dict[str, Any]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        value = row.get(key) or "unknown"
        groups[str(value)].append(row)
    return {value: summarize_rows(group) for value, group in sorted(groups.items())}


def grouped_list(rows: list[dict[str, Any]], key: str, label_key: str | None = None, reverse: bool = False) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        value = row.get(key) or "unknown"
        groups[str(value)].append(row)
    output = []
    for value, group in groups.items():
        summary = summarize_rows(group)
        summary[label_key or key] = value
        output.append(summary)
    return sorted(output, key=lambda row: str(row.get(label_key or key)), reverse=reverse)


def confidence_group(row: dict[str, Any]) -> str:
    confidence = row.get("confidence")
    if confidence is None:
        confidence = row.get("confidence_score") or row.get("home_cover_probability") or row.get("model_home_cover")
    value = safe_float(confidence)
    if value is None:
        return row.get("confidence_label") or "unknown"
    if value > 1:
        value /= 100
    value = max(value, 1 - value)
    if value >= 0.65:
        return "65%+"
    if value >= 0.60:
        return "60-65%"
    if value >= 0.575:
        return "57.5-60%"
    if value >= 0.55:
        return "55-57.5%"
    if value >= 0.525:
        return "52.5-55%"
    return "50-52.5%"


def recent_rows(rows: list[dict[str, Any]], days: int) -> list[dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    kept = []
    for row in rows:
        parsed = parse_datetime(row.get("game_date") or row.get("generated_at"))
        if parsed and parsed >= cutoff:
            kept.append(row)
    return kept


def date_rows(rows: list[dict[str, Any]], days_offset: int) -> list[dict[str, Any]]:
    target = (datetime.now(timezone.utc).date() + timedelta(days=days_offset)).isoformat()
    return [row for row in rows if str(row.get("game_date") or row.get("generated_at", ""))[:10] == target]


def prediction_game_key(row: dict[str, Any]) -> str:
    game_id = row.get("game_id")
    if game_id:
        return f"{row.get('sport')}:{row.get('game_date')}:{game_id}"
    return (
        f"{row.get('sport')}:{row.get('game_date')}:"
        f"{normalize_mlb_abbrev(row.get('away'))}@{normalize_mlb_abbrev(row.get('home'))}"
    )


def prediction_sort_key(row: dict[str, Any]) -> tuple[datetime, int]:
    parsed = parse_datetime(row.get("generated_at")) or parse_datetime(row.get("game_date")) or datetime.min.replace(tzinfo=timezone.utc)
    scored_weight = 1 if normalize_result(row.get("model_result")) in SCORED_RESULTS else 0
    return parsed, scored_weight


def latest_prediction_per_game(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = prediction_game_key(row)
        existing = latest.get(key)
        if existing is None or prediction_sort_key(row) >= prediction_sort_key(existing):
            latest[key] = row
    return sorted(latest.values(), key=lambda row: (str(row.get("game_date") or ""), str(row.get("generated_at") or "")))


def score_mlb_predictions(rows: list[dict[str, Any]]) -> tuple[int, int]:
    results = mlb_result_map()
    scored_this_run = 0
    pending = 0
    for row in rows:
        if row.get("sport") != "MLB":
            continue
        if is_excluded_prediction(row):
            row["result_status"] = "excluded"
            row["model_result"] = "no_result"
            row["exclusion_reason"] = "Non-decisive schedule status; excluded from model accountability."
            continue
        existing_result = normalize_result(row.get("model_result"))
        result = results.get(str(row.get("game_id")))
        if not result:
            # Preserve previously scored real records. Missing local cache should
            # never erase a win/loss/push that was already established.
            if existing_result in SCORED_RESULTS:
                row["result_status"] = row.get("result_status") or "scored"
                continue
            row["result_status"] = "pending"
            row["model_result"] = "pending"
            pending += 1
            continue
        row["actual_winner"] = result["actual_winner"]
        row["home_score"] = result["home_score"]
        row["away_score"] = result["away_score"]
        row["result_status"] = "scored"
        row["model_result"] = (
            "win"
            if normalize_mlb_abbrev(row.get("model_pick")) == normalize_mlb_abbrev(result["actual_winner"])
            else "loss"
        )
        scored_this_run += 1
    return scored_this_run, pending


def mlb_backtest_record() -> dict[str, Any]:
    payload = load_json(MLB_BACKTEST)
    games = payload.get("games", [])
    rows = [
        {
            "sport": "MLB",
            "game_date": game.get("game_date"),
            "model_result": normalize_result(game.get("model_result")),
            "model_pick": game.get("model_pick"),
            "home": game.get("home"),
            "away": game.get("away"),
        }
        for game in games
        if normalize_result(game.get("model_result")) in SCORED_RESULTS and game.get("model_pick")
    ]
    comparison = load_json(MLB_COMPARISON)
    selected_name = (comparison.get("metadata") or {}).get("selected_model")
    selected = next((row for row in comparison.get("models", []) if row.get("model_name") == selected_name), None)
    meta = payload.get("metadata", {})
    return labeled_record(
        rows,
        "2025 Backtest",
        source=str(MLB_BACKTEST.relative_to(ROOT)),
        model_type=meta.get("model_name") or meta.get("model_type"),
        test_season=meta.get("test_season"),
        row_count=meta.get("row_count") or len(games),
        metrics=selected or {},
        selection_available=bool(selected),
        note="Backtest record is separate from live MLB prediction record.",
    )


def recent_prediction_table(rows: list[dict[str, Any]], limit: int = 12) -> list[dict[str, Any]]:
    sorted_rows = sorted(
        rows,
        key=lambda row: str(row.get("generated_at") or row.get("game_date") or ""),
        reverse=True,
    )
    output = []
    for row in sorted_rows[:limit]:
        output.append(
            {
                "sport": row.get("sport"),
                "generated_at": row.get("generated_at"),
                "game_date": row.get("game_date"),
                "away": row.get("away"),
                "home": row.get("home"),
                "model_pick": row.get("model_pick"),
                "home_win_probability": row.get("home_win_probability"),
                "away_win_probability": row.get("away_win_probability"),
                "confidence": row.get("confidence"),
                "model_result": row.get("model_result"),
                "result_status": row.get("result_status"),
                "home_score": row.get("home_score"),
                "away_score": row.get("away_score"),
            }
        )
    return output


def mlb_live_record(rows: list[dict[str, Any]]) -> dict[str, Any]:
    raw_mlb_rows = [row for row in rows if row.get("sport") == "MLB" and not is_excluded_prediction(row)]
    mlb_rows = latest_prediction_per_game(raw_mlb_rows)
    by_confidence: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in mlb_rows:
        by_confidence[confidence_group(row)].append(row)
    by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in mlb_rows:
        month = str(row.get("game_date", ""))[:7] or "unknown"
        by_month[month].append(row)
    scored_rows = [row for row in mlb_rows if normalize_result(row.get("model_result")) in SCORED_RESULTS]
    last_scored = sorted(scored_rows, key=lambda row: str(row.get("game_date") or row.get("generated_at") or ""), reverse=True)
    live = labeled_record(
        mlb_rows,
        "Live Record",
        source=str(LOG_JSON.relative_to(ROOT)),
        note="Only the latest logged LineLens MLB prediction per game is counted here.",
        logged_rows=len(raw_mlb_rows),
        unique_games=len(mlb_rows),
    )
    return {
        "overall": live,
        "live_record": live,
        "today_record": labeled_record(date_rows(mlb_rows, 0), "Today"),
        "yesterday_record": labeled_record(date_rows(mlb_rows, -1), "Yesterday"),
        "recent_7_days": labeled_record(recent_rows(mlb_rows, 7), "Last 7 Days"),
        "recent_30_days": labeled_record(recent_rows(mlb_rows, 30), "Last 30 Days"),
        "pending_predictions": [row for row in recent_prediction_table(mlb_rows, 20) if normalize_result(row.get("model_result")) not in SCORED_RESULTS],
        "last_scored_game": recent_prediction_table(last_scored, 1)[0] if last_scored else None,
        "by_model_version": grouped_record(mlb_rows, "model_version"),
        "by_confidence": {key: summarize_rows(group) for key, group in sorted(by_confidence.items())},
        "by_month": {key: summarize_rows(group) for key, group in sorted(by_month.items())},
        "recent_predictions": recent_prediction_table(mlb_rows),
        "backtest_record": mlb_backtest_record(),
    }


def nfl_record() -> dict[str, Any]:
    payload = load_json(NFL_PREDICTIONS)
    games = payload.get("games", [])
    required_fields = ["model_pick", "model_result", "season", "week", "home", "away"]
    missing_fields = [
        field
        for field in required_fields
        if not any(game.get(field) not in {None, ""} for game in games)
    ]
    rows = []
    for game in games:
        result = normalize_result(game.get("model_result"))
        if result not in SCORED_RESULTS:
            continue
        rows.append(
            {
                "sport": "NFL",
                "model_result": result,
                "confidence": game.get("confidence")
                or game.get("home_cover_probability")
                or game.get("model_home_cover"),
                "confidence_label": game.get("confidence"),
                "season": game.get("season"),
                "week": game.get("week"),
                "game_date": game.get("game_date") or game.get("season"),
                "home": game.get("home"),
                "away": game.get("away"),
                "home_score": game.get("home_score"),
                "away_score": game.get("away_score"),
                "model_pick": game.get("model_pick"),
                "spread_line": game.get("spread_line"),
            }
        )
    by_confidence: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        by_confidence[confidence_group(row)].append(row)
    latest_season = max((row.get("season") for row in rows if row.get("season") is not None), default=None)
    latest_rows = [row for row in rows if row.get("season") == latest_season] if latest_season is not None else []
    historical = labeled_record(
        rows,
        "Historical NFL Backtest / Cached Real Export",
        source=str(NFL_PREDICTIONS.relative_to(ROOT)),
        rows_found=len(games),
        rows_scored=len(rows),
        missing_fields=missing_fields,
        prediction_mode=(payload.get("metadata") or payload.get("meta") or {}).get("prediction_mode"),
    )
    return {
        "overall": historical,
        "historical_record": historical,
        "latest_season_record": labeled_record(latest_rows, f"Latest Season {latest_season}" if latest_season else "Latest Season"),
        "by_season": grouped_list(rows, "season", "season", reverse=True),
        "by_week": grouped_list(rows, "week", "week"),
        "by_confidence": [
            {"bucket": key, **summarize_rows(group)}
            for key, group in sorted(by_confidence.items())
        ],
        "recent_games": recent_prediction_table(rows, 12),
        "missing_fields": missing_fields,
        "note": "NFL rows are historical/backtest exports, not current live NFL record.",
    }


def build_record(log_payload: dict[str, Any], scored: int, pending: int) -> dict[str, Any]:
    rows = log_payload.get("predictions", [])
    mlb = mlb_live_record(rows)
    nfl = nfl_record()
    return {
        "metadata": {
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": utc_now(),
            "real_data": True,
            "predictions_logged": len(rows),
            "predictions_scored_this_run": scored,
            "pending_predictions": pending,
            "last_scoring_run": utc_now(),
        },
        "sports": {
            "MLB": mlb,
            "NFL": nfl,
        },
    }


def main() -> int:
    payload = load_json(LOG_JSON) or {"metadata": {}, "predictions": []}
    payload.setdefault("predictions", [])
    scored, pending = score_mlb_predictions(payload["predictions"])
    payload["metadata"] = {
        "app": "LineLens Sports",
        "version": APP_VERSION,
        "generated_at": utc_now(),
        "real_data": True,
        "row_count": len(payload["predictions"]),
        "scored_this_run": scored,
        "pending": pending,
    }
    write_json_and_js(payload, LOG_JSON, LOG_JS, "__MODEL_PREDICTIONS_LOG__")
    record = build_record(payload, scored, pending)
    write_json_and_js(record, RECORD_JSON, RECORD_JS, "__MODEL_RECORD__")
    print(json.dumps(record["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
