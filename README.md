![alt text](image-1.png)

# LineLens Sports v0.7.0

LineLens Sports is a Tauri-ready desktop sports prediction dashboard for NFL spread and MLB moneyline modeling. Version v0.7.0 adds a premium Home command center plus a LineLens Live desktop mini widget for compact sports scores, live MLB context, and model-pick visibility.

The v0.6.0 MLB model-intelligence foundation remains in place: richer real features, model comparison, pick explanations, model registry, and ongoing model record tracking.

Predictions are experimental research outputs for analysis and portfolio demonstration only. They are not financial or betting advice.

## Current Modules

- Home command center with animated stadium visuals, highlighted best current pick, data readiness, model record summary, sports pulse ticker, and a collapsed refresh console.
- NFL spread predictor that preserves the existing NFL pipeline and real exported rows when source/processed data is available.
- MLB moneyline predictor with real model probabilities, pitcher matchup display, top factors, and data-quality badges.
- Reports page for current model, model record, model comparison, confidence buckets, calibration, global features, prediction log, and feature summary.
- Record page for live MLB record, MLB backtest record, and historical NFL cached/backtest record.
- Teams page using team metadata and logo fallbacks.
- Tracking page for local-only analysis.
- Settings/Data Status page with bootstrap, refresh, registry, prediction log, and file status guidance.
- LineLens Live widget window for compact live/today/final score cards, MLB play context when available, and joined LineLens model picks.

## LineLens Live Widget

LineLens Live is a small desktop widget window opened from the Tauri app. It is designed to sit on the side of the screen like a sports mini-player:

- Compact mode shows one featured game, score/status, latest play, model pick, edge, and previous/next controls.
- Expanded mode shows sport/mode filters, yesterday/today/tomorrow date navigation, a game list, selected-game detail, and a play-by-play feed when MLB Stats API supplies it.
- Work Mode mutes motion and keeps the panel quieter for office use.
- Widget preferences are stored locally under `linelens.liveWidget.v1`.

The widget uses real exported data only:

- MLB live/today/nearby schedule data comes from the public MLB Stats API where available. The live refresh requests a seven-day window: three days back, today, and three days forward.
- If the live API is unavailable, the widget keeps showing cached schedule files from `data/raw/mlb/` when present, then current exported MLB schedule/prediction rows, then other real exported rows.
- MLB pitch/play context is shown only when the live feed supplies it.
- LineLens model picks are joined from `data/predictions/mlb_predictions.json`.
- Schedule-only games are allowed in the widget, but they are labeled `Schedule only` / `No model pick` and are not counted in model record.
- NFL live play data is not sourced in this iteration; the widget can show exported NFL prediction rows when available and labels NFL live feed as unavailable.
- Browser/static mode cannot open a separate desktop widget window. It shows the manual command path instead of pretending.

Commands:

```powershell
npm run refresh:live
npm run refresh:widget
```

Outputs:

```text
data/live/live_scores.json
data/live/live_scores.js
```

Packaged desktop builds may show cached live data if Python scripts are unavailable. Full model training remains separate from the widget refresh path.

## Model Record Page

The Record tab is the dedicated place to inspect performance without mixing incompatible record types:

- MLB Live Record uses only real logged LineLens MLB predictions from `data/tracking/model_predictions_log.json`. If no completed logged predictions have been scored yet, the page says so and keeps rows as pending.
- MLB Backtest Record is shown separately as `2025 Backtest` from `data/predictions/mlb_backtest_predictions.json`. It is not counted as live model performance.
- NFL Historical Record uses the cached/exported NFL prediction rows from `data/predictions/nfl_predictions.json` when real `model_result` fields are present. It is labeled as historical/backtest, not live NFL record.
- Schedule-only games and games without model picks never count as wins/losses.

Refresh and score records:

```powershell
npm run refresh:live
npm run score:models
```

## Improved MLB Model

The MLB model is built from historical MLB game results with no fabricated rows. Feature engineering keeps strict no-leakage rules: games are sorted by date, rolling windows are shifted by one game, and same-game scores are used only for target/result/backtest scoring.

Feature groups now include:

- Team form: 3/7/14/30-game win percentage and matchup diffs.
- Run scoring: rolling runs scored and allowed over 3/7/14 games.
- Run differential and momentum: rolling run differential, streaks, and diffs.
- Home/away splits: recent home team home form and away team road form.
- Rest/fatigue: rest days, back-to-back flags, 3-in-4, 6-in-7, and fatigue diff.
- Series context: doubleheaders, series game number, previous head-to-head winner, and recent head-to-head rate.
- Pitcher proxy: probable pitcher names when supplied by MLB Stats API, plus prior-start team-result proxy features. This is not ERA/WHIP modeling unless richer pitcher stat joins are added.
- Travel estimate: approximate city/venue distance using team coordinates. This is not an exact travel itinerary.
- Season context: game number, month, day of week, late-season flag, interleague/division metadata when available.
- Volatility: recent scoring and prevention standard deviation.

Feature summaries are exported to:

```text
data/reports/mlb_feature_summary.json
data/reports/mlb_feature_summary.js
```

Large raw and processed files stay local-only under ignored folders.

## Why This Pick?

MLB prediction exports include an explanation object for each model-backed row:

- Summary text using careful language such as "Model leans".
- Top factors with feature name, home value, away value, impact direction, and strength.
- Data-quality badges for pitcher data, estimated travel, and missing feature count.
- Feature values for audit/debugging.

