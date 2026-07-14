"""Export WNBA model probabilities for current games or a held-out season."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from src.shared.export_utils import safe_float, write_json_and_js
from src.shared.modeling import clean_numeric_frame, confidence_bucket
from src.shared.paths import PREDICTIONS_DIR, ROOT
from src.shared.version import APP_NAME, APP_VERSION

MODEL_PATH = ROOT / "models" / "wnba_moneyline_model.joblib"
PREDICTION_JSON = PREDICTIONS_DIR / "wnba_predictions.json"
PREDICTION_JS = PREDICTIONS_DIR / "wnba_predictions.js"
BACKTEST_JSON = PREDICTIONS_DIR / "wnba_backtest_predictions.json"
BACKTEST_JS = PREDICTIONS_DIR / "wnba_backtest_predictions.js"
LOG_JSON = ROOT / "data" / "tracking" / "model_predictions_log.json"
LOG_JS = ROOT / "data" / "tracking" / "model_predictions_log.js"


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def result(row: pd.Series) -> str:
    if pd.isna(row.get("home_win")):
        return "Pending"
    return "Home won" if int(row["home_win"]) == 1 else "Away won"


def export(frame: pd.DataFrame, artifact: dict[str, Any], mode: str, season: int | None) -> dict[str, Any]:
    features = artifact["feature_columns"]
    valid = frame.copy()
    probabilities = artifact["model"].predict_proba(clean_numeric_frame(valid, features))[:, 1]
    games = []
    for (_, row), probability in zip(valid.iterrows(), probabilities):
        probability = float(probability)
        pick = row["home"] if probability >= 0.5 else row["away"]
        confidence_score = max(probability, 1 - probability)
        actual = result(row)
        model_result = "Pending" if actual == "Pending" else ("Won" if (pick == row["home"] and actual == "Home won") or (pick == row["away"] and actual == "Away won") else "Lost")
        games.append({
            "sport": "WNBA", "season": int(row["season"]), "game_date": str(row["game_date"])[:10], "game_id": str(row["game_id"]), "generated_at": now(),
            "home": row["home"], "away": row["away"], "home_display": row.get("home_display") or row["home"], "away_display": row.get("away_display") or row["away"],
            "home_score": safe_float(row.get("home_score")), "away_score": safe_float(row.get("away_score")), "status": row.get("status") or "Scheduled",
            "home_win_probability": probability, "away_win_probability": 1 - probability, "model_pick": pick,
            "confidence": confidence_bucket(confidence_score), "confidence_score": confidence_score, "model_name": artifact["model_name"], "model_id": artifact["model_id"],
            "prediction_mode": mode, "prediction_available": True, "edge": None, "moneyline_home": None, "moneyline_away": None,
            "result": actual, "model_result": model_result, "completed": actual != "Pending", "source": "ESPN WNBA scoreboard + LineLens model",
            "top_factor_label": "Pregame Elo and recent team form", "trend": {"labels": ["Elo", "Recent form", "Scoring margin", "Rest"], "home": [], "away": []},
        })
    return {"metadata": {"sport": "WNBA", "app": APP_NAME, "version": APP_VERSION, "generated_at": now(), "model_type": artifact["model_name"], "model_id": artifact["model_id"], "target": "home_win", "row_count": len(games), "real_data": True, "prediction_mode": mode, "season": season, "data_quality": "score_only_team_form_elo", "odds_status": "Not used in WNBA MVP."}, "games": games}


def append_tracking(games: list[dict[str, Any]]) -> None:
    try:
        payload = json.loads(LOG_JSON.read_text(encoding="utf-8")) if LOG_JSON.exists() else {"predictions": []}
    except json.JSONDecodeError:
        payload = {"predictions": []}
    rows = payload.get("predictions") or payload.get("games") or []
    known = {(row.get("sport"), row.get("game_id"), row.get("model_id")): index for index, row in enumerate(rows)}
    for game in games:
        key = (game.get("sport"), game.get("game_id"), game.get("model_id"))
        if key not in known:
            rows.append(game)
            known[key] = len(rows) - 1
        elif str(rows[known[key]].get("model_result") or "").lower() not in {"win", "won", "loss", "lost", "push"}:
            rows[known[key]] = {**rows[known[key]], **game}
    payload["predictions"] = rows
    payload["generated_at"] = now()
    write_json_and_js(payload, LOG_JSON, LOG_JS, "__MODEL_PREDICTIONS_LOG__")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["export", "backtest"])
    parser.add_argument("--features-file", default="data/processed/wnba/wnba_current_features.csv")
    parser.add_argument("--model-file", default="models/wnba_moneyline_model.joblib")
    parser.add_argument("--season", type=int)
    args = parser.parse_args()
    feature_path = ROOT / args.features_file
    model_path = ROOT / args.model_file
    if not feature_path.exists() or not model_path.exists():
        raise SystemExit(f"WNBA export needs {feature_path} and {model_path}")
    frame = pd.read_csv(feature_path)
    artifact = joblib.load(model_path)
    if args.mode == "backtest" and args.season is not None:
        frame = frame[pd.to_numeric(frame["season"], errors="coerce") == args.season].copy()
    if frame.empty:
        raise SystemExit("No WNBA rows available for export")
    payload = export(frame, artifact, "historical_backtest" if args.mode == "backtest" else "model", args.season)
    target_json, target_js = (BACKTEST_JSON, BACKTEST_JS) if args.mode == "backtest" else (PREDICTION_JSON, PREDICTION_JS)
    write_json_and_js(payload, target_json, target_js, "__WNBA_BACKTEST_PREDICTIONS__" if args.mode == "backtest" else "__WNBA_PREDICTIONS__")
    if args.mode == "export":
        append_tracking(payload["games"])
    print(f"WNBA {args.mode}: {len(payload['games'])} rows -> {target_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
