"""Export MLB moneyline predictions for the LineLens Sports dashboard."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import pandas as pd
import typer
from rich.console import Console

from src.shared.export_utils import safe_float, write_json_and_js
from src.shared.modeling import clean_numeric_frame, confidence_bucket, read_table
from src.shared.paths import MODEL_DIR, PREDICTIONS_DIR, PROCESSED_DIR, ensure_project_dirs, resolve_project_path
from src.shared.version import APP_NAME, APP_VERSION

console = Console()
app = typer.Typer(help="Export MLB moneyline predictions.")
DEFAULT_FEATURES = PROCESSED_DIR / "mlb" / "mlb_features_2021_2025.csv"
DEFAULT_MODEL = MODEL_DIR / "mlb_moneyline_model.joblib"


def _payload(games: list[dict], model_type: str, target: str, *, real_data: bool, reason: str | None = None) -> dict:
    return {
        "metadata": {
            "sport": "MLB",
            "app": APP_NAME,
            "version": APP_VERSION,
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "model_type": model_type,
            "target": target,
            "row_count": len(games),
            "real_data": real_data,
            "mode": "real" if real_data else "missing",
            "reason": reason,
            "odds_status": "Optional odds API hooks only; no odds provider required.",
        },
        "games": games,
    }


def _result(row: pd.Series) -> str:
    if pd.isna(row.get("home_score")) or pd.isna(row.get("away_score")):
        return "Pending"
    return "Home won" if float(row["home_score"]) > float(row["away_score"]) else "Away won"


def _model_result(row: pd.Series) -> str:
    if pd.isna(row.get("home_win")):
        return "Pending"
    picked_home = (row.get("home_win_probability") or 0) >= 0.5
    actual_home = int(row.get("home_win")) == 1
    if picked_home == actual_home:
        return "Win"
    return "Loss"


def _trend(row: pd.Series) -> dict:
    return {
        "labels": ["Win %", "Run diff", "Runs scored", "Runs allowed"],
        "home": [
            safe_float(row.get("home_team_recent_win_pct_7")),
            safe_float(row.get("home_run_diff_avg_7")),
            safe_float(row.get("home_runs_scored_avg_7")),
            safe_float(row.get("home_runs_allowed_avg_7")),
        ],
        "away": [
            safe_float(row.get("away_team_recent_win_pct_7")),
            safe_float(row.get("away_run_diff_avg_7")),
            safe_float(row.get("away_runs_scored_avg_7")),
            safe_float(row.get("away_runs_allowed_avg_7")),
        ],
    }


def _score_games(df: pd.DataFrame, model_path: Path, limit: Optional[int]) -> list[dict]:
    import joblib

    artifact = joblib.load(model_path)
    feature_cols = artifact["features"]
    model = artifact["model"]
    if df.empty:
        return []

    df = df.sort_values(["game_date", "game_id"]).tail(limit or len(df)).copy()
    probabilities = model.predict_proba(clean_numeric_frame(df, feature_cols))[:, 1]
    df["home_win_probability"] = probabilities

    games = []
    for _, row in df.iterrows():
        home_prob = safe_float(row.get("home_win_probability"))
        away_prob = None if home_prob is None else 1 - home_prob
        home = row.get("home_team")
        away = row.get("away_team")
        games.append(
            {
                "sport": "MLB",
                "season": int(row.get("season")),
                "game_date": str(pd.to_datetime(row.get("game_date")).date()),
                "game_id": str(row.get("game_id")),
                "home": home,
                "away": away,
                "home_display": row.get("home_display") or home,
                "away_display": row.get("away_display") or away,
                "home_score": safe_float(row.get("home_score")),
                "away_score": safe_float(row.get("away_score")),
                "status": row.get("status") or "Pending",
                "home_win_probability": home_prob,
                "away_win_probability": away_prob,
                "model_pick": home if (home_prob or 0) >= 0.5 else away,
                "confidence": confidence_bucket(home_prob),
                "home_probable_pitcher": row.get("home_probable_pitcher") or "TBD",
                "away_probable_pitcher": row.get("away_probable_pitcher") or "TBD",
                "home_pitcher_summary": "Probable pitcher shown when supplied by MLB schedule. Model remains team-level.",
                "away_pitcher_summary": "Probable pitcher shown when supplied by MLB schedule. Model remains team-level.",
                "pitcher_edge": "Team-level model",
                "pitcher_data_status": "available" if row.get("home_probable_pitcher") or row.get("away_probable_pitcher") else "missing",
                "moneyline_home": None,
                "moneyline_away": None,
                "market_implied_home": None,
                "moneyline_home_open": None,
                "moneyline_home_current": None,
                "moneyline_home_close": None,
                "moneyline_away_open": None,
                "moneyline_away_current": None,
                "moneyline_away_close": None,
                "edge": None,
                "movement_label": "Line movement unavailable. Add odds provider later.",
                "clv": None,
                "clv_label": "CLV unavailable",
                "result": _result(row),
                "model_result": _model_result(row),
                "actual_result": _result(row),
                "prediction_mode": "model",
                "trend": _trend(row),
            }
        )
    return games


@app.command()
def export(
    features_file: Optional[Path] = typer.Option(None, help="Feature table from feature_builder_mlb.py."),
    model_file: Optional[Path] = typer.Option(None, help="Model artifact from train_model_mlb.py."),
    output_file: Path = typer.Option(PREDICTIONS_DIR / "mlb_predictions.json", help="JSON output."),
    js_out: Path = typer.Option(PREDICTIONS_DIR / "mlb_predictions.js", help="JS output."),
    season: Optional[int] = typer.Option(None, help="Optional season filter."),
    limit: Optional[int] = typer.Option(30, help="Max games to export."),
    write_empty_if_missing: bool = typer.Option(True, help="Write an empty no-real-export payload when data/model files are missing."),
) -> None:
    ensure_project_dirs()
    features_path = resolve_project_path(features_file or DEFAULT_FEATURES)
    model_path = resolve_project_path(model_file or DEFAULT_MODEL)
    json_path = resolve_project_path(output_file)
    js_path = resolve_project_path(js_out)

    if not features_path.exists() or not model_path.exists():
        if not write_empty_if_missing:
            missing = [str(path) for path in [features_path, model_path] if not path.exists()]
            raise typer.BadParameter(f"Missing MLB export inputs: {missing}")
        missing = [str(path) for path in [features_path, model_path] if not path.exists()]
        payload = _payload([], "missing_model_or_features", "home_win", real_data=False, reason=f"No real export has been generated yet. Missing: {missing}")
        write_json_and_js(payload, json_path, js_path, "__MLB_PREDICTIONS__")
        console.print("[yellow]MLB feature/model files missing; wrote empty no-real-export payload.[/yellow]")
        return

    df = read_table(features_path)
    df["game_date"] = pd.to_datetime(df["game_date"])
    if season is not None:
        df = df[df["season"] == season]
    if df.empty:
        payload = _payload([], "logistic_regression", "home_win", real_data=False, reason="No rows matched the export filters.")
        write_json_and_js(payload, json_path, js_path, "__MLB_PREDICTIONS__")
        console.print("[yellow]No MLB rows matched the export filters; wrote an empty payload.[/yellow]")
        return

    games = _score_games(df, model_path, limit)

    payload = _payload(games, "logistic_regression", "home_win", real_data=True)
    payload["metadata"]["prediction_mode"] = "model"
    write_json_and_js(payload, json_path, js_path, "__MLB_PREDICTIONS__")
    console.print(f"[green]Wrote[/green] {len(games)} MLB predictions -> {json_path}")


@app.command("backtest")
def backtest(
    features_file: Optional[Path] = typer.Option(None, help="Historical feature table from feature_builder_mlb.py."),
    model_file: Optional[Path] = typer.Option(None, help="Model artifact from train_model_mlb.py."),
    output_file: Path = typer.Option(PREDICTIONS_DIR / "mlb_backtest_predictions.json", help="JSON output."),
    js_out: Path = typer.Option(PREDICTIONS_DIR / "mlb_backtest_predictions.js", help="JS output."),
    season: int = typer.Option(2025, help="Holdout season to export."),
    limit: Optional[int] = typer.Option(None, help="Max games to export."),
) -> None:
    """Export scored historical MLB holdout games for offseason/backtest UI states."""

    ensure_project_dirs()
    features_path = resolve_project_path(features_file or DEFAULT_FEATURES)
    model_path = resolve_project_path(model_file or DEFAULT_MODEL)
    if not features_path.exists() or not model_path.exists():
        missing = [str(path) for path in [features_path, model_path] if not path.exists()]
        raise typer.BadParameter(f"Missing MLB backtest inputs: {missing}")

    df = read_table(features_path)
    df["game_date"] = pd.to_datetime(df["game_date"])
    df = df[(df["season"] == season) & df["home_win"].notna()].copy()
    games = _score_games(df, model_path, limit)
    payload = _payload(games, "logistic_regression_backtest", "home_win", real_data=True)
    payload["metadata"]["prediction_mode"] = "historical_backtest"
    payload["metadata"]["test_season"] = season
    payload["metadata"]["mode"] = "real"
    write_json_and_js(payload, resolve_project_path(output_file), resolve_project_path(js_out), "__MLB_BACKTEST_PREDICTIONS__")
    console.print(f"[green]Wrote[/green] {len(games)} MLB backtest predictions -> {resolve_project_path(output_file)}")


if __name__ == "__main__":
    app()
