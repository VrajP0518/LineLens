# LineLens Sports v1.0.0 Release Notes

## Summary

LineLens Sports v1.0.0 is the first stable demo release. It packages the current multi-sport analytics dashboard with bundled real exports so the app opens to a useful state even before any local refresh commands run.

This release is for educational/project demonstration purposes only. It is not betting advice.

## Major Features

- Tauri desktop app shell with GitHub Actions Windows artifact.
- Polished Home command center with Best Pick Spotlight, summary cards, ticker, and Live Widget preview.
- MLB moneyline prediction board with model probabilities, pitcher context, top factors, and result chips.
- "Why this pick?" explanations for model-backed MLB rows.
- MLB model comparison and selected model registry.
- MLB live prediction record tracking, separated from 2025 backtest results.
- Record page for MLB live/backtest and NFL historical/backtest performance.
- Reports page with model metrics, comparison tables, calibration/report cards, feature summary, and registry.
- LineLens Live mini widget with compact and expanded modes.
- NFL historical spread predictor support from cached/exported real rows.
- Settings page with data status, refresh console, and bundled export visibility.
- Safe `npm run demo:check` validation command.
- Startup auto-refresh path: `npm run refresh:startup` bootstraps Python, refreshes MLB/NFL/live data, scores model records, and checks data status. The Tauri app runs this on open when project scripts are available.

## Demo Flow

1. Home: show Best Pick Spotlight, summary cards, and ticker.
2. MLB: show the daily board, probabilities, and "Why this pick?" explanations.
3. Live Widget: open the compact widget, then expand it.
4. Record: show live MLB record separate from backtest and NFL historical record.
5. Reports: show model comparison, selected model, and feature summary.
6. Settings: show refresh commands, data file status, and v1.0.0 metadata.

## Data And Model Notes

- No fake predictions or fabricated records are included.
- Current MLB predictions are bundled in `data/predictions/mlb_predictions.json`.
- MLB backtest rows are bundled separately in `data/predictions/mlb_backtest_predictions.json`.
- Live widget data is bundled in `data/live/live_scores.json`.
- Model record data is bundled in `data/tracking/model_record.json`.
- NFL rows are labeled historical/backtest unless a true current export exists.
- Schedule-only rows can appear, but they are labeled `No model pick` and are not counted in records.

## Install / Download

Download the Windows build from GitHub Actions:

1. Open `https://github.com/VrajP0518/LineLens`
2. Go to Actions.
3. Open the latest `Tauri Windows Build` run.
4. Download `LineLens-Sports-Windows`.
5. Extract and run the bundled app output.

If a GitHub Release is created for `v1.0.0`, use the release artifact/installer from the Releases page.

## Developer Validation

```powershell
npm run refresh:mlb
npm run refresh:live
npm run score:models
npm run refresh:startup
npm run check:data
npm run check:js
python -m compileall src scripts
npm run build:web
npm run demo:check
npm run tauri -- info
```

Local `npm run tauri:build` is not required for this release pass because MSVC/C++ Build Tools may be missing locally. GitHub Actions handles the Windows desktop build.

## Known Limitations

- MLB live scores can fall back to cached schedule data if MLB Stats API is unavailable.
- Pitcher features are proxy/context features, not full pitcher-stat joins.
- Odds, injuries, and CLV are optional/future extensions.
- NFL current-season refresh depends on source access or cached processed rows.
- Installed app refresh commands require the project repo/dev environment if Python scripts are not packaged alongside the app.
