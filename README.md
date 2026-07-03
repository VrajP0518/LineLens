# LineLens Sports v0.2.0

LineLens Sports is a Tauri-ready desktop sports prediction dashboard for reviewing model outputs across NFL and MLB. It keeps the original NFL spread predictor, adds an MLB moneyline module, and now includes v0.2.0 analytics features: calibration, model comparison, team profiles, local tracking, demo mode, and CI-first Windows desktop builds.

Predictions are experimental research outputs. This project is for analysis and portfolio demonstration only, not financial or betting advice.

## Current Modules

- Home command center with summary cards, data freshness, top model edges, and upcoming games.
- NFL spread predictor with matchup detail, line movement schema, CLV placeholders, and injury impact placeholders.
- MLB moneyline predictor with probability board, pitcher impact placeholders, line movement schema, and CLV placeholders.
- Reports page with calibration chart, confidence buckets, model comparison table, and generated daily/weekly report text.
- Teams page with NFL/MLB team metadata, logos with fallback initials, recent loaded games, and team-level model context.
- Tracking page with local-only unit tracker, CSV export, editable results, ROI, win rate, and unit summaries.
- Settings/Data Status page with app version, data mode, report mode, metadata status, and desktop build path.

## Architecture

```text
index.html
app.js
styles.css
data/
  app_metadata.json
  team_metadata.json
  predictions/
  reports/
src/
  nfl/
  mlb/
  shared/
src-tauri/
.github/workflows/
```

The root NFL scripts are still present for compatibility. The preferred new module paths are under `src/nfl`, `src/mlb`, and `src/shared`.

## Data Modes

The app is designed to look useful even before live exports exist.

- `real`: prediction/report export came from a real pipeline run.
- `demo`: bundled demo/sample data is being used.
- `missing`: the file is absent or contains no rows.

Demo data is labeled in the UI and should not be treated as real predictions.

## Data Sources

- NFL: `nfl-data-py` / nflverse schedules, play-by-play, weekly stats, and injury data.
- MLB: `pybaseball` and the public MLB Stats API schedule/probable pitcher data.
- Odds: optional future integration only. The app works without a paid odds API.

Optional future environment variables:

```powershell
$env:ODDS_API_KEY="..."
$env:MLB_ODDS_PROVIDER="..."
```

## Local Frontend / Static Testing

Use this workflow on restricted Windows work machines.

```powershell
npm install
npm run app
npm run check:js
```

`npm run app` serves the vanilla HTML/CSS/JS dashboard at a local static URL. It does not require MSVC or a local Tauri native build.

Browser/static mode uses existing exported JSON/JS files only. Automatic runtime refresh is available in the Tauri desktop app, where the frontend can call the Rust command that runs `scripts/refresh_data.py` in the background.

## Local Python / Data Work

