# LineLens Sports

LineLens is a desktop sports-intelligence app that compares machine-learning predictions with real market odds and tracks every prediction for long-term accountability.

<p align="center">
  <img src="image-1.png" alt="LineLens Sports home dashboard with MLB, NFL, reports, tracking, model health, and live ticker" width="100%" />
</p>

<p align="center">
  <img src="image-2.png" alt="LineLens Sports home dashboard with MLB, NFL, reports, tracking, model health, and live ticker" width="100%" />
</p>

<p align="center">
  <img src="docs/images/v6-compact-home.png" alt="LineLens v6 compact home dashboard with responsive navigation and data-health signal" width="49%" />
  <img src="docs/images/v6-underdogs-evaluation.png" alt="LineLens v6 Underdogs page with no-vig market and Brier evaluation evidence" width="49%" />
</p>


## Download LineLens

For Windows, open the repository’s [Releases](https://github.com/VrajP0518/LineLens/releases) page and choose the newest stable release.

Recommended for most users: the `LineLens_*_x64-setup.exe` installer. It installs the desktop app and creates the normal Windows shortcuts.

Use the `.msi` when LineLens is being installed through a managed or enterprise Windows deployment. The source tree and release notes may be newer than a published installer while a release is being prepared.

## What to look at first

1. Open **Home** for today’s strongest available opportunities, live games, and model health.
2. Open **Picks** for the full prediction feed. Each card separates LineLens probability, market-implied probability, model edge, and result status.
3. Open a matchup’s **GameCast** for odds, live state, box score, and the evidence behind the pick.
4. Use **Performance** to see scored results and **Prediction History** to inspect the source row behind any decision.

LineLens currently provides prediction pipelines for **MLB, NFL, and WNBA**. NBA, NHL, and Soccer are real-scoreboard views only; they do not claim a LineLens prediction model.

## Features

- Home dashboard focused on today’s best opportunities
- Picks: MLB and WNBA prediction feed
- Props: qualified and research-only player projections
- NFL / MLB / WNBA: sport-specific boards, date navigation, live scores, player-level box scores, and model context
- Underdogs: real-odds-qualified model picks with settled win/loss accountability
- GameCast: matchup detail, odds, timeline, and postgame review
- Models, Reports, and Performance: evaluation, health, and accountability
- My Tracker and Prediction History
- Personalized notifications
- Background refresh with cached-data fallback
- Settings release-readiness diagnostics and secret-safe support report
- MLB Economics: payroll-versus-wins regression, efficiency ranking, and team detail

## Data policy and limitations

LineLens shows real available data. Missing, stale, schedule-only, pending, and unavailable states are labelled beside the affected board or market. A missing odds snapshot is not treated as a zero edge, and a missing live feed is not treated as a final score.

Predictions and market information are for educational analysis only and **NOT BETTING ADVICE**. Model probabilities are estimates, not guarantees; historical performance does not ensure future results.

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
