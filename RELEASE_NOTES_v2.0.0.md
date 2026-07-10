# LineLens Sports v2.0.0 Release Notes

## Release summary

LineLens Sports v2.0.0 is a release-hardening and presentation release. It keeps the existing vanilla HTML/CSS/JavaScript, Python, bundled-export, and optional Tauri architecture while making the product easier to understand, verify, and run from GitHub.

## What changed

- MLB is presented as a broadcast-style Prediction Lifecycle desk with canonical date handling, responsive game cards, live/upcoming/final states, watchlist priority, team-color identity, and ticker-safe spacing.
- Soccer / World Cup is available as a scoreboard-only tab with real-data empty states and ticker support when the optional ESPN feed returns rows.
- GameCast keeps prediction, live score, odds movement, explanations, Moltres component context, timelines, and accountability together, with clearer provenance labels.
- Models and Reports expose production/challenger state, evaluation boundaries, selection rules, calibration, stability, and limitations.
- Moltres remains a real ensemble challenger. It is not called best or selected unless the sealed chronological comparison proves that outcome.
- Record includes live/backtest separation and lightweight result/odds-linked filters.
- First-run onboarding explains the three core workflows and can be reopened from Settings.
- About / What’s New summarizes the v2.0.0 product and transparency policy.
- Date, data-contract, model-selection, bundled-file, and release-safety checks are automated.
- Toronto-local timestamp normalization and non-decisive prediction exclusion prevent late-night date drift and postponed rows from affecting accountability.
- README and `docs/` now provide architecture, data dictionary, model evaluation, demo, and Windows artifact smoke-test guidance.

## Verification

```powershell
npm run verify:release
```

The release verifier runs JavaScript syntax checks, Python compilation, data status, integrity checks, required-file checks, web bundling, and git safety checks. It does not train models, refresh sports data, or build Tauri locally.

## Windows download

GitHub Actions produces the artifact:

```text
LineLens-Sports-Windows-v2.0.0
```

After downloading, perform the manual smoke test in the README: fresh open, bundled-data startup without Python/network, MLB board/date verification, Soccer empty/live state, Models, GameCast, widget, navigation, favorites, ticker, Presentation Mode, and reopen behavior.

## Data and model transparency

The demo uses real bundled exports. Odds and live status remain source-dependent. Cached, missing, stale, schedule-only, pending, and unavailable states remain labeled. No predictions, results, odds, records, or performance are fabricated.

The current production model remains the model selected by the real comparison export. Moltres remains a challenger unless its sealed chronological holdout evidence wins the existing selection rule.

## Known limitations

- Local Tauri packaging still depends on the Windows build toolchain; GitHub Actions is the supported build path when MSVC is unavailable.
- MLB pitcher fields are proxy/context features rather than complete pitcher-stat modeling.
- Odds, closing-line value, injuries, and live play detail depend on available real sources.
- The bundled demo can be stale until a user runs an approved refresh command.
- This is an educational analytics application, not betting advice.
