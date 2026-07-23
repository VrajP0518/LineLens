# LineLens Sports v5.4.0

## Release hardening

- Refreshes now run in the background while cached data remains usable.
- Fresh exports are applied in place without forcing a full app reload.
- Duplicate refresh commands are blocked across the desktop and local bridge.
- Settings now includes Release Readiness diagnostics and a secret-safe support report.
- Tauri runtime resources, version metadata, and bundled exports are verified in CI.
- Chart.js is bundled locally for offline desktop charts.
- Added restrictive desktop CSP configuration and installer SHA-256 checksums.
- Preserved MLB, WNBA, NFL, odds, props, GameCast, Model Lab, Record, Reports, widget, ticker, and Presentation Mode flows.

LineLens Sports is an educational sports-intelligence and model-evaluation project. Predictions, odds, and model outputs are not betting advice.
