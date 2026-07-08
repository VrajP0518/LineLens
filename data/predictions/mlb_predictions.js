window.__MLB_PREDICTIONS__ = {
  "metadata": {
    "sport": "MLB",
    "app": "LineLens Sports",
    "version": "v1.0.0",
    "generated_at": "2026-07-08T17:03:13Z",
    "model_type": "GradientBoostingClassifier",
    "target": "home_win",
    "row_count": 44,
    "real_data": true,
    "mode": "real",
    "reason": null,
    "odds_status": "Optional odds API hooks only; no odds provider required.",
    "prediction_mode": "model",
    "model_name": "GradientBoostingClassifier",
    "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
    "feature_count": 119
  },
  "games": [
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "822713",
      "home": "WSH",
      "away": "HOU",
      "home_display": "Washington Nationals",
      "away_display": "Houston Astros",
      "home_score": 3.0,
      "away_score": 6.0,
      "status": "Final",
      "home_win_probability": 0.5024604751974056,
      "away_win_probability": 0.49753952480259445,
      "model_pick": "WSH",
      "confidence": "Low",
      "confidence_score": 0.5024604751974056,
      "home_probable_pitcher": "Andrew Alvarez",
      "away_probable_pitcher": "Tatsuya Imai",
      "home_pitcher_summary": "Pitcher proxy: 4 prior starts, 5.00 runs allowed avg, 6.67 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Loss",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -2.357142857142857,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": -0.5999999999999996,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0
      },
      "explanation": {
        "summary": "Model leans WSH with top factors around recent run differential, short-term form, runs scored trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -2.071428571428572,
            "away_value": 0.2857142857142857,
            "impact": "supports_away",
            "strength": 0.5893
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.5714285714285714,
            "away_value": 0.2857142857142857,
            "impact": "supports_home",
            "strength": 0.0714
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.857142857142857,
            "away_value": 4.0,
            "impact": "supports_home",
            "strength": 0.0686
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.267786838055364,
            "away_value": 3.651483716701102,
            "impact": "supports_home",
            "strength": 0.0601
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 5.0,
            "away_value": null,
            "impact": "supports_away",
            "strength": 0.0555
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          -0.4285714285714285,
          4.857142857142857,
          5.285714285714286
        ],
        "away": [
          0.2857142857142857,
          -0.8571428571428571,
          4.0,
          4.857142857142857
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "822881",
      "home": "TEX",
      "away": "LAA",
      "home_display": "Texas Rangers",
      "away_display": "Los Angeles Angels",
      "home_score": 8.0,
      "away_score": 3.0,
      "status": "Final",
      "home_win_probability": 0.6843664806249278,
      "away_win_probability": 0.3156335193750722,
      "model_pick": "TEX",
      "confidence": "High",
      "confidence_score": 0.6843664806249278,
      "home_probable_pitcher": "Jacob deGrom",
      "away_probable_pitcher": "José Soriano",
      "home_pitcher_summary": "Pitcher proxy: 63 prior starts, 3.16 runs allowed avg, 6.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 50 prior starts, 4.74 runs allowed avg, 5.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Home won",
      "model_result": "Win",
      "actual_result": "Home won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 2.142857142857143,
        "win_pct_14_diff": 0.0714285714285714,
        "pitcher_runs_allowed_diff": 1.5812698412698416,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.2993421052631579
      },
      "explanation": {
        "summary": "Model leans TEX with top factors around recent run differential, volatility edge, starting pitcher proxy.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.7857142857142857,
            "away_value": -2.9285714285714284,
            "impact": "supports_home",
            "strength": 0.5357
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.288688541085343,
            "away_value": 1.3451854182690952,
            "impact": "supports_away",
            "strength": 0.2724
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 3.1587301587301586,
            "away_value": 4.74,
            "impact": "supports_home",
            "strength": 0.1463
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 3.4285714285714284,
            "away_value": 4.428571428571429,
            "impact": "supports_home",
            "strength": 0.08
          },
          {
            "label": "Month-long form",
            "feature": "win_pct_30_diff",
            "home_value": 0.5,
            "away_value": 0.3333333333333333,
            "impact": "supports_home",
            "strength": 0.0417
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -0.7142857142857143,
          2.7142857142857144,
          3.4285714285714284
        ],
        "away": [
          0.4285714285714285,
          -1.5714285714285714,
          2.857142857142857,
          4.428571428571429
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "822956",
      "home": "TB",
      "away": "NYY",
      "home_display": "Tampa Bay Rays",
      "away_display": "New York Yankees",
      "home_score": 6.0,
      "away_score": 4.0,
      "status": "Final",
      "home_win_probability": 0.4734167317224678,
      "away_win_probability": 0.5265832682775322,
      "model_pick": "NYY",
      "confidence": "Low",
      "confidence_score": 0.5265832682775322,
      "home_probable_pitcher": "Ian Seymour",
      "away_probable_pitcher": "Will Warren",
      "home_pitcher_summary": "Pitcher proxy: 4 prior starts, 2.50 runs allowed avg, 3.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 36 prior starts, 5.36 runs allowed avg, 7.33 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Home won",
      "model_result": "Loss",
      "actual_result": "Home won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -3.071428571428571,
        "win_pct_14_diff": -0.4285714285714285,
        "pitcher_runs_allowed_diff": 2.8611111111111107,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": -0.2058823529411765
      },
      "explanation": {
        "summary": "Model leans NYY with top factors around recent run differential, starting pitcher proxy, volatility edge.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.6428571428571429,
            "away_value": 2.4285714285714284,
            "impact": "supports_away",
            "strength": 0.7679
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 2.5,
            "away_value": 5.361111111111111,
            "impact": "supports_home",
            "strength": 0.2648
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.6367367999823035,
            "away_value": 1.772810520855851,
            "impact": "supports_home",
            "strength": 0.2186
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.4285714285714284,
            "away_value": 6.142857142857143,
            "impact": "supports_away",
            "strength": 0.2171
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 4.571428571428571,
            "away_value": 1.8571428571428568,
            "impact": "supports_away",
            "strength": 0.2171
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -1.1428571428571428,
          3.4285714285714284,
          4.571428571428571
        ],
        "away": [
          1.0,
          4.285714285714286,
          6.142857142857143,
          1.8571428571428568
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823035",
      "home": "STL",
      "away": "MIL",
      "home_display": "St. Louis Cardinals",
      "away_display": "Milwaukee Brewers",
      "home_score": 2.0,
      "away_score": 10.0,
      "status": "Final",
      "home_win_probability": 0.4963877192941954,
      "away_win_probability": 0.5036122807058045,
      "model_pick": "MIL",
      "confidence": "Low",
      "confidence_score": 0.5036122807058045,
      "home_probable_pitcher": "Hunter Dobbins",
      "away_probable_pitcher": "Robert Gasser",
      "home_pitcher_summary": "Pitcher proxy: 9 prior starts, 4.22 runs allowed avg, 5.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 6 prior starts, 3.00 runs allowed avg, 3.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Win",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Volatility edge",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.4285714285714284,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": -1.2222222222222223,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0958333333333333
      },
      "explanation": {
        "summary": "Model leans MIL with top factors around volatility edge, recent run differential, runs scored trend.",
        "top_factors": [
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.7342623276105904,
            "away_value": 1.6035674514745406,
            "impact": "supports_home",
            "strength": 0.4155
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.2142857142857142,
            "away_value": 0.2142857142857142,
            "impact": "supports_away",
            "strength": 0.3571
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.142857142857143,
            "away_value": 2.2857142857142856,
            "impact": "supports_home",
            "strength": 0.1486
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.714285714285714,
            "away_value": 4.285714285714286,
            "impact": "supports_away",
            "strength": 0.1143
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 4.222222222222222,
            "away_value": 3.0,
            "impact": "supports_away",
            "strength": 0.1131
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.4285714285714285,
          -1.5714285714285714,
          4.142857142857143,
          5.714285714285714
        ],
        "away": [
          0.2857142857142857,
          -2.0,
          2.2857142857142856,
          4.285714285714286
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823062",
      "home": "STL",
      "away": "MIL",
      "home_display": "St. Louis Cardinals",
      "away_display": "Milwaukee Brewers",
      "home_score": 3.0,
      "away_score": 4.0,
      "status": "Final",
      "home_win_probability": 0.47893223372519694,
      "away_win_probability": 0.5210677662748031,
      "model_pick": "MIL",
      "confidence": "Low",
      "confidence_score": 0.5210677662748031,
      "home_probable_pitcher": "Matt Svanson",
      "away_probable_pitcher": "Jacob Misiorowski",
      "home_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "away_pitcher_summary": "Pitcher proxy: 13 prior starts, 4.69 runs allowed avg, 6.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Win",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Volatility edge",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.4285714285714284,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": 0.2923076923076921,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0958333333333333
      },
      "explanation": {
        "summary": "Model leans MIL with top factors around volatility edge, recent run differential, runs scored trend.",
        "top_factors": [
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.7342623276105904,
            "away_value": 1.6035674514745406,
            "impact": "supports_home",
            "strength": 0.4155
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.2142857142857142,
            "away_value": 0.2142857142857142,
            "impact": "supports_away",
            "strength": 0.3571
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.142857142857143,
            "away_value": 2.2857142857142856,
            "impact": "supports_home",
            "strength": 0.1486
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.714285714285714,
            "away_value": 4.285714285714286,
            "impact": "supports_away",
            "strength": 0.1143
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.4285714285714285,
            "away_value": 0.2857142857142857,
            "impact": "supports_home",
            "strength": 0.0357
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.4285714285714285,
          -1.5714285714285714,
          4.142857142857143,
          5.714285714285714
        ],
        "away": [
          0.2857142857142857,
          -2.0,
          2.2857142857142856,
          4.285714285714286
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823203",
      "home": "SF",
      "away": "TOR",
      "home_display": "San Francisco Giants",
      "away_display": "Toronto Blue Jays",
      "home_score": 3.0,
      "away_score": 9.0,
      "status": "Final",
      "home_win_probability": 0.5573979489489632,
      "away_win_probability": 0.4426020510510368,
      "model_pick": "SF",
      "confidence": "Medium",
      "confidence_score": 0.5573979489489632,
      "home_probable_pitcher": "Trevor McDonald",
      "away_probable_pitcher": "Spencer Miles",
      "home_pitcher_summary": "Pitcher proxy: 1 prior starts, 1.00 runs allowed avg, 1.00 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Loss",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Starting pitcher proxy",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -0.7857142857142858,
        "win_pct_14_diff": -0.2142857142857142,
        "pitcher_runs_allowed_diff": 3.4000000000000004,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.1855203619909502
      },
      "explanation": {
        "summary": "Model leans SF with top factors around starting pitcher proxy, recent run differential, runs allowed trend.",
        "top_factors": [
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 1.0,
            "away_value": null,
            "impact": "supports_home",
            "strength": 0.3146
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.3571428571428572,
            "away_value": -0.5714285714285714,
            "impact": "supports_away",
            "strength": 0.1964
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 4.571428571428571,
            "away_value": 3.142857142857143,
            "impact": "supports_away",
            "strength": 0.1143
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 1.632993161855455,
            "away_value": 2.811540841738197,
            "impact": "supports_away",
            "strength": 0.108
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 5.0,
            "away_value": 3.7142857142857135,
            "impact": "supports_home",
            "strength": 0.1029
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          0.4285714285714285,
          5.0,
          4.571428571428571
        ],
        "away": [
          0.5714285714285714,
          0.5714285714285714,
          3.7142857142857135,
          3.142857142857143
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823280",
      "home": "SD",
      "away": "AZ",
      "home_display": "San Diego Padres",
      "away_display": "Arizona Diamondbacks",
      "home_score": 4.0,
      "away_score": 1.0,
      "status": "Final",
      "home_win_probability": 0.5180724694218998,
      "away_win_probability": 0.4819275305781002,
      "model_pick": "SD",
      "confidence": "Low",
      "confidence_score": 0.5180724694218998,
      "home_probable_pitcher": "Germán Márquez",
      "away_probable_pitcher": "Zac Gallen",
      "home_pitcher_summary": "Pitcher proxy: 89 prior starts, 5.12 runs allowed avg, 6.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 148 prior starts, 4.25 runs allowed avg, 3.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Home won",
      "model_result": "Win",
      "actual_result": "Home won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 1.7142857142857144,
        "win_pct_14_diff": 0.1428571428571429,
        "pitcher_runs_allowed_diff": -0.8735955056179776,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0666666666666666
      },
      "explanation": {
        "summary": "Model leans SD with top factors around recent run differential, volatility edge, runs allowed trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 1.3571428571428572,
            "away_value": -0.3571428571428571,
            "impact": "supports_home",
            "strength": 0.4286
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.3094010767585,
            "away_value": 2.9113897843110093,
            "impact": "supports_away",
            "strength": 0.208
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.4285714285714284,
            "away_value": 4.857142857142857,
            "impact": "supports_home",
            "strength": 0.1943
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.8571428571428571,
            "away_value": 0.4285714285714285,
            "impact": "supports_home",
            "strength": 0.1071
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 5.0,
            "away_value": 3.857142857142857,
            "impact": "supports_home",
            "strength": 0.0914
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.8571428571428571,
          2.571428571428572,
          5.0,
          2.4285714285714284
        ],
        "away": [
          0.4285714285714285,
          -1.0,
          3.857142857142857,
          4.857142857142857
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823361",
      "home": "PIT",
      "away": "ATL",
      "home_display": "Pittsburgh Pirates",
      "away_display": "Atlanta Braves",
      "home_score": 12.0,
      "away_score": 4.0,
      "status": "Final",
      "home_win_probability": 0.5440712183931664,
      "away_win_probability": 0.4559287816068336,
      "model_pick": "PIT",
      "confidence": "Low",
      "confidence_score": 0.5440712183931664,
      "home_probable_pitcher": "Paul Skenes",
      "away_probable_pitcher": "Hurston Waldrep",
      "home_pitcher_summary": "Pitcher proxy: 52 prior starts, 3.12 runs allowed avg, 3.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 9 prior starts, 4.89 runs allowed avg, 8.33 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Home won",
      "model_result": "Win",
      "actual_result": "Home won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Runs allowed trend",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -0.7142857142857142,
        "win_pct_14_diff": -0.1428571428571429,
        "pitcher_runs_allowed_diff": 1.773504273504274,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": -0.2083333333333333
      },
      "explanation": {
        "summary": "Model leans PIT with top factors around runs allowed trend, recent run differential, starting pitcher proxy.",
        "top_factors": [
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 1.5714285714285714,
            "away_value": 4.285714285714286,
            "impact": "supports_home",
            "strength": 0.2171
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.9285714285714286,
            "away_value": 1.6428571428571428,
            "impact": "supports_away",
            "strength": 0.1786
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 3.1153846153846154,
            "away_value": 4.888888888888889,
            "impact": "supports_home",
            "strength": 0.1641
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.7161167647860354,
            "away_value": 3.30223589477825,
            "impact": "supports_away",
            "strength": 0.1283
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.8571428571428571,
            "away_value": 0.5714285714285714,
            "impact": "supports_home",
            "strength": 0.0714
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.8571428571428571,
          3.2857142857142856,
          4.857142857142857,
          1.5714285714285714
        ],
        "away": [
          0.5714285714285714,
          0.4285714285714285,
          4.714285714285714,
          4.285714285714286
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823607",
      "home": "NYM",
      "away": "KC",
      "home_display": "New York Mets",
      "away_display": "Kansas City Royals",
      "home_score": 12.0,
      "away_score": 16.0,
      "status": "Final",
      "home_win_probability": 0.471163731016946,
      "away_win_probability": 0.528836268983054,
      "model_pick": "KC",
      "confidence": "Low",
      "confidence_score": 0.528836268983054,
      "home_probable_pitcher": "Cionel Pérez",
      "away_probable_pitcher": "Seth Lugo",
      "home_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "away_pitcher_summary": "Pitcher proxy: 84 prior starts, 3.83 runs allowed avg, 6.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Win",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -0.8571428571428572,
        "win_pct_14_diff": 0.0,
        "pitcher_runs_allowed_diff": -0.5666666666666669,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0
      },
      "explanation": {
        "summary": "Model leans KC with top factors around recent run differential, volatility edge, runs allowed trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.4285714285714285,
            "away_value": 1.2857142857142858,
            "impact": "supports_away",
            "strength": 0.2143
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.878491668515699,
            "away_value": 2.811540841738194,
            "impact": "supports_home",
            "strength": 0.1698
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.142857142857143,
            "away_value": 3.7142857142857135,
            "impact": "supports_away",
            "strength": 0.1143
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": null,
            "away_value": 3.8333333333333335,
            "impact": "supports_away",
            "strength": 0.0524
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.4285714285714285,
            "away_value": 0.5714285714285714,
            "impact": "supports_away",
            "strength": 0.0357
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.4285714285714285,
          -0.5714285714285714,
          4.571428571428571,
          5.142857142857143
        ],
        "away": [
          0.5714285714285714,
          1.0,
          4.714285714285714,
          3.7142857142857135
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823687",
      "home": "MIN",
      "away": "CLE",
      "home_display": "Minnesota Twins",
      "away_display": "Cleveland Guardians",
      "home_score": 3.0,
      "away_score": 1.0,
      "status": "Final",
      "home_win_probability": 0.39679951076031905,
      "away_win_probability": 0.603200489239681,
      "model_pick": "CLE",
      "confidence": "Medium",
      "confidence_score": 0.603200489239681,
      "home_probable_pitcher": "Taj Bradley",
      "away_probable_pitcher": "Joey Cantillo",
      "home_pitcher_summary": "Pitcher proxy: 72 prior starts, 5.06 runs allowed avg, 8.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 19 prior starts, 3.58 runs allowed avg, 3.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Home won",
      "model_result": "Loss",
      "actual_result": "Home won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -2.0,
        "win_pct_14_diff": -0.3571428571428571,
        "pitcher_runs_allowed_diff": -1.4766081871345027,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": -0.3798076923076923
      },
      "explanation": {
        "summary": "Model leans CLE with top factors around recent run differential, starting pitcher proxy, runs scored trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.2142857142857142,
            "away_value": 1.7857142857142858,
            "impact": "supports_away",
            "strength": 0.5
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 5.055555555555555,
            "away_value": 3.5789473684210527,
            "impact": "supports_away",
            "strength": 0.1367
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.142857142857143,
            "away_value": 4.0,
            "impact": "supports_away",
            "strength": 0.0686
          },
          {
            "label": "Month-long form",
            "feature": "win_pct_30_diff",
            "home_value": 0.5,
            "away_value": 0.7333333333333333,
            "impact": "supports_away",
            "strength": 0.0583
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.571428571428572,
            "away_value": 3.142857142857143,
            "impact": "supports_home",
            "strength": 0.0457
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          0.5714285714285714,
          3.142857142857143,
          2.571428571428572
        ],
        "away": [
          0.5714285714285714,
          0.8571428571428571,
          4.0,
          3.142857142857143
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823847",
      "home": "MIA",
      "away": "SEA",
      "home_display": "Miami Marlins",
      "away_display": "Seattle Mariners",
      "home_score": 6.0,
      "away_score": 5.0,
      "status": "Final",
      "home_win_probability": 0.45313082611219013,
      "away_win_probability": 0.5468691738878099,
      "model_pick": "SEA",
      "confidence": "Low",
      "confidence_score": 0.5468691738878099,
      "home_probable_pitcher": "Max Meyer",
      "away_probable_pitcher": "Bryan Woo",
      "home_pitcher_summary": "Pitcher proxy: 25 prior starts, 4.96 runs allowed avg, 4.67 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 69 prior starts, 3.74 runs allowed avg, 3.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Home won",
      "model_result": "Loss",
      "actual_result": "Home won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -2.2142857142857144,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": -1.220869565217391,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": -0.1047619047619047
      },
      "explanation": {
        "summary": "Model leans SEA with top factors around recent run differential, volatility edge, runs scored trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.5,
            "away_value": 2.7142857142857144,
            "impact": "supports_away",
            "strength": 0.5536
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.6457513110645965,
            "away_value": 2.4299715851758226,
            "impact": "supports_home",
            "strength": 0.4372
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.0,
            "away_value": 5.285714285714286,
            "impact": "supports_away",
            "strength": 0.1829
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 4.96,
            "away_value": 3.739130434782609,
            "impact": "supports_away",
            "strength": 0.113
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 4.142857142857143,
            "away_value": 3.142857142857143,
            "impact": "supports_away",
            "strength": 0.08
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          -1.1428571428571428,
          3.0,
          4.142857142857143
        ],
        "away": [
          0.7142857142857143,
          2.142857142857143,
          5.285714285714286,
          3.142857142857143
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "823929",
      "home": "LAD",
      "away": "COL",
      "home_display": "Los Angeles Dodgers",
      "away_display": "Colorado Rockies",
      "home_score": 3.0,
      "away_score": 4.0,
      "status": "Final",
      "home_win_probability": 0.6359514105769033,
      "away_win_probability": 0.3640485894230967,
      "model_pick": "LAD",
      "confidence": "High",
      "confidence_score": 0.6359514105769033,
      "home_probable_pitcher": "Justin Wrobleski",
      "away_probable_pitcher": "Michael Lorenzen",
      "home_pitcher_summary": "Pitcher proxy: 7 prior starts, 8.71 runs allowed avg, 9.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 90 prior starts, 4.23 runs allowed avg, 4.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Loss",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 4.428571428571429,
        "win_pct_14_diff": 0.5,
        "pitcher_runs_allowed_diff": -4.48095238095238,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.5541666666666667
      },
      "explanation": {
        "summary": "Model leans LAD with top factors around recent run differential, starting pitcher proxy, runs scored trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 2.142857142857143,
            "away_value": -2.2857142857142856,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 8.714285714285714,
            "away_value": 4.233333333333333,
            "impact": "supports_away",
            "strength": 0.4147
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.714285714285714,
            "away_value": 2.2857142857142856,
            "impact": "supports_home",
            "strength": 0.1943
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.7142857142857143,
            "away_value": 0.1428571428571428,
            "impact": "supports_home",
            "strength": 0.1429
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 3.142857142857143,
            "away_value": 4.714285714285714,
            "impact": "supports_home",
            "strength": 0.1257
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.7142857142857143,
          1.5714285714285714,
          4.714285714285714,
          3.142857142857143
        ],
        "away": [
          0.1428571428571428,
          -2.4285714285714284,
          2.2857142857142856,
          4.714285714285714
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "824254",
      "home": "DET",
      "away": "ATH",
      "home_display": "Detroit Tigers",
      "away_display": "Athletics",
      "home_score": 6.0,
      "away_score": 2.0,
      "status": "Final",
      "home_win_probability": 0.43920751590306234,
      "away_win_probability": 0.5607924840969376,
      "model_pick": "ATH",
      "confidence": "Medium",
      "confidence_score": 0.5607924840969376,
      "home_probable_pitcher": "Tarik Skubal",
      "away_probable_pitcher": "J.T. Ginn",
      "home_pitcher_summary": "Pitcher proxy: 124 prior starts, 3.58 runs allowed avg, 3.67 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 21 prior starts, 4.43 runs allowed avg, 2.33 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Home won",
      "model_result": "Loss",
      "actual_result": "Home won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -2.7142857142857144,
        "win_pct_14_diff": -0.4285714285714286,
        "pitcher_runs_allowed_diff": 0.8479262672811063,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": -0.3076923076923077
      },
      "explanation": {
        "summary": "Model leans ATH with top factors around recent run differential, volatility edge, starting pitcher proxy.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -2.357142857142857,
            "away_value": 0.3571428571428571,
            "impact": "supports_away",
            "strength": 0.6786
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 1.3801311186847045,
            "away_value": 2.4784787961282158,
            "impact": "supports_away",
            "strength": 0.6423
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 3.5806451612903225,
            "away_value": 4.428571428571429,
            "impact": "supports_home",
            "strength": 0.0785
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.2857142857142857,
            "away_value": 0.4285714285714285,
            "impact": "supports_away",
            "strength": 0.0357
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 2.7142857142857144,
            "away_value": 3.142857142857143,
            "impact": "supports_away",
            "strength": 0.0343
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -1.4285714285714286,
          2.7142857142857144,
          4.142857142857143
        ],
        "away": [
          0.4285714285714285,
          -1.4285714285714286,
          3.142857142857143,
          4.571428571428571
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "824495",
      "home": "CIN",
      "away": "PHI",
      "home_display": "Cincinnati Reds",
      "away_display": "Philadelphia Phillies",
      "home_score": 1.0,
      "away_score": 4.0,
      "status": "Final",
      "home_win_probability": 0.4703133413184243,
      "away_win_probability": 0.5296866586815757,
      "model_pick": "PHI",
      "confidence": "Low",
      "confidence_score": 0.5296866586815757,
      "home_probable_pitcher": "Andrew Abbott",
      "away_probable_pitcher": "Zack Wheeler",
      "home_pitcher_summary": "Pitcher proxy: 74 prior starts, 3.53 runs allowed avg, 1.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 141 prior starts, 3.45 runs allowed avg, 4.33 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Win",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Volatility edge",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 0.2142857142857142,
        "win_pct_14_diff": 0.0714285714285715,
        "pitcher_runs_allowed_diff": -0.0802185163887294,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0625
      },
      "explanation": {
        "summary": "Model leans PHI with top factors around volatility edge, runs allowed trend, short-term form.",
        "top_factors": [
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.2253945610567323,
            "away_value": 3.6449573777637294,
            "impact": "supports_away",
            "strength": 0.5093
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.4285714285714284,
            "away_value": 3.7142857142857135,
            "impact": "supports_home",
            "strength": 0.1029
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.7142857142857143,
            "away_value": 0.4285714285714285,
            "impact": "supports_home",
            "strength": 0.0714
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.5714285714285714,
            "away_value": 0.3571428571428571,
            "impact": "supports_home",
            "strength": 0.0536
          },
          {
            "label": "Month-long form",
            "feature": "win_pct_30_diff",
            "home_value": 0.5,
            "away_value": 0.6333333333333333,
            "impact": "supports_away",
            "strength": 0.0333
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.7142857142857143,
          1.0,
          3.4285714285714284,
          2.4285714285714284
        ],
        "away": [
          0.4285714285714285,
          -0.1428571428571428,
          3.571428571428572,
          3.7142857142857135
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "824579",
      "home": "CWS",
      "away": "BOS",
      "home_display": "Chicago White Sox",
      "away_display": "Boston Red Sox",
      "home_score": 1.0,
      "away_score": 8.0,
      "status": "Final",
      "home_win_probability": 0.486148594257073,
      "away_win_probability": 0.513851405742927,
      "model_pick": "BOS",
      "confidence": "Low",
      "confidence_score": 0.513851405742927,
      "home_probable_pitcher": "Noah Schultz",
      "away_probable_pitcher": "Payton Tolle",
      "home_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "away_pitcher_summary": "Pitcher proxy: 2 prior starts, 7.00 runs allowed avg, 7.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Win",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -2.071428571428572,
        "win_pct_14_diff": -0.3571428571428571,
        "pitcher_runs_allowed_diff": 2.6,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": -0.4208333333333333
      },
      "explanation": {
        "summary": "Model leans BOS with top factors around recent run differential, starting pitcher proxy, runs allowed trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.9285714285714288,
            "away_value": 0.1428571428571428,
            "impact": "supports_away",
            "strength": 0.5179
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": null,
            "away_value": 7.0,
            "impact": "supports_home",
            "strength": 0.2406
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.857142857142857,
            "away_value": 3.2857142857142856,
            "impact": "supports_away",
            "strength": 0.2057
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.0394235042348527,
            "away_value": 2.288688541085313,
            "impact": "supports_home",
            "strength": 0.126
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.1428571428571428,
            "away_value": 0.5714285714285714,
            "impact": "supports_away",
            "strength": 0.1071
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.1428571428571428,
          -2.142857142857143,
          3.7142857142857135,
          5.857142857142857
        ],
        "away": [
          0.5714285714285714,
          0.4285714285714285,
          3.7142857142857135,
          3.2857142857142856
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-07",
      "game_id": "824820",
      "home": "BAL",
      "away": "CHC",
      "home_display": "Baltimore Orioles",
      "away_display": "Chicago Cubs",
      "home_score": 2.0,
      "away_score": 5.0,
      "status": "Final",
      "home_win_probability": 0.4722582342890956,
      "away_win_probability": 0.5277417657109045,
      "model_pick": "CHC",
      "confidence": "Low",
      "confidence_score": 0.5277417657109045,
      "home_probable_pitcher": "Shane Baz",
      "away_probable_pitcher": "Matthew Boyd",
      "home_pitcher_summary": "Pitcher proxy: 53 prior starts, 3.91 runs allowed avg, 3.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 65 prior starts, 3.89 runs allowed avg, 3.33 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Away won",
      "model_result": "Win",
      "actual_result": "Away won",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -3.2857142857142856,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": -0.0133526850507981,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0625
      },
      "explanation": {
        "summary": "Model leans CHC with top factors around recent run differential, volatility edge, runs scored trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.8571428571428568,
            "away_value": 1.4285714285714286,
            "impact": "supports_away",
            "strength": 0.8214
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.3094010767585185,
            "away_value": 4.070801956792867,
            "impact": "supports_away",
            "strength": 0.4221
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.0,
            "away_value": 6.285714285714286,
            "impact": "supports_away",
            "strength": 0.2629
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.428571428571429,
            "away_value": 4.428571428571429,
            "impact": "supports_away",
            "strength": 0.08
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.2857142857142857,
            "away_value": 0.4285714285714285,
            "impact": "supports_away",
            "strength": 0.0357
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -2.4285714285714284,
          3.0,
          5.428571428571429
        ],
        "away": [
          0.4285714285714285,
          1.8571428571428568,
          6.285714285714286,
          4.428571428571429
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "822710",
      "home": "WSH",
      "away": "HOU",
      "home_display": "Washington Nationals",
      "away_display": "Houston Astros",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.41292604761362867,
      "away_win_probability": 0.5870739523863713,
      "model_pick": "HOU",
      "confidence": "Medium",
      "confidence_score": 0.5870739523863713,
      "home_probable_pitcher": "Foster Griffin",
      "away_probable_pitcher": "Spencer Arrighetti",
      "home_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "away_pitcher_summary": "Pitcher proxy: 34 prior starts, 4.91 runs allowed avg, 9.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": -136.3,
      "moneyline_away": 117.3,
      "market_implied_home": 0.5768091409225561,
      "moneyline_home_open": null,
      "moneyline_home_current": -136.3,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 117.3,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -2.7142857142857144,
        "win_pct_14_diff": -0.1428571428571428,
        "pitcher_runs_allowed_diff": 0.5117647058823529,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 3673.5910185327953,
        "home_split_advantage": -0.0666666666666666
      },
      "explanation": {
        "summary": "Model leans HOU with top factors around travel fatigue, recent run differential, runs allowed trend.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 0.0,
            "away_value": 3673.5910185327953,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -2.7142857142857144,
            "away_value": 0.0,
            "impact": "supports_away",
            "strength": 0.6786
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 6.0,
            "away_value": 4.285714285714286,
            "impact": "supports_away",
            "strength": 0.1371
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.911389784311003,
            "away_value": 3.728908942943212,
            "impact": "supports_home",
            "strength": 0.12
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": null,
            "away_value": 4.911764705882353,
            "impact": "supports_home",
            "strength": 0.0474
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.4285714285714285,
          -1.8571428571428568,
          4.142857142857143,
          6.0
        ],
        "away": [
          0.4285714285714285,
          0.0,
          4.285714285714286,
          4.285714285714286
        ]
      },
      "market_implied_away": 0.46019328117809477,
      "market_edge_home": -0.1639,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "822880",
      "home": "TEX",
      "away": "LAA",
      "home_display": "Texas Rangers",
      "away_display": "Los Angeles Angels",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.6051625359490184,
      "away_win_probability": 0.39483746405098163,
      "model_pick": "TEX",
      "confidence": "Medium",
      "confidence_score": 0.6051625359490184,
      "home_probable_pitcher": "MacKenzie Gore",
      "away_probable_pitcher": "Walbert Ureña",
      "home_pitcher_summary": "Pitcher proxy: 100 prior starts, 4.77 runs allowed avg, 5.00 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 1.9285714285714288,
        "win_pct_14_diff": 0.0,
        "pitcher_runs_allowed_diff": -0.3699999999999992,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 261.5325711556318,
        "home_split_advantage": 0.2555555555555555
      },
      "explanation": {
        "summary": "Model leans TEX with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1672.2711118485029,
            "away_value": 1933.8036830041349,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.2142857142857142,
            "away_value": -3.142857142857143,
            "impact": "supports_home",
            "strength": 0.4821
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.0472470011002373,
            "away_value": 1.3801311186847065,
            "impact": "supports_home",
            "strength": 0.2147
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 4.142857142857143,
            "away_value": 5.285714285714286,
            "impact": "supports_home",
            "strength": 0.0914
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.4285714285714284,
            "away_value": 2.7142857142857144,
            "impact": "supports_home",
            "strength": 0.0571
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -0.7142857142857143,
          3.4285714285714284,
          4.142857142857143
        ],
        "away": [
          0.2857142857142857,
          -2.571428571428572,
          2.7142857142857144,
          5.285714285714286
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "822957",
      "home": "TB",
      "away": "NYY",
      "home_display": "Tampa Bay Rays",
      "away_display": "New York Yankees",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4212483130182736,
      "away_win_probability": 0.5787516869817264,
      "model_pick": "NYY",
      "confidence": "Medium",
      "confidence_score": 0.5787516869817264,
      "home_probable_pitcher": "Shane McClanahan",
      "away_probable_pitcher": "Gerrit Cole",
      "home_pitcher_summary": "Pitcher proxy: 73 prior starts, 3.14 runs allowed avg, 4.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 106 prior starts, 3.61 runs allowed avg, 3.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": -116.9,
      "moneyline_away": 33.4,
      "market_implied_home": 0.5389580451821115,
      "moneyline_home_open": null,
      "moneyline_home_current": -116.9,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 33.4,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -3.7142857142857135,
        "win_pct_14_diff": -0.5,
        "pitcher_runs_allowed_diff": 0.4762212457999482,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": -132.26750573183904,
        "home_split_advantage": -0.2058823529411765
      },
      "explanation": {
        "summary": "Model leans NYY with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1789.056272276596,
            "away_value": 1656.788766544757,
            "impact": "supports_away",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.3571428571428572,
            "away_value": 2.357142857142857,
            "impact": "supports_away",
            "strength": 0.9286
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.6367367999823044,
            "away_value": 2.1380899352994027,
            "impact": "supports_home",
            "strength": 0.5076
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.571428571428571,
            "away_value": 2.0,
            "impact": "supports_away",
            "strength": 0.2857
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.2857142857142857,
            "away_value": 1.0,
            "impact": "supports_away",
            "strength": 0.1786
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -2.0,
          3.571428571428572,
          5.571428571428571
        ],
        "away": [
          1.0,
          3.7142857142857135,
          5.714285714285714,
          2.0
        ]
      },
      "market_implied_away": 0.7496251874062968,
      "market_edge_home": -0.1177,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "823032",
      "home": "STL",
      "away": "MIL",
      "home_display": "St. Louis Cardinals",
      "away_display": "Milwaukee Brewers",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.46245208361434664,
      "away_win_probability": 0.5375479163856534,
      "model_pick": "MIL",
      "confidence": "Low",
      "confidence_score": 0.5375479163856534,
      "home_probable_pitcher": "Michael McGreevy",
      "away_probable_pitcher": "Kyle Harrison",
      "home_pitcher_summary": "Pitcher proxy: 17 prior starts, 4.12 runs allowed avg, 3.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 36 prior starts, 4.25 runs allowed avg, 4.33 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": 128.6,
      "moneyline_away": -150.6,
      "market_implied_home": 0.4374453193350831,
      "moneyline_home_open": null,
      "moneyline_home_current": 128.6,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": -150.6,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Rest advantage",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -0.8571428571428572,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": 0.132352941176471,
        "schedule_fatigue_diff": 1.0,
        "travel_km_diff": -427.83684267745366,
        "home_split_advantage": 0.0333333333333333
      },
      "explanation": {
        "summary": "Model leans MIL with top factors around rest advantage, travel fatigue, volatility edge.",
        "top_factors": [
          {
            "label": "Rest advantage",
            "feature": "rest_diff",
            "home_value": 282.0,
            "away_value": 0.0,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 427.83684267745366,
            "away_value": 0.0,
            "impact": "supports_away",
            "strength": 1.0
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.078342163598855,
            "away_value": 1.6761634196950477,
            "impact": "supports_home",
            "strength": 0.4832
          },
          {
            "label": "Schedule fatigue",
            "feature": "schedule_fatigue_diff",
            "home_value": 0.0,
            "away_value": 0.0,
            "impact": "supports_home",
            "strength": 0.25
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.9285714285714286,
            "away_value": -0.0714285714285714,
            "impact": "supports_away",
            "strength": 0.2143
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.4285714285714285,
          -1.7142857142857142,
          3.857142857142857,
          5.571428571428571
        ],
        "away": [
          0.4285714285714285,
          -1.1428571428571428,
          2.857142857142857,
          4.0
        ]
      },
      "market_implied_away": 0.6009577015163607,
      "market_edge_home": 0.025,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "823202",
      "home": "SF",
      "away": "TOR",
      "home_display": "San Francisco Giants",
      "away_display": "Toronto Blue Jays",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.49433296203497407,
      "away_win_probability": 0.5056670379650259,
      "model_pick": "TOR",
      "confidence": "Low",
      "confidence_score": 0.5056670379650259,
      "home_probable_pitcher": "Logan Webb",
      "away_probable_pitcher": "Dylan Cease",
      "home_pitcher_summary": "Pitcher proxy: 156 prior starts, 3.67 runs allowed avg, 8.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 159 prior starts, 4.13 runs allowed avg, 2.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": 107.4,
      "moneyline_away": -124.7,
      "market_implied_home": 0.4821600771456123,
      "moneyline_home_open": null,
      "moneyline_home_current": 107.4,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": -124.7,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -0.6428571428571429,
        "win_pct_14_diff": -0.1428571428571428,
        "pitcher_runs_allowed_diff": 0.4527092404450896,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 3640.800350800471,
        "home_split_advantage": 0.1855203619909502
      },
      "explanation": {
        "summary": "Model leans TOR with top factors around travel fatigue, volatility edge, recent run differential.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 0.0,
            "away_value": 3640.800350800471,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 1.6761634196950537,
            "away_value": 4.197504927816957,
            "impact": "supports_away",
            "strength": 0.2931
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.6428571428571429,
            "away_value": 0.0,
            "impact": "supports_away",
            "strength": 0.1607
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.857142857142857,
            "away_value": 5.428571428571429,
            "impact": "supports_away",
            "strength": 0.0457
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 3.673076923076923,
            "away_value": 4.1257861635220126,
            "impact": "supports_home",
            "strength": 0.0419
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.7142857142857143,
          1.2857142857142858,
          4.857142857142857,
          3.571428571428572
        ],
        "away": [
          0.7142857142857143,
          2.0,
          5.428571428571429,
          3.4285714285714284
        ]
      },
      "market_implied_away": 0.5549621717846017,
      "market_edge_home": 0.0122,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "823279",
      "home": "SD",
      "away": "AZ",
      "home_display": "San Diego Padres",
      "away_display": "Arizona Diamondbacks",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.5992044984029816,
      "away_win_probability": 0.4007955015970184,
      "model_pick": "SD",
      "confidence": "Medium",
      "confidence_score": 0.5992044984029816,
      "home_probable_pitcher": "Michael King",
      "away_probable_pitcher": "Jose Cabrera",
      "home_pitcher_summary": "Pitcher proxy: 58 prior starts, 3.95 runs allowed avg, 4.67 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 2.928571428571429,
        "win_pct_14_diff": 0.2142857142857143,
        "pitcher_runs_allowed_diff": 0.451724137931035,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0958333333333333
      },
      "explanation": {
        "summary": "Model leans SD with top factors around recent run differential, runs allowed trend, volatility edge.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 2.071428571428572,
            "away_value": -0.8571428571428571,
            "impact": "supports_home",
            "strength": 0.7321
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.571428571428572,
            "away_value": 6.142857142857143,
            "impact": "supports_home",
            "strength": 0.2857
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.498298906339373,
            "away_value": 2.9113897843110093,
            "impact": "supports_away",
            "strength": 0.1779
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 5.714285714285714,
            "away_value": 3.857142857142857,
            "impact": "supports_home",
            "strength": 0.1486
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.8571428571428571,
            "away_value": 0.2857142857142857,
            "impact": "supports_home",
            "strength": 0.1429
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.8571428571428571,
          3.142857142857143,
          5.714285714285714,
          2.571428571428572
        ],
        "away": [
          0.2857142857142857,
          -2.2857142857142856,
          3.857142857142857,
          6.142857142857143
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "823360",
      "home": "PIT",
      "away": "ATL",
      "home_display": "Pittsburgh Pirates",
      "away_display": "Atlanta Braves",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4955585230075846,
      "away_win_probability": 0.5044414769924155,
      "model_pick": "ATL",
      "confidence": "Low",
      "confidence_score": 0.5044414769924155,
      "home_probable_pitcher": "Jared Jones",
      "away_probable_pitcher": "Grant Holmes",
      "home_pitcher_summary": "Pitcher proxy: 21 prior starts, 5.14 runs allowed avg, 4.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 26 prior starts, 4.58 runs allowed avg, 3.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": -117.4,
      "moneyline_away": 34.0,
      "market_implied_home": 0.5400183992640295,
      "moneyline_home_open": null,
      "moneyline_home_current": -117.4,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 34.0,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.6428571428571428,
        "win_pct_14_diff": -0.2142857142857143,
        "pitcher_runs_allowed_diff": -0.5659340659340666,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": -0.2499999999999999
      },
      "explanation": {
        "summary": "Model leans ATL with top factors around recent run differential, volatility edge, runs allowed trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.7857142857142857,
            "away_value": 2.4285714285714284,
            "impact": "supports_away",
            "strength": 0.4107
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.860668582611297,
            "away_value": 3.258688021128692,
            "impact": "supports_away",
            "strength": 0.1282
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.142857142857143,
            "away_value": 3.7142857142857135,
            "impact": "supports_home",
            "strength": 0.1257
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 5.142857142857143,
            "away_value": 4.576923076923077,
            "impact": "supports_away",
            "strength": 0.0524
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.7142857142857143,
            "away_value": 0.5714285714285714,
            "impact": "supports_home",
            "strength": 0.0357
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.7142857142857143,
          2.571428571428572,
          4.714285714285714,
          2.142857142857143
        ],
        "away": [
          0.5714285714285714,
          0.7142857142857143,
          4.428571428571429,
          3.7142857142857135
        ]
      },
      "market_implied_away": 0.746268656716418,
      "market_edge_home": -0.0445,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "823605",
      "home": "NYM",
      "away": "KC",
      "home_display": "New York Mets",
      "away_display": "Kansas City Royals",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4846596015700801,
      "away_win_probability": 0.5153403984299199,
      "model_pick": "KC",
      "confidence": "Low",
      "confidence_score": 0.5153403984299199,
      "home_probable_pitcher": "Christian Scott",
      "away_probable_pitcher": "Steven Cruz",
      "home_pitcher_summary": "Pitcher proxy: 8 prior starts, 5.38 runs allowed avg, 6.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 3 prior starts, 4.00 runs allowed avg, 4.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": -178.8,
      "moneyline_away": 151.2,
      "market_implied_home": 0.6413199426111909,
      "moneyline_home_open": null,
      "moneyline_home_current": -178.8,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 151.2,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.7142857142857144,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": -1.375,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 2270.118822457529,
        "home_split_advantage": -0.1047619047619047
      },
      "explanation": {
        "summary": "Model leans KC with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1766.534648510508,
            "away_value": 4036.653470968037,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.5,
            "away_value": 2.2142857142857144,
            "impact": "supports_away",
            "strength": 0.4286
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.3380918415851224,
            "away_value": 2.927700218845598,
            "impact": "supports_home",
            "strength": 0.2652
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 5.375,
            "away_value": 4.0,
            "impact": "supports_away",
            "strength": 0.1272
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.142857142857143,
            "away_value": 5.714285714285714,
            "impact": "supports_away",
            "strength": 0.1257
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.4285714285714285,
          -0.8571428571428571,
          4.142857142857143,
          5.0
        ],
        "away": [
          0.5714285714285714,
          1.8571428571428568,
          5.714285714285714,
          3.857142857142857
        ]
      },
      "market_implied_away": 0.3980891719745223,
      "market_edge_home": -0.1567,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "823684",
      "home": "MIN",
      "away": "CLE",
      "home_display": "Minnesota Twins",
      "away_display": "Cleveland Guardians",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4153296045748834,
      "away_win_probability": 0.5846703954251167,
      "model_pick": "CLE",
      "confidence": "Medium",
      "confidence_score": 0.5846703954251167,
      "home_probable_pitcher": "Connor Prielipp",
      "away_probable_pitcher": "Slade Cecconi",
      "home_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "away_pitcher_summary": "Pitcher proxy: 38 prior starts, 4.66 runs allowed avg, 5.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": -119.1,
      "moneyline_away": 35.3,
      "market_implied_home": 0.5435874030123231,
      "moneyline_home_open": null,
      "moneyline_home_current": -119.1,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 35.3,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.9285714285714288,
        "win_pct_14_diff": -0.4285714285714285,
        "pitcher_runs_allowed_diff": 0.2578947368421049,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": -570.718486252411,
        "home_split_advantage": -0.3798076923076923
      },
      "explanation": {
        "summary": "Model leans CLE with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1585.421518123191,
            "away_value": 1014.70303187078,
            "impact": "supports_away",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.3571428571428571,
            "away_value": 1.5714285714285714,
            "impact": "supports_away",
            "strength": 0.4821
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 1.976047040118718,
            "away_value": 2.478478796128218,
            "impact": "supports_away",
            "strength": 0.3032
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 1.7142857142857142,
            "away_value": 4.285714285714286,
            "impact": "supports_home",
            "strength": 0.2057
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.2857142857142856,
            "away_value": 4.142857142857143,
            "impact": "supports_away",
            "strength": 0.0686
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          1.5714285714285714,
          3.2857142857142856,
          1.7142857142857142
        ],
        "away": [
          0.5714285714285714,
          -0.1428571428571428,
          4.142857142857143,
          4.285714285714286
        ]
      },
      "market_implied_away": 0.7390983000739098,
      "market_edge_home": -0.1283,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "823848",
      "home": "MIA",
      "away": "SEA",
      "home_display": "Miami Marlins",
      "away_display": "Seattle Mariners",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4052963970538531,
      "away_win_probability": 0.5947036029461469,
      "model_pick": "SEA",
      "confidence": "Medium",
      "confidence_score": 0.5947036029461469,
      "home_probable_pitcher": "Tyler Phillips",
      "away_probable_pitcher": "George Kirby",
      "home_pitcher_summary": "Pitcher proxy: 7 prior starts, 4.71 runs allowed avg, 6.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 111 prior starts, 3.75 runs allowed avg, 3.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": 110.9,
      "moneyline_away": -129.4,
      "market_implied_home": 0.474158368895211,
      "moneyline_home_open": null,
      "moneyline_home_current": 110.9,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": -129.4,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.9285714285714284,
        "win_pct_14_diff": 0.0,
        "pitcher_runs_allowed_diff": -0.9665379665379668,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 4392.337600739937,
        "home_split_advantage": -0.0333333333333333
      },
      "explanation": {
        "summary": "Model leans SEA with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 0.0,
            "away_value": 4392.337600739937,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.3571428571428571,
            "away_value": 2.2857142857142856,
            "impact": "supports_away",
            "strength": 0.4821
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.6457513110645965,
            "away_value": 2.8784916685156934,
            "impact": "supports_home",
            "strength": 0.3423
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.0,
            "away_value": 4.571428571428571,
            "impact": "supports_away",
            "strength": 0.1257
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 4.714285714285714,
            "away_value": 3.747747747747748,
            "impact": "supports_away",
            "strength": 0.0894
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          -0.7142857142857143,
          3.0,
          3.7142857142857135
        ],
        "away": [
          0.5714285714285714,
          1.1428571428571428,
          4.571428571428571,
          3.4285714285714284
        ]
      },
      "market_implied_away": 0.5640802092414996,
      "market_edge_home": -0.0689,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "823928",
      "home": "LAD",
      "away": "COL",
      "home_display": "Los Angeles Dodgers",
      "away_display": "Colorado Rockies",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.6762695646676163,
      "away_win_probability": 0.32373043533238366,
      "model_pick": "LAD",
      "confidence": "High",
      "confidence_score": 0.6762695646676163,
      "home_probable_pitcher": "Roki Sasaki",
      "away_probable_pitcher": "Gabriel Hughes",
      "home_pitcher_summary": "Pitcher proxy: 7 prior starts, 4.86 runs allowed avg, 3.67 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 4.785714285714287,
        "win_pct_14_diff": 0.5714285714285714,
        "pitcher_runs_allowed_diff": -0.4571428571428564,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": -985.419948797534,
        "home_split_advantage": 0.6
      },
      "explanation": {
        "summary": "Model leans LAD with top factors around recent run differential, travel fatigue, runs scored trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 2.071428571428572,
            "away_value": -2.7142857142857144,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1541.4224850530736,
            "away_value": 556.0025362555397,
            "impact": "supports_away",
            "strength": 1.0
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.571428571428571,
            "away_value": 2.2857142857142856,
            "impact": "supports_home",
            "strength": 0.1829
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.571428571428572,
            "away_value": 4.857142857142857,
            "impact": "supports_home",
            "strength": 0.1829
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.7142857142857143,
            "away_value": 0.1428571428571428,
            "impact": "supports_home",
            "strength": 0.1429
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.7142857142857143,
          2.0,
          4.571428571428571,
          2.571428571428572
        ],
        "away": [
          0.1428571428571428,
          -2.571428571428572,
          2.2857142857142856,
          4.857142857142857
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "824253",
      "home": "DET",
      "away": "ATH",
      "home_display": "Detroit Tigers",
      "away_display": "Athletics",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.44819169505536943,
      "away_win_probability": 0.5518083049446305,
      "model_pick": "ATH",
      "confidence": "Medium",
      "confidence_score": 0.5518083049446305,
      "home_probable_pitcher": "Troy Melton",
      "away_probable_pitcher": "Jeffrey Springs",
      "home_pitcher_summary": "Pitcher proxy: 3 prior starts, 2.33 runs allowed avg, 2.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 64 prior starts, 3.64 runs allowed avg, 4.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.6428571428571428,
        "win_pct_14_diff": -0.3571428571428571,
        "pitcher_runs_allowed_diff": 1.3072916666666663,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 2271.559240642848,
        "home_split_advantage": -0.3333333333333333
      },
      "explanation": {
        "summary": "Model leans ATH with top factors around travel fatigue, volatility edge, recent run differential.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 981.4350557355074,
            "away_value": 3252.994296378355,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 0.9759000729485272,
            "away_value": 2.149196970742248,
            "impact": "supports_away",
            "strength": 0.7048
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -2.0,
            "away_value": -0.3571428571428571,
            "impact": "supports_away",
            "strength": 0.4107
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 3.857142857142857,
            "away_value": 5.571428571428571,
            "impact": "supports_home",
            "strength": 0.1371
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 2.333333333333333,
            "away_value": 3.640625,
            "impact": "supports_home",
            "strength": 0.121
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -1.4285714285714286,
          2.4285714285714284,
          3.857142857142857
        ],
        "away": [
          0.4285714285714285,
          -2.142857142857143,
          3.4285714285714284,
          5.571428571428571
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "824496",
      "home": "CIN",
      "away": "PHI",
      "home_display": "Cincinnati Reds",
      "away_display": "Philadelphia Phillies",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4458446132867874,
      "away_win_probability": 0.5541553867132126,
      "model_pick": "PHI",
      "confidence": "Medium",
      "confidence_score": 0.5541553867132126,
      "home_probable_pitcher": "Chase Burns",
      "away_probable_pitcher": null,
      "home_pitcher_summary": "Pitcher proxy: 7 prior starts, 5.43 runs allowed avg, 5.00 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": -141.7,
      "moneyline_away": 121.3,
      "market_implied_home": 0.5862639635912288,
      "moneyline_home_open": null,
      "moneyline_home_current": -141.7,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 121.3,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 0.8571428571428571,
        "win_pct_14_diff": 0.0714285714285715,
        "pitcher_runs_allowed_diff": -1.0285714285714285,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 281.3572195310152,
        "home_split_advantage": 0.0240384615384615
      },
      "explanation": {
        "summary": "Model leans PHI with top factors around travel fatigue, volatility edge, recent run differential.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 524.6603426058064,
            "away_value": 806.0175621368215,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 1.9518001458970484,
            "away_value": 3.690399384761435,
            "impact": "supports_away",
            "strength": 0.574
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.8571428571428571,
            "away_value": 0.0,
            "impact": "supports_home",
            "strength": 0.2143
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 5.428571428571429,
            "away_value": null,
            "impact": "supports_away",
            "strength": 0.0952
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.571428571428572,
            "away_value": 3.2857142857142856,
            "impact": "supports_home",
            "strength": 0.0571
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          0.2857142857142857,
          2.857142857142857,
          2.571428571428572
        ],
        "away": [
          0.5714285714285714,
          0.1428571428571428,
          3.4285714285714284,
          3.2857142857142856
        ]
      },
      "market_implied_away": 0.4518752824220515,
      "market_edge_home": -0.1404,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "824578",
      "home": "CWS",
      "away": "BOS",
      "home_display": "Chicago White Sox",
      "away_display": "Boston Red Sox",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.49650641212425956,
      "away_win_probability": 0.5034935878757405,
      "model_pick": "BOS",
      "confidence": "Low",
      "confidence_score": 0.5034935878757405,
      "home_probable_pitcher": "Davis Martin",
      "away_probable_pitcher": "Jake Bennett",
      "home_pitcher_summary": "Pitcher proxy: 42 prior starts, 4.98 runs allowed avg, 3.33 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": -112.6,
      "moneyline_away": -103.9,
      "market_implied_home": 0.5296331138287864,
      "moneyline_home_open": null,
      "moneyline_home_current": -112.6,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": -103.9,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.5,
        "win_pct_14_diff": -0.3571428571428571,
        "pitcher_runs_allowed_diff": -0.5761904761904759,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 405.8154745831739,
        "home_split_advantage": -0.3809523809523809
      },
      "explanation": {
        "summary": "Model leans BOS with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 957.836457797214,
            "away_value": 1363.651932380388,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.0714285714285714,
            "away_value": 0.4285714285714285,
            "impact": "supports_away",
            "strength": 0.375
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.408672412985392,
            "away_value": 2.070196678027058,
            "impact": "supports_home",
            "strength": 0.364
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 4.857142857142857,
            "away_value": 3.2857142857142856,
            "impact": "supports_away",
            "strength": 0.1257
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.428571428571429,
            "away_value": 3.4285714285714284,
            "impact": "supports_home",
            "strength": 0.08
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -0.4285714285714285,
          4.428571428571429,
          4.857142857142857
        ],
        "away": [
          0.5714285714285714,
          0.1428571428571428,
          3.4285714285714284,
          3.2857142857142856
        ]
      },
      "market_implied_away": 0.5095635115252575,
      "market_edge_home": -0.0331,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-08",
      "game_id": "824815",
      "home": "BAL",
      "away": "CHC",
      "home_display": "Baltimore Orioles",
      "away_display": "Chicago Cubs",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.43577166147807994,
      "away_win_probability": 0.56422833852192,
      "model_pick": "CHC",
      "confidence": "Medium",
      "confidence_score": 0.56422833852192,
      "home_probable_pitcher": "Dean Kremer",
      "away_probable_pitcher": "Colin Rea",
      "home_pitcher_summary": "Pitcher proxy: 116 prior starts, 4.53 runs allowed avg, 7.67 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 74 prior starts, 4.54 runs allowed avg, 4.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": -126.1,
      "moneyline_away": 108.4,
      "market_implied_home": 0.5577178239716939,
      "moneyline_home_open": null,
      "moneyline_home_current": -126.1,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 108.4,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -3.5,
        "win_pct_14_diff": -0.1428571428571428,
        "pitcher_runs_allowed_diff": 0.0060577819198508,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 689.8359818975275,
        "home_split_advantage": 0.0666666666666666
      },
      "explanation": {
        "summary": "Model leans CHC with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 286.6232003837621,
            "away_value": 976.4591822812896,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.8571428571428568,
            "away_value": 1.6428571428571428,
            "impact": "supports_away",
            "strength": 0.875
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.1930626551751504,
            "away_value": 4.220133150686583,
            "impact": "supports_away",
            "strength": 0.4953
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.142857142857143,
            "away_value": 6.142857142857143,
            "impact": "supports_away",
            "strength": 0.24
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.0,
            "away_value": 3.571428571428572,
            "impact": "supports_away",
            "strength": 0.1143
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -1.8571428571428568,
          3.142857142857143,
          5.0
        ],
        "away": [
          0.5714285714285714,
          2.571428571428572,
          6.142857142857143,
          3.571428571428572
        ]
      },
      "market_implied_away": 0.4798464491362764,
      "market_edge_home": -0.1219,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "822877",
      "home": "TEX",
      "away": "LAA",
      "home_display": "Texas Rangers",
      "away_display": "Los Angeles Angels",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.6316293897470089,
      "away_win_probability": 0.3683706102529911,
      "model_pick": "TEX",
      "confidence": "High",
      "confidence_score": 0.6316293897470089,
      "home_probable_pitcher": "Nathan Eovaldi",
      "away_probable_pitcher": "Reid Detmers",
      "home_pitcher_summary": "Pitcher proxy: 124 prior starts, 4.07 runs allowed avg, 3.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 73 prior starts, 5.08 runs allowed avg, 6.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": -152.4,
      "moneyline_away": 130.2,
      "market_implied_home": 0.6038034865293186,
      "moneyline_home_open": null,
      "moneyline_home_current": -152.4,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 130.2,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 1.9285714285714288,
        "win_pct_14_diff": 0.0,
        "pitcher_runs_allowed_diff": 1.009611135660628,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 261.5325711556318,
        "home_split_advantage": 0.2555555555555555
      },
      "explanation": {
        "summary": "Model leans TEX with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1672.2711118485029,
            "away_value": 1933.8036830041349,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.2142857142857142,
            "away_value": -3.142857142857143,
            "impact": "supports_home",
            "strength": 0.4821
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.0472470011002373,
            "away_value": 1.3801311186847065,
            "impact": "supports_home",
            "strength": 0.2147
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 4.07258064516129,
            "away_value": 5.082191780821918,
            "impact": "supports_home",
            "strength": 0.0934
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 4.142857142857143,
            "away_value": 5.285714285714286,
            "impact": "supports_home",
            "strength": 0.0914
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -0.7142857142857143,
          3.4285714285714284,
          4.142857142857143
        ],
        "away": [
          0.2857142857142857,
          -2.571428571428572,
          2.7142857142857144,
          5.285714285714286
        ]
      },
      "market_implied_away": 0.43440486533449174,
      "market_edge_home": 0.0278,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "822954",
      "home": "TB",
      "away": "NYY",
      "home_display": "Tampa Bay Rays",
      "away_display": "New York Yankees",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.46107062468524035,
      "away_win_probability": 0.5389293753147597,
      "model_pick": "NYY",
      "confidence": "Low",
      "confidence_score": 0.5389293753147597,
      "home_probable_pitcher": "Drew Rasmussen",
      "away_probable_pitcher": null,
      "home_pitcher_summary": "Pitcher proxy: 80 prior starts, 3.48 runs allowed avg, 5.67 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -3.7142857142857135,
        "win_pct_14_diff": -0.5,
        "pitcher_runs_allowed_diff": 0.9250000000000004,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": -132.26750573183904,
        "home_split_advantage": -0.2058823529411765
      },
      "explanation": {
        "summary": "Model leans NYY with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1789.056272276596,
            "away_value": 1656.788766544757,
            "impact": "supports_away",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.3571428571428572,
            "away_value": 2.357142857142857,
            "impact": "supports_away",
            "strength": 0.9286
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.6367367999823044,
            "away_value": 2.1380899352994027,
            "impact": "supports_home",
            "strength": 0.5076
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.571428571428571,
            "away_value": 2.0,
            "impact": "supports_away",
            "strength": 0.2857
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.2857142857142857,
            "away_value": 1.0,
            "impact": "supports_away",
            "strength": 0.1786
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -2.0,
          3.571428571428572,
          5.571428571428571
        ],
        "away": [
          1.0,
          3.7142857142857135,
          5.714285714285714,
          2.0
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "823034",
      "home": "STL",
      "away": "MIL",
      "home_display": "St. Louis Cardinals",
      "away_display": "Milwaukee Brewers",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.47203609548954467,
      "away_win_probability": 0.5279639045104554,
      "model_pick": "MIL",
      "confidence": "Low",
      "confidence_score": 0.5279639045104554,
      "home_probable_pitcher": "Andre Pallante",
      "away_probable_pitcher": null,
      "home_pitcher_summary": "Pitcher proxy: 56 prior starts, 4.21 runs allowed avg, 5.33 recent RA avg.",
      "away_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Rest advantage",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -0.8571428571428572,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": 0.1857142857142859,
        "schedule_fatigue_diff": 1.0,
        "travel_km_diff": -427.83684267745366,
        "home_split_advantage": 0.0333333333333333
      },
      "explanation": {
        "summary": "Model leans MIL with top factors around rest advantage, travel fatigue, volatility edge.",
        "top_factors": [
          {
            "label": "Rest advantage",
            "feature": "rest_diff",
            "home_value": 282.0,
            "away_value": 0.0,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 427.83684267745366,
            "away_value": 0.0,
            "impact": "supports_away",
            "strength": 1.0
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.078342163598855,
            "away_value": 1.6761634196950477,
            "impact": "supports_home",
            "strength": 0.4832
          },
          {
            "label": "Schedule fatigue",
            "feature": "schedule_fatigue_diff",
            "home_value": 0.0,
            "away_value": 0.0,
            "impact": "supports_home",
            "strength": 0.25
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.9285714285714286,
            "away_value": -0.0714285714285714,
            "impact": "supports_away",
            "strength": 0.2143
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.4285714285714285,
          -1.7142857142857142,
          3.857142857142857,
          5.571428571428571
        ],
        "away": [
          0.4285714285714285,
          -1.1428571428571428,
          2.857142857142857,
          4.0
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "823201",
      "home": "SF",
      "away": "COL",
      "home_display": "San Francisco Giants",
      "away_display": "Colorado Rockies",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.6512621634441664,
      "away_win_probability": 0.34873783655583357,
      "model_pick": "SF",
      "confidence": "High",
      "confidence_score": 0.6512621634441664,
      "home_probable_pitcher": null,
      "away_probable_pitcher": "Ryan Feltner",
      "home_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "away_pitcher_summary": "Pitcher proxy: 66 prior starts, 5.61 runs allowed avg, 4.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 2.071428571428572,
        "win_pct_14_diff": 0.2857142857142857,
        "pitcher_runs_allowed_diff": 1.206060606060606,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 556.0025362555397,
        "home_split_advantage": 0.5803921568627451
      },
      "explanation": {
        "summary": "Model leans SF with top factors around travel fatigue, recent run differential, runs scored trend.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 0.0,
            "away_value": 556.0025362555397,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.6428571428571429,
            "away_value": -2.7142857142857144,
            "impact": "supports_home",
            "strength": 0.5179
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.857142857142857,
            "away_value": 2.2857142857142856,
            "impact": "supports_home",
            "strength": 0.2057
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 1.6761634196950537,
            "away_value": 1.1126972805283322,
            "impact": "supports_home",
            "strength": 0.1953
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.7142857142857143,
            "away_value": 0.1428571428571428,
            "impact": "supports_home",
            "strength": 0.1429
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.7142857142857143,
          1.2857142857142858,
          4.857142857142857,
          3.571428571428572
        ],
        "away": [
          0.1428571428571428,
          -2.571428571428572,
          2.2857142857142856,
          4.857142857142857
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "823277",
      "home": "SD",
      "away": "AZ",
      "home_display": "San Diego Padres",
      "away_display": "Arizona Diamondbacks",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.553323843530143,
      "away_win_probability": 0.44667615646985703,
      "model_pick": "SD",
      "confidence": "Medium",
      "confidence_score": 0.553323843530143,
      "home_probable_pitcher": "Griffin Canning",
      "away_probable_pitcher": "Merrill Kelly",
      "home_pitcher_summary": "Pitcher proxy: 80 prior starts, 5.00 runs allowed avg, 5.67 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 133 prior starts, 4.09 runs allowed avg, 4.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 2.928571428571429,
        "win_pct_14_diff": 0.2142857142857143,
        "pitcher_runs_allowed_diff": -0.9097744360902258,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": 0.0958333333333333
      },
      "explanation": {
        "summary": "Model leans SD with top factors around recent run differential, runs allowed trend, volatility edge.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 2.071428571428572,
            "away_value": -0.8571428571428571,
            "impact": "supports_home",
            "strength": 0.7321
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.571428571428572,
            "away_value": 6.142857142857143,
            "impact": "supports_home",
            "strength": 0.2857
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.498298906339373,
            "away_value": 2.9113897843110093,
            "impact": "supports_away",
            "strength": 0.1779
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 5.714285714285714,
            "away_value": 3.857142857142857,
            "impact": "supports_home",
            "strength": 0.1486
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.8571428571428571,
            "away_value": 0.2857142857142857,
            "impact": "supports_home",
            "strength": 0.1429
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.8571428571428571,
          3.142857142857143,
          5.714285714285714,
          2.571428571428572
        ],
        "away": [
          0.2857142857142857,
          -2.2857142857142856,
          3.857142857142857,
          6.142857142857143
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "823359",
      "home": "PIT",
      "away": "ATL",
      "home_display": "Pittsburgh Pirates",
      "away_display": "Atlanta Braves",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.46515009112583905,
      "away_win_probability": 0.534849908874161,
      "model_pick": "ATL",
      "confidence": "Low",
      "confidence_score": 0.534849908874161,
      "home_probable_pitcher": "Mitch Keller",
      "away_probable_pitcher": "Bryce Elder",
      "home_pitcher_summary": "Pitcher proxy: 146 prior starts, 4.70 runs allowed avg, 4.67 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 77 prior starts, 4.17 runs allowed avg, 2.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": -103.2,
      "moneyline_away": -110.5,
      "market_implied_home": 0.5078740157480316,
      "moneyline_home_open": null,
      "moneyline_home_current": -103.2,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": -110.5,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Recent run differential",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.6428571428571428,
        "win_pct_14_diff": -0.2142857142857143,
        "pitcher_runs_allowed_diff": -0.5297989681551325,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 0.0,
        "home_split_advantage": -0.2499999999999999
      },
      "explanation": {
        "summary": "Model leans ATL with top factors around recent run differential, volatility edge, runs allowed trend.",
        "top_factors": [
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.7857142857142857,
            "away_value": 2.4285714285714284,
            "impact": "supports_away",
            "strength": 0.4107
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.860668582611297,
            "away_value": 3.258688021128692,
            "impact": "supports_away",
            "strength": 0.1282
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.142857142857143,
            "away_value": 3.7142857142857135,
            "impact": "supports_home",
            "strength": 0.1257
          },
          {
            "label": "Starting pitcher proxy",
            "feature": "pitcher_runs_allowed_diff",
            "home_value": 4.698630136986301,
            "away_value": 4.1688311688311686,
            "impact": "supports_away",
            "strength": 0.049
          },
          {
            "label": "Short-term form",
            "feature": "win_pct_7_diff",
            "home_value": 0.7142857142857143,
            "away_value": 0.5714285714285714,
            "impact": "supports_home",
            "strength": 0.0357
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.7142857142857143,
          2.571428571428572,
          4.714285714285714,
          2.142857142857143
        ],
        "away": [
          0.5714285714285714,
          0.7142857142857143,
          4.428571428571429,
          3.7142857142857135
        ]
      },
      "market_implied_away": 0.5249406175771971,
      "market_edge_home": -0.0427,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "823606",
      "home": "NYM",
      "away": "KC",
      "home_display": "New York Mets",
      "away_display": "Kansas City Royals",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.44080578921239666,
      "away_win_probability": 0.5591942107876033,
      "model_pick": "KC",
      "confidence": "Medium",
      "confidence_score": 0.5591942107876033,
      "home_probable_pitcher": "Sean Manaea",
      "away_probable_pitcher": "Michael Wacha",
      "home_pitcher_summary": "Pitcher proxy: 112 prior starts, 4.93 runs allowed avg, 6.67 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 127 prior starts, 4.09 runs allowed avg, 7.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": -136.2,
      "moneyline_away": 119.2,
      "market_implied_home": 0.5766299745977984,
      "moneyline_home_open": null,
      "moneyline_home_current": -136.2,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": 119.2,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.7142857142857144,
        "win_pct_14_diff": -0.0714285714285714,
        "pitcher_runs_allowed_diff": -0.8419572553430825,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 2270.118822457529,
        "home_split_advantage": -0.1047619047619047
      },
      "explanation": {
        "summary": "Model leans KC with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1766.534648510508,
            "away_value": 4036.653470968037,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.5,
            "away_value": 2.2142857142857144,
            "impact": "supports_away",
            "strength": 0.4286
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.3380918415851224,
            "away_value": 2.927700218845598,
            "impact": "supports_home",
            "strength": 0.2652
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.142857142857143,
            "away_value": 5.714285714285714,
            "impact": "supports_away",
            "strength": 0.1257
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.0,
            "away_value": 3.857142857142857,
            "impact": "supports_away",
            "strength": 0.0914
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.4285714285714285,
          -0.8571428571428571,
          4.142857142857143,
          5.0
        ],
        "away": [
          0.5714285714285714,
          1.8571428571428568,
          5.714285714285714,
          3.857142857142857
        ]
      },
      "market_implied_away": 0.4562043795620438,
      "market_edge_home": -0.1358,
      "odds_status": "real_odds_snapshot",
      "odds_snapshot_at": "2026-07-08T18:10:27Z"
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "823683",
      "home": "MIN",
      "away": "CLE",
      "home_display": "Minnesota Twins",
      "away_display": "Cleveland Guardians",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4067417754028255,
      "away_win_probability": 0.5932582245971745,
      "model_pick": "CLE",
      "confidence": "Medium",
      "confidence_score": 0.5932582245971745,
      "home_probable_pitcher": "Mike Paredes",
      "away_probable_pitcher": "Gavin Williams",
      "home_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "away_pitcher_summary": "Pitcher proxy: 61 prior starts, 4.11 runs allowed avg, 1.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.9285714285714288,
        "win_pct_14_diff": -0.4285714285714285,
        "pitcher_runs_allowed_diff": -0.2852459016393442,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": -570.718486252411,
        "home_split_advantage": -0.3798076923076923
      },
      "explanation": {
        "summary": "Model leans CLE with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 1585.421518123191,
            "away_value": 1014.70303187078,
            "impact": "supports_away",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -0.3571428571428571,
            "away_value": 1.5714285714285714,
            "impact": "supports_away",
            "strength": 0.4821
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 1.976047040118718,
            "away_value": 2.478478796128218,
            "impact": "supports_away",
            "strength": 0.3032
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 1.7142857142857142,
            "away_value": 4.285714285714286,
            "impact": "supports_home",
            "strength": 0.2057
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.2857142857142856,
            "away_value": 4.142857142857143,
            "impact": "supports_away",
            "strength": 0.0686
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          1.5714285714285714,
          3.2857142857142856,
          1.7142857142857142
        ],
        "away": [
          0.5714285714285714,
          -0.1428571428571428,
          4.142857142857143,
          4.285714285714286
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "823846",
      "home": "MIA",
      "away": "SEA",
      "home_display": "Miami Marlins",
      "away_display": "Seattle Mariners",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.44006810740231783,
      "away_win_probability": 0.5599318925976822,
      "model_pick": "SEA",
      "confidence": "Medium",
      "confidence_score": 0.5599318925976822,
      "home_probable_pitcher": null,
      "away_probable_pitcher": "Bryce Miller",
      "home_pitcher_summary": "Probable pitcher listed, but prior-start proxy data is unavailable.",
      "away_pitcher_summary": "Pitcher proxy: 73 prior starts, 4.26 runs allowed avg, 5.33 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "partial_proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "partial_proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.9285714285714284,
        "win_pct_14_diff": 0.0,
        "pitcher_runs_allowed_diff": -0.1397260273972609,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 4392.337600739937,
        "home_split_advantage": -0.0333333333333333
      },
      "explanation": {
        "summary": "Model leans SEA with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 0.0,
            "away_value": 4392.337600739937,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.3571428571428571,
            "away_value": 2.2857142857142856,
            "impact": "supports_away",
            "strength": 0.4821
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.6457513110645965,
            "away_value": 2.8784916685156934,
            "impact": "supports_home",
            "strength": 0.3423
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.0,
            "away_value": 4.571428571428571,
            "impact": "supports_away",
            "strength": 0.1257
          },
          {
            "label": "Month-long form",
            "feature": "win_pct_30_diff",
            "home_value": 0.5,
            "away_value": 0.6333333333333333,
            "impact": "supports_away",
            "strength": 0.0333
          }
        ],
        "data_quality": {
          "pitcher_data": "partial_proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 4,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          -0.7142857142857143,
          3.0,
          3.7142857142857135
        ],
        "away": [
          0.5714285714285714,
          1.1428571428571428,
          4.571428571428571,
          3.4285714285714284
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "824251",
      "home": "DET",
      "away": "ATH",
      "home_display": "Detroit Tigers",
      "away_display": "Athletics",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.44984280221789436,
      "away_win_probability": 0.5501571977821056,
      "model_pick": "ATH",
      "confidence": "Medium",
      "confidence_score": 0.5501571977821056,
      "home_probable_pitcher": "Framber Valdez",
      "away_probable_pitcher": "Jack Perkins",
      "home_pitcher_summary": "Pitcher proxy: 141 prior starts, 3.52 runs allowed avg, 6.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 3 prior starts, 4.00 runs allowed avg, 4.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.6428571428571428,
        "win_pct_14_diff": -0.3571428571428571,
        "pitcher_runs_allowed_diff": 0.4751773049645389,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 2271.559240642848,
        "home_split_advantage": -0.3333333333333333
      },
      "explanation": {
        "summary": "Model leans ATH with top factors around travel fatigue, volatility edge, recent run differential.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 981.4350557355074,
            "away_value": 3252.994296378355,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 0.9759000729485272,
            "away_value": 2.149196970742248,
            "impact": "supports_away",
            "strength": 0.7048
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -2.0,
            "away_value": -0.3571428571428571,
            "impact": "supports_away",
            "strength": 0.4107
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 3.857142857142857,
            "away_value": 5.571428571428571,
            "impact": "supports_home",
            "strength": 0.1371
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 2.4285714285714284,
            "away_value": 3.4285714285714284,
            "impact": "supports_away",
            "strength": 0.08
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -1.4285714285714286,
          2.4285714285714284,
          3.857142857142857
        ],
        "away": [
          0.4285714285714285,
          -2.142857142857143,
          3.4285714285714284,
          5.571428571428571
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "824494",
      "home": "CIN",
      "away": "PHI",
      "home_display": "Cincinnati Reds",
      "away_display": "Philadelphia Phillies",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4519237442398681,
      "away_win_probability": 0.548076255760132,
      "model_pick": "PHI",
      "confidence": "Low",
      "confidence_score": 0.548076255760132,
      "home_probable_pitcher": "Brady Singer",
      "away_probable_pitcher": "Jesús Luzardo",
      "home_pitcher_summary": "Pitcher proxy: 142 prior starts, 4.42 runs allowed avg, 3.00 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 110 prior starts, 4.53 runs allowed avg, 3.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": 0.8571428571428571,
        "win_pct_14_diff": 0.0714285714285715,
        "pitcher_runs_allowed_diff": 0.1117797695262483,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 281.3572195310152,
        "home_split_advantage": 0.0240384615384615
      },
      "explanation": {
        "summary": "Model leans PHI with top factors around travel fatigue, volatility edge, recent run differential.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 524.6603426058064,
            "away_value": 806.0175621368215,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 1.9518001458970484,
            "away_value": 3.690399384761435,
            "impact": "supports_away",
            "strength": 0.574
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": 0.8571428571428571,
            "away_value": 0.0,
            "impact": "supports_home",
            "strength": 0.2143
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 2.571428571428572,
            "away_value": 3.2857142857142856,
            "impact": "supports_home",
            "strength": 0.0571
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 2.857142857142857,
            "away_value": 3.4285714285714284,
            "impact": "supports_away",
            "strength": 0.0457
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.5714285714285714,
          0.2857142857142857,
          2.857142857142857,
          2.571428571428572
        ],
        "away": [
          0.5714285714285714,
          0.1428571428571428,
          3.4285714285714284,
          3.2857142857142856
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "824577",
      "home": "CWS",
      "away": "BOS",
      "home_display": "Chicago White Sox",
      "away_display": "Boston Red Sox",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.4805278403659517,
      "away_win_probability": 0.5194721596340484,
      "model_pick": "BOS",
      "confidence": "Low",
      "confidence_score": 0.5194721596340484,
      "home_probable_pitcher": "Anthony Kay",
      "away_probable_pitcher": "Patrick Sandoval",
      "home_pitcher_summary": "Pitcher proxy: 4 prior starts, 5.00 runs allowed avg, 4.33 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 83 prior starts, 4.88 runs allowed avg, 4.00 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -1.5,
        "win_pct_14_diff": -0.3571428571428571,
        "pitcher_runs_allowed_diff": -0.1204819277108431,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 405.8154745831739,
        "home_split_advantage": -0.3809523809523809
      },
      "explanation": {
        "summary": "Model leans BOS with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 957.836457797214,
            "away_value": 1363.651932380388,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.0714285714285714,
            "away_value": 0.4285714285714285,
            "impact": "supports_away",
            "strength": 0.375
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 3.408672412985392,
            "away_value": 2.070196678027058,
            "impact": "supports_home",
            "strength": 0.364
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 4.857142857142857,
            "away_value": 3.2857142857142856,
            "impact": "supports_away",
            "strength": 0.1257
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 4.428571428571429,
            "away_value": 3.4285714285714284,
            "impact": "supports_home",
            "strength": 0.08
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -0.4285714285714285,
          4.428571428571429,
          4.857142857142857
        ],
        "away": [
          0.5714285714285714,
          0.1428571428571428,
          3.4285714285714284,
          3.2857142857142856
        ]
      }
    },
    {
      "sport": "MLB",
      "season": 2026,
      "game_date": "2026-07-09",
      "game_id": "824816",
      "home": "BAL",
      "away": "CHC",
      "home_display": "Baltimore Orioles",
      "away_display": "Chicago Cubs",
      "home_score": null,
      "away_score": null,
      "status": "Scheduled",
      "home_win_probability": 0.41128659072067425,
      "away_win_probability": 0.5887134092793258,
      "model_pick": "CHC",
      "confidence": "Medium",
      "confidence_score": 0.5887134092793258,
      "home_probable_pitcher": "Trevor Rogers",
      "away_probable_pitcher": "David Peterson",
      "home_pitcher_summary": "Pitcher proxy: 92 prior starts, 4.32 runs allowed avg, 3.67 recent RA avg.",
      "away_pitcher_summary": "Pitcher proxy: 102 prior starts, 4.59 runs allowed avg, 5.67 recent RA avg.",
      "pitcher_edge": "Pitcher proxy edge",
      "pitcher_data_status": "proxy",
      "moneyline_home": null,
      "moneyline_away": null,
      "market_implied_home": null,
      "moneyline_home_open": null,
      "moneyline_home_current": null,
      "moneyline_home_close": null,
      "moneyline_away_open": null,
      "moneyline_away_current": null,
      "moneyline_away_close": null,
      "edge": null,
      "movement_label": "Line movement unavailable. Add odds provider later.",
      "clv": null,
      "clv_label": "CLV unavailable",
      "result": "Pending",
      "model_result": "Pending",
      "actual_result": "Pending",
      "prediction_mode": "model",
      "model_name": "GradientBoostingClassifier",
      "model_id": "mlb_moneyline_v1.0.0_20260708T164059",
      "top_factor_label": "Travel fatigue",
      "data_quality": {
        "pitcher_data": "proxy",
        "travel_data": "estimated",
        "schedule_fatigue": "used"
      },
      "feature_values": {
        "run_diff_14_diff": -3.5,
        "win_pct_14_diff": -0.1428571428571428,
        "pitcher_runs_allowed_diff": 0.2730179028132991,
        "schedule_fatigue_diff": 0.0,
        "travel_km_diff": 689.8359818975275,
        "home_split_advantage": 0.0666666666666666
      },
      "explanation": {
        "summary": "Model leans CHC with top factors around travel fatigue, recent run differential, volatility edge.",
        "top_factors": [
          {
            "label": "Travel fatigue",
            "feature": "travel_km_diff",
            "home_value": 286.6232003837621,
            "away_value": 976.4591822812896,
            "impact": "supports_home",
            "strength": 1.0
          },
          {
            "label": "Recent run differential",
            "feature": "run_diff_14_diff",
            "home_value": -1.8571428571428568,
            "away_value": 1.6428571428571428,
            "impact": "supports_away",
            "strength": 0.875
          },
          {
            "label": "Volatility edge",
            "feature": "volatility_diff",
            "home_value": 2.1930626551751504,
            "away_value": 4.220133150686583,
            "impact": "supports_away",
            "strength": 0.4953
          },
          {
            "label": "Runs scored trend",
            "feature": "runs_scored_7_diff",
            "home_value": 3.142857142857143,
            "away_value": 6.142857142857143,
            "impact": "supports_away",
            "strength": 0.24
          },
          {
            "label": "Runs allowed trend",
            "feature": "runs_allowed_7_diff",
            "home_value": 5.0,
            "away_value": 3.571428571428572,
            "impact": "supports_away",
            "strength": 0.1143
          }
        ],
        "data_quality": {
          "pitcher_data": "proxy",
          "travel_data": "estimated",
          "schedule_fatigue": "used",
          "feature_missing_count": 0,
          "explanation_type": "local feature values with global model driver weights"
        }
      },
      "trend": {
        "labels": [
          "Win %",
          "Run diff",
          "Runs scored",
          "Runs allowed"
        ],
        "home": [
          0.2857142857142857,
          -1.8571428571428568,
          3.142857142857143,
          5.0
        ],
        "away": [
          0.5714285714285714,
          2.571428571428572,
          6.142857142857143,
          3.571428571428572
        ]
      }
    }
  ]
};
