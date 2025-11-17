
# NFL SPREAD PREDICTOR

An AI model that uses data from the past to predict the outcomes of teams against the spread in their upcoming matchups on a week-by-week basis.


## Languages


Python:
- Powers data ingestion, feature engineering, model training, and the Streamlit reference UI.

JavaScript + HTML/CSS:
- Drive the static dashboard, handling filtering, trend charts, and matchup visuals.

#### Python ecosystem:

Data access/IO: 
- nfl-data-py for schedules/injuries, pyarrow and polars for parquet work, pandas/numpy for tabular manipulation.

Modeling & analytics: 
- scikit-learn (logistic regression + calibration), matplotlib/seaborn for exploratory plots.

App/runtime helpers:
- typer for CLI utilities, python-dotenv for env config, rich for colorful console output, streamlit for the interactive reference UI.

#### Frontend libraries:

- Static site relies on vanilla JS modules in app.js, with Chart.js for probability trend visualizations.

- Styling is handcrafted in styles.css, augmented with SVG/PNG logos fetched directly from the NFL assets CDN
## Features

- Static + Streamlit UIs: filters for season/week/matchup, matchup banner with team logos, probability bars, confidence copy, betting context (spread + moneylines), recent form timelines, Chart.js trend view, full week table, and record tables (season + weekly).

- Data ingestion: pulls schedules, team stats, injuries, play-by-play, and weekly stat summaries from nflverse; merges travel mileage, rest/back-to-back indicators, injury counts, lagged team production (passing/rushing/receiving volume, sacks, turnovers) plus rolling means.

- Model training: scikit-learn pipeline (scaler + logistic regression) trained on 2018–2024, calibrated via sigmoid; strips leaky columns before fitting, evaluates on holdout season, then exports calibrated cover probabilities into web/data/predictions for the front-end.

- Updates: supports updating weekly by training on play-by-play on a week-to-week bases after all games on that specific week have been played.

