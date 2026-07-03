"""Build matchup-level MLB moneyline features with leakage-safe rolling windows."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Optional

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


def _history_file(season: int) -> Path:
    return MLB_RAW_DIR / f"history_{season}.json"


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
    return df.drop_duplicates(subset=["game_id"]).sort_values(["game_date", "game_id"]).reset_index(drop=True)


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
    log["home_win_pct_30"] = (
        log.groupby("team", group_keys=False)
        .apply(lambda g: (g["win"].where(g["is_home"].eq(1))).shift(1).rolling(30, min_periods=1).mean())
        .reset_index(level=0, drop=True)
    )
    log["away_win_pct_30"] = (
        log.groupby("team", group_keys=False)
        .apply(lambda g: (g["win"].where(g["is_home"].eq(0))).shift(1).rolling(30, min_periods=1).mean())
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
        "run_diff_avg_14",
        "home_win_pct_30",
        "away_win_pct_30",
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
            "run_diff_avg_14": f"{side}_run_diff_avg_14",
            "home_win_pct_30": f"{side}_team_home_win_pct_30",
            "away_win_pct_30": f"{side}_team_away_win_pct_30",
            "rest_days": f"{side}_rest_days",
        }
        return merged.rename(columns=rename).drop(columns=["team", f"{side}_team_key"], errors="ignore")

    enriched = merge_side(games, "home")
    enriched = merge_side(enriched, "away")
    return enriched.sort_values(["game_date", "game_id"]).reset_index(drop=True)


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
        .sort_values(["game_date", "game_id"])
        .reset_index(drop=True)
    )


def build_dataset_from_games(games: pd.DataFrame) -> pd.DataFrame:
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
        "home_run_diff_avg_14": 0.0,
        "away_run_diff_avg_14": 0.0,
        "home_team_home_win_pct_30": 0.5,
        "away_team_away_win_pct_30": 0.5,
        "home_rest_days": 3.0,
        "away_rest_days": 3.0,
    }
    for col, default in defaults.items():
        feature_frame[col] = feature_frame.get(col, default)
        feature_frame[col] = feature_frame[col].fillna(default)

    feature_frame["rest_diff"] = feature_frame["home_rest_days"] - feature_frame["away_rest_days"]
    feature_frame["recent_win_pct_diff_7"] = (
        feature_frame["home_team_recent_win_pct_7"] - feature_frame["away_team_recent_win_pct_7"]
    )
    feature_frame["recent_win_pct_diff_14"] = (
        feature_frame["home_team_recent_win_pct_14"] - feature_frame["away_team_recent_win_pct_14"]
    )
    feature_frame["run_diff_avg_diff_7"] = feature_frame["home_run_diff_avg_7"] - feature_frame["away_run_diff_avg_7"]
    feature_frame["run_diff_avg_diff_14"] = feature_frame["home_run_diff_avg_14"] - feature_frame["away_run_diff_avg_14"]
    feature_frame["runs_scored_avg_diff_7"] = feature_frame["home_runs_scored_avg_7"] - feature_frame["away_runs_scored_avg_7"]
    feature_frame["runs_allowed_avg_diff_7"] = (
        feature_frame["home_runs_allowed_avg_7"] - feature_frame["away_runs_allowed_avg_7"]
    )
    feature_frame["venue_win_pct_diff_30"] = (
        feature_frame["home_team_home_win_pct_30"] - feature_frame["away_team_away_win_pct_30"]
    )
    feature_frame["home_field"] = 1
    feature_frame["home_is_home"] = 1
    feature_frame["away_is_away"] = 1
    # Pitcher and bullpen joins need a cleaner player-id history table before becoming model features.
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
    console.print(f"[green]Saved[/green] {len(current):,} current MLB feature rows -> {resolve_project_path(output_file)}")


if __name__ == "__main__":
    app()
