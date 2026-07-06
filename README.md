# LineLens Sports v0.5.0

LineLens Sports is a Tauri-ready desktop sports prediction dashboard for NFL spread and MLB moneyline modeling. Version v0.5.0 adds automated Python environment bootstrap and real-data startup refresh.

Predictions are experimental research outputs for analysis and portfolio demonstration only. They are not financial or betting advice.

## Current Modules

- Home command center with startup automation, data readiness, and refresh console.
- NFL spread predictor that shows real exported rows when the existing NFL pipeline has processed features and a model.
- MLB moneyline predictor backed by a real logistic-regression model when model artifacts and features are available.
- Reports page for real model metrics, calibration, confidence buckets, and model comparison.
- Teams page using team metadata and logo fallbacks.
- Tracking page for local-only analysis; schedule-only rows cannot be tracked as model picks.
- Settings/Data Status page with bootstrap, refresh, and file status guidance.

## Recommended First Run

The Tauri desktop app now tries to automate this, but this manual path is still useful when preparing a fresh machine:

```powershell
cd C:\Users\Vraj.Patel\Downloads\coop\LineLens

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

npm run startup:auto
npm run app
```

## Why Python 3.11 Instead Of Python 3.14

Use Python 3.11 for this app. `nfl-data-py` depends on an older numpy/pandas stack, and Python 3.14 can force source builds for packages that normally have prebuilt wheels on Python 3.11. On work machines without MSVC/C++ Build Tools, compiling numpy/pandas locally is fragile. The bootstrap script rejects Python 3.14 for the main environment and tells you to install/use Python 3.11.

## Automatic Startup Refresh

In Tauri desktop mode, the app:

1. Loads existing exported JSON immediately so the UI opens fast.
2. Runs `run_startup_automation()` through the Rust command bridge.
3. Bootstraps/checks Python via `scripts/bootstrap_env.py`.
4. Creates/uses `.venv`.
5. Installs requirements only when missing or when `requirements.txt` changed.
6. Refreshes MLB current model predictions, training first if the model is missing.
7. Attempts NFL real-data refresh if a real NFL export is missing.
8. Reloads bootstrap, refresh, prediction, and report JSON.
9. Shows stdout/stderr in the Home and Settings refresh console.

No fake NFL or MLB games are created. Cached data is labeled as cached, missing data is labeled as missing, and source failures are reported directly.

## Data Status Files

- `data/bootstrap_status.json/js`: Python version, venv, requirements, and import readiness.
- `data/env_state.json`: local-only requirements hash/cache state; ignored by Git.
- `data/startup_status.json/js`: startup automation steps and current warning/error summary.
- `data/refresh_status.json/js`: sport-level refresh results.
- `data/predictions/*.json/js`: compact prediction exports.
- `data/reports/model_report.json/js`: compact report export.

Large raw, processed, and import files are intentionally ignored. Do not use Git LFS for NFL parquet/raw caches; regenerate or import them locally.

## Data Modes

- `env_ready`: Python environment is ready.
- `dependency_missing`: core MLB dependencies work, but optional NFL dependency/import failed.
- `model_generated`: a model export generated prediction probabilities.
- `real_fresh`: real data was regenerated/exported in the current run.
- `real_cached`: a real local export/cache was reused.
- `schedule_only`: real schedule rows exist, but no model probabilities exist.
- `missing`: no real model export/report exists.
- `source_refused`: an external source refused the connection.
- `install_failed`: Python setup or dependency install failed.

## Data Sources

- NFL: existing nflverse / `nfl-data-py` project pipeline, local model/feature artifacts, optional `nflreadpy`, and direct nflverse CSV fallback for schedules.
- MLB: public MLB Stats API schedule/results/probable-pitcher data plus local historical feature/model artifacts.
- Odds: optional only through `ODDS_API_KEY`; not required for core NFL/MLB modeling.

## NFL Pipeline And Recovery

Preferred refresh wrapper:

```powershell
npm run refresh:nfl:real
```

NFL refresh order:

1. Import local `data\imports\nfl\spread_dataset.parquet`.
2. Import local `data\imports\nfl\spread_dataset.csv`.
3. Reuse existing processed parquet under `data\processed\nfl\` or `data\processed\`.
4. Rebuild through the original `nfl-data-py` scripts.
5. For schedules, fall back to direct nflverse-data CSV and optional `nflreadpy`.
6. If all real sources fail, write an honest failure and keep `games = []`.

Manual NFL recovery from an older local project:

```powershell
mkdir data\imports\nfl
copy C:\path\to\old\spread_dataset.parquet data\imports\nfl\spread_dataset.parquet
npm run refresh:nfl:real
```

The app does not fabricate offseason rows. If NFL source access is refused, the NFL page and Settings page show the manual import path.

## MLB Pipeline

Historical model/backtest workflow:

```powershell
python -m src.mlb.data_ingest_mlb history --start-season 2021 --end-season 2025 --force
python -m src.mlb.feature_builder_mlb build-history --start-season 2021 --end-season 2025
python -m src.mlb.train_model_mlb --features-file data/processed/mlb/mlb_features_2021_2025.csv --train-start-season 2021 --train-end-season 2024 --test-season 2025
python -m src.mlb.export_predictions_mlb backtest --features-file data/processed/mlb/mlb_features_2021_2025.csv --season 2025
python -m src.mlb.export_predictions_mlb export --features-file data/processed/mlb/mlb_current_features.csv --model-file models/mlb_moneyline_model.joblib --season 2026
```

Or run:

```powershell
npm run refresh:mlb:all
npm run refresh:mlb
```

`npm run refresh:mlb` uses prediction mode, not schedule-only mode.

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
```

Browser/static mode cannot run terminal commands. It shows the manual command instead of pretending to refresh.

Refresh console logs are stored locally under:

```text
linelens.refreshLogs.v1
```

## Package Scripts

```powershell
npm run bootstrap:env
npm run startup:auto
npm run refresh:startup
npm run refresh:data:real
npm run refresh:mlb
npm run refresh:mlb:all
npm run refresh:mlb:train
npm run refresh:nfl:real
npm run check:data
```

## Local Validation

```powershell
npm run check:js
python -m compileall src scripts
npm run build:web
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
npm run bootstrap:env
npm run startup:auto
npm run refresh:mlb
npm run refresh:nfl:real
npm run check:data
npm run check:js
python -m compileall src scripts
npm run build:web
git status
git add .
git commit -m "Automate LineLens startup environment and real-data refresh"
git push origin main
```
