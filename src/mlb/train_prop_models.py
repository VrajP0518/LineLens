"""Manually train MLB player-prop research regressors.

This command is intentionally not run by release checks. It requires a real
MLB player-game source prepared by ``props_dataset.py`` and uses a chronological
holdout; it never creates historical sportsbook lines.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATASET = ROOT / "data" / "processed" / "mlb" / "mlb_player_props.csv"
REGISTRY_JSON = ROOT / "data" / "reports" / "mlb_prop_model_registry.json"
REGISTRY_JS = ROOT / "data" / "reports" / "mlb_prop_model_registry.js"
CARDS_JSON = ROOT / "data" / "reports" / "mlb_prop_model_cards.json"
CARDS_JS = ROOT / "data" / "reports" / "mlb_prop_model_cards.js"
HEALTH_JSON = ROOT / "data" / "reports" / "mlb_prop_model_health.json"
HEALTH_JS = ROOT / "data" / "reports" / "mlb_prop_model_health.js"
MODEL_DIR = ROOT / "models"
TARGETS = ("pitcher_strikeouts", "batter_hits", "batter_total_bases")
NON_FEATURES = {"sport", "season", "game_date", "game_id", "player_id", "player_name", "team", "opponent", "target_stat", "target_value", *TARGETS, "source"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def write(payload: dict, json_path: Path, js_path: Path, variable: str) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2)
    json_path.write_text(text + "\n", encoding="utf-8")
    js_path.write_text(f"window.{variable} = {text};\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=str(DATASET))
    parser.add_argument("--test-fraction", type=float, default=0.2)
    args = parser.parse_args()
    path = Path(args.dataset)
    if not path.exists():
        raise SystemExit(f"Missing real MLB player-game dataset: {path}. Run npm run build:mlb:props first.")
    import joblib
    import pandas as pd
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.metrics import mean_absolute_error, mean_squared_error, median_absolute_error
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder

    frame = pd.read_csv(path)
    frame["game_date"] = pd.to_datetime(frame["game_date"], errors="coerce")
    frame = frame.dropna(subset=["game_date", "target_stat", "target_value"]).sort_values(["game_date", "game_id", "player_id"])
    feature_columns = [column for column in frame.columns if column not in NON_FEATURES]
    if len(feature_columns) < 4:
        raise SystemExit("MLB player-prop dataset has too few real pregame features.")
    dates = frame["game_date"].dt.date.drop_duplicates().tolist()
    split_at = max(1, min(len(dates) - 1, int(len(dates) * (1 - args.test_fraction))))
    cutoff = dates[split_at]
    train = frame[frame["game_date"].dt.date < cutoff]
    test = frame[frame["game_date"].dt.date >= cutoff]
    if len(train) < 24 or len(test) < 8:
        raise SystemExit("MLB prop training needs at least 24 training rows and 8 chronological test rows.")
    registry = {"metadata": {"sport": "MLB", "generated_at": now(), "selection_policy": "regression error with chronological holdout; no sportsbook lines fabricated", "production_ready": False}, "models": []}
    cards: list[dict] = []
    health_rows: list[dict] = []
    numeric = [column for column in feature_columns if pd.api.types.is_numeric_dtype(frame[column])]
    categorical = [column for column in feature_columns if column not in numeric]
    for target in TARGETS:
        subset_train = train[train["target_stat"] == target]
        subset_test = test[test["target_stat"] == target]
        if len(subset_train) < 24 or len(subset_test) < 8:
            continue
        preprocessor = ColumnTransformer([("numeric", SimpleImputer(strategy="median"), numeric), ("categorical", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("one_hot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), categorical)], remainder="drop")
        model = Pipeline([("preprocessor", preprocessor), ("regressor", GradientBoostingRegressor(loss="huber", random_state=42, n_estimators=160, max_depth=2))])
        model.fit(subset_train[feature_columns], subset_train["target_value"])
        prediction = model.predict(subset_test[feature_columns])
        model_id = f"mlb_prop_{target}_v1"
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": model, "target": target, "feature_columns": feature_columns, "model_id": model_id}, MODEL_DIR / f"{model_id}.joblib")
        metrics = {"mae": float(mean_absolute_error(subset_test["target_value"], prediction)), "rmse": float(mean_squared_error(subset_test["target_value"], prediction) ** 0.5), "median_absolute_error": float(median_absolute_error(subset_test["target_value"], prediction)), "sample_size": int(len(subset_test)), "interval_coverage": None, "brier_score": None}
        entry = {"model_id": model_id, "model_version": "v1", "sport": "MLB", "target_stat": target, "algorithm": "ColumnTransformer + GradientBoostingRegressor (Huber)", "train_start": str(subset_train["game_date"].min().date()), "train_end": str(subset_train["game_date"].max().date()), "test_start": str(subset_test["game_date"].min().date()), "test_end": str(subset_test["game_date"].max().date()), "feature_count": len(feature_columns), "train_rows": int(len(subset_train)), "test_rows": int(len(subset_test)), "metrics": metrics, "calibration_status": "Not evaluated without real sportsbook line outcomes", "selected": False, "status": "research", "limitations": ["Starting lineup and pitcher confirmation must be available before publication.", "Prediction intervals require validated residual coverage.", "No historical sportsbook lines are fabricated."]}
        registry["models"].append(entry)
        cards.append({"metadata": {"sport": "MLB", "target_stat": target, "generated_at": registry["metadata"]["generated_at"]}, "model": entry, "inputs": feature_columns, "limitations": entry["limitations"]})
        health_rows.append({"market": target, "status": "Stable" if len(subset_test) >= 30 else "Insufficient sample", "reason": "Chronological test sample supports basic error reporting." if len(subset_test) >= 30 else "Test sample is below the minimum health threshold.", "training_sample": int(len(subset_train)), "evaluation_sample": int(len(subset_test)), "mae": metrics["mae"], "rmse": metrics["rmse"], "median_absolute_error": metrics["median_absolute_error"], "interval_coverage": None, "brier_score": None})
    write(registry, REGISTRY_JSON, REGISTRY_JS, "__MLB_PROP_MODEL_REGISTRY__")
    write({"metadata": registry["metadata"], "cards": cards}, CARDS_JSON, CARDS_JS, "__MLB_PROP_MODEL_CARDS__")
    write({"metadata": {"sport": "MLB", "generated_at": registry["metadata"]["generated_at"], "status": "Stable" if health_rows and all(row["status"] == "Stable" for row in health_rows) else "Insufficient sample", "reason": "Health remains separate from prop pick record and probability calibration."}, "markets": health_rows}, HEALTH_JSON, HEALTH_JS, "__MLB_PROP_MODEL_HEALTH__")
    print(json.dumps(registry["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
