# LineLens Demo Checklist

## Five-minute sports-user walkthrough

1. Open Home and identify the Best Pick Spotlight, current source health, ticker, and live widget.
2. Open MLB and confirm the selected date, season label, upcoming/live/final filters, production model identity, and compact intelligence strip.
3. Open one matchup in GameCast and show prediction probability, live context, odds movement, explanation, timeline, and accountability.
4. Open Soccer / World Cup and confirm that real rows render when bundled, or that the no-data state is concise and contains no prediction controls.
5. Open Models to compare the production model with challengers, including Moltres status and limitations.
6. Open Record to separate live MLB outcomes from backtest and NFL historical outcomes.

## Recruiter walkthrough

Use the project to explain:

- the real-data-only policy;
- the Python-to-export-to-UI architecture;
- chronological train/test separation;
- Moltres out-of-fold stacking;
- model selection by log loss/Brier rather than branding;
- atomic artifacts and single-worker protection;
- explicit data freshness and missing-data behavior;
- Toronto-local date normalization and exclusion of non-decisive postponed/delayed rows from accountability;
- the distinction between prediction, market context, and final accountability.

## Pre-demo checks

```powershell
npm run demo:check
npm run check:js
python -m compileall src scripts
npm run check:data
npm run build:web
git diff --check
```

The bundled demo should load without model training, odds credentials, live refresh, or a local Tauri build. Optional sources may show cached, missing, or unavailable states and that is expected.

## Windows artifact smoke test

After downloading `LineLens-Sports-Windows-v3.0.0` from GitHub Actions, verify: fresh install/open; first launch without Python, `.env`, network, or odds credentials; Home bundled data; MLB date selection and score/status consistency; Soccer empty/live state; every unique Models entry; GameCast; widget; responsive navigation; favorites persistence; ticker clearance; Presentation Mode; and successful reopen after closing.
