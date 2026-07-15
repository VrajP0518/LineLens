"""Train WNBA points, rebounds, and assists regression candidates.

This command is intentionally manual. It requires real player box-score rows
from props_dataset.py and never creates sportsbook lines for historical games.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATASET = ROOT / "data" / "processed" / "wnba" / "wnba_player_props.csv"
REGISTRY_JSON = ROOT / "data" / "reports" / "wnba_prop_model_registry.json"
REGISTRY_JS = ROOT / "data" / "reports" / "wnba_prop_model_registry.js"
CARDS_JSON = ROOT / "data" / "reports" / "wnba_prop_model_cards.json"
CARDS_JS = ROOT / "data" / "reports" / "wnba_prop_model_cards.js"
HEALTH_JSON = ROOT / "data" / "reports" / "wnba_prop_model_health.json"
HEALTH_JS = ROOT / "data" / "reports" / "wnba_prop_model_health.js"
MODEL_DIR = ROOT / "models"
TARGETS = ("points", "rebounds", "assists")
NON_FEATURES = {"sport", "season", "game_date", "game_id", "player_id", "player_name", "team", "opponent", *TARGETS, "source"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def write(payload: dict, json_path: Path, js_path: Path, variable: str) -> None:
    json_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    js_path.write_text(f"window.{variable} = {json.dumps(payload, indent=2)};\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=str(DATASET))
    parser.add_argument("--test-fraction", type=float, default=0.2)
    args = parser.parse_args()
    path = Path(args.dataset)
    if not path.exists():
        raise SystemExit(f"Missing real player-prop dataset: {path}. Run npm run build:wnba:props first.")

    with path.open("r", encoding="utf-8") as handle:
        next(handle, None)  # header
        if not next(handle, None):
            raise SystemExit("WNBA player-prop dataset is empty; no model was trained.")

    # Check the data contract before importing the optional training stack so
    # an empty source reports the real blocker instead of a dependency error.
    import joblib
    import pandas as pd
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.metrics import mean_absolute_error, mean_squared_error, median_absolute_error
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder

    frame = pd.read_csv(path)
    if frame.empty:
        raise SystemExit("WNBA player-prop dataset is empty; no model was trained.")
    frame["game_date"] = pd.to_datetime(frame["game_date"], errors="coerce")
    frame = frame.dropna(subset=["game_date"]).sort_values(["game_date", "game_id", "player_id"])
    feature_columns = [column for column in frame.columns if column not in NON_FEATURES]
    if len(feature_columns) < 4:
        raise SystemExit("WNBA player-prop dataset has too few real pregame features.")
    dates = frame["game_date"].dt.date.drop_duplicates().tolist()
    split_at = max(1, min(len(dates) - 1, int(len(dates) * (1 - args.test_fraction))))
    cutoff = dates[split_at]
    train = frame[frame["game_date"].dt.date < cutoff]
    test = frame[frame["game_date"].dt.date >= cutoff]
    if len(train) < 24 or len(test) < 8:
        raise SystemExit("WNBA prop training needs at least 24 training rows and 8 chronological test rows.")

    registry = {"metadata": {"sport": "WNBA", "generated_at": now(), "selection_policy": "regression MAE/RMSE with chronological holdout; no sportsbook lines fabricated", "production_ready": False}, "models": []}
    cards: list[dict] = []
    health_rows: list[dict] = []
    numeric_features = [column for column in feature_columns if pd.api.types.is_numeric_dtype(frame[column])]
    categorical_features = [column for column in feature_columns if column not in numeric_features]
    preprocessor = ColumnTransformer([
        ("numeric", SimpleImputer(strategy="median"), numeric_features),
        ("categorical", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("one_hot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]), categorical_features),
    ], remainder="drop")
    for target in TARGETS:
        x_train = train[feature_columns]
        y_train = train[target]
        x_test = test[feature_columns]
        y_test = test[target]
        model = Pipeline([("preprocessor", preprocessor), ("regressor", GradientBoostingRegressor(loss="huber", random_state=42, n_estimators=160, max_depth=2))])
        model.fit(x_train, y_train)
        prediction = model.predict(x_test)
        residuals = y_test.to_numpy() - prediction
        residual_sigma = max(0.5, float(residuals.std(ddof=1)) if len(residuals) > 1 else 0.5)
        lower = prediction - 1.28 * residual_sigma
        upper = prediction + 1.28 * residual_sigma
        model_id = f"wnba_prop_{target}_v1"
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": model, "target": target, "feature_columns": feature_columns, "model_id": model_id}, MODEL_DIR / f"{model_id}.joblib")
        metrics = {
            "mae": float(mean_absolute_error(y_test, prediction)),
            "rmse": float(mean_squared_error(y_test, prediction) ** 0.5),
            "median_absolute_error": float(median_absolute_error(y_test, prediction)),
            "sample_size": int(len(test)),
            "interval_coverage": float(((y_test.to_numpy() >= lower) & (y_test.to_numpy() <= upper)).mean()),
            "projection_uncertainty": residual_sigma,
            "brier_score": None,
        }
        entry = {
            "model_id": model_id, "model_version": "v1", "sport": "WNBA", "target_stat": target,
            "algorithm": "ColumnTransformer + GradientBoostingRegressor (Huber)", "train_start": str(train["game_date"].min().date()), "train_end": str(train["game_date"].max().date()),
            "test_start": str(test["game_date"].min().date()), "test_end": str(test["game_date"].max().date()), "feature_count": len(feature_columns),
            "train_rows": int(len(train)), "test_rows": int(len(test)), "metrics": metrics, "calibration_status": "Not evaluated without real sportsbook lines",
            "selected": False, "status": "challenger", "limitations": ["The exported interval is an 80% normal approximation from held-out residual error; it is not a calibrated quantile interval.", "No historical sportsbook lines are fabricated.", "Production selection requires more real evaluation and current-line validation."],
        }
        registry["models"].append(entry)
        cards.append({"metadata": {"sport": "WNBA", "target_stat": target, "generated_at": registry["metadata"]["generated_at"]}, "model": entry, "inputs": feature_columns, "limitations": entry["limitations"]})
        health_rows.append({"market": target, "status": "Healthy" if len(test) >= 30 else "Insufficient sample", "reason": "Chronological test sample supports basic error reporting." if len(test) >= 30 else "Test sample is below the minimum health threshold.", "training_sample": int(len(train)), "evaluation_sample": int(len(test)), "mae": metrics["mae"], "rmse": metrics["rmse"], "interval_coverage": metrics["interval_coverage"], "projection_uncertainty": residual_sigma, "brier_score": None})
    write(registry, REGISTRY_JSON, REGISTRY_JS, "__WNBA_PROP_MODEL_REGISTRY__")
    write({"metadata": registry["metadata"], "cards": cards}, CARDS_JSON, CARDS_JS, "__WNBA_PROP_MODEL_CARDS__")
    write({"metadata": {"sport": "WNBA", "generated_at": registry["metadata"]["generated_at"], "status": "Stable" if len(test) >= 30 else "Insufficient sample", "reason": "Health remains separate from prop pick record and probability calibration."}, "markets": health_rows}, HEALTH_JSON, HEALTH_JS, "__WNBA_PROP_MODEL_HEALTH__")
    print(json.dumps(registry["metadata"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
