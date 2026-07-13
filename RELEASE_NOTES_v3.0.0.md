# LineLens Sports v3.0.0 Release Notes

## Sprint 3 complete

Sprint 3 turns LineLens into a more presentation-ready, model-forward sports analytics product. The app now makes the production model, model consensus, accountability, live data, and market context easier to understand at a glance.

## Highlights

- Refreshed the visual system with stronger team-color treatments, responsive sizing, larger sidebar branding, sport icons, model cards, and focused loading states.
- Added green model-win and red model-loss card treatments with stronger result visibility.
- Added model consensus, production/model picks, model leaderboard context, and model profile detail.
- Added cached and refreshed odds support with American odds such as `-110` and `+125`, plus MLB moneyline and run-line display.
- Added smooth score-card selection that scrolls directly to the matchup workspace.
- Improved the live widget fallback and refresh path so the app remains useful while data is loading or a source is unavailable.
- Improved MLB lifecycle presentation across pregame, live, final, and accountability states.
- Preserved historical exports and real-data-only behavior while keeping missing data clearly labeled.

## Verification

```powershell
npm run demo:check
npm run verify:release
```

The release verifier checks JavaScript syntax, Python compilation, data status, integrity contracts, required bundled files, web bundling, and repository safety paths. It does not train models or require a local native Tauri build.
