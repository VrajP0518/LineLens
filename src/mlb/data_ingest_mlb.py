"""Download and cache free-first MLB data for LineLens Sports."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Optional

import pandas as pd
import requests
import typer
from rich.console import Console

from src.shared.paths import RAW_DIR, ensure_project_dirs, resolve_project_path

console = Console()
app = typer.Typer(help="Download MLB data and cache it under data/raw/mlb.")
MLB_RAW_DIR = RAW_DIR / "mlb"
SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule"


def _write_json(payload: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    console.print(f"[green]Saved[/green] {path}")


def _fetch_schedule_payload(
    season: int,
    *,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    game_type: str = "R",
) -> dict:
    params = {
        "sportId": 1,
        "season": season,
        "gameType": game_type,
        "hydrate": "probablePitcher,team,linescore",
    }
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date

    response = requests.get(SCHEDULE_URL, params=params, timeout=45)
    response.raise_for_status()
    return response.json()


@app.command("schedule")
def schedule(
    season: int = typer.Option(date.today().year, help="MLB season to cache."),
    start_date: Optional[str] = typer.Option(None, help="YYYY-MM-DD start date. Defaults to season start."),
    end_date: Optional[str] = typer.Option(None, help="YYYY-MM-DD end date. Defaults to season end."),
    output_file: Optional[Path] = typer.Option(None, help="Optional output JSON path."),
) -> None:
    """Cache MLB public schedule data, including scores and probable pitchers when supplied."""

    ensure_project_dirs()
    console.print(f"Fetching MLB schedule for {season}...")
    payload = _fetch_schedule_payload(season, start_date=start_date, end_date=end_date)

    out = output_file or MLB_RAW_DIR / f"schedule_{season}.json"
    out = resolve_project_path(out)
    _write_json(payload, out)


@app.command("history")
def history(
    start_season: int = typer.Option(2021, help="First historical MLB season to cache."),
    end_season: int = typer.Option(2025, help="Last historical MLB season to cache."),
    start_month_day: str = typer.Option("03-01", help="Season cache start as MM-DD."),
    end_month_day: str = typer.Option("11-30", help="Season cache end as MM-DD."),
    force: bool = typer.Option(False, "--force", "--overwrite", help="Re-download files that already exist."),
) -> None:
    """Cache regular-season MLB schedules/results for leakage-safe backtests."""

    ensure_project_dirs()
    if end_season < start_season:
        raise typer.BadParameter("end-season must be greater than or equal to start-season.")

    for season in range(start_season, end_season + 1):
        out = resolve_project_path(MLB_RAW_DIR / f"history_{season}.json")
        if out.exists() and not force:
            console.print(f"[cyan]Using cached[/cyan] {out}")
            continue

        start_date = f"{season}-{start_month_day}"
        end_date = f"{season}-{end_month_day}"
        console.print(f"Fetching MLB regular-season history for {season} ({start_date} to {end_date})...")
        payload = _fetch_schedule_payload(season, start_date=start_date, end_date=end_date, game_type="R")
        _write_json(payload, out)


@app.command("team-stats")
def team_stats(
    season: int = typer.Option(date.today().year - 1, help="Season for pybaseball team batting/pitching stats."),
) -> None:
    """Cache pybaseball team-level stat tables for later feature work."""

    ensure_project_dirs()
    try:
        from pybaseball import team_batting, team_pitching
    except ImportError as exc:
        raise typer.BadParameter("pybaseball is not installed. Run pip install -r requirements.txt.") from exc

    console.print(f"Fetching pybaseball team batting/pitching for {season}...")
    batting = team_batting(season)
    pitching = team_pitching(season)
    batting_path = MLB_RAW_DIR / f"team_batting_{season}.csv"
    pitching_path = MLB_RAW_DIR / f"team_pitching_{season}.csv"
    pd.DataFrame(batting).to_csv(batting_path, index=False)
    pd.DataFrame(pitching).to_csv(pitching_path, index=False)
    console.print(f"[green]Saved[/green] {batting_path}")
    console.print(f"[green]Saved[/green] {pitching_path}")


if __name__ == "__main__":
    app()
