# LineLens Sports v4.1.0 Release Notes

## Board reliability patch

- Fixed the MLB date rail to use only current and live schedule rows.
- Removed historical backtest rows from MLB daily game counts and date navigation.
- Prevented live rows from being counted twice on the same date.
- Restored visible weekday and month/day labels on date cards with safe fallbacks.
- Added an integrity check that keeps board calendars separate from History and Record data.
- Aligned the packaged application version, release notes, and Windows artifact name to `v4.1.0`.

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

LineLens remains an educational sports-intelligence and model-evaluation project. It does not provide betting advice.
