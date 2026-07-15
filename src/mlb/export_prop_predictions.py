"""Export current MLB player-prop projections when research artifacts exist."""

from __future__ import annotations

import json
import math
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
CURRENT_FEATURES = ROOT / "data" / "processed" / "mlb" / "mlb_player_props_current.csv"
HISTORICAL_FEATURES = ROOT / "data" / "processed" / "mlb" / "mlb_player_props.csv"
PLAYER_PROPS = ROOT / "data" / "odds" / "player_props.json"
LIVE_JSON = ROOT / "data" / "live" / "live_scores.json"
OUTPUT_JSON = ROOT / "data" / "predictions" / "mlb_prop_predictions.json"
OUTPUT_JS = ROOT / "data" / "predictions" / "mlb_prop_predictions.js"
DIAGNOSTICS_JSON = ROOT / "data" / "odds" / "props_matching_diagnostics.json"
DIAGNOSTICS_JS = ROOT / "data" / "odds" / "props_matching_diagnostics.js"
MODEL_DIR = ROOT / "models"
TARGETS = ("pitcher_strikeouts", "batter_hits", "batter_total_bases")
ALLOWED_AVAILABILITY = {"expected_active", "confirmed_active", "active", "confirmed_start", "confirmed_lineup"}
INTERNAL_THRESHOLDS = {"batter_hits": 0.5, "batter_total_bases": 1.5}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def write(payload: dict[str, Any]) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(text + "\n", encoding="utf-8")
    OUTPUT_JS.write_text(f"window.__MLB_PROP_PREDICTIONS__ = {text};\n", encoding="utf-8")


def write_diagnostics(payload: dict[str, Any]) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    DIAGNOSTICS_JSON.write_text(text + "\n", encoding="utf-8")
    DIAGNOSTICS_JS.write_text(f"window.__PROPS_MATCHING_DIAGNOSTICS__ = {text};\n", encoding="utf-8")


def update_diagnostics(markets: list[dict[str, Any]], candidate_count: int, published_count: int, rejection_reasons: dict[str, int]) -> None:
    diagnostics = load(DIAGNOSTICS_JSON, {"metadata": {"generated_at": now()}, "sports": {}})
    diagnostics.setdefault("metadata", {})["mlb_prediction_exported_at"] = now()
    diagnostics.setdefault("sports", {})["MLB"] = {
        **diagnostics.get("sports", {}).get("MLB", {}),
        "market_rows_available": len(markets),
        "players_matched": candidate_count,
        "model_projections_generated": candidate_count,
        "qualified_props_published": published_count,
        "rejection_reason_totals": rejection_reasons,
    }
    write_diagnostics(diagnostics)


def implied(price: Any) -> float | None:
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
    sigma = max(float(sigma), 0.25)
    return max(0.001, min(0.999, 0.5 * (1 + math.erf(((projection - line) / sigma) / math.sqrt(2)))))


def clean_value(value: Any) -> Any:
    try:
        return None if pd.isna(value) else value
    except (TypeError, ValueError):
        return value


def qualifies(row: dict[str, Any]) -> bool:
    try:
        interval = float(row["upper_projection"]) - float(row["lower_projection"])
        return float(row["probability"]) >= 0.55 and float(row["edge"]) >= 0.03 and interval <= max(4, abs(float(row["line"])) * 1.2) and str(row.get("availability_status") or "").lower() in ALLOWED_AVAILABILITY and str(row.get("freshness_status") or "").lower() == "current"
    except (TypeError, ValueError, KeyError):
        return False


def upcoming_mlb_games() -> list[dict[str, Any]]:
    payload = load(LIVE_JSON, {})
    games = payload.get("games", []) if isinstance(payload, dict) else []
    today = datetime.now(timezone.utc).date().isoformat()
    output = []
    for game in games:
        if str(game.get("sport") or "").upper() != "MLB":
            continue
        game_date = str(game.get("game_date") or "")[:10]
        status = str(game.get("status") or game.get("status_detail") or "").lower()
        if not game_date or game_date < today or any(marker in status for marker in ("final", "completed", "postponed", "canceled", "cancelled", "suspended")):
            continue
        if not game.get("game_id") or not game.get("home") or not game.get("away"):
            continue
        output.append(game)
    return sorted(output, key=lambda row: (str(row.get("game_date") or ""), str(row.get("game_time") or ""), str(row.get("game_id") or "")))