Use Python 3.10 or 3.11. The existing NFL stack pins `pandas<2.0`, which does not install cleanly on Python 3.14.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m compileall src
```

For the broader project check used by CI:

```powershell
python -m compileall src scripts
```

## NFL Pipeline

Existing root commands still work:

```powershell
python data_ingest.py schedules --start-season 2018 --end-season 2025
python data_ingest.py pbp --start-season 2018 --end-season 2025
python feature_builder.py build --start-season 2018 --end-season 2024
python train_model.py train
python export_predictions.py --features-file data/processed/spread_dataset.parquet --model-file models/spread_model.joblib --output-file data/predictions/nfl_predictions.json
```

Module entrypoints are also available:

```powershell
python -m src.nfl.data_ingest_nfl schedules --start-season 2018 --end-season 2025
python -m src.nfl.feature_builder_nfl build
python -m src.nfl.train_model_nfl train
python -m src.nfl.export_predictions_nfl --features-file data/processed/spread_dataset.parquet --model-file models/spread_model.joblib --output-file data/predictions/nfl_predictions.json
```

## MLB Pipeline

```powershell
python -m src.mlb.data_ingest_mlb schedule --season 2026
python -m src.mlb.data_ingest_mlb team-stats --season 2025
python -m src.mlb.feature_builder_mlb build --season 2026
python -m src.mlb.train_model_mlb train
python -m src.mlb.export_predictions_mlb export
```

If MLB feature/model files are missing, the exporter can write a clearly labeled sample payload so the MLB dashboard still renders.

## Runtime Data Refresh

LineLens loads bundled/cached exports immediately, then the Tauri desktop app can try a background refresh without blocking startup.

Desktop/Tauri behavior:

- Load existing `data/predictions/*.json` and `data/reports/model_report.json` immediately.
- Call the Tauri `refresh_sports_data` command in the background.
- Run `scripts/refresh_data.py --sport all` through Python if project files and Python are available.
- Reload prediction/status JSON after a successful refresh.
- Keep cached/demo data and show a friendly warning if Python, internet, dependencies, or model files are missing.

Browser/static behavior:

- Uses existing exported JSON/JS files.
- Does not call Tauri commands.
- Shows that automatic desktop refresh is unavailable in browser/static mode.

Manual refresh commands:

```powershell
npm run refresh:data
npm run refresh:mlb
npm run refresh:nfl
```

MLB refresh uses the free public MLB Stats API schedule endpoint:

```text
https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=YYYY-MM-DD&hydrate=probablePitcher,team,linescore
```

If no trained MLB model is available, the refresh still writes a real schedule-based payload with `"prediction_mode": "schedule_only"` and clear model-pending labels.

NFL refresh checks for cached processed features and an NFL model, then runs the existing export wrapper when possible. During offseason or when processed features are missing, it preserves cached data and writes an offseason/cache status instead of failing the app.

## Reports, Calibration, And Model Comparison

The Reports page reads:

```text
data/reports/model_report.json
```

v0.2.0 includes demo calibration and model comparison data for NFL and MLB. Real backtest exports can replace the demo rows later without changing the frontend schema.

Calibration answers: if the model predicts games around 60%, do those games actually win around 60% of the time?

## Team Logos

Team metadata lives in:

```text
data/team_metadata.json
data/team_metadata.js
```

Remote logo URLs are optional display assets. If a logo fails or is unavailable, the app falls back to a clean abbreviation circle. No large image files are required in the repo.

## Tracking

The Tracking page stores picks in browser/Tauri localStorage:

```text
linelens.tracker.v1
```

Tracked fields include date, sport, game, pick, line/odds, model probability, confidence, units, result, profit/loss, and notes. Use CSV export for analysis outside the app.

## Windows/Tauri Build Note

Local Tauri builds on Windows require Microsoft C++ Build Tools/MSVC. On restricted work machines, `npm run tauri:dev` or `npm run tauri:build` may fail because MSVC cannot be installed. That is expected and not a project failure.

This repo builds the Windows desktop app through GitHub Actions. The local machine can edit UI, run static checks, run compatible Python scripts, and push changes.

The Tauri v2 Rust crate uses the standard `src-tauri/src/lib.rs` plus `src-tauri/src/main.rs` structure so GitHub Actions can resolve the `linelens_sports_lib` library crate during build.

## Build Desktop App Through GitHub Actions

1. Commit and push changes:

```powershell
git add .
git commit -m "Add LineLens Sports v0.2.0 analytics dashboard"
git push origin main
```

2. Go to:

```text
https://github.com/VrajP0518/LineLens/actions
```

3. Open `Tauri Windows Build`.

4. Click `Run workflow`.

5. Wait for the workflow to finish.

6. Download:

```text
LineLens-Sports-Windows
```

7. Extract the artifact ZIP and run/install the bundled Windows app.

If the build fails, check Node install, Rust install, Tauri config paths, missing `Cargo.lock`, npm lock mismatch, or an invalid frontend build command.

## CI

- `.github/workflows/validate.yml`: lightweight JS/Python validation on push/PR.
- `.github/workflows/tauri-windows-build.yml`: Windows Tauri bundle build and artifact upload.

CI does not require live data downloads.

## Useful Commands

```powershell
npm install
npm run app
npm run check:js
python -m compileall src scripts
npm run refresh:mlb
git status
git add .
git commit -m "Fix Tauri build and add automatic data refresh"
git push origin main
```

## Known Limitations

- Odds APIs are not required and are not wired as a live dependency yet.
- Line movement and CLV fields are schema-ready, but most values are null until an odds provider/export exists.
- NFL injury impact and MLB pitcher impact have graceful placeholders when source data is missing.
- Report data is demo until a real backtest exporter replaces `data/reports/model_report.json`.
- Local native Tauri builds remain optional; use GitHub Actions for the Windows artifact on restricted machines.
