"""Construct spread-focused modeling features from cached nflfastR tables."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd
import typer
from rich.console import Console

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

console = Console()
app = typer.Typer(help="Build rolling team features for spread modeling.")

TEAM_COORDS: Dict[str, Tuple[float, float]] = {
    "ARI": (33.5276, -112.2626),
    "ATL": (33.7554, -84.4008),
    "BAL": (39.2780, -76.6227),
    "BUF": (42.7738, -78.7865),
    "CAR": (35.2256, -80.8528),
    "CHI": (41.8623, -87.6167),
    "CIN": (39.0954, -84.5160),
    "CLE": (41.5061, -81.6995),
    "DAL": (32.7473, -97.0945),
    "DEN": (39.7439, -105.0201),
    "DET": (42.3400, -83.0456),
    "GB": (44.5013, -88.0622),
    "HOU": (29.6847, -95.4107),
    "IND": (39.7601, -86.1639),
    "JAX": (30.3239, -81.6373),
    "KC": (39.0489, -94.4840),
    "LA": (34.0139, -118.2848),
    "LAC": (32.7831, -117.1194),
    "LV": (36.0909, -115.1830),
    "MIA": (25.9580, -80.2389),
    "MIN": (44.9735, -93.2570),
    "NE": (42.0909, -71.2643),
    "NO": (29.9511, -90.0812),
    "NYG": (40.8128, -74.0743),
    "NYJ": (40.8128, -74.0743),
    "PHI": (39.9008, -75.1675),
    "PIT": (40.4468, -80.0158),
    "SEA": (47.5952, -122.3316),
    "SF": (37.4030, -121.9700),
    "TB": (27.9759, -82.5033),
    "TEN": (36.1665, -86.7713),
    "WAS": (38.9077, -76.8645),
}

STATUS_MAP = {
    "Out": "inj_out",
    "Doubtful": "inj_doubtful",
    "Questionable": "inj_questionable",
}

PRACTICE_MAP = {
    "did not participate in practice": "inj_practice_dnp",
    "limited participation in practice": "inj_practice_limited",
    "full participation in practice": "inj_practice_full",
}

WEEKLY_AGG_MAP = {
    "passing_yards": "weekly_pass_yards",
    "passing_tds": "weekly_pass_tds",
    "interceptions": "weekly_ints",
    "sacks": "weekly_sacks",
    "rushing_yards": "weekly_rush_yards",
    "rushing_tds": "weekly_rush_tds",
    "receiving_yards": "weekly_rec_yards",
    "receiving_tds": "weekly_rec_tds",
    "targets": "weekly_targets",
    "receptions": "weekly_receptions",
}

STATIC_FEATURES = [
    "team_rest",
    "opponent_rest",
    "team_rest_diff",
    "team_short_week",
    "team_long_rest",
    "travel_miles",
    "road_trip_b2b",
    "team_moneyline",
    "opponent_moneyline",
    "team_spread_odds",
    "opponent_spread_odds",
    "inj_out",
    "inj_doubtful",
    "inj_questionable",
    "inj_total",
    "inj_practice_dnp",
    "inj_practice_limited",
    "inj_practice_full",
] + list(WEEKLY_AGG_MAP.values())


def _resolve_input(
    candidate: Optional[Path], pattern: str, description: str, *, required: bool = True
) -> Optional[Path]:
    if candidate:
        path = (ROOT / candidate).resolve() if not candidate.is_absolute() else candidate
        if not path.exists():
            raise typer.BadParameter(f"{description} '{path}' does not exist")
        return path

    matches = sorted(RAW_DIR.glob(pattern))
    if not matches:
        if required:
            raise typer.BadParameter(
                f"No files matching '{pattern}' were found in {RAW_DIR}. "
                "Pass an explicit path with the corresponding --file option."
            )
        console.print(f"[yellow]Skipping {description}; no '{pattern}' files detected.[/yellow]")
        return None
    console.print(f"[yellow]Auto-selected[/yellow] {matches[-1]} for {description}.")
    return matches[-1]


def _prepare_schedule(schedule: pd.DataFrame, start_season: int, end_season: int) -> pd.DataFrame:
    schedule = schedule.copy()
    schedule = schedule[(schedule["game_type"] == "REG") & schedule["season"].between(start_season, end_season)]
    schedule = schedule.dropna(subset=["spread_line", "home_score", "away_score"])
    schedule["rest_diff"] = schedule["home_rest"].fillna(0) - schedule["away_rest"].fillna(0)
    return schedule


def _reshape_team_games(schedule: pd.DataFrame) -> pd.DataFrame:
    base_cols = [
        "game_id",
        "season",
        "week",
        "spread_line",
        "total_line",
        "rest_diff",
        "home_team",
        "away_team",
        "home_score",
        "away_score",
        "home_rest",
        "away_rest",
        "home_moneyline",
        "away_moneyline",
        "home_spread_odds",
        "away_spread_odds",
    ]
    existing_cols = [col for col in base_cols if col in schedule.columns]
    schedule = schedule[existing_cols].copy()

    home = schedule.rename(
        columns={
            "home_team": "team",
            "away_team": "opponent",
            "home_score": "team_score",
            "away_score": "opponent_score",
            "home_rest": "team_rest",
            "away_rest": "opponent_rest",
            "home_moneyline": "team_moneyline",
            "away_moneyline": "opponent_moneyline",
            "home_spread_odds": "team_spread_odds",
            "away_spread_odds": "opponent_spread_odds",
        }
    )
    home["is_home"] = 1

    away = schedule.rename(
        columns={
            "away_team": "team",
            "home_team": "opponent",
            "away_score": "team_score",
            "home_score": "opponent_score",
            "away_rest": "team_rest",
            "home_rest": "opponent_rest",
            "away_moneyline": "team_moneyline",
            "home_moneyline": "opponent_moneyline",
            "away_spread_odds": "team_spread_odds",
            "home_spread_odds": "opponent_spread_odds",
        }
    )
    away["is_home"] = 0

    team_games = pd.concat([home, away], ignore_index=True)
    team_games = team_games.sort_values(["team", "season", "week"]).reset_index(drop=True)
    team_games["team_score"] = team_games["team_score"].fillna(0)
    team_games["opponent_score"] = team_games["opponent_score"].fillna(0)
    team_games["team_result"] = (team_games["team_score"] > team_games["opponent_score"]).astype(int)
    team_games["point_diff"] = team_games["team_score"] - team_games["opponent_score"]
    team_games["games_played"] = team_games.groupby("team").cumcount()

    team_games["team_rest"] = team_games["team_rest"].fillna(7)
    team_games["opponent_rest"] = team_games["opponent_rest"].fillna(7)
    team_games["team_rest_diff"] = team_games["team_rest"] - team_games["opponent_rest"]
    team_games["team_short_week"] = (team_games["team_rest"] < 7).astype(int)
    team_games["team_long_rest"] = (team_games["team_rest"] > 9).astype(int)
    return team_games


def _aggregate_pbp(pbp: pd.DataFrame) -> pd.DataFrame:
    plays = pbp.copy()
    plays = plays.loc[plays["play_type"].isin(["pass", "run"])]
    plays = plays.dropna(subset=["posteam", "defteam"])
    plays["is_pass"] = plays["pass"].fillna(0)
    plays["success"] = plays["success"].fillna(0)
    plays["epa"] = plays["epa"].fillna(0)

    offense = (
        plays.groupby(["game_id", "posteam"])
        .agg(
            off_plays=("play_id", "count"),
            off_epa_per_play=("epa", "mean"),
            off_success_rate=("success", "mean"),
            off_pass_rate=("is_pass", "mean"),
        )
        .reset_index()
        .rename(columns={"posteam": "team"})
    )

    defense = (
        plays.groupby(["game_id", "defteam"])
        .agg(
            def_plays=("play_id", "count"),
            def_epa_per_play=("epa", "mean"),
            def_success_rate=("success", "mean"),
        )
        .reset_index()
        .rename(columns={"defteam": "team"})
    )
    defense["def_epa_per_play"] = -defense["def_epa_per_play"]

    merged = offense.merge(defense, on=["game_id", "team"], how="outer")
    return merged


def _attach_play_metrics(team_games: pd.DataFrame, play_metrics: pd.DataFrame) -> pd.DataFrame:
    enriched = team_games.merge(play_metrics, on=["game_id", "team"], how="left")
    metric_cols = [
        "off_plays",
        "off_epa_per_play",
        "off_success_rate",
        "off_pass_rate",
        "def_plays",
        "def_epa_per_play",
        "def_success_rate",
    ]
    for col in metric_cols:
        enriched[col] = enriched[col].fillna(0)
    return enriched


def _add_rolling_features(df: pd.DataFrame, windows: Iterable[int]) -> pd.DataFrame:
    rolling_map: Dict[str, str] = {
        "team_score": "pf",
        "opponent_score": "pa",
        "point_diff": "point_diff",
        "team_result": "win_pct",
        "off_epa_per_play": "off_epa",
        "off_success_rate": "off_success",
        "off_pass_rate": "pass_rate",
        "def_epa_per_play": "def_epa",
        "def_success_rate": "def_success",
    }

    for alias in WEEKLY_AGG_MAP.values():
        if alias in df.columns:
            rolling_map[alias] = alias

    for window in windows:
        for source_col, short_name in rolling_map.items():
            target_col = f"{short_name}_l{window}"
            df[target_col] = (
                df.groupby("team", group_keys=False)[source_col]
                .apply(lambda s: s.shift(1).rolling(window, min_periods=1).mean())
                .reset_index(level=0, drop=True)
            )
    return df


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def _compute_travel_features(team_games: pd.DataFrame) -> pd.DataFrame:
    def _travel(row: pd.Series) -> float:
        if row["is_home"] == 1:
            return 0.0
        team_coord = TEAM_COORDS.get(row["team"])
        opp_coord = TEAM_COORDS.get(row["opponent"])
        if not team_coord or not opp_coord:
            return float("nan")
        return _haversine_miles(*team_coord, *opp_coord)

    team_games["travel_miles"] = team_games.apply(_travel, axis=1).fillna(0.0)
    prev_home = team_games.groupby("team")["is_home"].shift(1)
    team_games["road_trip_b2b"] = ((team_games["is_home"] == 0) & (prev_home == 0)).astype(int).fillna(0)
    return team_games


def _summarize_injuries(injuries: pd.DataFrame, start_season: int, end_season: int) -> pd.DataFrame:
    data = injuries.copy()
    data = data[(data["season"].between(start_season, end_season)) & (data["game_type"] == "REG")]
    data["report_status"] = data["report_status"].fillna("Unknown")
    data["practice_status"] = data["practice_status"].fillna("Unknown")
    data["practice_status_norm"] = data["practice_status"].str.strip().str.lower()

    status_counts = (
        data.groupby(["season", "week", "team"])["report_status"]
        .value_counts()
        .unstack(fill_value=0)
        .reindex(columns=STATUS_MAP.keys(), fill_value=0)
        .rename(columns=STATUS_MAP)
    )

    practice_counts = (
        data.groupby(["season", "week", "team"])["practice_status_norm"]
        .value_counts()
        .unstack(fill_value=0)
        .reindex(columns=PRACTICE_MAP.keys(), fill_value=0)
        .rename(columns=PRACTICE_MAP)
    )

    summary = status_counts.join(practice_counts, how="outer").fillna(0).reset_index()
    summary["inj_total"] = summary[list(STATUS_MAP.values())].sum(axis=1)
    return summary


def _merge_injury_features(
    team_games: pd.DataFrame,
    injuries: Optional[pd.DataFrame],
    start_season: int,
    end_season: int,
) -> pd.DataFrame:
    injury_cols = list(STATUS_MAP.values()) + list(PRACTICE_MAP.values()) + ["inj_total"]
    if injuries is None:
        for col in injury_cols:
            team_games[col] = 0
        return team_games

    summary = _summarize_injuries(injuries, start_season, end_season)
    team_games = team_games.merge(summary, on=["season", "week", "team"], how="left")
    for col in injury_cols:
        team_games[col] = team_games[col].fillna(0)
    return team_games

def _summarize_weekly(weekly: pd.DataFrame, start_season: int, end_season: int) -> pd.DataFrame:
    data = weekly.copy()
    data = data[(data["season"].between(start_season, end_season)) & (data["season_type"] == "REG")]
    agg_specs = {alias: (source, "sum") for source, alias in WEEKLY_AGG_MAP.items() if source in data.columns}
    if not agg_specs:
        raise RuntimeError("Weekly dataset missing expected columns for aggregation.")

    summary = (
        data.groupby(["season", "week", "recent_team"]).agg(**agg_specs).reset_index()
    )
    summary = summary.rename(columns={"recent_team": "team"})
    value_cols = list(agg_specs.keys())
    summary = summary.sort_values(["team", "season", "week"])
    summary[value_cols] = summary.groupby("team")[value_cols].shift(1)
    summary[value_cols] = summary[value_cols].fillna(0)
    return summary


def _merge_weekly_features(
    team_games: pd.DataFrame,
    weekly: Optional[pd.DataFrame],
    start_season: int,
    end_season: int,
) -> pd.DataFrame:
    weekly_cols = list(WEEKLY_AGG_MAP.values())
    if weekly is None:
        for col in weekly_cols:
            team_games[col] = 0
        return team_games

    summary = _summarize_weekly(weekly, start_season, end_season)
    team_games = team_games.merge(summary, on=["season", "week", "team"], how="left")
    for col in weekly_cols:
        team_games[col] = team_games[col].fillna(0)
    return team_games


def _build_game_level_frame(team_games: pd.DataFrame, min_games: int) -> pd.DataFrame:
    rolling_prefixes = ("pf_", "pa_", "point_diff_", "win_pct_", "off_", "def_", "pass_rate_", "weekly_")
    rolling_cols = [
        col
        for col in team_games.columns
        if any(col.startswith(prefix) for prefix in rolling_prefixes) and "_l" in col
    ]

    static_cols = [col for col in STATIC_FEATURES if col in team_games.columns]
    feature_cols = rolling_cols + static_cols
    cols = ["game_id", "games_played", "team", "is_home"] + feature_cols
    subset = team_games[cols].copy()

    home = subset[subset["is_home"] == 1].drop(columns=["is_home"])
    home = home.add_prefix("home_")
    home = home.rename(columns={"home_game_id": "game_id"})

    away = subset[subset["is_home"] == 0].drop(columns=["is_home"])
    away = away.add_prefix("away_")
    away = away.rename(columns={"away_game_id": "game_id"})

    combined = home.merge(away, on="game_id", how="inner")
    combined = combined[(combined["home_games_played"] >= min_games) & (combined["away_games_played"] >= min_games)]
    return combined


def _finalize_dataset(schedule: pd.DataFrame, features: pd.DataFrame) -> pd.DataFrame:
    schedule_subset = schedule[[
        "game_id",
        "season",
        "week",
        "home_team",
        "away_team",
        "spread_line",
        "home_score",
        "away_score",
        "rest_diff",
    ]].copy()
    dataset = schedule_subset.merge(features, on="game_id", how="inner")
    dataset["cover_margin"] = dataset["home_score"] - dataset["away_score"] + dataset["spread_line"]
    dataset = dataset[dataset["cover_margin"].notnull()]
    dataset = dataset[np.isfinite(dataset["cover_margin"])]
    dataset = dataset[dataset["cover_margin"] != 0]
    dataset["home_cover"] = (dataset["cover_margin"] > 0).astype(int)
    dataset = dataset.dropna()
    return dataset


@app.command()
def build(
    start_season: int = typer.Option(2018, help="Earliest season to include (inclusive)."),
    end_season: int = typer.Option(2023, help="Latest season to include (inclusive)."),
    min_games: int = typer.Option(3, help="Minimum prior games required per team before a matchup."),
    pbp_file: Optional[Path] = typer.Option(None, help="Parquet file with play-by-play data."),
    schedule_file: Optional[Path] = typer.Option(None, help="CSV file with schedule and spreads."),
    injuries_file: Optional[Path] = typer.Option(None, help="CSV file with injury reports."),
    weekly_file: Optional[Path] = typer.Option(None, help="Parquet file with team-level weekly stats."),
    output_file: Path = typer.Option(PROCESSED_DIR / "spread_dataset.parquet", help="Where to write processed features."),
    rolling_short: int = typer.Option(3, help="Short rolling window size."),
    rolling_long: int = typer.Option(5, help="Long rolling window size."),
) -> None:
    """Build the modeling table for spread classification."""

    pbp_path = _resolve_input(pbp_file, "pbp_*.parquet", "play-by-play cache")
    schedule_path = _resolve_input(schedule_file, "schedules_*.csv", "schedule cache")
    injuries_path = _resolve_input(injuries_file, "injuries_*.csv", "injury cache", required=False)
    weekly_path = _resolve_input(weekly_file, "weekly_*.parquet", "weekly cache", required=False)

    pbp_df = pd.read_parquet(pbp_path)
    pbp_df = pbp_df[pbp_df["season"].between(start_season, end_season)]

    schedule_df = pd.read_csv(schedule_path)
    schedule_df = _prepare_schedule(schedule_df, start_season, end_season)

    injuries_df = pd.read_csv(injuries_path) if injuries_path else None
    weekly_df = pd.read_parquet(weekly_path) if weekly_path else None
    msg = f"Loaded {len(pbp_df):,} plays and {len(schedule_df):,} games."
    if injuries_df is None:
        msg += " [yellow](injury features disabled)"
    else:
        msg += f" + {len(injuries_df):,} injury rows"
    if weekly_df is None:
        msg += " [yellow](weekly features disabled)"
    else:
        msg += f" + {len(weekly_df):,} weekly records"
    console.print(msg)

    team_games = _reshape_team_games(schedule_df)
    play_metrics = _aggregate_pbp(pbp_df)
    team_games = _attach_play_metrics(team_games, play_metrics)
    team_games = _compute_travel_features(team_games)
    team_games = _merge_injury_features(team_games, injuries_df, start_season, end_season)
    team_games = _merge_weekly_features(team_games, weekly_df, start_season, end_season)
    team_games = _add_rolling_features(team_games, windows=[rolling_short, rolling_long])
    features = _build_game_level_frame(team_games, min_games=min_games)
    dataset = _finalize_dataset(schedule_df, features)

    output_file = output_file if output_file.is_absolute() else (ROOT / output_file)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_parquet(output_file, index=False)
    console.print(
        f"[green]Saved[/green] {len(dataset):,} rows with {dataset.shape[1]-6} feature columns -> {output_file}"
    )


if __name__ == "__main__":
    app()