Logistic regression uses local coefficient-style contributions. Tree models use global feature importance plus row values when local explanations are not available. SHAP is not required.

## Model Training And Registry

Default MLB training uses 2021-2024 for training and 2025 for test/backtest. The trainer compares:

- Logistic Regression
- Random Forest
- Gradient Boosting
- HistGradientBoostingClassifier
- Baseline Home Team
- Baseline Recent Form
- Baseline 50/50

The selected model is chosen by test log loss, with Brier score as a secondary quality check. The active model is saved to:

```text
models/mlb_moneyline_model.joblib
```

Model comparison and registry outputs:

```text
data/reports/mlb_model_comparison.json
data/reports/mlb_model_comparison.js
data/models/model_registry.json
data/models/model_registry.js
```

Run the full train/backtest/export path:

```powershell
npm run refresh:mlb:all
```

## Model Record Tracking

Current MLB exports append real prediction snapshots to:

```text
data/tracking/model_predictions_log.json
data/tracking/model_predictions_log.js
```

Scoring reads completed MLB results from cached/live MLB Stats API schedule data when available and writes:

```text
data/tracking/model_record.json
data/tracking/model_record.js
```

Commands:

```powershell
npm run refresh:mlb
npm run score:models
```

No historical prediction records are fabricated. The registry and prediction log start from real runs.

## Data Honesty

- No fake predictions.
- Missing feature sources are marked missing and the model continues with available real features.
- Cached data is labeled cached.
- Pitcher proxy means pitcher-team-result proxy from prior starts, not invented pitcher stats.
- Estimated travel is approximate team/city distance.
- Odds are optional only through environment configuration such as `ODDS_API_KEY`; odds are not required.

## Recommended First Run

```powershell
cd C:\Users\Vraj.Patel\Downloads\coop\LineLens

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

npm install
npm run startup:auto
npm run refresh:mlb:all
npm run app
```

Use Python 3.11 for this app. `nfl-data-py` depends on an older numpy/pandas stack, and newer Python versions can force fragile local source builds on machines without MSVC/C++ Build Tools.

## MLB Pipeline

Manual workflow:

```powershell
python -m src.mlb.data_ingest_mlb history --start-season 2021 --end-season 2025 --force
python -m src.mlb.feature_builder_mlb build-history --start-season 2021 --end-season 2025
python -m src.mlb.train_model_mlb --features-file data/processed/mlb/mlb_features_2021_2025.csv --train-start-season 2021 --train-end-season 2024 --test-season 2025
python -m src.mlb.export_predictions_mlb backtest --features-file data/processed/mlb/mlb_features_2021_2025.csv --season 2025
python -m src.mlb.export_predictions_mlb export --features-file data/processed/mlb/mlb_current_features.csv --model-file models/mlb_moneyline_model.joblib --season 2026
python scripts/score_model_predictions.py
```

Package scripts:

```powershell
npm run refresh:mlb
npm run refresh:mlb:all
npm run refresh:mlb:train
npm run score:models
npm run check:data
```

## NFL Pipeline And Recovery

NFL functionality is preserved, but NFL real-data refresh still depends on source access or local processed artifacts.

Preferred refresh wrapper:

```powershell
npm run refresh:nfl:real
```

Manual NFL recovery from an older local project:

```powershell
mkdir data\imports\nfl
copy C:\path\to\old\spread_dataset.parquet data\imports\nfl\spread_dataset.parquet
npm run refresh:nfl:real
```

The app does not fabricate offseason NFL rows. If NFL source access is refused, the NFL page and Settings page show the manual import path.

## Desktop Commands

The Tauri command bridge only runs allow-listed operations:

```text
startup_auto  -> python scripts/startup_orchestrator.py
bootstrap_env -> python scripts/bootstrap_env.py
mlb_current   -> python scripts/refresh_data.py --sport mlb --mode predict
mlb_all       -> python scripts/refresh_data.py --sport mlb --mode all
nfl_real      -> python scripts/refresh_data.py --sport nfl --mode real
data_real     -> python scripts/refresh_data.py --sport all --mode real
check_data    -> python scripts/check_data_status.py
score_models  -> python scripts/score_model_predictions.py
live_scores   -> python scripts/live_scores.py
```

Browser/static mode cannot run terminal commands. It shows the manual command instead of pretending to refresh.

## Local Validation

```powershell
npm run check:js
python -m compileall src scripts
npm run build:web
npm run refresh:live
npm run refresh:mlb:all
npm run refresh:mlb
npm run score:models
npm run check:data
npm run tauri -- info
```

Do not require `npm run tauri:build` locally on this machine. Local native builds require Rust, WebView2, and Microsoft C++ Build Tools/MSVC. The Windows desktop bundle is built by GitHub Actions.

## GitHub Actions Build

The production bundle uses:

```text
src-tauri/tauri.conf.json > build.frontendDist = ../dist-web
```

GitHub Actions uploads the Windows artifact as:

```text
LineLens-Sports-Windows
```

## Push Workflow

```powershell
npm run refresh:mlb:all
npm run refresh:mlb
npm run score:models
npm run check:data
npm run check:js
python -m compileall src scripts
npm run build:web
git status
git add .
git commit -m "Improve MLB model features explanations and record tracking"
git push origin main
```
