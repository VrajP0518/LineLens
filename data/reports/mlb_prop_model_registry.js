window.__MLB_PROP_MODEL_REGISTRY__ = {
  "metadata": {
    "sport": "MLB",
    "generated_at": "2026-07-15T16:34:55Z",
    "selection_policy": "regression error with chronological holdout; no sportsbook lines fabricated",
    "production_ready": false
  },
  "models": [
    {
      "model_id": "mlb_prop_pitcher_strikeouts_v1",
      "model_version": "v1",
      "sport": "MLB",
      "target_stat": "pitcher_strikeouts",
      "algorithm": "ColumnTransformer + GradientBoostingRegressor (Huber)",
      "train_start": "2026-07-01",
      "train_end": "2026-07-09",
      "test_start": "2026-07-10",
      "test_end": "2026-07-12",
      "feature_count": 13,
      "train_rows": 956,
      "test_rows": 392,
      "metrics": {
        "mae": 1.2348807089881515,
        "rmse": 1.856088794970757,
        "median_absolute_error": 0.9790088747400776,
        "sample_size": 392,
        "interval_coverage": null,
        "brier_score": null
      },
      "calibration_status": "Not evaluated without real sportsbook line outcomes",
      "selected": false,
      "status": "research",
      "limitations": [
        "Starting lineup and pitcher confirmation must be available before publication.",
        "Prediction intervals require validated residual coverage.",
        "No historical sportsbook lines are fabricated."
      ]
    },
    {
      "model_id": "mlb_prop_batter_hits_v1",
      "model_version": "v1",
      "sport": "MLB",
      "target_stat": "batter_hits",
      "algorithm": "ColumnTransformer + GradientBoostingRegressor (Huber)",
      "train_start": "2026-07-01",
      "train_end": "2026-07-09",
      "test_start": "2026-07-10",
      "test_end": "2026-07-12",
      "feature_count": 13,
      "train_rows": 2375,
      "test_rows": 917,
      "metrics": {
        "mae": 0.6325751765671219,
        "rmse": 0.7829512878124678,
        "median_absolute_error": 0.5538776919542363,
        "sample_size": 917,
        "interval_coverage": null,
        "brier_score": null
      },
      "calibration_status": "Not evaluated without real sportsbook line outcomes",
      "selected": false,
      "status": "research",
      "limitations": [
        "Starting lineup and pitcher confirmation must be available before publication.",
        "Prediction intervals require validated residual coverage.",
        "No historical sportsbook lines are fabricated."
      ]
    },
    {
      "model_id": "mlb_prop_batter_total_bases_v1",
      "model_version": "v1",
      "sport": "MLB",
      "target_stat": "batter_total_bases",
      "algorithm": "ColumnTransformer + GradientBoostingRegressor (Huber)",
      "train_start": "2026-07-01",
      "train_end": "2026-07-09",
      "test_start": "2026-07-10",
      "test_end": "2026-07-12",
      "feature_count": 13,
      "train_rows": 2375,
      "test_rows": 917,
      "metrics": {
        "mae": 1.3251612751492503,
        "rmse": 1.7156364043416703,
        "median_absolute_error": 1.0838251904882559,
        "sample_size": 917,
        "interval_coverage": null,
        "brier_score": null
      },
      "calibration_status": "Not evaluated without real sportsbook line outcomes",
      "selected": false,
      "status": "research",
      "limitations": [
        "Starting lineup and pitcher confirmation must be available before publication.",
        "Prediction intervals require validated residual coverage.",
        "No historical sportsbook lines are fabricated."
      ]
    }
  ]
};
