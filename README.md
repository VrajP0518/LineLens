# LineLens Sports v1.0.0

LineLens Sports is a Tauri desktop sports analytics dashboard for model-based NFL and MLB prediction review. It is built as a plain HTML/CSS/JavaScript frontend with Python data/modeling pipelines and a Tauri shell for a real desktop app experience.

This v1.0.0 demo release is designed to open with bundled real exports so a reviewer can immediately see the app working without first running a live data refresh.

Predictions are experimental educational outputs for project demonstration only. LineLens Sports is not betting advice.

## Feature Highlights

- Tauri desktop app with GitHub Actions Windows builds.
- Home command center with Best Pick Spotlight, dashboard cards, and ESPN-style ticker.
- MLB Prediction Lifecycle workspace that follows Pregame, Live, and Final accountability in one daily board.
- MLB Model Observatory with technical algorithm names, Legendary-inspired abstract identities, production/challenger status, and expandable metric profiles.
- MLB moneyline prediction model with real probabilities and current schedule exports.
- 119+ MLB feature set covering team form, run differential, rest/fatigue, travel estimate, pitcher proxy, home/away splits, series context, and volatility.
- Model comparison and selected model metadata.
- "Why this pick?" explanations with top factors and data-quality badges.
- Model record tracking with live MLB record separated from MLB backtest.
- LineLens Live widget for compact live/today/final score cards and joined model picks.
- Record page for MLB live/backtest and NFL historical record review.
- Reports page with model comparison, calibration/report cards, global factors, and registry.
- Optional real odds snapshot capture through `ODDS_API_KEY`, with market lines shown only when fetched successfully.
- Data Doctor and Presentation Mode controls for cleaner demo review.
- NFL historical spread predictor support from cached/exported real rows.
- Settings refresh console for safe Tauri command refreshes.
- No fake prediction policy. Missing data is labeled honestly.

## Demo Flow

1. Open Home and show the Best Pick Spotlight, summary cards, ticker, and Live Widget preview.
2. Open MLB and show the daily board, probabilities, pitcher context, result chips, and "Why this pick?" factors.
3. Click Open Live Widget to show the compact sports mini-widget. Expand it if you want the game list and detail panel.
4. Open Record and show MLB live record, MLB backtest record, and NFL historical record as separate sections.
5. Open Reports and show model comparison, selected model, feature summary, calibration/report cards, and registry.
6. Open Settings and show the refresh console, data file presence, app version, and build/runtime status.
7. Use Settings -> Presentation Mode when you want a cleaner professor/TA walkthrough with diagnostic noise reduced.

## Download The Windows App

The Windows desktop artifact is built in GitHub Actions.

1. Go to the GitHub repo: `https://github.com/VrajP0518/LineLens`
2. Open the Actions tab.
3. Select the latest `Tauri Windows Build` run.
4. Download the `LineLens-Sports-Windows` artifact.
5. Extract it and run the bundled LineLens Sports executable or installer output.

If a v1.0.0 GitHub Release is created, download the Windows installer/artifact from the release page instead.

## First Open Behavior

The app loads bundled JSON exports immediately:

- `data/predictions/mlb_predictions.json`
- `data/predictions/mlb_backtest_predictions.json`
- `data/predictions/nfl_predictions.json`
- `data/live/live_scores.json`
- `data/reports/*.json`
- `data/tracking/*.json`
- `data/models/model_registry.json`

If Python scripts are not available in the installed app environment, the UI stays usable and says that bundled exports are being shown. Command refresh requires the project repo/dev environment.

When the Tauri desktop app opens in the repo/dev environment, it automatically runs the same safe startup path as `npm run refresh:startup`: bootstrap Python, refresh MLB, refresh NFL, refresh live widget data, score model records, and check data status.

Live score refresh is intentionally lighter than model refresh. `npm run refresh:live` pulls fast scoreboard/status data from ESPN public scoreboard endpoints and MLB Stats API, then joins existing LineLens prediction exports. The app heartbeat can poll live scores about every 15 seconds, while model predictions remain daily/on-demand so training is not rerun during live games.

## Developer Setup

Use Python 3.11 for the local pipeline.

