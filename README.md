# LineLens Sports

LineLens Sports is a desktop sports-intelligence and model-evaluation app built around real bundled exports.

<p align="center">
  <img src="image-1.png" alt="LineLens Sports home dashboard with MLB, NFL, reports, tracking, model health, and live ticker" width="100%" />
</p>

<p align="center">
  <img src="image-2.png" alt="LineLens Sports home dashboard with MLB, NFL, reports, tracking, model health, and live ticker" width="100%" />
</p>


## Download (RECOMMENDED)

For Windows, download the latest `.msi` or `.exe` from the repository’s [Releases](https://github.com/VrajP0518/LineLens/releases) page.

## Run locally

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

The app uses bundled exports first, so the core pages can open without a live feed. Startup and manual refreshes run in the background when the local refresh bridge is available; fresh exports are applied without replacing the whole window.

The Windows release keeps a writable runtime copy in the user’s local app-data folder. On launch it automatically checks the approved `data-channel-v6` release, verifies the bundle and individual file hashes, and applies sanitized scores, schedules, available odds, props, records, and current predictions. End users do not need Python or provider API keys. Bundled exports remain available offline, and a new installer is only needed for application-code changes.

Live scores use a separate fast path: while the installed app or Live widget is open, its native Tauri client requests the public scoreboards directly every 30 seconds. Daily predictions remain stable while score, inning/period, and final status continue to move. The scheduled data workflow also revisits every pending MLB/WNBA prediction date and settles final results, postponed games, and other no-result states instead of allowing old rows to remain pending indefinitely.

LineLens v6 also includes a weekly/manual GitHub Actions retraining workflow. It rebuilds the selected MLB/WNBA model family, runs chronological checks, generates drift alerts, signs the review bundle with GitHub artifact provenance, and opens a review pull request rather than silently promoting a new model. After review and merge, the separate **Publish Approved Model Channel** workflow can publish a hash-locked v6 model bundle. Installed clients verify the manifest, archive, individual files, and allowed paths before installing it, so model artifacts can update without a complete app release. See [model delivery](docs/MODEL_DELIVERY.md) and [API key deployment](docs/API_KEY_DEPLOYMENT.md).

## Automatic shared data and optional developer keys

Normal Windows users do not configure API keys. Repository secrets are used only by the scheduled **Publish Shared Data Channel** workflow, and the installed app downloads the sanitized result. See [API key deployment](docs/API_KEY_DEPLOYMENT.md) for the one-time channel activation and security boundary.

Developers running the source checkout can optionally copy `.env.example` to `.env` and add their own provider keys for direct refresh testing:

```text
ODDS_API_KEY=
SHARP_ODDS_API_KEY=
PROPLINE_API_KEY=
```

Refresh odds with:

```powershell
npm run refresh:odds
```

Missing odds remain unavailable; they are never inferred or fabricated.

The installed app also keeps Settings → Optional developer API keys as a local override. Values are saved to the user’s local runtime `.env`, are never shown back, and are never included in a release.

## Main commands

```powershell
npm run refresh:live:fast
npm run refresh:mlb
npm run refresh:wnba
npm run refresh:props:pipeline
```

The props pipeline is optional and should only be run when the required real player data and model artifacts are available. MLB player-game data is stored locally as Parquet by the pybaseball collector.

## Features

- Home dashboard for quick access
- Picks: MLB and WNBA prediction feed
- Props: qualified and research-only player projections
- NFL / MLB / WNBA: sport-specific boards, date navigation, live scores, player-level box scores, and model context
- Underdogs: real-odds-qualified model picks with settled win/loss accountability
- GameCast: matchup detail, odds, timeline, and postgame review
- Models, Reports, Record: evaluation, health, and accountability
- Tracking ledger
- Personalized notifications
- Background refresh with cached-data fallback
- Settings release-readiness diagnostics and secret-safe support report
- MLB Economics: payroll-versus-wins regression, efficiency ranking, and team detail

## MLB Economics

MLB Economics is an analytical report for testing whether payroll is associated
with wins. It reads the real MLB results already bundled with LineLens and a
local payroll input; it does not estimate missing payrolls.

The preferred input is `data/mlb_economics/payroll.csv` with this schema:

```text
season,team_id,team_name,payroll,payroll_source,payroll_as_of,payroll_basis,inflation_adjusted_payroll
```

Local Lahman-compatible `Salaries.csv` and optional `Teams.csv` files are also
supported. Rebuild the compact browser/offline exports with:

```powershell
python scripts/build_mlb_economics.py
```

The page labels projections, nominal dollars, missing payroll, and source
freshness. Inflation adjustment is used only when a reliable adjusted field is
provided. Regression describes association, not causation; injuries, roster
construction, player development, schedule strength, accounting definitions,
and payroll timing are not fully captured.

## Data policy

LineLens shows real available data. Missing, stale, schedule-only, pending, and unavailable states are labelled. Predictions and market information are for educational analysis only and NOT BETTING ADVICE.

## Tech Stack

- Python
- JavaScript
- HTML
- CSS
- ML: scikit-learn, NumPy, pandas, joblib
- Data processing: Polars, PyArrow, pybaseball, nfl-data-py
- Desktop app: Tauri 2 with Rust
- Rust libraries: serde and tauri-plugin-opener
- Packaging/CI: Node.js/npm, GitHub Actions, Windows .msi/.exe builds
- Storage: bundled JSON/JavaScript exports, local Parquet files, and browser localStorage

## Project links

- [Source code](https://github.com/VrajP0518/LineLens)
- [Report an issue](https://github.com/VrajP0518/LineLens/issues)
- [Releases](https://github.com/VrajP0518/LineLens/releases)

Created by [Vraj Patel](https://github.com/VrajP0518).
