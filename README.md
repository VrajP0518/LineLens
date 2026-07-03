# LineLens Sports v0.4.0

LineLens Sports is a Tauri-ready desktop sports prediction dashboard for NFL spread and MLB moneyline modeling. Version v0.4.0 is the real-data-only release: no fake games, no demo predictions, no sample backtest records, and no fabricated report metrics.

Predictions are experimental research outputs for analysis and portfolio demonstration only. They are not financial or betting advice.

## Current Modules

- Home command center with real data readiness and startup refresh status.
- NFL spread predictor that shows real exported rows when the existing NFL pipeline has processed features and a model.
- MLB moneyline predictor that shows schedule-only rows until a trained model produces probabilities.
- Reports page that shows real metrics only after a model training/export generates them.
- Teams page using team metadata and logo fallbacks.
- Tracking page for local-only analysis; schedule-only rows cannot be tracked as model picks.
- Settings/Data Status page with refresh commands and file status guidance.

## Data Modes

- `real`: a real model/export produced prediction rows or report metrics.
- `schedule only`: real schedule data loaded, but no model probabilities exist.
- `missing`: no real model export/report has been generated.

Empty payloads are allowed for app boot stability, but they include `metadata.real_data = false`, a reason, and `games = []`.

## Data Sources

- NFL: existing nflverse / `nfl-data-py` project pipeline and local model/feature artifacts.
- MLB: public MLB Stats API schedule/results/probable-pitcher data. No API key required.
- Odds: optional only through `ODDS_API_KEY`; not required for core NFL/MLB modeling.

## Generate Real NFL And MLB Data

Use Python 3.10 or 3.11 for the modeling environment:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

npm run refresh:startup
npm run refresh:nfl:real
npm run refresh:mlb:all
npm run build:web
npm run app
```

## NFL Pipeline

The original root NFL files are still present:

```powershell
python data_ingest.py schedules --start-season 2018 --end-season 2025
python data_ingest.py pbp --start-season 2018 --end-season 2025
python feature_builder.py build --start-season 2018 --end-season 2024
python train_model.py train
python export_predictions.py --features-file data/processed/spread_dataset.parquet --model-file spread_model.joblib --output-file data/predictions/nfl_predictions.json --js-out data/predictions/nfl_predictions.js
```

Preferred refresh wrapper:

```powershell
npm run refresh:nfl:real
```

This command does not fabricate offseason rows. If processed NFL features are missing, it writes an empty no-real-export payload and reports the exact missing file.

## MLB Pipeline

Historical model/backtest workflow:

```powershell
python -m src.mlb.data_ingest_mlb history --start-season 2021 --end-season 2025 --force
python -m src.mlb.feature_builder_mlb build-history --start-season 2021 --end-season 2025
python -m src.mlb.train_model_mlb train --train-start 2021 --train-end 2024 --test-season 2025
python -m src.mlb.export_predictions_mlb backtest --season 2025
python -m src.mlb.export_predictions_mlb export --season 2026
```

Or run:

```powershell
npm run refresh:mlb:all
```

If the trained MLB model is missing, current MLB refresh may write real schedule-only rows, but those rows have no probabilities and are not presented as predictions.

## Startup Auto-Refresh

In Tauri desktop mode, the app loads existing exported JSON immediately and then calls the Rust command `run_startup_refresh`, which runs:

```powershell
python scripts/refresh_data.py --sport all --mode startup
```

The command tries `.venv\Scripts\python.exe`, `python`, `py -3.11`, then `py`. Startup mode:

- Ensures the real NFL export exists or reports missing NFL inputs.
- Ensures the MLB model/features exist; if missing, it runs the MLB training/backtest pipeline once.
- Refreshes current MLB schedule/predictions.
- Updates `data/refresh_status.json` and `data/refresh_status.js`.
- Never creates fake prediction rows.

Browser/static mode cannot run terminal commands. It uses existing exported data and shows that automatic startup refresh is available only in the Tauri desktop app.

## Refresh Scripts

```powershell
npm run refresh:startup
npm run refresh:data:real
npm run refresh:nfl:real
npm run refresh:mlb:history
npm run refresh:mlb:train
npm run refresh:mlb:predict
npm run refresh:mlb:all
npm run refresh:mlb
npm run refresh:nfl
```

## Reports

Reports are real-data only. `data/reports/model_report.json` starts as a missing-report payload. MLB training writes real metrics, calibration buckets, confidence records, and model comparison rows when it succeeds. NFL report metrics are shown only after a real NFL report/export process generates them.

## Local Validation

```powershell
npm run check:js
python -m compileall src scripts
npm run build:web
npm run tauri -- info
```

Do not require `npm run tauri:build` locally on restricted Windows machines. The Windows desktop bundle is built by GitHub Actions.

## Windows/Tauri Build

Local Tauri builds require Rust, WebView2, and Microsoft C++ Build Tools/MSVC. If MSVC is missing, local `tauri:build` can fail while GitHub Actions still builds the artifact.

The production bundle uses:

```text
src-tauri/tauri.conf.json > build.frontendDist = ../dist-web
```

GitHub Actions uploads the Windows artifact as:

```text
LineLens-Sports-Windows
```

## Troubleshooting

- If `typer` is missing, activate the venv and run `pip install -r requirements.txt`.
- If MLB network/API calls are refused, retry `npm run refresh:mlb:all` later.
- If NFL export is missing, verify processed NFL feature files exist and run `npm run refresh:nfl:real`.
- If a packaged Tauri app cannot access Python scripts, run from repo/dev mode or use manual refresh commands. Sidecar packaging can be added later.

## Push Workflow

```powershell
npm run refresh:startup
npm run refresh:nfl:real
npm run refresh:mlb:all
npm run check:js
python -m compileall src scripts
npm run build:web
git status
git add .
git commit -m "Add real-data startup refresh and MLB/NFL model pipeline"
git push origin main
```
