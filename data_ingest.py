"""nflfastR ingestion helpers powered by nfl-data-py.

Usage examples:
    python src/data_ingest.py pbp --start-season 2018 --end-season 2025
    python src/data_ingest.py team-stats --start-season 2018 --end-season 2025
    python src/data_ingest.py schedules --start-season 2018 --end-season 2025
    python src/data_ingest.py injuries --start-season 2018 --end-season 2025
    python src/data_ingest.py weekly --start-season 2018 --end-season 2025 --downcast / --no-downcast
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional
from urllib.error import HTTPError

import nfl_data_py as nfl
import pandas as pd
import typer
from rich.console import Console

console = Console()
app = typer.Typer(help="Download nflfastR datasets via nfl-data-py and cache them locally.")
RAW_DIR = Path(__file__).resolve().parent / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)
NFLVERSE_GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"


def _build_season_list(start: int, end: int) -> List[int]:
    if start > end:
        raise typer.BadParameter("start-season must be <= end-season")
    return list(range(start, end + 1))


def _write_frame(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == ".parquet":
        df.to_parquet(path, index=False)
    else:
        df.to_csv(path, index=False)
    console.print(f"Saved {len(df):,} rows -> {path}")


@app.command()
def pbp(
    start_season: int = typer.Option(2018, help="First season to download (inclusive)"),
    end_season: int = typer.Option(2024, help="Last season to download (inclusive)"),
) -> None:
    """Download play-by-play data and store it as a Parquet file."""

    seasons = _build_season_list(start_season, end_season)
    outfile = RAW_DIR / f"pbp_{start_season}_{end_season}.parquet"
    console.print(f"Fetching play-by-play seasons: {seasons}")
    with console.status("Contacting nflfastR GitHub mirror..."):
        df = nfl.import_pbp_data(seasons)
    _write_frame(df, outfile)


@app.command("team-stats")
def team_stats(
    start_season: int = typer.Option(2018, help="First season to download (inclusive)"),
    end_season: int = typer.Option(2024, help="Last season to download (inclusive)"),
    season_type: str = typer.Option("REG", help="Season type to include (REG, POST, ALL)."),
) -> None:
    """Download seasonal team-level summary stats."""

    seasons = _build_season_list(start_season, end_season)
    outfile = RAW_DIR / f"team_stats_{start_season}_{end_season}.csv"
    console.print(f"Fetching team stats seasons: {seasons}")
    season_type = season_type.upper()
    if season_type not in {"REG", "POST", "ALL"}:
        raise typer.BadParameter("season_type must be one of REG, POST, ALL")

    frames = []
    skipped: List[int] = []
    with console.status("Downloading team summaries..."):
        for season in seasons:
            try:
                frames.append(nfl.import_seasonal_data([season], s_type=season_type))
            except HTTPError:
                skipped.append(season)
                console.print(f"[yellow]Season {season} seasonal file not published yet, skipping.[/yellow]")

    if not frames:
        raise typer.BadParameter("No seasonal stats were downloaded; reduce end-season to published years.")

    df = pd.concat(frames, ignore_index=True)
    _write_frame(df, outfile)

    if skipped:
        console.print(f"[yellow]Skipped seasons without seasonal data: {skipped}[/yellow]")


@app.command()
def schedules(
    start_season: int = typer.Option(2018, help="First season to download (inclusive)"),
    end_season: int = typer.Option(2024, help="Last season to download (inclusive)"),
) -> None:
    """Download the nflfastR schedule table with scores and spread info."""

    seasons = _build_season_list(start_season, end_season)
    outfile = RAW_DIR / f"schedules_{start_season}_{end_season}.csv"
    console.print(f"Fetching schedules seasons: {seasons}")
    with console.status("Downloading schedule metadata..."):
        try:
            df = nfl.import_schedules(seasons)
        except Exception as exc:  # noqa: BLE001 - nfl-data-py may use an HTTP mirror blocked by local policy.
            console.print(f"[yellow]nfl-data-py schedule mirror failed ({type(exc).__name__}: {exc}); trying nflverse HTTPS CSV.[/yellow]")
            df = pd.read_csv(NFLVERSE_GAMES_URL)
            df = df[df["season"].isin(seasons)]
    _write_frame(df, outfile)


@app.command()
def injuries(
    start_season: int = typer.Option(2018, help="First season to download (inclusive)"),
    end_season: int = typer.Option(2024, help="Last season to download (inclusive)"),
) -> None:
    """Download weekly injury reports for each team."""

    seasons = _build_season_list(start_season, end_season)
    outfile = RAW_DIR / f"injuries_{start_season}_{end_season}.csv"
    console.print(f"Fetching injury reports for seasons: {seasons}")
    frames = []
    skipped: List[int] = []
    with console.status("Downloading injury data..."):
        for season in seasons:
            try:
                frames.append(nfl.import_injuries([season]))
            except HTTPError:
                skipped.append(season)
                console.print(f"[yellow]Season {season} injury file not published yet, skipping.[/yellow]")

    if not frames:
        raise typer.BadParameter("No injury data was downloaded; reduce end-season to published years.")

    df = pd.concat(frames, ignore_index=True)
    _write_frame(df, outfile)

    if skipped:
        console.print(f"[yellow]Skipped seasons without injury data: {skipped}[/yellow]")


@app.command()
def weekly(
    start_season: int = typer.Option(2018, help="First season to download (inclusive)"),
    end_season: int = typer.Option(2025, help="Last season to download (inclusive)"),
    columns: Optional[List[str]] = typer.Option(
        None,
        "--column",
        "-c",
        help="Optional weekly column names; repeat flag for multiple entries (defaults to all columns).",
    ),
    downcast: bool = typer.Option(
        True,
        help="Convert float64 columns to float32 for smaller files (slightly slower ingestion).",
    ),
) -> None:
    """Download the nflfastR weekly table (one row per team per game)."""

    seasons = _build_season_list(start_season, end_season)
    outfile = RAW_DIR / f"weekly_{start_season}_{end_season}.parquet"
    console.print(
        "Fetching weekly data for seasons "
        f"{seasons} with columns={'all' if not columns else ','.join(columns)} (downcast={downcast})"
    )
    frames = []
    skipped: List[int] = []
    with console.status("Downloading weekly records..."):
        for season in seasons:
            try:
                frames.append(
                    nfl.import_weekly_data([season], columns=columns or None, downcast=downcast)
                )
            except HTTPError:
                skipped.append(season)
                console.print(f"[yellow]Season {season} weekly file not published yet, skipping.[/yellow]")

    if not frames:
        raise typer.BadParameter("No weekly data was downloaded; reduce end-season to published years.")

    df = pd.concat(frames, ignore_index=True)
    _write_frame(df, outfile)

    if skipped:
        console.print(f"[yellow]Skipped seasons without weekly data: {skipped}[/yellow]")


if __name__ == "__main__":
    app()
