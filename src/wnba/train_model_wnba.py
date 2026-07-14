"""Train and evaluate the WNBA score/form winner candidates."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline

from src.shared.export_utils import write_json_and_js
from src.shared.paths import MODEL_DIR, ROOT
from src.shared.version import APP_NAME, APP_VERSION

MODEL_PATH = MODEL_DIR / "wnba_moneyline_model.joblib"
REGISTRY_JSON = ROOT / "data" / "models" / "model_registry.json"
REGISTRY_JS = ROOT / "data" / "models" / "model_registry.js"
COMPARISON_JSON = ROOT / "data" / "reports" / "wnba_model_comparison.json"
COMPARISON_JS = ROOT / "data" / "reports" / "wnba_model_comparison.js"
CARD_JSON = ROOT / "data" / "reports" / "wnba_model_card.json"
CARD_JS = ROOT / "data" / "reports" / "wnba_model_card.js"
REPORT_JSON = ROOT / "data" / "reports" / "model_report.json"
REPORT_JS = ROOT / "data" / "reports" / "model_report.js"
FEATURES = [
    "home_elo", "away_elo", "elo_diff", "home_win_pct_10", "away_win_pct_10", "win_pct_diff",
    "home_margin_avg_10", "away_margin_avg_10", "margin_diff", "home_points_for_avg_10",
    "away_points_for_avg_10", "points_for_diff", "home_points_against_avg_10", "away_points_against_avg_10",
    "points_against_diff", "home_rest_days", "away_rest_days", "rest_diff", "home_b2b", "away_b2b", "home_court",
]
CANDIDATES = {
    "Raikou": LogisticRegression(max_iter=1200, C=0.7),
    "Entei": GradientBoostingClassifier(random_state=42, n_estimators=80, max_depth=2, learning_rate=0.04),
    "Suicune": HistGradientBoostingClassifier(random_state=42, max_iter=120, max_leaf_nodes=8, learning_rate=0.04),
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def metric(y: pd.Series, probability: np.ndarray) -> dict[str, Any]:
    probability = np.clip(np.asarray(probability, dtype=float), 0.001, 0.999)
    prediction = probability >= 0.5
    return {
        "accuracy": float(accuracy_score(y, prediction)),
        "log_loss": float(log_loss(y, probability, labels=[0, 1])),
        "brier_score": float(brier_score_loss(y, probability)),
        "roc_auc": float(roc_auc_score(y, probability)) if len(set(y)) > 1 else None,
        "sample_size": int(len(y)),
    }


def pipeline(model: Any) -> Pipeline:
    return Pipeline([("imputer", SimpleImputer(strategy="median", add_indicator=True)), ("model", model)])


def read(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path)
    frame["game_date"] = pd.to_datetime(frame["game_date"], errors="coerce")
    frame["season"] = pd.to_numeric(frame["season"], errors="coerce")
    frame["home_win"] = pd.to_numeric(frame["home_win"], errors="coerce")
    return frame.sort_values(["game_date", "game_id"]).reset_index(drop=True)


def stage_joblib(payload: dict[str, Any]) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".wnba_moneyline.", suffix=".tmp", dir=MODEL_DIR)
    os.close(fd)
    staged = Path(name)
    try:
        joblib.dump(payload, staged)
        os.replace(staged, MODEL_PATH)
    finally:
        staged.unlink(missing_ok=True)


def update_registry(selected: str, metrics: dict[str, Any]) -> None:
    try:
        payload = json.loads(REGISTRY_JSON.read_text(encoding="utf-8")) if REGISTRY_JSON.exists() else {"models": []}
    except json.JSONDecodeError:
        payload = {"models": []}
    models = [row for row in payload.get("models", []) if not (row.get("sport") == "WNBA" and row.get("target") == "home_win")]
    model_id = f"wnba_{selected.lower()}_moneyline"
    models.append({
        "model_id": model_id, "model_name": selected, "sport": "WNBA", "target": "home_win",
        "selected": True, "status": "production", "technical_name": metrics.get("technical_name"),
        "trained_at": now(), "metrics": metrics,
    })
    payload["models"] = models
    payload["generated_at"] = now()
    write_json_and_js(payload, REGISTRY_JSON, REGISTRY_JS, "__MODEL_REGISTRY__")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features-file", default="data/processed/wnba/wnba_features_all.csv")
    parser.add_argument("--train-end-season", type=int, required=True)
    parser.add_argument("--test-season", type=int, required=True)
    args = parser.parse_args()
    frame = read(ROOT / args.features_file)
    train = frame[(frame["season"] <= args.train_end_season) & frame["home_win"].notna()].copy()
    test = frame[(frame["season"] == args.test_season) & frame["home_win"].notna()].copy()
    if len(train) < 24 or len(test) < 8 or train["home_win"].nunique() < 2 or test["home_win"].nunique() < 2:
        raise SystemExit("WNBA training needs at least 24 historical games and an 8-game completed-season holdout with both outcomes.")
    x_train, y_train = train[FEATURES], train["home_win"].astype(int)
    x_test, y_test = test[FEATURES], test["home_win"].astype(int)
    evaluations: list[dict[str, Any]] = []
    fitted: dict[str, Any] = {}
    for name, estimator in CANDIDATES.items():
        model = pipeline(estimator)
        model.fit(x_train, y_train)
        probability = model.predict_proba(x_test)[:, 1]
        block = metric(y_test, probability)
        block.update({"model_name": name, "technical_name": estimator.__class__.__name__, "status": "evaluated"})
        evaluations.append(block)
        fitted[name] = estimator
    selected_row = min(evaluations, key=lambda row: (row["log_loss"], row["brier_score"], -row["accuracy"]))
    selected = selected_row["model_name"]
    production = pipeline(CANDIDATES[selected])
    production.fit(frame.loc[frame["home_win"].notna(), FEATURES], frame.loc[frame["home_win"].notna(), "home_win"].astype(int))
    artifact = {
        "model": production, "feature_columns": FEATURES, "model_name": selected,
        "model_id": f"wnba_{selected.lower()}_moneyline", "sport": "WNBA", "target": "home_win",
        "metadata": {"app": APP_NAME, "version": APP_VERSION, "created_at": now(), "data_quality": "score_only_team_form_elo", "training_rows": int(frame["home_win"].notna().sum()), "evaluation_holdout": args.test_season},
    }
    stage_joblib(artifact)
    selected_metrics = next(row for row in evaluations if row["model_name"] == selected)
    update_registry(selected, selected_metrics)
    comparison = {"metadata": {"sport": "WNBA", "target": "home_win", "generated_at": now(), "selection_policy": "lowest chronological holdout log loss, then Brier score", "holdout_season": args.test_season, "data_quality": "score_only_team_form_elo"}, "models": evaluations, "selected_model": selected}
    card = {"metadata": comparison["metadata"], "model": {"model_name": selected, "model_id": artifact["model_id"], "technical_name": selected_metrics["technical_name"], "status": "production"}, "inputs": FEATURES, "limitations": ["No odds edge is produced in this first WNBA release.", "Advanced box-score, player availability, and injury features are not used until a stable historical source is validated."], "aliases": {"Raikou": "fast recency/Elo candidate", "Entei": "nonlinear form challenger", "Suicune": "calibrated tree candidate"}}
    write_json_and_js(comparison, COMPARISON_JSON, COMPARISON_JS, "__WNBA_MODEL_COMPARISON__")
    write_json_and_js(card, CARD_JSON, CARD_JS, "__WNBA_MODEL_CARD__")
    try:
        report = json.loads(REPORT_JSON.read_text(encoding="utf-8")) if REPORT_JSON.exists() else {"metadata": {}, "sports": {}}
    except json.JSONDecodeError:
        report = {"metadata": {}, "sports": {}}
    report.setdefault("sports", {})["WNBA"] = {
        "model_comparison": evaluations,
        "selected_model": selected,
        "calibration": [],
        "feature_summary": {"data_quality": "score_only_team_form_elo", "features": FEATURES},
        "limitations": card["limitations"],
    }
    report.setdefault("metadata", {}).update({"generated_at": now(), "real_data": True})
    write_json_and_js(report, REPORT_JSON, REPORT_JS, "__MODEL_REPORT__")
    print(f"WNBA production model: {selected}; holdout rows={len(test)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
