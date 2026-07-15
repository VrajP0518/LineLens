window.__WNBA_PROP_MODEL_REGISTRY__ = {
  "metadata": {
    "sport": "WNBA",
    "generated_at": "2026-07-15T13:22:24Z",
    "selection_policy": "regression MAE/RMSE with chronological holdout; no sportsbook lines fabricated",
    "production_ready": false
  },
  "models": [
    {
      "model_id": "wnba_prop_points_v1",
      "model_version": "v1",
      "sport": "WNBA",
      "target_stat": "points",
      "algorithm": "ColumnTransformer + GradientBoostingRegressor (Huber)",
      "train_start": "2003-06-03",
      "train_end": "2022-07-04",
      "test_start": "2022-07-05",
      "test_end": "2026-07-14",
      "feature_count": 18,
      "train_rows": 83763,
      "test_rows": 21566,
      "metrics": {
        "mae": 3.368907551391699,
        "rmse": 4.592308544035197,
        "median_absolute_error": 2.4702498916943565,
        "sample_size": 21566,
        "interval_coverage": 0.8272744134285449,
        "projection_uncertainty": 4.57909296312018,
        "brier_score": null
      },
      "calibration_status": "Not evaluated without real sportsbook lines",
      "selected": false,
      "status": "challenger",
      "limitations": [
        "The exported interval is an 80% normal approximation from held-out residual error; it is not a calibrated quantile interval.",
        "No historical sportsbook lines are fabricated.",
        "Production selection requires more real evaluation and current-line validation."
      ]
    },
    {
      "model_id": "wnba_prop_rebounds_v1",
      "model_version": "v1",
      "sport": "WNBA",
      "target_stat": "rebounds",
      "algorithm": "ColumnTransformer + GradientBoostingRegressor (Huber)",
      "train_start": "2003-06-03",
      "train_end": "2022-07-04",
      "test_start": "2022-07-05",
      "test_end": "2026-07-14",
      "feature_count": 18,
      "train_rows": 83763,
      "test_rows": 21566,
      "metrics": {
        "mae": 1.526249546416921,
        "rmse": 2.066673774605435,
        "median_absolute_error": 1.1399509240316517,
        "sample_size": 21566,
        "interval_coverage": 0.8333487897616618,
        "projection_uncertainty": 2.060571780430888,
        "brier_score": null
      },
      "calibration_status": "Not evaluated without real sportsbook lines",
      "selected": false,
      "status": "challenger",
      "limitations": [
        "The exported interval is an 80% normal approximation from held-out residual error; it is not a calibrated quantile interval.",
        "No historical sportsbook lines are fabricated.",
        "Production selection requires more real evaluation and current-line validation."
      ]
    },
    {
      "model_id": "wnba_prop_assists_v1",
      "model_version": "v1",
      "sport": "WNBA",
      "target_stat": "assists",
      "algorithm": "ColumnTransformer + GradientBoostingRegressor (Huber)",
      "train_start": "2003-06-03",
      "train_end": "2022-07-04",
      "test_start": "2022-07-05",
      "test_end": "2026-07-14",
      "feature_count": 18,
      "train_rows": 83763,
      "test_rows": 21566,
      "metrics": {
        "mae": 1.1045561904041639,
        "rmse": 1.5435723428630466,
        "median_absolute_error": 0.7942334561372217,
        "sample_size": 21566,
        "interval_coverage": 0.8447556338681258,
        "projection_uncertainty": 1.5352933618023268,
        "brier_score": null
      },
      "calibration_status": "Not evaluated without real sportsbook lines",
      "selected": false,
      "status": "challenger",
      "limitations": [
        "The exported interval is an 80% normal approximation from held-out residual error; it is not a calibrated quantile interval.",
        "No historical sportsbook lines are fabricated.",
        "Production selection requires more real evaluation and current-line validation."
      ]
    }
  ]
};
