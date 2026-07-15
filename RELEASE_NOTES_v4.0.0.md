# LineLens Sports v4.0.0 Release Notes

## Sprint 4 complete

Sprint 4 makes LineLens a multi-sport prediction and model-evaluation workspace.

## Highlights

- Added the Universal Picks feed for MLB and WNBA with date, status, confidence, model, watchlist, consensus, and disagreement filters.
- Added cross-sport Model Arena sections, leaderboards, model health, drift states, comparison warnings, and production/challenger boundaries.
- Added structured GameCast postgame autopsies using exported prediction, odds, feature, availability, and final-result data.
- Added WNBA matchup intelligence for form, ratings, pace, splits, rest, availability, live state, and missing-data handling.
- Added real odds snapshots, market-edge joins, compact moneyline/runline presentation, and cached provider status.
- Added MLB player-game Parquet collection support through pybaseball 2.0.0 and research-only MLB prop artifacts.
- Added WNBA and MLB prop lanes, quality gates, candidate states, deterministic scoring, and separate accountability records.
- Added seven-day future schedule visibility so games remain visible before predictions are ready.
- Added model consensus signals, daily model brief export, and improved live heartbeat refresh behavior.
- Added About & Contact, compact release information, a restrained sports-desk visual system, and shared date navigation across sport boards.
- Preserved real-data-only behavior: missing odds, lineups, starters, availability, and model outputs remain clearly unavailable.

## Release status

- Application version: `v4.0.0`
- MLB production identity: Lugia / `GradientBoostingClassifier`
- Moltres remains a challenger unless a validated comparison selects it.
- WNBA production candidate remains evidence-bound to the bundled comparison export.
- Existing model artifacts may retain their recorded training version until a new validated training run is completed.

## Verification

```powershell
npm run check:js
python -m compileall src scripts
npm run check:data
npm run check:props
npm run build:web
npm run verify:release
git diff --check
```

The release checks do not run Tauri locally or perform long model training.

## Known limitations

- Live scores, odds, player availability, and future schedules depend on source availability and freshness.
- Player props remain unpublished when a real current line, model artifact, or availability gate is missing.
- Tauri Windows installers are produced through GitHub Actions.
- LineLens is an educational analytics project, not betting advice.
