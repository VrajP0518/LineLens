# LineLens Sports v4.0.0 Release Notes

## Sprint 4: Multi-sport model intelligence

- Added the Universal Picks hub for MLB and WNBA.
- Added cross-sport model comparison, consensus, health, drift, and accountability views.
- Added structured GameCast postgame autopsy support and WNBA matchup intelligence.
- Added background live-score heartbeat refresh with stale-live protection.
- Added real odds snapshots with cache-safe prediction joins and local-date timezone handling.
- Added MLB player-game Parquet refresh, compatibility handling for pybaseball 2.0.0, and research prop model artifacts.
- Added the About & Contact experience and professional sports-desk visual system.
- Preserved real-data-only behavior: unavailable markets, lineups, starters, and player availability remain explicitly unavailable.
- The application release is v4.0.0; existing selected MLB training artifacts retain their recorded v3.0.0 model version until a new validated production training run is completed.

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
