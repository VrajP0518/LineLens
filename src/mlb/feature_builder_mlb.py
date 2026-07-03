"""Build matchup-level MLB moneyline features with leakage-safe rolling windows."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import typer
from rich.console import Console

from src.shared.paths import PROCESSED_DIR, RAW_DIR, ensure_project_dirs, resolve_project_path

console = Console()
app = typer.Typer(help="Build MLB matchup features for home-win prediction.")
MLB_RAW_DIR = RAW_DIR / "mlb"
MLB_PROCESSED_DIR = PROCESSED_DIR / "mlb"


def _default_schedule_file(season: int) -> Path:
    return MLB_RAW_DIR / f"schedule_{season}.json"


def _status(game: dict) -> str:
    detailed = game.get("status", {}).get("detailedState") or game.get("status", {}).get("abstractGameState")
    return detailed or "Pending"


def _team_abbrev(team: dict) -> str:
    info = team.get("team", team)
    return info.get("abbreviation") or info.get("teamCode") or info.get("name", "UNK")


def _team_name(team: dict) -> str:
    info = team.get("team", team)
    return info.get("name") or _team_abbrev(team)


def _pitcher_name(side: dict) -> str | None:
    pitcher = side.get("probablePitcher") or {}
    return pitcher.get("fullName")


def _flatten_schedule(payload: dict, season: int) -> pd.DataFrame:
    rows = []
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            teams = game.get("teams", {})
            home = teams.get("home", {})
            away = teams.get("away", {})
            home_score = home.get("score")
            away_score = away.get("score")
            rows.append(
                {
                    "season": int(game.get("season") or season),
                    "game_date": game.get("gameDate", day.get("date"))[:10],
                    "game_id": str(game.get("gamePk")),
                    "home_team": _team_abbrev(home),
                    "away_team": _team_abbrev(away),
                    "home_display": _team_name(home),
                    "away_display": _team_name(away),
                    "home_score": home_score,
                    "away_score": away_score,
                    "status": _status(game),
                    "home_probable_pitcher": _pitcher_name(home),
                    "away_probable_pitcher": _pitcher_name(away),
                }
            )
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["game_date"] = pd.to_datetime(df["game_date"])
    df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
    df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")
    df["home_win"] = np.where(
        df["home_score"].notna() & df["away_score"].notna(),
        (df["home_score"] > df["away_score"]).astype(int),
        np.nan,
    )
    return df.sort_values(["game_date", "game_id"]).reset_index(drop=True)


def _team_game_log(games: pd.DataFrame) -> pd.DataFrame:
    finished = games.dropna(subset=["home_score", "away_score"]).copy()
    home = finished[
        ["game_date", "game_id", "home_team", "away_team", "home_score", "away_score"]
    ].rename(
        columns={
            "home_team": "team",
            "away_team": "opponent",
            "home_score": "runs_scored",
            "away_score": "runs_allowed",
        }
    )
    home["is_home"] = 1
    away = finished[
        ["game_date", "game_id", "away_team", "home_team", "away_score", "home_score"]
    ].rename(
        columns={
            "away_team": "team",
            "home_team": "opponent",
            "away_score": "runs_scored",
            "home_score": "runs_allowed",
        }
    )
    away["is_home"] = 0
    log = pd.concat([home, away], ignore_index=True)
    log["win"] = (log["runs_scored"] > log["runs_allowed"]).astype(int)
    log["run_diff"] = log["runs_scored"] - log["runs_allowed"]
    return log.sort_values(["team", "game_date", "game_id"]).reset_index(drop=True)


def _add_rolling_team_features(log: pd.DataFrame) -> pd.DataFrame:
    log = log.copy()
    log["prev_game_date"] = log.groupby("team")["game_date"].shift(1)
    log["rest_days"] = (log["game_date"] - log["prev_game_date"]).dt.days.fillna(3).clip(lower=0)
    rolling_sources = {
        "win": "recent_win_pct",
        "runs_scored": "runs_scored_avg",
        "runs_allowed": "runs_allowed_avg",
        "run_diff": "run_diff_avg",
    }
    # Leakage guard: shift(1) ensures current-game scores/results never feed current-game features.
    for window in (7, 14):
        for source, alias in rolling_sources.items():
            log[f"{alias}_{window}"] = (
                log.groupby("team", group_keys=False)[source]
                .apply(lambda s: s.shift(1).rolling(window, min_periods=1).mean())
                .reset_index(level=0, drop=True)
            )
    return log


def _asof_features(games: pd.DataFrame, team_features: pd.DataFrame) -> pd.DataFrame:
    feature_cols = [
        "team",
        "game_date",
        "recent_win_pct_7",
        "recent_win_pct_14",
        "runs_scored_avg_7",
        "runs_allowed_avg_7",
        "run_diff_avg_7",
        "rest_days",
    ]
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
            "recent_win_pct_7": f"{side}_team_recent_win_pct_7",
            "recent_win_pct_14": f"{side}_team_recent_win_pct_14",
            "runs_scored_avg_7": f"{side}_runs_scored_avg_7",
            "runs_allowed_avg_7": f"{side}_runs_allowed_avg_7",
            "run_diff_avg_7": f"{side}_run_diff_avg_7",
            "rest_days": f"{side}_rest_days",
        }
        return merged.rename(columns=rename).drop(columns=["team", f"{side}_team_key"], errors="ignore")

    enriched = merge_side(games, "home")
    enriched = merge_side(enriched, "away")
    return enriched.sort_values(["game_date", "game_id"]).reset_index(drop=True)


def build_dataset(schedule_file: Path, season: int) -> pd.DataFrame:
    payload = json.loads(schedule_file.read_text(encoding="utf-8"))
    games = _flatten_schedule(payload, season)
    if games.empty:
        return games
    team_log = _team_game_log(games)
    if team_log.empty:
        feature_frame = games.copy()
    else:
        feature_frame = _asof_features(games, _add_rolling_team_features(team_log))

    defaults = {
        "home_team_recent_win_pct_7": 0.5,
        "away_team_recent_win_pct_7": 0.5,
        "home_team_recent_win_pct_14": 0.5,
        "away_team_recent_win_pct_14": 0.5,
        "home_runs_scored_avg_7": 4.4,
        "away_runs_scored_avg_7": 4.4,
        "home_runs_allowed_avg_7": 4.4,
        "away_runs_allowed_avg_7": 4.4,
        "home_run_diff_avg_7": 0.0,
        "away_run_diff_avg_7": 0.0,
        "home_rest_days": 3.0,
        "away_rest_days": 3.0,
    }
    for col, default in defaults.items():
        feature_frame[col] = feature_frame.get(col, default)
        feature_frame[col] = feature_frame[col].fillna(default)

    feature_frame["rest_diff"] = feature_frame["home_rest_days"] - feature_frame["away_rest_days"]
    feature_frame["home_is_home"] = 1
    feature_frame["away_is_away"] = 1
    # First pass placeholders: pitcher and bullpen joins need a cleaner player-id history table.
    for col in [
        "home_pitcher_era",
        "away_pitcher_era",
        "home_pitcher_whip",
        "away_pitcher_whip",
        "home_pitcher_k_rate",
        "away_pitcher_k_rate",
        "home_bullpen_recent_innings_3",
        "away_bullpen_recent_innings_3",
    ]:
        feature_frame[col] = np.nan
    feature_frame["bullpen_usage_diff"] = 0.0
    return feature_frame


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
    out = resolve_project_path(output_file)
    out.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_parquet(out, index=False)
    console.print(f"[green]Saved[/green] {len(dataset):,} MLB matchup rows -> {out}")


if __name__ == "__main__":
    app()