```powershell
cd C:\Users\Vraj.Patel\Downloads\coop\LineLens

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

npm install
npm run demo:check
npm run app
```

`npm run app` serves the static app at `http://localhost:4173`. The Tauri desktop dev shell is available with:

```powershell
npm run tauri:dev
```

Local native Tauri builds require Rust, WebView2, and Microsoft C++ Build Tools/MSVC. This project is configured so GitHub Actions can build the Windows desktop artifact even when local MSVC is unavailable.

## Useful Commands

```powershell
npm run refresh:mlb
npm run refresh:live
npm run refresh:odds
npm run score:models
npm run refresh:startup
npm run check:data
npm run check:js
python -m compileall src scripts
npm run build:web
npm run demo:check
npm run tauri -- info
```

Full MLB train/backtest/current refresh:

```powershell
npm run refresh:mlb:all
```

NFL real/cached refresh:

```powershell
npm run refresh:nfl:real
```

All-in startup refresh:

```powershell
npm run refresh:startup
```

Optional odds refresh:

```powershell
copy .env.example .env
# Add your key locally. Do not commit .env.
# ODDS_API_KEY=your_key_here
npm run refresh:odds
```

Line movement and CLV are only calculated from real odds snapshots when enough market history exists. If odds are missing, stale, or unavailable, LineLens shows a missing/cached state instead of fabricating lines.

## MLB Model

The MLB model predicts `home_win` for moneyline-style matchup review. The current selected model is trained from historical MLB results and exported into `models/mlb_moneyline_model.joblib`.

Training uses 2021-2024 for training and 2025 for test/backtest by default. The trainer compares:

- Logistic Regression
- Random Forest
- Gradient Boosting
- HistGradientBoostingClassifier
- Baseline Home Team
- Baseline Recent Form
- Baseline 50/50

The selected model is chosen primarily by log loss, with Brier score as an additional quality check.

## Moltres MLB Flagship Ensemble

Moltres is an integrated MLB challenger model, not a pre-declared winner. It combines the strongest base estimators that train successfully from the existing feature table, then fits a logistic meta-model on chronological out-of-fold base probabilities. The 2025 holdout season is sealed from both base-model and meta-model fitting. The comparison export reports accuracy, log loss, Brier score, ROC AUC, calibration error, and chronological stability for Moltres and every existing candidate.

Moltres is promoted to the production artifact only when the same holdout selection rule used for the existing MLB models—lowest log loss, then Brier score—actually selects it. Otherwise the existing selected model remains in `models/mlb_moneyline_model.joblib`, while the challenger is retained at `models/mlb_moltres_model.joblib`. The Reports page shows `pending`, `challenger`, or `active` honestly from the available card and registry exports. No Moltres performance claim should be made before a manual training run produces the card and comparison evidence.

The training path is protected by a single-process lock and stages model artifacts before replacing the production file. A failed or overlapping run is rejected without replacing the existing production model. The generated outputs are:

- `models/mlb_moltres_model.joblib` — serialized Moltres ensemble artifact.
- `data/reports/mlb_moltres_model_card.json` and `.js` — architecture, leakage controls, component weights, metrics, selection status, and limitations.
- `data/reports/mlb_model_comparison.json` and `.js` — fair holdout comparison across base models, Moltres, and baselines.
- `data/models/model_registry.json` and `.js` — Moltres registry entry plus the explicit selected model.
- `data/predictions/mlb_predictions.json` and `.js` — production predictions using the selected model; Moltres component contributions appear when Moltres is selected or exported explicitly.

### Manual Moltres training and evaluation commands

Run these commands yourself from the repository after activating the project environment. Do not start a second training process while one is running, and do not use `npm run refresh:mlb:all` if you only want this controlled Moltres run because that refresh path may retrain as part of its orchestration.

