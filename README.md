# LineLens Sports v4.0.0

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

## Player props and odds

The prop system supports WNBA points, rebounds, and assists, plus MLB pitcher strikeouts, batter hits, and batter total bases. WNBA artifacts are research/challenger models until a real evaluation supports selection. MLB artifacts are intentionally research-only until a verified player-game dataset has been supplied and evaluated. A published prop requires a real current line and odds, matched event/player, trained model, sufficient history, current freshness, and a sport-specific availability or lineup gate. When MLB bookmaker player markets are not returned yet, the Props page shows real upcoming schedule rows, up to twenty model-only projections, and up to ten separate internal-threshold model picks. Internal picks use the retrained regressor and chronological holdout RMSE against fixed baseball thresholds (at least one hit; at least two total bases); they never claim bookmaker lines, odds, market edge, lineup confirmation, or availability. “Top 10” means up to ten qualified props; fewer results, or zero results, are normal when a gate is not met.

Historical sportsbook lines and player availability are not fabricated. Player models use chronological, leakage-safe player-game rows and export a numeric projection with an 80% residual-based interval. Probability is estimated from projection versus line and held-out error; it is not a historical Over/Under classifier. Prop Score ranks candidates but never bypasses a hard quality gate. Publication is capped at ten rows, with no more than two per player and three per game.

Odds use the optional `ODDS_API_KEY` environment variable and The Odds API architecture. WNBA requests `player_points`, `player_rebounds`, and `player_assists`; MLB monitoring requests `pitcher_strikeouts`, `batter_hits`, and `batter_total_bases` (override with `ODDS_MLB_PROP_MARKETS`). If The Odds API returns no MLB rows, the refresh can use `SHARP_ODDS_API_KEY` for SharpAPI's documented MLB main-market and player-prop endpoints, followed by an optional `PROPLINE_API_KEY` or `PROP_LINE_API_KEY` fallback. Quota headers, refresh limits, provider health, event/player matching, and cached snapshots are tracked without exposing keys. No API key, raw provider payload, or large training dataset belongs in the UI or release bundle.

### Local data refresh and Parquet storage

The optional MLB player-game collector uses the installed `pybaseball==2.0.0` interface. PyPI documents its Statcast, batting, pitching, and player-ID functions; the collector uses Statcast pitch events and aggregates only completed real events. Player IDs are resolved through pybaseball when compatible and MLB's public Stats API as a compatibility fallback; unresolved IDs are excluded. Raw chunks and the normalized player-game export stay local under the ignored `data/raw/mlb/` directory as Parquet files. The package cache is redirected to `data/raw/mlb/pybaseball_cache` so the app does not require write access to the user profile.

The official WNBA report is fetched from the WNBA injury-report page’s report feed. Only explicit statuses from the latest report are normalized; an unlisted player remains `unknown` and cannot pass the publication gate.

```powershell
npm run refresh:wnba:availability
npm run refresh:mlb:player-games -- --start-date 2023-03-30 --end-date 2025-10-01
npm run build:mlb:props
npm run train:mlb:props
npm run refresh:props
npm run export:props
npm run export:mlb:props
npm run score:props
```

For the one-button local workflow, use `npm run refresh:props:pipeline`. It refreshes official WNBA availability, downloads resumable MLB Parquet chunks, builds the leakage-safe dataset, trains the research MLB prop models, exports both sports, and scores completed player-game rows. It is intentionally manual and is not run automatically when the desktop app opens. The Props page exposes the same action through the local refresh bridge when LineLens is launched with `npm run app` or in the packaged desktop shell.

When LineLens opens through `npm run app` or the packaged desktop shell, it starts the allow-listed startup refresh in the background. A fast live heartbeat refreshes yesterday, today, and tomorrow scoreboards every 15 seconds; stale live rows are suppressed until a fresh export is available. The full `npm run refresh:live` command remains available for rebuilding the larger cached scoreboard window.

The MLB collector supports `--dry-run`, `--force`, and `--chunk-days`. A multi-season Statcast download can be large and may take time; existing Parquet chunks are reused by default. Do not commit `data/raw/mlb/`, `data/processed/mlb/`, or the local pybaseball cache.

### Manual WNBA prop commands

Do not run these during the normal lightweight release check. Run them manually when real player box-score source files and enough history are available:

```powershell
npm run build:wnba:props
npm run train:wnba:props
npm run refresh:props
npm run export:props
npm run score:props
```

`build:wnba:props` reads validated player box-score JSON under `data/raw/wnba`. Rolling features exclude the game being predicted and the train/test split is chronological. `train:wnba:props` creates separate points, rebounds, and assists regression artifacts; it does not create historical sportsbook lines. `refresh:props` requests selected current event-specific markets with cache and quota protection. `export:props` publishes only qualified current projections. `score:props` freezes the original line and scores final player statistics as Won, Lost, Push, Void, DNP, Pending, or Data unresolved.

### Manual MLB prop commands

Supply verified real player-game files under the ignored `data/raw/mlb/` path before running these commands. The pipeline will remain explicit `model_not_trained` or `no_qualified_props` when the source, artifacts, or quality gates are missing:

```powershell
npm run build:mlb:props
npm run train:mlb:props
npm run export:mlb:props
```

The MLB builder accepts `player_game*.json`, `player_game*.csv`, `player_game*.parquet`, `player_boxscore*.json`, and `player_boxscore*.csv`. It does not infer player props from team schedules. The MLB trainer uses a chronological holdout and writes separate research artifacts for pitcher strikeouts, batter hits, and batter total bases. Run `npm run refresh:props` before either exporter when a fresh real sportsbook snapshot is required; cached data is used when the provider cache policy requires it. `no_market_available` means the provider returned no current player lines; it is different from a missing model.

Both exporters write candidate rows and rejection diagnostics. Candidates are review-only until every publication gate passes. `npm run score:props` is idempotent and keeps WNBA and MLB records separate. It adds final statistics, result, prediction error, deterministic autopsy classification, and closing-line fields only when a provider export explicitly contains closing values; otherwise closing status remains `not_captured`.

The importer also accepts CSV files named `player_boxscore*.csv` or `boxscore*.csv`. The current local training source is the public [WNBA Player and Team Stats 2003–2025 export](https://www.kaggle.com/datasets/nicholascoplandunc/wnba-player-and-team-stats-2003-2025-120k-rows), attributed by its listing to the `wehoop` data project. It is stored under the ignored `data/raw/wnba/` path and normalized into the LineLens player-game schema before feature construction.

For current completed games, `npm run refresh:wnba:player-boxscores` uses the public ESPN WNBA summary feed to write real 2026 player rows. It does not create future player availability or starter information; current props remain unpublished until those states and fresh odds are available.

The current WNBA bundle includes real player box-score history and trained challenger prop artifacts. Candidate projections remain visible for review, but the Props page publishes none until verified availability and the remaining quality gates are present. Advanced player data, official availability, and historical sportsbook lines may require a paid or separately licensed source; LineLens will not infer them from team scoreboard rows. MLB market rows remain separate from WNBA model projections until the MLB player model is validated.

After the tag push, open the repository’s **Actions** tab to watch `Tauri Windows Build`. When it finishes, the workflow creates a GitHub Release and attaches the `.msi` and `.exe` installers. Others can then download the app from **Releases**, rather than from an Actions artifact.

For a future release, update the app version metadata, README version, and tag together.
