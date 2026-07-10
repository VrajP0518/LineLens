# LineLens Sports Architecture

LineLens is a local-first sports intelligence application with three deliberately separate layers:

```text
Real exports / optional sources
        |
Python ingestion + feature engineering + evaluation
        |
JSON + JavaScript browser bundles
        |
Vanilla HTML/CSS/JavaScript dashboard
        |
Optional Tauri desktop shell and GitHub Actions Windows build
```

## Runtime flow

1. The web UI loads bundled JSON exports first, so the demo works without credentials or model training.
2. `app.js` normalizes prediction, live-score, odds, registry, report, and tracking payloads into shared view state.
3. Home provides the command-center summary. MLB provides the daily prediction lifecycle. GameCast provides matchup-level detail. Reports and Record provide evaluation and accountability.
4. Tauri commands can run refreshes in the project environment, but refreshes are separate from initial rendering.

## Data and model flow

- MLB feature construction lives in `src/mlb/feature_builder_mlb.py`.
- MLB training and chronological evaluation live in `src/mlb/train_model_mlb.py`.
- MLB prediction and tracking exports live in `src/mlb/export_predictions_mlb.py`.
- Shared modeling and atomic JSON/JavaScript export helpers live in `src/shared/`.
- `data/reports/mlb_model_comparison.json` is the evaluation source of truth for model comparison.
- `data/models/model_registry.json` records production and challenger artifacts.
- `data/tracking/` separates logged predictions from scored records.

## Reliability boundaries

- Missing odds, live data, pitcher context, and future results remain explicit missing states.
- Training uses a lock and stages artifacts before replacing production files.
- Moltres is a challenger until the sealed chronological comparison selects it.
- The UI never treats a cached export as a fresh live source without labeling it.

## Useful validation

```powershell
npm run check:js
python -m compileall src scripts
npm run check:data
npm run demo:check
npm run build:web
git diff --check
```
