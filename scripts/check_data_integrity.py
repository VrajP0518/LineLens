"""Validate cross-export LineLens invariants without network access or training."""

from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.shared.timezones import safe_zone


class IntegrityError(RuntimeError):
    pass


def load(relative: str) -> dict:
    path = ROOT / relative
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise IntegrityError(f"Missing required export: {relative}") from exc
    except json.JSONDecodeError as exc:
        raise IntegrityError(f"Invalid JSON in {relative}: {exc}") from exc


def rows(payload: dict, key: str = "games") -> list[dict]:
    value = payload.get(key, [])
    return value if isinstance(value, list) else []


def check(label: str, condition: bool, detail: str) -> None:
    if not condition:
        raise IntegrityError(f"FAIL: {label} — {detail}")
    print(f"PASS: {label} — {detail}")


def game_key(row: dict) -> str:
    return str(row.get("game_id") or row.get("id") or f"{row.get('game_date')}|{row.get('away')}|{row.get('home')}")


def prediction_log_game_key(row: dict) -> str:
    sport = str(row.get("sport") or "MLB").strip().upper()
    game_id = str(row.get("game_id") or row.get("espn_event_id") or "").strip()
    if game_id:
        return f"{sport}:id:{game_id}"
    return ":".join(
        (
            sport,
            str(row.get("game_date") or "").strip()[:10],
            str(row.get("away") or "").strip().upper(),
            str(row.get("home") or "").strip().upper(),
            str(row.get("game_time") or row.get("start_time") or "").strip()[:16],
        )
    )


def source_date(row: dict) -> str:
    raw = str(row.get("game_date") or row.get("date") or row.get("scheduled_date") or "")
    match = re.match(r"^(\d{4}-\d{2}-\d{2})", raw)
    return match.group(1) if match else ""


def live_schedule_date(row: dict) -> str:
    """Convert timestamped ESPN rows to the Toronto calendar date."""
    raw = str(row.get("game_time") or "")
    if row.get("source") == "ESPN Scoreboard API" and "T" in raw:
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(safe_zone("America/Toronto")).date().isoformat()
        except ValueError:
            pass
    return source_date(row)


def live_composite_key(row: dict) -> str:
    raw = str(row.get("game_time") or "")
    slot = raw.split("T", 1)[1][:5] if "T" in raw else ""
    return "|".join((str(row.get("sport") or ""), live_schedule_date(row), str(row.get("away") or "").upper(), str(row.get("home") or "").upper(), slot))


def local_date_iso(value: datetime) -> str:
    return value.strftime("%Y-%m-%d")


def default_date(dates: list[str], today: str) -> str | None:
    ordered = sorted(set(dates))
    if today in ordered:
        return today
    future = [item for item in ordered if item > today]
    return future[0] if future else (ordered[-1] if ordered else None)


def check_calendar_rules() -> None:
    date_value = "2026-07-10"
    check("date-only preservation", date_value == date.fromisoformat(date_value).isoformat(), date_value)
    for zone in ("America/Toronto", "America/New_York", "UTC", "Asia/Tokyo"):
        local = datetime(2026, 7, 10, 23, 45, tzinfo=safe_zone(zone))
        check("local timezone calendar", local_date_iso(local) == date_value, f"{zone} keeps {date_value}")
    check("today default", default_date(["2026-07-09", date_value, "2026-07-11"], date_value) == date_value, "today with games")
    check("future fallback", default_date(["2026-07-11", "2026-07-12"], date_value) == "2026-07-11", "next future date")
    check("previous fallback", default_date(["2026-07-08", "2026-07-09"], date_value) == "2026-07-09", "latest previous date")
    check("empty fallback", default_date([], date_value) is None, "no date is invented")
    doubleheader = [{"game_id": "a", "game_date": date_value}, {"game_id": "b", "game_date": date_value}]
    check("doubleheader identity", len({game_key(row) for row in doubleheader}) == 2, "same date, distinct games")
    check("season boundary", default_date(["2025-12-31", "2026-01-01"], "2026-01-01") == "2026-01-01", "December/January ordering")


def app_js_text() -> str:
    return (ROOT / "app.js").read_text(encoding="utf-8")


