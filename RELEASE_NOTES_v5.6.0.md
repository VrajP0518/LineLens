# LineLens Sports v5.6.0

## Logo recovery and release diagnostics

- Restored ESPN team logos in the packaged desktop app by allowing the documented logo host through the Tauri image policy.
- Kept abbreviation fallbacks when a logo is unavailable or cannot load.
- Added a lightweight team-logo contract check for MLB, WNBA, and NFL metadata.
- Preserved the non-blocking refresh lifecycle and cached-data fallback from v5.4.0.
- Updated application, installer, and bundled web metadata to v5.6.0.

The app continues to use real bundled exports and labels unavailable data instead of fabricating it.
