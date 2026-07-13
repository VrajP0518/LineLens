# LineLens Sports v3.0.0

> Live sports intelligence for MLB and NFL: real data, daily model exports, game context, and accountable predictions in one focused dashboard.

<p align="center">
  <img src="image-1.png" alt="LineLens Sports prediction command center" width="100%" />
</p>

<p align="center">
  <img src="image.png" alt="LineLens Sports home dashboard" width="100%" />
</p>

## What makes it useful

- Model-first MLB workspace with production picks, challenger models, consensus, confidence, and win/loss accountability.
- Live scoreboard and ticker powered by refreshed sports data, with historical exports kept available for review.
- American odds, market context, matchup detail, model explanations, and cached pregame snapshots.
- Compact live widget, responsive layout, loading states, and smooth score-card-to-matchup navigation.
- Real-data-only behavior: missing feeds stay clearly labeled instead of becoming invented numbers.

## Download the Windows app

You do not need Python, Node, Rust, or the source code to run the packaged Tauri app.

1. Open the repository’s **Releases** page.
2. Open the latest `LineLens Sports` release.
3. Download the Windows `.msi` installer or `.exe` installer.
4. Install it and launch LineLens Sports from the Start menu.

The app opens with bundled exports immediately. Live refresh requires the configured desktop environment and available data sources.

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

## Publish a new release

The repository workflow builds and publishes the Tauri Windows installers when a version tag is pushed. From PowerShell:

```powershell
npm run verify:release
git add .
git commit -m "Release LineLens Sports v3.0.0"
git push origin main
git tag -a v3.0.0 -m "LineLens Sports v3.0.0"
git push origin v3.0.0
```

After the tag push, open the repository’s **Actions** tab to watch `Tauri Windows Build`. When it finishes, the workflow creates a GitHub Release and attaches the `.msi` and `.exe` installers. Others can then download the app from **Releases**, rather than from an Actions artifact.

For a future release, update the app version metadata, README version, and tag together, for example `v3.1.0`.