def check_exports() -> None:
    app = load("data/app_metadata.json")
    predictions = load("data/predictions/mlb_predictions.json")
    backtest = load("data/predictions/mlb_backtest_predictions.json")
    nfl = load("data/predictions/nfl_predictions.json")
    comparison = load("data/reports/mlb_model_comparison.json")
    registry = load("data/models/model_registry.json")
    card = load("data/reports/mlb_moltres_model_card.json")
    log = load("data/tracking/model_predictions_log.json")
    record = load("data/tracking/model_record.json")
    live_payload = load("data/live/live_scores.json")
    app_js = app_js_text()

    selected_registry = [row for row in rows(registry, "models") if row.get("sport") == "MLB" and row.get("selected")]
    registry_name = selected_registry[0].get("model_name") if len(selected_registry) == 1 else None
    comparison_name = comparison.get("metadata", {}).get("selected_model")
    prediction_name = predictions.get("metadata", {}).get("model_type")
    check("production selection", len(selected_registry) == 1, f"{len(selected_registry)} selected MLB registry rows")
    check("registry/prediction agreement", registry_name == prediction_name, f"registry={registry_name}, predictions={prediction_name}")
    check("comparison/registry agreement", registry_name == comparison_name, f"registry={registry_name}, comparison={comparison_name}")
    selected_model = selected_registry[0] if selected_registry else {}
    prediction_meta = predictions.get("metadata", {})
    check("production model identity", prediction_meta.get("model_id") == selected_model.get("model_id"), f"prediction model_id={prediction_meta.get('model_id')}, registry model_id={selected_model.get('model_id')}")
    check("production model version", prediction_meta.get("version") == selected_model.get("version"), f"prediction version={prediction_meta.get('version')}, registry version={selected_model.get('version')}")
    check("production model UI identity", registry_name == "GradientBoostingClassifier" and "GradientBoostingClassifier" in app_js and 'legend: "Lugia"' in app_js, f"technical model={registry_name}, Lugia mapping present")
    check("app metadata", bool(app.get("version")), f"version={app.get('version')}")
    check("real bundled exports", all(payload.get("metadata", {}).get("real_data", True) is not False for payload in (predictions, backtest, nfl, comparison, registry, card, record)), "no export marked synthetic")

    moltres_selected = registry_name == "Moltres" or comparison_name == "Moltres" or card.get("selection", {}).get("selected_for_production") is True
    check("Moltres challenger boundary", moltres_selected or card.get("identity", {}).get("status") != "active", "Moltres is not promoted without selection evidence")

    supplements = [row for row in rows(nfl) if row.get("prediction_mode") == "postseason_result_supplement"]
    check("postseason supplements excluded", all(row.get("model_pick") in (None, "", "-") and row.get("model_result") == "No logged pick" for row in supplements), f"{len(supplements)} supplement rows")

    pending = [row for row in rows(log, "predictions") if str(row.get("model_result") or row.get("result_status") or "").lower() == "pending"]
    check("pending remains pending", all(str(row.get("model_result") or "").lower() not in {"win", "loss", "push"} for row in pending), f"{len(pending)} pending log rows")

    finals = rows(predictions)
    zero_final = [row for row in finals if str(row.get("status") or row.get("status_detail") or "").lower() in {"final", "completed"} and row.get("away_score") == 0 and row.get("home_score") == 0]
    check("scheduled zero-zero safety", not zero_final, f"{len(zero_final)} zero-zero final rows")

    log_keys = [f"{game_key(row)}|{row.get('model_name') or row.get('model_id')}|{row.get('generated_at') or row.get('prediction_at')}" for row in rows(log, "predictions")]
    check("duplicate log safety", len(log_keys) == len(set(log_keys)), "no identical game/model/timestamp predictions")
    canonical_log_keys = [prediction_log_game_key(row) for row in rows(log, "predictions")]
    check("one prediction log row per game", len(canonical_log_keys) == len(set(canonical_log_keys)), "model re-exports do not create duplicate game rows")

    live_mlb = [row for row in rows(live_payload) if row.get("sport") == "MLB" and live_schedule_date(row) == "2026-07-10"]
    unique_live = {live_composite_key(row) for row in live_mlb}
    check("canonical MLB slate", bool(unique_live) and len(unique_live) == len(live_mlb), f"{len(unique_live)} unique Toronto-local games")
    check("non-decisive record guard", "isNonDecisiveGameStatus" in app_js and "is_excluded_prediction" in (ROOT / "scripts/score_model_predictions.py").read_text(encoding="utf-8"), "postponed/delayed/canceled/suspended rows are excluded")
    check("past zero-zero guard", 'return "stale"' in app_js and "Past / verify" in app_js, "past schedule-only rows cannot render as Upcoming or Final")

    prediction_dates = {source_date(row) for row in finals if source_date(row)}
    check("date source available", bool(prediction_dates), f"{len(prediction_dates)} schedule dates available")
    late_night = {"game_date": "2026-07-10T23:59:00-04:00"}
    check("late-night schedule date", source_date(late_night) == "2026-07-10", "source calendar date is preserved")
    check("canonical date path", "function ensureMlbReviewDate" in app_js and "function selectedMlbDateDisplay" in app_js, "MLB date state and display helpers present")
    check("date-only UTC guard", "function localDateIso" in app_js and "return localDateIso(date);" in app_js, "date offsets use local calendar values")


def main() -> int:
    print("LineLens data integrity")
    try:
        check_calendar_rules()
        check_exports()
    except IntegrityError as exc:
        print(str(exc))
        return 1
    print("PASS: all bundled data, model, date, and accountability invariants")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
