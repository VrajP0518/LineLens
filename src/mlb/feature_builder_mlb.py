"""Build leakage-safe MLB moneyline features for LineLens Sports."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

import numpy as np
import pandas as pd
import typer
from rich.console import Console

from src.shared.export_utils import write_json_and_js
from src.shared.mlb_teams import mlb_team_abbreviation, mlb_team_display_name
from src.shared.paths import PROCESSED_DIR, RAW_DIR, ensure_project_dirs, resolve_project_path
from src.shared.version import APP_VERSION

console = Console()
app = typer.Typer(help="Build MLB matchup features for home-win prediction.")
MLB_RAW_DIR = RAW_DIR / "mlb"
MLB_PROCESSED_DIR = PROCESSED_DIR / "mlb"
FEATURE_SUMMARY_JSON = Path("data/reports/mlb_feature_summary.json")
FEATURE_SUMMARY_JS = Path("data/reports/mlb_feature_summary.js")

ROLLING_WINDOWS = (3, 7, 14, 30)

# Approximate team venue coordinates. These support estimated travel context,
# not exact itinerary modeling.
TEAM_CONTEXT = {
    "ARI": ("NL", "West", 33.4455, -112.0667),
    "AZ": ("NL", "West", 33.4455, -112.0667),
    "ATL": ("NL", "East", 33.8907, -84.4677),
    "BAL": ("AL", "East", 39.2840, -76.6217),
    "BOS": ("AL", "East", 42.3467, -71.0972),
    "CHC": ("NL", "Central", 41.9484, -87.6553),
    "CIN": ("NL", "Central", 39.0975, -84.5066),
    "CLE": ("AL", "Central", 41.4962, -81.6852),
    "COL": ("NL", "West", 39.7562, -104.9942),
    "CWS": ("AL", "Central", 41.8300, -87.6339),
    "CHW": ("AL", "Central", 41.8300, -87.6339),
    "DET": ("AL", "Central", 42.3390, -83.0485),
    "HOU": ("AL", "West", 29.7573, -95.3555),
    "KC": ("AL", "Central", 39.0517, -94.4803),
    "LAA": ("AL", "West", 33.8003, -117.8827),
    "LAD": ("NL", "West", 34.0739, -118.2400),
    "MIA": ("NL", "East", 25.7781, -80.2197),
    "MIL": ("NL", "Central", 43.0280, -87.9712),
    "MIN": ("AL", "Central", 44.9817, -93.2776),
    "NYM": ("NL", "East", 40.7571, -73.8458),
    "NYY": ("AL", "East", 40.8296, -73.9262),
    "OAK": ("AL", "West", 37.7516, -122.2005),
    "ATH": ("AL", "West", 38.5802, -121.5130),
    "PHI": ("NL", "East", 39.9061, -75.1665),
    "PIT": ("NL", "Central", 40.4469, -80.0057),
    "SD": ("NL", "West", 32.7073, -117.1566),
    "SDP": ("NL", "West", 32.7073, -117.1566),
    "SEA": ("AL", "West", 47.5914, -122.3325),
    "SF": ("NL", "West", 37.7786, -122.3893),
    "SFG": ("NL", "West", 37.7786, -122.3893),
    "STL": ("NL", "Central", 38.6226, -90.1928),
    "TB": ("AL", "East", 27.7682, -82.6534),
    "TBR": ("AL", "East", 27.7682, -82.6534),
    "TEX": ("AL", "West", 32.7473, -97.0842),
    "TOR": ("AL", "East", 43.6414, -79.3894),
    "WSH": ("NL", "East", 38.8730, -77.0074),
    "WSN": ("NL", "East", 38.8730, -77.0074),
}

FEATURE_GROUPS = {
    "team_form": [
        "home_win_pct_3",
        "away_win_pct_3",
        "home_win_pct_7",
        "away_win_pct_7",
        "home_win_pct_14",
        "away_win_pct_14",
        "home_win_pct_30",
        "away_win_pct_30",
        "win_pct_3_diff",
        "win_pct_7_diff",
        "win_pct_14_diff",
        "win_pct_30_diff",
    ],
    "run_scoring": [
        "home_runs_scored_avg_3",
        "away_runs_scored_avg_3",
        "home_runs_scored_avg_7",
        "away_runs_scored_avg_7",
        "home_runs_scored_avg_14",
        "away_runs_scored_avg_14",
        "home_runs_allowed_avg_3",
        "away_runs_allowed_avg_3",
        "home_runs_allowed_avg_7",
        "away_runs_allowed_avg_7",
        "home_runs_allowed_avg_14",
        "away_runs_allowed_avg_14",
        "runs_scored_3_diff",
        "runs_scored_7_diff",
        "runs_scored_14_diff",
        "runs_allowed_3_diff",
        "runs_allowed_7_diff",
        "runs_allowed_14_diff",
    ],
    "run_differential": [
        "home_run_diff_avg_3",
        "away_run_diff_avg_3",
        "home_run_diff_avg_7",
        "away_run_diff_avg_7",
        "home_run_diff_avg_14",
        "away_run_diff_avg_14",
        "home_run_diff_avg_30",
        "away_run_diff_avg_30",
        "run_diff_3_diff",
        "run_diff_7_diff",
        "run_diff_14_diff",
        "run_diff_30_diff",
        "home_streak",
        "away_streak",
        "streak_diff",
    ],
    "home_away_splits": [
        "home_team_home_win_pct_30",
        "away_team_away_win_pct_30",
        "home_team_home_run_diff_30",
        "away_team_away_run_diff_30",
        "home_split_advantage",
        "home_field",
    ],
    "rest_schedule": [
        "home_rest_days",
        "away_rest_days",
        "rest_diff",
        "home_is_back_to_back",
        "away_is_back_to_back",
        "home_3_games_in_4_days",
        "away_3_games_in_4_days",
        "home_6_games_in_7_days",
        "away_6_games_in_7_days",
        "schedule_fatigue_diff",
    ],
    "series_context": [
        "same_series_game_number",
        "is_doubleheader",
        "doubleheader_game_number",
        "home_won_previous_series_game",
        "away_won_previous_series_game",
        "previous_head_to_head_home_won",
        "head_to_head_win_pct_recent",
    ],
    "pitcher_proxy": [
        "home_pitcher_prior_starts",
        "away_pitcher_prior_starts",
        "home_pitcher_team_win_pct",
        "away_pitcher_team_win_pct",
        "home_pitcher_runs_allowed_avg",
        "away_pitcher_runs_allowed_avg",
        "home_pitcher_recent_runs_allowed_avg_3",
        "away_pitcher_recent_runs_allowed_avg_3",
        "pitcher_win_pct_diff",
        "pitcher_runs_allowed_diff",
        "pitcher_recent_runs_allowed_diff",
    ],
    "travel": [
        "home_team_lat",
        "home_team_lon",
        "away_team_lat",
        "away_team_lon",
        "estimated_travel_km",
        "away_travel_km_from_previous_game",
        "home_travel_km_from_previous_game",
        "travel_km_diff",
        "away_cross_country_trip",
        "home_cross_country_trip",
    ],
    "season_context": [
        "game_number_for_home_team",
        "game_number_for_away_team",
        "month",
        "day_of_week",
        "late_season",
        "division_game",
        "interleague",
    ],
    "volatility": [
        "home_runs_scored_std_7",
        "away_runs_scored_std_7",
        "home_runs_allowed_std_7",
        "away_runs_allowed_std_7",
        "volatility_diff",
    ],
}


def _default_schedule_file(season: int) -> Path:
    return MLB_RAW_DIR / f"schedule_{season}.json"


def _history_file(season: int) -> Path:
    return MLB_RAW_DIR / f"history_{season}.json"


def _status(game: dict) -> str:
    detailed = game.get("status", {}).get("detailedState") or game.get("status", {}).get("abstractGameState")
    return detailed or "Pending"


def _is_final_status(status: str | None) -> bool:
    normalized = str(status or "").lower()
    return "final" in normalized or "completed" in normalized


def _team_abbrev(team: dict) -> str:
    return mlb_team_abbreviation(team)


def _team_name(team: dict) -> str:
    return mlb_team_display_name(team)


def _pitcher_name(side: dict) -> str | None:
    pitcher = side.get("probablePitcher") or {}
    return pitcher.get("fullName")


def _team_context(code: str | None) -> tuple[str | None, str | None, float | None, float | None]:
    return TEAM_CONTEXT.get(str(code or "").upper(), (None, None, None, None))


def _haversine(lat1: float | None, lon1: float | None, lat2: float | None, lon2: float | None) -> float | None:
    if any(value is None or pd.isna(value) for value in [lat1, lon1, lat2, lon2]):
        return None
    radius = 6371.0
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    d_phi = math.radians(float(lat2) - float(lat1))
    d_lambda = math.radians(float(lon2) - float(lon1))
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return float(radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _flatten_schedule(payload: dict, season: int) -> pd.DataFrame:
    rows = []
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            teams = game.get("teams", {})
            home = teams.get("home", {})
            away = teams.get("away", {})
            home_score = home.get("score")
            away_score = away.get("score")
            home_code = _team_abbrev(home)
            away_code = _team_abbrev(away)
            home_league, home_division, home_lat, home_lon = _team_context(home_code)
            away_league, away_division, away_lat, away_lon = _team_context(away_code)
            rows.append(
                {
                    "season": int(game.get("season") or season),
                    "game_date": str(day.get("date") or game.get("officialDate") or game.get("gameDate"))[:10],
                    "game_datetime": game.get("gameDate", day.get("date")),
                    "game_id": str(game.get("gamePk")),
                    "home_team": home_code,
                    "away_team": away_code,
                    "home_display": _team_name(home),
                    "away_display": _team_name(away),
                    "home_score": home_score,
                    "away_score": away_score,
                    "status": _status(game),
                    "home_probable_pitcher": _pitcher_name(home),
                    "away_probable_pitcher": _pitcher_name(away),
                    "venue": (game.get("venue") or {}).get("name"),
                    "home_league": home_league,
                    "away_league": away_league,
                    "home_division": home_division,
                    "away_division": away_division,
                    "home_team_lat": home_lat,
                    "home_team_lon": home_lon,
                    "away_team_lat": away_lat,
                    "away_team_lon": away_lon,
                    "doubleheader_game_number": pd.to_numeric(game.get("gameNumber"), errors="coerce"),
                }
            )
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["game_date"] = pd.to_datetime(df["game_date"])
    df["game_datetime"] = pd.to_datetime(df["game_datetime"], errors="coerce", utc=True)
    df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
    df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")
    final_mask = df["status"].map(_is_final_status)
    df.loc[~final_mask, ["home_score", "away_score"]] = np.nan
    df["home_win"] = np.where(
        final_mask & df["home_score"].notna() & df["away_score"].notna(),
        (df["home_score"] > df["away_score"]).astype(int),
        np.nan,
    )
    return df.drop_duplicates(subset=["game_id"]).sort_values(["game_date", "game_datetime", "game_id"]).reset_index(drop=True)


def _team_game_log(games: pd.DataFrame) -> pd.DataFrame:
    finished = games.dropna(subset=["home_score", "away_score"]).copy()
    if finished.empty:
        return pd.DataFrame()
    home = finished[
        [
            "season",
            "game_date",
            "game_datetime",
            "game_id",
            "home_team",
            "away_team",
            "home_score",
            "away_score",
            "home_team_lat",
            "home_team_lon",
        ]
    ].rename(
        columns={
            "home_team": "team",
            "away_team": "opponent",
            "home_score": "runs_scored",
            "away_score": "runs_allowed",
            "home_team_lat": "venue_lat",
            "home_team_lon": "venue_lon",
        }
    )
    home["is_home"] = 1
    away = finished[
        [
            "season",
            "game_date",
            "game_datetime",
            "game_id",
            "away_team",
            "home_team",
            "away_score",
            "home_score",
            "home_team_lat",
            "home_team_lon",
        ]
    ].rename(
        columns={
            "away_team": "team",
            "home_team": "opponent",
            "away_score": "runs_scored",
            "home_score": "runs_allowed",
            "home_team_lat": "venue_lat",
            "home_team_lon": "venue_lon",
        }
    )
    away["is_home"] = 0
    log = pd.concat([home, away], ignore_index=True)
    log["win"] = (log["runs_scored"] > log["runs_allowed"]).astype(int)
    log["run_diff"] = log["runs_scored"] - log["runs_allowed"]
    return log.sort_values(["team", "game_date", "game_datetime", "game_id"]).reset_index(drop=True)


def _streak(values: pd.Series) -> pd.Series:
    streaks = []
    current = 0
    previous = None
    for value in values.shift(1):
        if pd.isna(value):
            streaks.append(0)
            continue
        sign = 1 if int(value) == 1 else -1
        current = current + sign if previous == sign else sign
        previous = sign
        streaks.append(current)
    return pd.Series(streaks, index=values.index)


def _count_recent(days: int):
    def count(group: pd.DataFrame) -> pd.Series:
        dates = group["game_date"]
        values = []
        for idx, current_date in dates.items():
            prior = dates.loc[:idx].iloc[:-1]
            values.append(int(((current_date - prior).dt.days < days).sum()))
        return pd.Series(values, index=group.index)

    return count


def _add_rolling_team_features(log: pd.DataFrame) -> pd.DataFrame:
    log = log.copy()
    log["prev_game_date"] = log.groupby("team")["game_date"].shift(1)
    log["rest_days"] = (log["game_date"] - log["prev_game_date"]).dt.days.fillna(3).clip(lower=0)
    log["game_number"] = log.groupby(["season", "team"]).cumcount() + 1
    # Leakage guard: all rolling features shift by one game before averaging.
    for window in ROLLING_WINDOWS:
        grouped = log.groupby("team", group_keys=False)
        log[f"win_pct_{window}"] = grouped["win"].apply(lambda s: s.shift(1).rolling(window, min_periods=1).mean())
        log[f"runs_scored_avg_{window}"] = grouped["runs_scored"].apply(lambda s: s.shift(1).rolling(window, min_periods=1).mean())
        log[f"runs_allowed_avg_{window}"] = grouped["runs_allowed"].apply(lambda s: s.shift(1).rolling(window, min_periods=1).mean())
        log[f"run_diff_avg_{window}"] = grouped["run_diff"].apply(lambda s: s.shift(1).rolling(window, min_periods=1).mean())
    log["runs_scored_std_7"] = log.groupby("team", group_keys=False)["runs_scored"].apply(
        lambda s: s.shift(1).rolling(7, min_periods=2).std()
    )
    log["runs_allowed_std_7"] = log.groupby("team", group_keys=False)["runs_allowed"].apply(
        lambda s: s.shift(1).rolling(7, min_periods=2).std()
    )
    log["home_win_pct_30"] = log.groupby("team", group_keys=False).apply(
        lambda g: g["win"].where(g["is_home"].eq(1)).shift(1).rolling(30, min_periods=1).mean()
    )
    log["away_win_pct_30"] = log.groupby("team", group_keys=False).apply(
        lambda g: g["win"].where(g["is_home"].eq(0)).shift(1).rolling(30, min_periods=1).mean()
    )
    log["home_run_diff_30"] = log.groupby("team", group_keys=False).apply(
        lambda g: g["run_diff"].where(g["is_home"].eq(1)).shift(1).rolling(30, min_periods=1).mean()
    )
    log["away_run_diff_30"] = log.groupby("team", group_keys=False).apply(
        lambda g: g["run_diff"].where(g["is_home"].eq(0)).shift(1).rolling(30, min_periods=1).mean()
    )
    log["streak"] = log.groupby("team", group_keys=False)["win"].apply(_streak)
    log["games_last_4_days"] = log.groupby("team", group_keys=False).apply(_count_recent(4))
    log["games_last_7_days"] = log.groupby("team", group_keys=False).apply(_count_recent(7))
    log["prev_venue_lat"] = log.groupby("team")["venue_lat"].shift(1)
    log["prev_venue_lon"] = log.groupby("team")["venue_lon"].shift(1)
    log["travel_km_from_previous_game"] = log.apply(
        lambda row: _haversine(row["prev_venue_lat"], row["prev_venue_lon"], row["venue_lat"], row["venue_lon"]),
        axis=1,
    )
    return log


def _asof_features(games: pd.DataFrame, team_features: pd.DataFrame) -> pd.DataFrame:
    feature_cols = [
        "team",
        "game_date",
        "rest_days",
        "game_number",
        "home_win_pct_30",
        "away_win_pct_30",
        "home_run_diff_30",
        "away_run_diff_30",
        "streak",
        "games_last_4_days",
        "games_last_7_days",
        "travel_km_from_previous_game",
    ]
    for window in ROLLING_WINDOWS:
        feature_cols.extend(
            [
                f"win_pct_{window}",
                f"runs_scored_avg_{window}",
                f"runs_allowed_avg_{window}",
                f"run_diff_avg_{window}",
            ]
        )
    feature_cols.extend(["runs_scored_std_7", "runs_allowed_std_7"])
    features = team_features[feature_cols].dropna(subset=["team", "game_date"]).sort_values("game_date")

    def merge_side(df: pd.DataFrame, side: str) -> pd.DataFrame:
        left = df.sort_values("game_date").copy()
        left[f"{side}_team_key"] = left[f"{side}_team"]
        merged = pd.merge_asof(
            left,
            features,
            left_on="game_date",
            right_on="game_date",
            left_by=f"{side}_team_key",
            right_by="team",
            direction="backward",
            allow_exact_matches=False,
        )
        rename = {
            "rest_days": f"{side}_rest_days",
            "game_number": f"game_number_for_{side}_team",
            "home_win_pct_30": f"{side}_team_home_win_pct_30",
            "away_win_pct_30": f"{side}_team_away_win_pct_30",
            "home_run_diff_30": f"{side}_team_home_run_diff_30",
            "away_run_diff_30": f"{side}_team_away_run_diff_30",
            "streak": f"{side}_streak",
            "games_last_4_days": f"{side}_games_last_4_days",
            "games_last_7_days": f"{side}_games_last_7_days",
            "travel_km_from_previous_game": f"{side}_travel_km_from_previous_game",
            "runs_scored_std_7": f"{side}_runs_scored_std_7",
            "runs_allowed_std_7": f"{side}_runs_allowed_std_7",
        }
        for window in ROLLING_WINDOWS:
            rename[f"win_pct_{window}"] = f"{side}_win_pct_{window}"
            rename[f"runs_scored_avg_{window}"] = f"{side}_runs_scored_avg_{window}"
            rename[f"runs_allowed_avg_{window}"] = f"{side}_runs_allowed_avg_{window}"
            rename[f"run_diff_avg_{window}"] = f"{side}_run_diff_avg_{window}"
        return merged.rename(columns=rename).drop(columns=["team", f"{side}_team_key"], errors="ignore")

    enriched = merge_side(games, "home")
    enriched = merge_side(enriched, "away")
    return enriched.sort_values(["game_date", "game_datetime", "game_id"]).reset_index(drop=True)


def _pitcher_key(name: object) -> str | None:
    if name is None or pd.isna(name):
        return None
    value = str(name).strip().lower()
    if not value or value in {"tbd", "unknown", "none"}:
        return None
    return value


def _pitcher_log(games: pd.DataFrame) -> pd.DataFrame:
    finished = games.dropna(subset=["home_score", "away_score"]).copy()
    rows = []
    for _, game in finished.iterrows():
        for side, opponent_side in [("home", "away"), ("away", "home")]:
            pitcher = game.get(f"{side}_probable_pitcher")
            key = _pitcher_key(pitcher)
            if key is None:
                continue
            rows.append(
                {
                    "pitcher_key": key,
                    "pitcher_name": pitcher,
                    "game_date": game["game_date"],
                    "game_datetime": game.get("game_datetime"),
                    "game_id": game["game_id"],
                    "team": game[f"{side}_team"],
                    "runs_allowed": game[f"{opponent_side}_score"],
                    "team_win": 1 if game[f"{side}_score"] > game[f"{opponent_side}_score"] else 0,
                }
            )
    if not rows:
        return pd.DataFrame()
    log = pd.DataFrame(rows).sort_values(["pitcher_key", "game_date", "game_datetime", "game_id"]).reset_index(drop=True)
    grouped = log.groupby("pitcher_key", group_keys=False)
    log["pitcher_prior_starts"] = grouped.cumcount()
    log["pitcher_team_win_pct"] = grouped["team_win"].apply(lambda s: s.shift(1).expanding(min_periods=1).mean())
    log["pitcher_runs_allowed_avg"] = grouped["runs_allowed"].apply(lambda s: s.shift(1).expanding(min_periods=1).mean())
    log["pitcher_recent_runs_allowed_avg_3"] = grouped["runs_allowed"].apply(lambda s: s.shift(1).rolling(3, min_periods=1).mean())
    return log


def _merge_pitcher_features(games: pd.DataFrame, pitcher_features: pd.DataFrame) -> pd.DataFrame:
    games = games.copy()
    if pitcher_features.empty:
        for side in ["home", "away"]:
            games[f"{side}_pitcher_prior_starts"] = np.nan
            games[f"{side}_pitcher_team_win_pct"] = np.nan
            games[f"{side}_pitcher_runs_allowed_avg"] = np.nan
            games[f"{side}_pitcher_recent_runs_allowed_avg_3"] = np.nan
        games["pitcher_data_status"] = "missing"
        return games

    features = pitcher_features[
        [
            "pitcher_key",
            "game_date",
            "pitcher_prior_starts",
            "pitcher_team_win_pct",
            "pitcher_runs_allowed_avg",
            "pitcher_recent_runs_allowed_avg_3",
        ]
    ].sort_values("game_date")

    for side in ["home", "away"]:
        games[f"{side}_pitcher_key"] = games[f"{side}_probable_pitcher"].map(_pitcher_key)
        games = pd.merge_asof(
            games.sort_values("game_date"),
            features,
            left_on="game_date",
            right_on="game_date",
            left_by=f"{side}_pitcher_key",
            right_by="pitcher_key",
            direction="backward",
            allow_exact_matches=False,
        )
        games = games.rename(
            columns={
                "pitcher_prior_starts": f"{side}_pitcher_prior_starts",
                "pitcher_team_win_pct": f"{side}_pitcher_team_win_pct",
                "pitcher_runs_allowed_avg": f"{side}_pitcher_runs_allowed_avg",
                "pitcher_recent_runs_allowed_avg_3": f"{side}_pitcher_recent_runs_allowed_avg_3",
            }
        ).drop(columns=["pitcher_key"], errors="ignore")

    home_has = games["home_pitcher_prior_starts"].fillna(0) > 0
    away_has = games["away_pitcher_prior_starts"].fillna(0) > 0
    games["pitcher_data_status"] = np.select(
        [home_has & away_has, home_has | away_has],
        ["proxy", "partial_proxy"],
        default="missing",
    )
    return games


def _series_context(games: pd.DataFrame) -> pd.DataFrame:
    df = games.sort_values(["season", "game_date", "game_datetime", "game_id"]).copy()
    df["matchup_key"] = df.apply(lambda row: "-".join(sorted([str(row["home_team"]), str(row["away_team"])])), axis=1)
    df["same_series_game_number"] = 1
    df["home_won_previous_series_game"] = 0
    df["away_won_previous_series_game"] = 0
    df["previous_head_to_head_home_won"] = np.nan
    df["head_to_head_win_pct_recent"] = 0.5

    previous_by_pair: dict[str, list[dict]] = {}
    series_counter: dict[tuple, tuple[pd.Timestamp, int]] = {}
    for idx, row in df.iterrows():
        pair = row["matchup_key"]
        same_home_away = (row["season"], row["home_team"], row["away_team"])
        prior_date, prior_count = series_counter.get(same_home_away, (None, 0))
        if prior_date is not None and (row["game_date"] - prior_date).days <= 4:
            count = prior_count + 1
        else:
            count = 1
        df.at[idx, "same_series_game_number"] = count
        series_counter[same_home_away] = (row["game_date"], count)

        prior = previous_by_pair.get(pair, [])
        if prior:
            last = prior[-1]
            if last["winner"] == row["home_team"]:
                df.at[idx, "home_won_previous_series_game"] = 1
                df.at[idx, "previous_head_to_head_home_won"] = 1
            elif last["winner"] == row["away_team"]:
                df.at[idx, "away_won_previous_series_game"] = 1
                df.at[idx, "previous_head_to_head_home_won"] = 0
            recent = prior[-10:]
            home_wins = sum(1 for item in recent if item["winner"] == row["home_team"])
            df.at[idx, "head_to_head_win_pct_recent"] = home_wins / len(recent)

        if not pd.isna(row.get("home_win")):
            previous_by_pair.setdefault(pair, []).append(
                {
                    "date": row["game_date"],
                    "winner": row["home_team"] if int(row["home_win"]) == 1 else row["away_team"],
                }
            )

    df["doubleheader_game_number"] = pd.to_numeric(df["doubleheader_game_number"], errors="coerce")
    duplicated_same_day = df.duplicated(["game_date", "home_team", "away_team"], keep=False)
    df["is_doubleheader"] = np.where(duplicated_same_day | df["doubleheader_game_number"].fillna(1).gt(1), 1, 0)
    df["doubleheader_game_number"] = df["doubleheader_game_number"].fillna(1)
    return df


def _load_schedule_frames(files: Iterable[tuple[Path, int]]) -> pd.DataFrame:
    frames = []
    for schedule_file, season in files:
        payload = json.loads(schedule_file.read_text(encoding="utf-8"))
        frame = _flatten_schedule(payload, season)
        if not frame.empty:
            frames.append(frame)
    if not frames:
        return pd.DataFrame()
    return (
        pd.concat(frames, ignore_index=True)
        .drop_duplicates(subset=["game_id"])
        .sort_values(["game_date", "game_datetime", "game_id"])
        .reset_index(drop=True)
    )


def _defaults(frame: pd.DataFrame) -> pd.DataFrame:
    defaults: dict[str, float] = {
        "home_rest_days": 3.0,
        "away_rest_days": 3.0,
        "home_team_home_win_pct_30": 0.5,
        "away_team_away_win_pct_30": 0.5,
        "home_team_home_run_diff_30": 0.0,
        "away_team_away_run_diff_30": 0.0,
        "home_streak": 0.0,
        "away_streak": 0.0,
        "home_games_last_4_days": 0.0,
        "away_games_last_4_days": 0.0,
        "home_games_last_7_days": 0.0,
        "away_games_last_7_days": 0.0,
        "game_number_for_home_team": 1.0,
        "game_number_for_away_team": 1.0,
        "home_runs_scored_std_7": 0.0,
        "away_runs_scored_std_7": 0.0,
        "home_runs_allowed_std_7": 0.0,
        "away_runs_allowed_std_7": 0.0,
    }
    for window in ROLLING_WINDOWS:
        defaults[f"home_win_pct_{window}"] = 0.5
        defaults[f"away_win_pct_{window}"] = 0.5
        defaults[f"home_runs_scored_avg_{window}"] = 4.4
        defaults[f"away_runs_scored_avg_{window}"] = 4.4
        defaults[f"home_runs_allowed_avg_{window}"] = 4.4
        defaults[f"away_runs_allowed_avg_{window}"] = 4.4
        defaults[f"home_run_diff_avg_{window}"] = 0.0
        defaults[f"away_run_diff_avg_{window}"] = 0.0
    for col, default in defaults.items():
        if col not in frame.columns:
            frame[col] = default
        frame[col] = pd.to_numeric(frame[col], errors="coerce").fillna(default)
    return frame


def _add_derived_features(frame: pd.DataFrame) -> pd.DataFrame:
    frame = _defaults(frame.copy())
    for window in ROLLING_WINDOWS:
        frame[f"win_pct_{window}_diff"] = frame[f"home_win_pct_{window}"] - frame[f"away_win_pct_{window}"]
        frame[f"runs_scored_{window}_diff"] = frame[f"home_runs_scored_avg_{window}"] - frame[f"away_runs_scored_avg_{window}"]
        frame[f"runs_allowed_{window}_diff"] = frame[f"home_runs_allowed_avg_{window}"] - frame[f"away_runs_allowed_avg_{window}"]
        frame[f"run_diff_{window}_diff"] = frame[f"home_run_diff_avg_{window}"] - frame[f"away_run_diff_avg_{window}"]
    frame["rest_diff"] = frame["home_rest_days"] - frame["away_rest_days"]
    frame["home_is_back_to_back"] = (frame["home_rest_days"] <= 1).astype(int)
    frame["away_is_back_to_back"] = (frame["away_rest_days"] <= 1).astype(int)
    frame["home_3_games_in_4_days"] = (frame["home_games_last_4_days"] >= 2).astype(int)
    frame["away_3_games_in_4_days"] = (frame["away_games_last_4_days"] >= 2).astype(int)
    frame["home_6_games_in_7_days"] = (frame["home_games_last_7_days"] >= 5).astype(int)
    frame["away_6_games_in_7_days"] = (frame["away_games_last_7_days"] >= 5).astype(int)
    frame["schedule_fatigue_diff"] = (
        frame["away_is_back_to_back"]
        + frame["away_3_games_in_4_days"]
        + frame["away_6_games_in_7_days"]
        - frame["home_is_back_to_back"]
        - frame["home_3_games_in_4_days"]
        - frame["home_6_games_in_7_days"]
    )
    frame["streak_diff"] = frame["home_streak"] - frame["away_streak"]
    frame["home_split_advantage"] = frame["home_team_home_win_pct_30"] - frame["away_team_away_win_pct_30"]
    frame["home_field"] = 1
    frame["home_is_home"] = 1
    frame["away_is_away"] = 1
    frame["month"] = frame["game_date"].dt.month
    frame["day_of_week"] = frame["game_date"].dt.dayofweek
    frame["late_season"] = frame["month"].isin([8, 9, 10, 11]).astype(int)
    frame["division_game"] = (frame["home_division"].notna() & (frame["home_division"] == frame["away_division"])).astype(int)
    frame["interleague"] = (frame["home_league"].notna() & frame["away_league"].notna() & (frame["home_league"] != frame["away_league"])).astype(int)
    frame["estimated_travel_km"] = frame.apply(
        lambda row: _haversine(row["away_team_lat"], row["away_team_lon"], row["home_team_lat"], row["home_team_lon"]),
        axis=1,
    )
    frame["home_travel_km_from_previous_game"] = pd.to_numeric(frame["home_travel_km_from_previous_game"], errors="coerce")
    frame["away_travel_km_from_previous_game"] = pd.to_numeric(frame["away_travel_km_from_previous_game"], errors="coerce")
    frame["travel_km_diff"] = frame["away_travel_km_from_previous_game"].fillna(0) - frame["home_travel_km_from_previous_game"].fillna(0)
    frame["away_cross_country_trip"] = (frame["away_travel_km_from_previous_game"].fillna(0) >= 2500).astype(int)
    frame["home_cross_country_trip"] = (frame["home_travel_km_from_previous_game"].fillna(0) >= 2500).astype(int)
    frame["pitcher_win_pct_diff"] = frame["home_pitcher_team_win_pct"].fillna(0.5) - frame["away_pitcher_team_win_pct"].fillna(0.5)
    frame["pitcher_runs_allowed_diff"] = frame["away_pitcher_runs_allowed_avg"].fillna(4.4) - frame["home_pitcher_runs_allowed_avg"].fillna(4.4)
    frame["pitcher_recent_runs_allowed_diff"] = frame["away_pitcher_recent_runs_allowed_avg_3"].fillna(4.4) - frame["home_pitcher_recent_runs_allowed_avg_3"].fillna(4.4)
    frame["volatility_diff"] = (
        frame["away_runs_scored_std_7"].fillna(0)
        + frame["away_runs_allowed_std_7"].fillna(0)
        - frame["home_runs_scored_std_7"].fillna(0)
        - frame["home_runs_allowed_std_7"].fillna(0)
    )
    return frame


def build_dataset_from_games(games: pd.DataFrame) -> pd.DataFrame:
    if games.empty:
        return games
    games = _series_context(games)
    team_log = _team_game_log(games)
    if team_log.empty:
        feature_frame = games.copy()
    else:
        feature_frame = _asof_features(games, _add_rolling_team_features(team_log))
    feature_frame = _merge_pitcher_features(feature_frame, _pitcher_log(games))
    feature_frame = _add_derived_features(feature_frame)
    return feature_frame.sort_values(["game_date", "game_datetime", "game_id"]).reset_index(drop=True)


def numeric_feature_columns(dataset: pd.DataFrame) -> list[str]:
    protected = {
        "home_score",
        "away_score",
        "home_win",
        "game_id",
        "game_date",
        "game_datetime",
    }
    return [
        col
        for col in dataset.select_dtypes(include=[np.number]).columns
        if col not in protected and not col.endswith("_score")
    ]


def write_feature_summary(dataset: pd.DataFrame, output_file: Path) -> None:
    feature_cols = numeric_feature_columns(dataset)
    group_summary = {}
    for group, cols in FEATURE_GROUPS.items():
        available = [col for col in cols if col in dataset.columns]
        missing = [col for col in cols if col not in dataset.columns]
        group_summary[group] = {
            "feature_count": len(available),
            "features": available,
            "missing_features": missing,
            "missingness": {
                col: float(pd.to_numeric(dataset[col], errors="coerce").isna().mean()) for col in available
            },
        }
    dropped = []
    for col in dataset.columns:
        if col not in feature_cols and col not in {"home_win"}:
            reason = "non_numeric_or_identifier"
            if col in {"home_score", "away_score"}:
                reason = "leakage_score_column"
            dropped.append({"feature": col, "reason": reason})
    payload = {
        "metadata": {
            "app": "LineLens Sports",
            "sport": "MLB",
            "version": APP_VERSION,
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "feature_file": str(resolve_project_path(output_file)),
            "real_data": True,
        },
        "rows": int(len(dataset)),
        "row_count": int(len(dataset)),
        "feature_count": len(feature_cols),
        "feature_groups": group_summary,
        "features_used_by_model": feature_cols,
        "features_dropped": dropped,
        "notes": [
            "Rolling features are shifted by one prior game to avoid same-game leakage.",
            "Pitcher features are pitcher-team-result proxy features when probable pitcher names are available.",
            "Travel features are estimated from team venue coordinates, not exact travel itineraries.",
        ],
    }
    write_json_and_js(payload, resolve_project_path(FEATURE_SUMMARY_JSON), resolve_project_path(FEATURE_SUMMARY_JS), "__MLB_FEATURE_SUMMARY__")


def build_dataset(schedule_file: Path, season: int) -> pd.DataFrame:
    games = _load_schedule_frames([(schedule_file, season)])
    return build_dataset_from_games(games)


def _write_dataset(dataset: pd.DataFrame, output_file: Path) -> None:
    out = resolve_project_path(output_file)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix.lower() == ".csv":
        dataset.to_csv(out, index=False)
        return
    try:
        dataset.to_parquet(out, index=False)
    except Exception as exc:  # noqa: BLE001
        csv_fallback = out.with_suffix(".csv")
        dataset.to_csv(csv_fallback, index=False)
        console.print(f"[yellow]Could not write Parquet ({type(exc).__name__}: {exc}); saved CSV fallback -> {csv_fallback}[/yellow]")


@app.command()
def build(
    season: int = typer.Option(2026, help="MLB season to build."),
    schedule_file: Optional[Path] = typer.Option(None, help="Cached MLB schedule JSON."),
    output_file: Path = typer.Option(MLB_PROCESSED_DIR / "moneyline_dataset.parquet", help="Output feature table."),
) -> None:
    ensure_project_dirs()
    schedule_path = resolve_project_path(schedule_file or _default_schedule_file(season))
    if not schedule_path.exists():
        raise typer.BadParameter(
            f"Missing MLB schedule cache: {schedule_path}. Run python -m src.mlb.data_ingest_mlb schedule first."
        )
    dataset = build_dataset(schedule_path, season)
    _write_dataset(dataset, output_file)
    write_feature_summary(dataset, output_file)
    console.print(f"[green]Saved[/green] {len(dataset):,} MLB matchup rows -> {resolve_project_path(output_file)}")


@app.command("build-history")
def build_history(
    start_season: int = typer.Option(2021, help="First cached history season."),
    end_season: int = typer.Option(2025, help="Last cached history season."),
    output_file: Path = typer.Option(
        MLB_PROCESSED_DIR / "mlb_features_2021_2025.csv",
        help="Output historical feature table.",
    ),
    parquet_out: Optional[Path] = typer.Option(
        MLB_PROCESSED_DIR / "moneyline_dataset.parquet",
        help="Optional compatibility Parquet output.",
    ),
) -> None:
    """Build a multi-season historical MLB feature set for training/backtests."""

    ensure_project_dirs()
    files: list[tuple[Path, int]] = []
    missing: list[Path] = []
    for season in range(start_season, end_season + 1):
        path = resolve_project_path(_history_file(season))
        if path.exists():
            files.append((path, season))
        else:
            missing.append(path)

    if missing:
        raise typer.BadParameter(
            "Missing MLB history cache files. Run "
            f"python -m src.mlb.data_ingest_mlb history --start-season {start_season} --end-season {end_season}. "
            f"Missing: {[str(path) for path in missing]}"
        )

    dataset = build_dataset_from_games(_load_schedule_frames(files))
    _write_dataset(dataset, output_file)
    write_feature_summary(dataset, output_file)
    console.print(f"[green]Saved[/green] {len(dataset):,} historical MLB rows -> {resolve_project_path(output_file)}")
    if parquet_out is not None:
        _write_dataset(dataset, parquet_out)


@app.command("build-current")
def build_current(
    season: int = typer.Option(2026, help="Current MLB season to score."),
    start_season: int = typer.Option(2021, help="First cached history season to use for rolling context."),
    end_season: int = typer.Option(2025, help="Last cached history season to use for rolling context."),
    schedule_file: Path = typer.Option(..., help="Cached current MLB schedule JSON."),
    output_file: Path = typer.Option(
        MLB_PROCESSED_DIR / "mlb_current_features.csv",
        help="Output current-schedule feature table.",
    ),
) -> None:
    """Build current MLB matchup features using historical games for prior-team context."""

    ensure_project_dirs()
    files: list[tuple[Path, int]] = []
    missing: list[Path] = []
    for context_season in range(start_season, end_season + 1):
        path = resolve_project_path(_history_file(context_season))
        if path.exists():
            files.append((path, context_season))
        else:
            missing.append(path)
    current_path = resolve_project_path(schedule_file)
    if not current_path.exists():
        missing.append(current_path)
    if missing:
        raise typer.BadParameter(f"Missing MLB files for current feature build: {[str(path) for path in missing]}")

    files.append((current_path, season))
    dataset = build_dataset_from_games(_load_schedule_frames(files))
    current = dataset[dataset["season"].astype(int) == int(season)].copy()
    _write_dataset(current, output_file)
    write_feature_summary(dataset, output_file)
    console.print(f"[green]Saved[/green] {len(current):,} current MLB feature rows -> {resolve_project_path(output_file)}")


if __name__ == "__main__":
    app()
