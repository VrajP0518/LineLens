"""Streamlit dashboard for exploring NFL spread predictions."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FEATURES = ROOT / "data" / "processed" / "spread_2018_2025.parquet"
DEFAULT_MODEL = ROOT / "models" / "spread_model.joblib"

COLUMN_ALIASES: Dict[str, Tuple[str, ...]] = {
    "home_team": ("home_team_x", "home_team_y"),
    "away_team": ("away_team_x", "away_team_y"),
    "home_team_moneyline": ("home_moneyline",),
    "away_team_moneyline": ("away_moneyline",),
}


def _harmonize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map: Dict[str, str] = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        if canonical in df.columns:
            continue
        for alias in aliases:
            if alias in df.columns:
                rename_map[alias] = canonical
                break
    if rename_map:
        df = df.rename(columns=rename_map)
    return df


@st.cache_data(show_spinner=False)
def load_dataset(path: Path) -> pd.DataFrame:
    df = pd.read_parquet(path)
    df = _harmonize_columns(df)
    df = df.sort_values(["season", "week"]).reset_index(drop=True)
    return df


@st.cache_resource(show_spinner=False)
def load_model(path: Path) -> Tuple[object, Tuple[str, ...]]:
    artifact: Dict[str, object] = joblib.load(path)
    model = artifact["model"]
    feature_cols = tuple(artifact["features"])
    return model, feature_cols


def describe_game(row: pd.Series) -> str:
    spread = row["spread_line"]
    home = row["home_team"]
    away = row["away_team"]
    return f"{away} @ {home} (spread {spread:+.1f})"


def render_game_summary(row: pd.Series, proba: float) -> None:
    cols = st.columns(3)
    cols[0].metric("Home Team", row["home_team"], f"vs {row['away_team']}")
    cols[1].metric("Predicted Home Cover", f"{proba*100:.1f}%", delta=None)
    result = "Home covered" if row["home_cover"] == 1 else "Home failed"
    cols[2].metric("Actual Result", result, delta=f"Margin {row['cover_margin']:+.1f}")

    st.write("### Market Context")
    market_cols = st.columns(4)
    market_cols[0].metric("Spread", f"{row['spread_line']:+.1f}")
    total_val = row.get("total_line")
    market_cols[1].metric(
        "Total",
        f"{total_val:.1f}" if total_val is not None and pd.notna(total_val) else "-",
    )
    market_cols[2].metric("Moneyline (home)", row.get("home_team_moneyline", "-"))
    market_cols[3].metric("Moneyline (away)", row.get("away_team_moneyline", "-"))


def render_recent_games(df: pd.DataFrame, team: str, n: int = 5) -> None:
    subset = df[(df["home_team"] == team) | (df["away_team"] == team)]
    subset = subset.sort_values(["season", "week"], ascending=False).head(n)
    if subset.empty:
        st.info(f"No recent games for {team}.")
        return
    st.write(f"### {team} last {len(subset)} games")
    st.dataframe(
        subset[["season", "week", "home_team", "away_team", "spread_line", "cover_margin"]],
        use_container_width=True,
        hide_index=True,
    )


def main() -> None:
    st.set_page_config(page_title="NFL Spread Predictor", layout="wide")
    st.title("NFL Spread Predictor Dashboard")
    st.caption("Data sourced from nfl-data-py / nflverse")

    with st.sidebar:
        st.header("Data Sources")
        features_path = Path(
            st.text_input("Processed features parquet", str(DEFAULT_FEATURES))
        )
        model_path = Path(st.text_input("Model artifact", str(DEFAULT_MODEL)))

    if not features_path.exists():
        st.error(f"Features file not found: {features_path}")
        return
    if not model_path.exists():
        st.error(f"Model file not found: {model_path}")
        return

    df = load_dataset(features_path)
    model, feature_cols = load_model(model_path)

    missing_features = [col for col in feature_cols if col not in df.columns]
    if missing_features:
        st.error(
            "The feature file is missing expected columns, e.g. "
            f"{missing_features[:5]}. Rebuild features or adjust the model."
        )
        return

    st.sidebar.header("Filters")
    seasons = sorted(df["season"].unique())
    default_season = seasons.index(max(seasons)) if seasons else 0
    season = st.sidebar.selectbox("Season", seasons, index=default_season)

    weeks = sorted(df.loc[df["season"] == season, "week"].unique())
    default_week = weeks.index(max(weeks)) if weeks else 0
    week = st.sidebar.selectbox("Week", weeks, index=default_week)

    week_games = df[(df["season"] == season) & (df["week"] == week)]
    if week_games.empty:
        st.warning("No games for the selected filters.")
        return

    game_labels = week_games.apply(describe_game, axis=1)
    label_to_id = dict(zip(game_labels, week_games.index))
    default_label = game_labels.iloc[0]
    game_label = st.sidebar.selectbox("Game", game_labels, index=0)
    selected_row = df.loc[label_to_id[game_label]]

    feature_vector = selected_row.loc[list(feature_cols)].astype(float)
    X = feature_vector.to_numpy(dtype=np.float64).reshape(1, -1)
    proba = float(model.predict_proba(X)[0, 1])

    render_game_summary(selected_row, proba)

    with st.expander("Feature Snapshot", expanded=False):
        home_cols = [col for col in feature_cols if col.startswith("home_")]
        away_cols = [col for col in feature_cols if col.startswith("away_")]
        st.subheader("Home team features")
        st.dataframe(
            selected_row[home_cols].rename("value"),
            use_container_width=True,
        )
        st.subheader("Away team features")
        st.dataframe(
            selected_row[away_cols].rename("value"),
            use_container_width=True,
        )

    st.divider()
    col_left, col_right = st.columns(2)
    with col_left:
        render_recent_games(df, selected_row["home_team"])
    with col_right:
        render_recent_games(df, selected_row["away_team"])

    st.divider()
    st.write("### Week overview")
    st.dataframe(
        week_games[["home_team", "away_team", "spread_line", "cover_margin", "home_cover"]],
        use_container_width=True,
        hide_index=True,
    )


if __name__ == "__main__":
    main()