def model_only_candidates(frame: pd.DataFrame) -> list[dict[str, Any]]:
    """Create real model projections when no bookmaker line is posted yet.

    These rows are deliberately not publishable picks. They join real upcoming
    schedule rows to each team's latest real player-game feature row and expose
    only the trained model's numeric projection. No line, odds, probability,
    availability, or lineup state is inferred.
    """

    if frame.empty or "game_date" not in frame.columns:
        return []
    games = upcoming_mlb_games()
    if not games:
        return []
    batter_targets = ("batter_hits", "batter_total_bases")
    candidates: list[dict[str, Any]] = []
    for target in batter_targets:
        model_path = MODEL_DIR / f"mlb_prop_{target}_v1.joblib"
        if not model_path.exists():
            continue
        bundle = __import__("joblib").load(model_path)
        if "target_stat" not in frame.columns:
            continue
        target_rows = frame[frame["target_stat"].astype(str) == target].copy()
        if "player_role" in target_rows.columns:
            target_rows = target_rows[target_rows["player_role"].astype(str).str.casefold() == "batter"]
        if target_rows.empty:
            continue
        target_rows["game_date"] = target_rows["game_date"].astype(str).str[:10]
        target_rows = target_rows.sort_values(["game_date", "game_id", "player_id"])
        for game in games:
            for team, opponent, is_home in ((game.get("home"), game.get("away"), 1), (game.get("away"), game.get("home"), 0)):
                team_rows = target_rows[target_rows["team"].astype(str).str.upper() == str(team).upper()]
                if team_rows.empty:
                    continue
                latest_rows = team_rows.groupby("player_id", as_index=False, sort=False).tail(1)
                for _, source_row in latest_rows.iterrows():
                    try:
                        sample_size = float(source_row.get("sample_size_pre"))
                    except (TypeError, ValueError):
                        sample_size = None
                    if sample_size is not None and sample_size < 5:
                        continue
                    feature_row = source_row.copy()
                    feature_row["home"] = is_home
                    try:
                        latest_date = datetime.fromisoformat(str(source_row.get("game_date"))[:10]).date()
                        future_date = datetime.fromisoformat(str(game.get("game_date"))[:10]).date()
                        feature_row["rest_days"] = max(0, (future_date - latest_date).days)
                        with warnings.catch_warnings():
                            warnings.simplefilter("ignore", UserWarning)
                            projection = float(bundle["model"].predict(feature_row[bundle["feature_columns"]].to_frame().T)[0])
                    except (KeyError, TypeError, ValueError):
                        continue
                    player_id = str(source_row.get("player_id") or "")
                    game_id = str(game.get("game_id"))
                    candidates.append({
                        "prediction_id": f"mlb-model-only:{game_id}:{player_id}:{target}",
                        "sport": "MLB",
                        "event_id": f"mlb-schedule:{game_id}",
                        "game_id": game_id,
                        "game_date": game.get("game_date"),
                        "game_time": game.get("game_time"),
                        "player_id": player_id or None,
                        "player_name": source_row.get("player_name"),
                        "team": team,
                        "opponent": opponent,
                        "market_key": target,
                        "side": "Projection",
                        "line": None,
                        "original_line": None,
                        "projection": round(projection, 3),
                        "lower_projection": None,
                        "upper_projection": None,
                        "sigma": None,
                        "projection_uncertainty": None,
                        "probability": None,
                        "implied_probability": None,
                        "edge": None,
                        "over_price": None,
                        "under_price": None,
                        "original_price": None,
                        "odds_snapshot_at": None,
                        "original_odds_snapshot_at": None,
                        "bookmaker_update_at": None,
                        "bookmaker": None,
                        "provider": "LineLens model projection",
                        "model_id": bundle.get("model_id"),
                        "model_version": "v1",
                        "data_quality": "real_mlb_player_features_and_upcoming_schedule",
                        "availability_status": "unknown",
                        "freshness_status": "feature_snapshot",
                        "publication_rank": None,
                        "publication_timestamp": now(),
                        "prediction_timestamp": now(),
                        "status": "Pending",
                        "candidate_only": True,
                        "model_only": True,
                        "candidate_reason": "Real model projection only. No current bookmaker line, lineup confirmation, or player availability state was returned.",
                        "feature_as_of": str(source_row.get("game_date"))[:10],
                        "model_rmse": model_rmse(target),
                    })
    unique = {row["prediction_id"]: row for row in candidates}
    # Keep the page useful without turning it into a wall of every roster row.
    return sorted(unique.values(), key=lambda row: (str(row.get("game_date") or ""), -float(row.get("projection") or 0)))[:20]


