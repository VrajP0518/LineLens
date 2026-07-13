# LineLens Sports v3.0.0

> Live sports intelligence for MLB and NFL: real data, daily model exports, game context, and accountable predictions in one focused dashboard.

<p align="center">
  <img src="image-1.png" alt="LineLens Sports prediction command center" width="100%" />
</p>

## See it in action

<p align="center">
  <img src="image.png" alt="LineLens Sports home experience" width="100%" />
</p>

## What makes it useful

- Model-first MLB workspace with production picks, challenger models, consensus, confidence, and win/loss accountability.
- Live scoreboard and ticker powered by refreshed sports data, with historical exports kept available for review.
- American odds, market context, matchup detail, model explanations, and cached pregame snapshots.
- Compact live widget, responsive layout, loading states, and smooth score-card-to-matchup navigation.
- Real-data-only behavior: missing feeds stay clearly labeled instead of becoming invented numbers.

## Run it locally

Requires Python 3.11 and Node.js.

```powershell
git clone https://github.com/VrajP0518/LineLens.git
cd LineLens
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm install
npm run app
```

Open `http://localhost:4173`.

For a quick verification without refreshing or training:

```powershell
npm run demo:check
npm run verify:release
```

## Data and model notes

LineLens bundles real exports so the interface opens immediately. Daily refresh can update MLB/NFL predictions, live scores, odds snapshots, model records, and reports when the local environment and source APIs are available. Odds are optional and never fabricated.

Predictions are experimental educational outputs for project demonstration only, not betting advice.

## Sprint 3 / v3.0.0

Sprint 3 is complete: the model presentation, responsive UI, visual system, refresh workflow, odds display, loading experience, live widget surface, and matchup navigation are ready for review.

See the short [v3.0.0 release notes](RELEASE_NOTES_v3.0.0.md). A video demo can be added here later.
