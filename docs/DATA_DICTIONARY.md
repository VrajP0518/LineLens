# LineLens Data Dictionary

The dashboard is intentionally export-driven. The fields below are the minimum provenance users should expect to see or trace.

| Export | Important fields | Meaning |
|---|---|---|
| `data/predictions/mlb_predictions.json` | `game_id`, `game_date`, `away`, `home`, `model_pick`, `home_win_probability`, `explanation` | Current MLB prediction rows and model context |
| `data/predictions/mlb_backtest_predictions.json` | `game_date`, `model_pick`, `model_result`, `home_win_probability` | Historical MLB evaluation rows, separate from live record |
| `data/predictions/nfl_predictions.json` | `season`, `week`, `spread_line`, `model_pick`, `model_result`, `prediction_mode` | Historical/cached NFL spread rows; supplements are labeled |
| `data/odds/odds_snapshots.json` | `snapshot_at`, matchup identifiers, market implied fields, bookmaker count | Optional real market snapshots; absence means no market claim |
| `data/live/live_scores.json` | matchup identifiers, status, scores, `latest_play`, inning/bases context | Optional live scoreboard context |
| `data/models/model_registry.json` | `model_name`, `model_id`, `selected`, `trained_at`, `metrics` | Model artifact history and production/challenger state |
| `data/reports/mlb_model_comparison.json` | model metrics, calibration, stability, selection metadata | Fair chronological model comparison |
| `data/tracking/model_predictions_log.json` | prediction timestamp, game, model, result status | Logged predictions used for live accountability |
| `data/tracking/model_record.json` | live/backtest/historical records, sample sizes, source paths | Scored performance summaries |

## Date rules

Date-only values use plain `YYYY-MM-DD` strings. They are compared as strings and parsed as local calendar dates for display. They are not converted through UTC before filtering or rendering.

## Trust rules

- `real_data`, `source_status`, `generated_at`, and `prediction_mode` are provenance fields, not decoration.
- Cached, missing, schedule-only, and unavailable states must remain visible.
- A missing odds snapshot must not become an inferred line.
- A pending or no-logged-pick row must not become a win or loss.
