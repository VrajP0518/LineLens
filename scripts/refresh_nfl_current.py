"""Refresh current NFL fixtures independently of the historical model exporter.

Uses public nflverse schedule data; no API key or ML runtime is required.
Only previously published, pregame-safe predictions may join a fixture.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from src.shared.timezones import safe_zone
from src.nfl.pregame_policy import FEATURE_POLICY_VERSION, is_pregame_feature

URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
OUTPUT = ROOT / "data/predictions/nfl_current.json"
EASTERN = safe_zone("America/New_York")


def utc(value: str | None) -> datetime | None:
    try:
        result = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return result.astimezone(timezone.utc) if result.tzinfo else None
    except (TypeError, ValueError):
        return None


def number(value):
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def publication_reason(row: dict, kickoff: datetime) -> str | None:
    if row.get("prediction_mode") != "current" or row.get("publication_status") != "published":
        return "No published pregame prediction"
    policy = row.get("model_validation") or {}
    if not isinstance(policy, dict):
        return "Invalid model validation metadata"
    if policy.get("feature_policy_version") != FEATURE_POLICY_VERSION or policy.get("review_status") != "approved":
        return "Pregame model validation requires review"
    features = policy.get("features") or []
    if not isinstance(features, list) or not features or not all(isinstance(name, str) and is_pregame_feature(name) for name in features):
        return "Model uses unverified or postgame features"
    for field in ("generated_at", "feature_cutoff_at", "model_trained_at"):
        stamp = utc(row.get(field))
        if stamp is None or stamp >= kickoff:
            return "No verified prediction snapshot before kickoff"
    if utc(row['feature_cutoff_at']) > utc(row['generated_at']) or utc(row['model_trained_at']) > utc(row['generated_at']):
        return "Prediction predates its features or model"
    probability = number(row.get("home_cover_probability", row.get("model_home_cover")))
    if probability is None or not 0 <= probability <= 1 or number(row.get("spread_line")) is None:
        return "Prediction probability or spread is missing"
    return None


def build_payload(schedule: list[dict], predictions: list[dict], now: datetime) -> dict:
    local_today = now.astimezone(EASTERN).date()
    season = local_today.year - (local_today.month < 3)
    lookup = {str(row.get("id") or row.get("game_id")): row for row in predictions}
    games = []
    for row in schedule:
        if str(row.get("season")) != str(season) or row.get("game_type") not in {"REG", "WC", "DIV", "CON", "SB"}:
            continue
        try:
            day = datetime.strptime(row["gameday"], "%Y-%m-%d").date()
            if not local_today - timedelta(days=7) <= day <= local_today + timedelta(days=14):
                continue
            kickoff = datetime.strptime(f"{row['gameday']} {row['gametime']}", "%Y-%m-%d %H:%M").replace(tzinfo=EASTERN).astimezone(timezone.utc)
        except (KeyError, TypeError, ValueError):
            continue
        home_score, away_score = number(row.get("home_score")), number(row.get("away_score"))
        completed = home_score is not None and away_score is not None and kickoff < now
        status = "Final" if completed else "Scheduled" if kickoff > now else "Awaiting score update"
        prediction = lookup.get(row["game_id"], {})
        reason = publication_reason(prediction, kickoff)
        if reason is None and (prediction.get("home") != row["home_team"] or prediction.get("away") != row["away_team"]):
            reason = "Prediction teams do not match the schedule"
        probability = None if reason else number(prediction.get("home_cover_probability", prediction.get("model_home_cover")))
        games.append({
            "id": row["game_id"], "sport": "NFL", "season": season, "week": int(row["week"]),
            "game_date": day.isoformat(), "game_time": kickoff.isoformat().replace("+00:00", "Z"),
            "home": row["home_team"], "away": row["away_team"], "venue": row.get("stadium"),
            "neutral_site": row.get("location") == "Neutral", "status": status, "status_detail": status,
            "completed": completed, "home_score": home_score, "away_score": away_score,
            "source": "nflverse schedules", "source_timestamp": now.isoformat(),
            "reference_home_spread": -number(row.get("spread_line")) if number(row.get("spread_line")) is not None else None,
            "spread_line": prediction.get("spread_line") if not reason else None,
            "home_cover_probability": probability, "model_home_cover": probability,
            "model_pick": (row["home_team"] if probability >= .5 else row["away_team"]) if probability is not None else "-",
            "prediction_mode": "current" if not reason else "schedule_only",
            "publication_status": "published" if not reason else "unavailable",
            "prediction_reason": reason, "prediction_generated_at": prediction.get("generated_at") if not reason else None,
        })
    games.sort(key=lambda game: game["game_time"])
    published = sum(game["publication_status"] == "published" for game in games)
    return {"metadata": {"schema_version": 1, "sport": "NFL", "season": season,
            "generated_at": now.isoformat().replace("+00:00", "Z"), "source": URL,
            "source_status": "schedule_current", "freshness_threshold_seconds": 21600,
            "real_data": True, "row_count": len(games), "published_predictions": published,
            "prediction_status": "available" if published else "requires_pregame_model",
            "prediction_note": "Current predictions require a reviewed pregame-only model and a timestamped snapshot before kickoff. Historical model outputs are not current picks."}, "games": games}


def refresh(now=None, output=OUTPUT) -> dict:
    now = now or datetime.now(timezone.utc)
    try:
        request = Request(URL, headers={"User-Agent": "LineLens/6 NFL schedule"})
        with urlopen(request, timeout=20) as response:
            schedule = list(csv.DictReader(io.StringIO(response.read().decode("utf-8-sig"))))
        if not schedule or not {"game_id", "gameday", "gametime", "home_team", "away_team"}.issubset(schedule[0]):
            raise ValueError("Schedule response has no valid game rows")
        historical = ROOT / "data/predictions/nfl_predictions.json"
        predictions = json.loads(historical.read_text(encoding="utf-8")).get("games", []) if historical.exists() else []
        payload = build_payload(schedule, predictions, now)
    except Exception as exc:
        payload = json.loads(output.read_text(encoding="utf-8")) if output.exists() else {"metadata": {}, "games": []}
        payload["metadata"].update(source_status="cached" if payload["games"] else "unavailable", last_attempt_at=now.isoformat(), error=f"{type(exc).__name__}: NFL schedule could not be refreshed")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, allow_nan=False), encoding="utf-8")
    output.with_suffix(".js").write_text("window.__NFL_CURRENT__ = " + json.dumps(payload, separators=(",", ":"), allow_nan=False) + ";\n", encoding="utf-8")
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", help="UTC ISO timestamp for reproducible validation")
    args = parser.parse_args()
    as_of = utc(args.as_of) if args.as_of else None
    if args.as_of and as_of is None:
        parser.error("--as-of must be an ISO timestamp with an explicit timezone")
    result = refresh(as_of)
    print(json.dumps(result["metadata"], indent=2))
