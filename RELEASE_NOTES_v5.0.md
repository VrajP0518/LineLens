# LineLens Sports v5.0 Release Notes

## Live intelligence and personalization

- Added a shared Sprint 5 export loader with browser and packaged-mode fallbacks for live reactions, history, For You, preferences, alerts, GameCast, feed health, diagnostics, sensitivity, disagreements, scenarios, simulations, and widget state.
- Live Reaction now separates the official pregame prediction from the deterministic live estimate, shows percentage-point movement and freshness, and rejects stale, incomplete, final, postponed, suspended, or regressed states.
- For You now ranks watched live games, favorite teams, qualified props, consensus, disagreements, and results with deduplication and a short “why this appears” explanation.
- Preferences now recover from malformed local storage, normalize legacy values, support reset, and show a clear setup state when no favorites exist.
- Notifications now use transition deduplication, direct severity-based copy, Today/Earlier grouping, filters, persisted read state, and safe GameCast deep links.
- GameCast now presents a deduplicated lifecycle from Pregame through Final, with technical source metadata collapsed by default.
- Model Lab now clearly separates official and simulated values, keeps bounded local-only sensitivity controls, supports reset/save/export, and never writes to official records or prediction exports.
- Data Doctor now reports Sprint 5 export coverage, stale-state rejection, alert counters, deep-link failures, and measured render timings.

LineLens remains an educational sports-intelligence and model-evaluation project. It does not provide betting advice.