def model_rmse(target: str) -> float | None:
    registry = load(ROOT / "data" / "reports" / "mlb_prop_model_registry.json", {})
    for entry in registry.get("models", []) if isinstance(registry, dict) else []:
        if entry.get("target_stat") != target:
            continue
        try:
            value = float(entry.get("metrics", {}).get("rmse"))
            return value if value > 0 else None
        except (TypeError, ValueError):
            return None
    return None


def model_only_picks(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Derive clearly labeled internal-threshold picks from real regressors.

    These are model picks, not sportsbook picks. The thresholds are fixed by
    the baseball stat definition (at least one hit; at least two total bases),
    and probability uses the model's real chronological holdout RMSE. No
    bookmaker price, market edge, or current line is inferred.
    """

    picks: list[dict[str, Any]] = []
    for row in candidates:
        target = str(row.get("market_key") or "")
        threshold = INTERNAL_THRESHOLDS.get(target)
        sigma = row.get("model_rmse")
        projection = row.get("projection")
        if threshold is None or sigma is None or projection is None:
            continue
        try:
            over_probability = probability_over(float(projection), threshold, float(sigma))
        except (TypeError, ValueError):
            continue
        side = "Over" if over_probability >= 0.5 else "Under"
        probability = over_probability if side == "Over" else 1 - over_probability
        picks.append({
            **row,
            "prediction_id": f"{row.get('prediction_id')}:model-pick",
            "side": side,
            "line": None,
            "original_line": None,
            "probability": round(probability, 6),
            "model_probability": round(probability, 6),
            "model_probability_type": "normal_residual_approximation_from_chronological_rmse",
            "model_threshold": threshold,
            "threshold_label": "LineLens internal threshold",
            "model_only_pick": True,
            "candidate_only": False,
            "candidate_reason": "Internal model threshold only. No bookmaker line, odds, lineup confirmation, or availability state was returned.",
            "status": "Pending",
        })
    return sorted(picks, key=lambda row: (float(row.get("probability") or 0), float(row.get("projection") or 0)), reverse=True)[:10]


def empty(status: str, note: str) -> dict[str, Any]:
    return {"metadata": {"sport": "MLB", "version": "v1", "generated_at": now(), "real_data": False, "status": status, "markets": list(TARGETS), "candidate_count": 0, "model_pick_count": 0, "excluded_candidate_counts": {status: 0}, "note": note}, "predictions": [], "candidate_predictions": [], "model_picks": []}


def main() -> int:
    feature_path = CURRENT_FEATURES if CURRENT_FEATURES.exists() else HISTORICAL_FEATURES
    if not feature_path.exists():
        payload = empty("model_not_trained", "MLB player-game features are unavailable. Supply a real player-game export and run the manual dataset and training commands.")
        write(payload)
        update_diagnostics([], 0, 0, {"model_not_trained": 0})
        print(json.dumps(payload["metadata"], indent=2))
        return 0
    props = load(PLAYER_PROPS, {})
    markets = [row for row in props.get("markets", []) if str(row.get("sport") or "").upper() == "MLB"]
    frame = pd.read_csv(feature_path)
    candidates: list[dict[str, Any]] = []
    for target in TARGETS:
        model_path = MODEL_DIR / f"mlb_prop_{target}_v1.joblib"
        if not model_path.exists():
            continue
        bundle = __import__("joblib").load(model_path)
        matching = [row for row in markets if row.get("market_key") == target]
        for market in matching:
            player_id = str(market.get("normalized_player_id") or market.get("player_id") or "")
            rows = frame[frame["player_id"].astype(str) == player_id] if player_id else frame.iloc[0:0]
            if rows.empty:
                rows = frame[frame["player_name"].astype(str).str.casefold() == str(market.get("player_name") or "").casefold()]
            rows = rows[rows["target_stat"].astype(str) == target] if not rows.empty and "target_stat" in rows.columns else rows
            if rows.empty:
                continue
            row = rows.sort_values(["game_date", "game_id"]).iloc[-1]
            features = bundle["feature_columns"]
            projection = float(bundle["model"].predict(row[features].to_frame().T)[0])
            line = float(market["line"])
            sigma = max(0.25, abs(projection - float(row.get("rolling_5") or projection)))
            over_probability = probability_over(projection, line, sigma)
            side = "Over" if over_probability >= 0.5 else "Under"
            price = market.get("over_price" if side == "Over" else "under_price")
            implied_probability = implied(price)
            candidates.append({"prediction_id": f"mlb-prop:{market.get('provider_event_id')}:{player_id or market.get('player_name')}:{target}:{line}", "sport": "MLB", "event_id": market.get("provider_event_id"), "game_id": market.get("game_id"), "game_date": market.get("game_date"), "game_time": market.get("game_time"), "player_id": player_id or None, "player_name": market.get("player_name"), "team": clean_value(row.get("team")) or market.get("team"), "opponent": clean_value(row.get("opponent")) or market.get("opponent"), "market_key": target, "side": side, "line": line, "original_line": line, "projection": round(projection, 3), "lower_projection": round(projection - 1.28 * sigma, 3), "upper_projection": round(projection + 1.28 * sigma, 3), "sigma": round(sigma, 3), "projection_uncertainty": round(sigma, 3), "probability": round(over_probability if side == "Over" else 1 - over_probability, 6), "implied_probability": implied_probability, "edge": round((over_probability if side == "Over" else 1 - over_probability) - implied_probability, 6) if implied_probability is not None else None, "over_price": market.get("over_price"), "under_price": market.get("under_price"), "original_price": price, "odds_snapshot_at": market.get("snapshot_at"), "original_odds_snapshot_at": market.get("snapshot_at"), "bookmaker_update_at": market.get("bookmaker_update_at"), "bookmaker": market.get("bookmaker"), "provider": market.get("provider", "The Odds API"), "model_id": bundle.get("model_id"), "model_version": "v1", "data_quality": "real_mlb_player_features_and_current_line", "availability_status": market.get("availability_status", "unknown"), "freshness_status": market.get("freshness_status", "Unavailable"), "publication_rank": None, "prediction_timestamp": now(), "status": "Pending"})
    if not markets:
        candidates.extend(model_only_candidates(frame))
    unique = {row["prediction_id"]: row for row in candidates}
    candidates = [{**row, "candidate_only": True, "candidate_reason": row.get("candidate_reason") or "MLB lineup or starter confirmation is required before publication."} for row in unique.values()]
    model_picks = model_only_picks(candidates)
    predictions = [row for row in sorted(candidates, key=lambda item: (float(item.get("probability") or 0), float(item.get("edge") or 0)), reverse=True) if qualifies(row)][:10]
    reasons = {}
    for row in candidates:
        reason = "market_unavailable" if row.get("model_only") else "model_not_trained" if not (MODEL_DIR / f"mlb_prop_{row['market_key']}_v1.joblib").exists() else "availability_unknown" if str(row.get("availability_status") or "").lower() not in ALLOWED_AVAILABILITY else "quality_threshold"
        reasons[reason] = reasons.get(reason, 0) + 1
    has_artifact = any((MODEL_DIR / f"mlb_prop_{target}_v1.joblib").exists() for target in TARGETS)
    status = "success" if predictions else "success_with_candidates" if candidates and not any(row.get("model_only") for row in candidates) else "model_only_projections" if candidates else "model_not_trained" if not has_artifact else "no_market_available" if not markets else "no_qualified_props"
    if status == "model_not_trained" and feature_path.exists():
        note = "MLB player-game features are present, but no trained MLB prop artifact is available. Run npm run train:mlb:props before exporting projections."
    elif status == "no_market_available":
        note = "The Odds API returned no current MLB player-prop market rows for the matched event. The model and player-game features are ready; no prop is displayed until a real line is returned."
    elif status == "model_only_projections":
        note = "No current MLB player-prop market rows were returned. Real upcoming MLB schedule rows and trained player models produced projection-only candidates; no line, odds, probability, or availability state was inferred."
    else:
        note = "MLB player projections remain research candidates until a real player-game model and lineup/starter availability state are available."
    payload = {"metadata": {"sport": "MLB", "version": "v1", "generated_at": now(), "real_data": bool(predictions or candidates or model_picks), "status": status, "markets": list(TARGETS), "candidate_count": len(candidates), "model_pick_count": len(model_picks), "excluded_candidate_counts": reasons, "qualification": {"minimum_probability": 0.55, "minimum_edge": 0.03, "publication_requires": ["real line and odds", "matched player", "confirmed lineup or starter state", "fresh snapshot", "validated model artifact"]}, "model_pick_policy": {"thresholds": INTERNAL_THRESHOLDS, "probability": "chronological holdout RMSE residual approximation", "market_edge": "not available without a bookmaker line", "availability": "not inferred"}, "note": note}, "predictions": predictions, "candidate_predictions": candidates, "model_picks": model_picks}
    write(payload)
    update_diagnostics(markets, len(candidates), len(predictions), reasons)
    print(json.dumps(payload["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
