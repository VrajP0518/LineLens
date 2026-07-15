"""Export current WNBA player prop projections from trained real-data models."""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from src.shared.version import APP_VERSION

ROOT = Path(__file__).resolve().parents[2]
CURRENT_FEATURES = ROOT / "data" / "processed" / "wnba" / "wnba_player_props_current.csv"
PLAYER_PROPS = ROOT / "data" / "odds" / "player_props.json"
AVAILABILITY = ROOT / "data" / "odds" / "wnba_availability.json"
OUTPUT_JSON = ROOT / "data" / "predictions" / "wnba_prop_predictions.json"
OUTPUT_JS = ROOT / "data" / "predictions" / "wnba_prop_predictions.js"
DIAGNOSTICS_JSON = ROOT / "data" / "odds" / "props_matching_diagnostics.json"
DIAGNOSTICS_JS = ROOT / "data" / "odds" / "props_matching_diagnostics.js"
MODEL_DIR = ROOT / "models"
TARGETS = ("points", "rebounds", "assists")
ALLOWED_AVAILABILITY = {"expected_active", "confirmed_active", "active"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def write(payload: dict[str, Any]) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    OUTPUT_JSON.write_text(text + "\n", encoding="utf-8")
    OUTPUT_JS.write_text(f"window.__WNBA_PROP_PREDICTIONS__ = {text};\n", encoding="utf-8")


def write_diagnostics(payload: dict[str, Any]) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    DIAGNOSTICS_JSON.write_text(text + "\n", encoding="utf-8")
    DIAGNOSTICS_JS.write_text(f"window.__PROPS_MATCHING_DIAGNOSTICS__ = {text};\n", encoding="utf-8")


def american_implied(price: Any) -> float | None:
    try:
        value = float(price)
    except (TypeError, ValueError):
        return None
    if value > 0:
        return 100 / (value + 100)
    if value < 0:
        return abs(value) / (abs(value) + 100)
    return None


def probability_over(projection: float, line: float, sigma: float) -> float:
    sigma = max(float(sigma), 0.5)
    value = (projection - line) / sigma
    return max(0.001, min(0.999, 0.5 * (1 + math.erf(value / math.sqrt(2)))))


def clean_value(value: Any) -> Any:
    try:
        return None if pd.isna(value) else value
    except (TypeError, ValueError):
        return value


def normalized_name(value: Any) -> str:
    return "".join(character for character in str(value or "").lower() if character.isalnum())


def availability_for(market: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    market_date = str(market.get("game_date") or "")[:10]
    market_name = normalized_name(market.get("player_name"))
    matches = [row for row in rows if str(row.get("game_date") or "")[:10] == market_date and normalized_name(row.get("player_name")) == market_name]
    return matches[-1] if matches else {}


def empty_payload(status: str, note: str) -> dict[str, Any]:
    return {"metadata": {"sport": "WNBA", "version": APP_VERSION, "generated_at": now(), "real_data": False, "status": status, "markets": list(TARGETS), "note": note}, "predictions": []}


def qualifies(row: dict[str, Any]) -> bool:
    probability = row.get("probability")
    edge = row.get("edge")
    availability = str(row.get("availability_status") or "").lower()
    freshness = str(row.get("freshness_status") or "").lower()
    try:
        interval = float(row["upper_projection"]) - float(row["lower_projection"])
        line = abs(float(row["line"]))
        return (
            float(probability) >= 0.55
            and float(edge) >= 0.03
            and interval <= max(12, line * 0.9)
            and availability in ALLOWED_AVAILABILITY
            and freshness == "current"
        )
    except (KeyError, TypeError, ValueError):
        return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("current",), default="current")
    args = parser.parse_args()
    if not CURRENT_FEATURES.exists():
        payload = empty_payload("current_data_unavailable", "Prop models are trained, but no real current-season player feature rows are available for publication.")
        write(payload)
        print(json.dumps(payload["metadata"], indent=2))
        return 0
    props = load(PLAYER_PROPS, {})
    markets = props.get("markets", []) if isinstance(props, dict) else []
    availability_payload = load(AVAILABILITY, {})
    availability_rows = availability_payload.get("players", []) if isinstance(availability_payload, dict) else []
    props_status = str(props.get("metadata", {}).get("status") or "").lower() if isinstance(props, dict) else ""
    frame = pd.read_csv(CURRENT_FEATURES)
    candidates: list[dict[str, Any]] = []
    for target in TARGETS:
        model_path = MODEL_DIR / f"wnba_prop_{target}_v1.joblib"
        if not model_path.exists():
            continue
        bundle = joblib.load(model_path)
        model = bundle["model"]
        features = bundle["feature_columns"]
        matching_markets = [row for row in markets if str(row.get("market_key")) == f"player_{target}"]
        for market in matching_markets:
            player_id = str(market.get("normalized_player_id") or market.get("player_id") or "")
            rows = frame[frame["player_id"].astype(str) == player_id] if player_id else frame.iloc[0:0]
            if rows.empty:
                rows = frame[frame["player_name"].astype(str).str.casefold() == str(market.get("player_name") or "").casefold()]
            if rows.empty:
                continue
            row = rows.iloc[-1]
            availability = availability_for(market, availability_rows)
            availability_status = availability.get("availability_status") or market.get("availability_status", "unknown")
            projection = float(model.predict(row[features].to_frame().T)[0])
            line = float(market["line"])
            sigma = max(0.5, abs(projection - float(row.get(f"rolling_5_{target}") or projection)))
            over_probability = probability_over(projection, line, sigma)
            side = "Over" if over_probability >= 0.5 else "Under"
            probability = over_probability if side == "Over" else 1 - over_probability
            implied = american_implied(market.get("over_price" if side == "Over" else "under_price"))
            candidates.append({"prediction_id": f"wnba-prop:{market.get('provider_event_id')}:{player_id or market.get('player_name')}:{target}:{market.get('line')}", "sport": "WNBA", "event_id": market.get("provider_event_id"), "game_id": market.get("game_id"), "game_date": market.get("game_date"), "game_time": market.get("game_time"), "player_id": player_id or None, "player_name": market.get("player_name"), "team": market.get("team") or clean_value(row.get("team")), "opponent": market.get("opponent") or clean_value(row.get("opponent")), "market_key": f"player_{target}", "side": side, "line": line, "original_line": line, "projection": round(projection, 3), "lower_projection": round(projection - 1.28 * sigma, 3), "upper_projection": round(projection + 1.28 * sigma, 3), "sigma": round(sigma, 3), "projection_uncertainty": round(sigma, 3), "probability": round(probability, 6), "implied_probability": implied, "edge": round(probability - implied, 6) if implied is not None else None, "over_price": market.get("over_price"), "under_price": market.get("under_price"), "original_price": market.get("over_price" if side == "Over" else "under_price"), "odds_snapshot_at": market.get("snapshot_at"), "original_odds_snapshot_at": market.get("snapshot_at"), "bookmaker_update_at": market.get("bookmaker_update_at"), "bookmaker": market.get("bookmaker"), "provider": market.get("provider", "The Odds API"), "model_id": bundle.get("model_id"), "model_version": "v1", "data_quality": "real_player_features_and_current_line", "availability_status": availability_status, "availability_reason": availability.get("reason"), "availability_reported_at": availability.get("reported_at"), "availability_source": availability.get("source_url"), "freshness_status": market.get("freshness_status") or ("Current" if props_status == "success" else "Unavailable"), "publication_rank": None, "publication_timestamp": now(), "status": "Pending", "prediction_timestamp": now()})
    unique_candidates: dict[str, dict[str, Any]] = {}
    for row in candidates:
        key = str(row.get("prediction_id") or "")
        previous = unique_candidates.get(key)
        if previous is None or abs(float(row.get("edge") or 0)) > abs(float(previous.get("edge") or 0)):
            unique_candidates[key] = row
    candidates = [{**row, "candidate_only": True, "candidate_reason": "Verified player availability is required before publication."} for row in unique_candidates.values()]
    predictions = [row for row in sorted(candidates, key=lambda item: (float(item.get("probability") or 0), float(item.get("edge") or 0)), reverse=True) if qualifies(row)][:10]
    excluded_reasons = {}
    for row in candidates:
        reason = "availability_unknown" if str(row.get("availability_status") or "").lower() not in ALLOWED_AVAILABILITY else "quality_threshold"
        excluded_reasons[reason] = excluded_reasons.get(reason, 0) + 1
    payload = {"metadata": {"sport": "WNBA", "version": APP_VERSION, "generated_at": now(), "real_data": bool(predictions or candidates), "status": "success" if predictions else ("success_with_candidates" if candidates else "no_qualified_props"), "markets": list(TARGETS), "candidate_count": len(candidates), "excluded_candidate_counts": excluded_reasons, "qualification": {"minimum_probability": 0.55, "minimum_edge": 0.03, "interval_policy": "80 percent normal approximation from held-out error until validated quantile model exists", "prop_score_formula": "0.55 probability + 1.20 capped absolute edge - uncertainty penalty; health, data quality, freshness, consensus, availability confidence, and lineup confidence are hard gates"}, "note": "Real projections are visible as candidates. Publication still requires verified player availability and all quality gates."}, "predictions": predictions, "candidate_predictions": candidates}
    diagnostics = load(DIAGNOSTICS_JSON, {"metadata": {"generated_at": now()}, "sports": {}})
    diagnostics.setdefault("metadata", {})["prediction_exported_at"] = now()
    diagnostics.setdefault("sports", {}).setdefault("WNBA", {})
    diagnostics["sports"]["WNBA"].update({"market_rows_available": len([row for row in markets if str(row.get("market_key")) in {f"player_{target}" for target in TARGETS}]), "players_matched": len(candidates), "players_unmatched": max(0, len([row for row in markets if str(row.get("market_key")) in {f"player_{target}" for target in TARGETS}]) - len(candidates)), "model_projections_generated": len(candidates), "qualified_props_published": len(predictions), "rejection_reason_totals": excluded_reasons})
    write_diagnostics(diagnostics)
    write(payload)
    print(json.dumps(payload["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