```powershell
cd C:\Users\Vraj.Patel\Downloads\coop\LineLens
.\.venv\Scripts\Activate.ps1

# Train base candidates and Moltres on pre-2025 seasons; evaluate on sealed 2025.
python -m src.mlb.train_model_mlb

# Export current predictions from whichever model the evaluation selected.
python -m src.mlb.export_predictions_mlb export

# Export the selected production model's 2025 holdout rows.
python -m src.mlb.export_predictions_mlb backtest --season 2025

# If Moltres remains a challenger, inspect its predictions separately without
# replacing the production export or live record.
python -m src.mlb.export_predictions_mlb backtest --season 2025 --model-file models\mlb_moltres_model.joblib --output-file data\predictions\mlb_moltres_backtest_predictions.json --js-out data\predictions\mlb_moltres_backtest_predictions.js

# Score logged production predictions and rebuild live/backtest record summaries.
npm run score:models

# Inspect the fair comparison and explicit selected model.
$comparison = Get-Content data\reports\mlb_model_comparison.json -Raw | ConvertFrom-Json
$comparison.metadata | Format-List selected_model,selected_by,generated_at
$comparison.models | Where-Object { $_.status -in @('trained','baseline') } | Select-Object model_name,accuracy,log_loss,brier_score,roc_auc,calibration_error,stability | Format-Table -AutoSize

# Lightweight verification after the run.
npm run check:js
python -m compileall src scripts
npm run check:data
npm run build:web
```

If the Moltres card is absent, the app intentionally shows `Moltres pending` and does not create predictions, records, or claims for it. Odds, pitcher detail, travel, and live status remain source-dependent and are never filled with placeholders.

## Data Policy

- No fake predictions.
- No fabricated model records.
- No fabricated scores or game results.
- Schedule-only games can appear in the widget or boards, but they are labeled `No model pick` and do not count in model record.
- MLB live record uses logged LineLens predictions only.
- MLB backtest is clearly separated from live record.
- NFL exported rows are labeled historical/backtest unless a true current export is available.
- Cached data is labeled cached.
- Pitcher proxy features are based on available probable pitcher names and prior team-result context, not invented ERA/WHIP.
- Estimated travel is approximate team/venue distance, not exact itinerary.
- Odds APIs are optional and not required.
- Local secrets belong in `.env`, which is ignored by git.

## Project Structure

```text
app.js / styles.css / index.html   Static dashboard frontend
widget.html / widget.js / widget.css   LineLens Live mini widget
src/mlb/                          MLB ingestion, features, training, exports
src/nfl/                          NFL compatibility modules
src/shared/                       Shared paths, modeling, metadata, export helpers
scripts/                          Refresh, scoring, startup, validation scripts
src-tauri/                        Tauri desktop app wrapper
data/predictions/                 Compact bundled prediction exports
data/live/                        Compact bundled live/widget export
data/reports/                     Compact bundled model reports
data/tracking/                    Prediction log and model record
data/models/                      Model registry
data/odds/                        Optional compact odds snapshots
models/                           Small model artifacts
```

Large generated inputs stay local and ignored:

- `data/raw/`
- `data/processed/`
- `data/imports/`
- `.venv/`
- `node_modules/`
- `dist-web/`
- `src-tauri/target/`

## GitHub Actions Build

The workflow `.github/workflows/tauri-windows-build.yml` runs on:

- Push to `main`
- Push of tags matching `v*`
- Manual `workflow_dispatch`

It runs:

- `npm ci`
- `npm run check:js`
- `python -m compileall src scripts`
- `npm run build:web`
- `npm run tauri:build`

The artifact is uploaded as:

```text
LineLens-Sports-Windows
```

The build uses bundled compact exports and does not require live sports API refresh.

## Known Limitations

- Local native Tauri build may fail without MSVC/C++ Build Tools, even though GitHub Actions can build the artifact.
- MLB live feed may fall back to cached schedule data if the public MLB Stats API is unavailable.
- MLB pitcher features are proxy/context features, not full pitcher-stat modeling.
- Odds, injuries, and closing-line value are optional data sources. Line movement/CLV stay unavailable until real snapshots exist.
- NFL current-season refresh depends on source access or cached processed rows.

## Release Checklist

```powershell
npm run refresh:mlb
npm run refresh:live
npm run score:models
npm run refresh:startup
npm run check:data
npm run demo:check
npm run tauri -- info
git status
git add .
git commit -m "Prepare LineLens Sports v1.0.0 demo release"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```
