"""Export MLB moneyline predictions with explanations and tracking logs."""

from __future__ import annotations

from datetime import datetime, timezone
import json
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
TRACKING_LOG_JSON = Path("data/tracking/model_predictions_log.json")
TRACKING_LOG_JS = Path("data/tracking/model_predictions_log.js")

FACTOR_DEFS = [
    ("Recent run differential", "run_diff_14_diff", "home_run_diff_avg_14", "away_run_diff_avg_14", True),
    ("Short-term form", "win_pct_7_diff", "home_win_pct_7", "away_win_pct_7", True),
    ("Month-long form", "win_pct_30_diff", "home_win_pct_30", "away_win_pct_30", True),
    ("Runs scored trend", "runs_scored_7_diff", "home_runs_scored_avg_7", "away_runs_scored_avg_7", True),
    ("Runs allowed trend", "runs_allowed_7_diff", "home_runs_allowed_avg_7", "away_runs_allowed_avg_7", False),
    ("Starting pitcher proxy", "pitcher_runs_allowed_diff", "home_pitcher_runs_allowed_avg", "away_pitcher_runs_allowed_avg", True),
    ("Pitcher team-win proxy", "pitcher_win_pct_diff", "home_pitcher_team_win_pct", "away_pitcher_team_win_pct", True),
    ("Rest advantage", "rest_diff", "home_rest_days", "away_rest_days", True),
    ("Schedule fatigue", "schedule_fatigue_diff", "home_6_games_in_7_days", "away_6_games_in_7_days", True),
    ("Travel fatigue", "travel_km_diff", "home_travel_km_from_previous_game", "away_travel_km_from_previous_game", True),
    ("Home/away split", "home_split_advantage", "home_team_home_win_pct_30", "away_team_away_win_pct_30", True),
    ("Volatility edge", "volatility_diff", "home_runs_scored_std_7", "away_runs_scored_std_7", False),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _payload(games: list[dict], model_type: str, target: str, *, real_data: bool, reason: str | None = None, metadata: dict | None = None) -> dict:
    meta = {
        "sport": "MLB",
        "app": APP_NAME,
        "version": APP_VERSION,
        "generated_at": utc_now(),
        "model_type": model_type,
        "target": target,
        "row_count": len(games),
        "real_data": real_data,
        "mode": "real" if real_data else "missing",
        "reason": reason,
        "odds_status": "Optional odds API hooks only; no odds provider required.",
    }
    if metadata:
        meta.update(metadata)
    return {"metadata": meta, "games": games}


def _result(row: pd.Series) -> str:
    if not _is_final_status(row.get("status")):
        return "Pending"
    if pd.isna(row.get("home_score")) or pd.isna(row.get("away_score")):
        return "Pending"
    return "Home won" if float(row["home_score"]) > float(row["away_score"]) else "Away won"


def _model_result(row: pd.Series) -> str:
    if not _is_final_status(row.get("status")):
        return "Pending"
    if pd.isna(row.get("home_win")):
        return "Pending"
    picked_home = (row.get("home_win_probability") or 0) >= 0.5
    actual_home = int(row.get("home_win")) == 1
    return "Win" if picked_home == actual_home else "Loss"


def _is_final_status(status: str | None) -> bool:
    normalized = str(status or "").lower()
    return "final" in normalized or "completed" in normalized


def _trend(row: pd.Series) -> dict:
    return {
        "labels": ["Win %", "Run diff", "Runs scored", "Runs allowed"],
        "home": [
            safe_float(row.get("home_win_pct_7")),
            safe_float(row.get("home_run_diff_avg_7")),
            safe_float(row.get("home_runs_scored_avg_7")),
            safe_float(row.get("home_runs_allowed_avg_7")),
        ],
        "away": [
            safe_float(row.get("away_win_pct_7")),
            safe_float(row.get("away_run_diff_avg_7")),
            safe_float(row.get("away_runs_scored_avg_7")),
            safe_float(row.get("away_runs_allowed_avg_7")),
        ],
    }


def _load_json(path: Path) -> dict:
    path = resolve_project_path(path)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _feature_importance_map(artifact: dict) -> dict[str, float]:
    rows = artifact.get("top_global_features") or []
    if not rows:
        return {}
    max_value = max((safe_float(row.get("importance")) or 0 for row in rows), default=1) or 1
    return {row["feature"]: (safe_float(row.get("importance")) or 0) / max_value for row in rows}


def _factor(row: pd.Series, label: str, feature: str, home_feature: str, away_feature: str, positive_supports_home: bool, importances: dict[str, float]) -> dict | None:
    value = safe_float(row.get(feature))
    if value is None:
        return None
    home_value = safe_float(row.get(home_feature))
    away_value = safe_float(row.get(away_feature))
    if home_value is None and away_value is None:
        return None
    supports_home = value >= 0 if positive_supports_home else value <= 0
    importance = importances.get(feature, 0.25)
    strength = min(1.0, abs(value) * max(importance, 0.08))
    return {
        "label": label,
        "feature": feature,
        "home_value": home_value,
        "away_value": away_value,
        "impact": "supports_home" if supports_home else "supports_away",
        "strength": round(float(strength), 4),
    }


def _explanation(row: pd.Series, home: str, away: str, home_prob: float | None, importances: dict[str, float], features: list[str]) -> dict:
    factors = []
    for item in FACTOR_DEFS:
        factor = _factor(row, *item, importances=importances)
        if factor:
            factors.append(factor)
    factors = sorted(factors, key=lambda item: item["strength"], reverse=True)[:5]
    picked_home = (home_prob or 0) >= 0.5
    picked = home if picked_home else away
    if factors:
        top_labels = ", ".join(factor["label"].lower() for factor in factors[:3])
        summary = f"Model leans {picked} with top factors around {top_labels}."
    else:
        summary = f"Model leans {picked}; detailed factor values are limited for this row."
    feature_missing_count = int(sum(pd.isna(row.get(feature)) for feature in features if feature in row.index))
    pitcher_status = row.get("pitcher_data_status") or "missing"
    travel_available = safe_float(row.get("estimated_travel_km")) is not None
    fatigue_available = safe_float(row.get("schedule_fatigue_diff")) is not None
    return {
        "summary": summary,
        "top_factors": factors,
        "data_quality": {
            "pitcher_data": pitcher_status,
            "travel_data": "estimated" if travel_available else "missing",
            "schedule_fatigue": "used" if fatigue_available else "missing",
            "feature_missing_count": feature_missing_count,
            "explanation_type": "local feature values with global model driver weights",
        },
    }


def _pitcher_summary(row: pd.Series, side: str) -> str:
    starts = safe_float(row.get(f"{side}_pitcher_prior_starts"))
    runs_allowed = safe_float(row.get(f"{side}_pitcher_runs_allowed_avg"))
    recent = safe_float(row.get(f"{side}_pitcher_recent_runs_allowed_avg_3"))
    if starts is None or starts <= 0:
        return "Probable pitcher listed, but prior-start proxy data is unavailable."
    pieces = [f"{int(starts)} prior starts"]
    if runs_allowed is not None:
        pieces.append(f"{runs_allowed:.2f} runs allowed avg")
    if recent is not None:
        pieces.append(f"{recent:.2f} recent RA avg")
    return "Pitcher proxy: " + ", ".join(pieces) + "."


def _score_games(df: pd.DataFrame, model_path: Path, limit: Optional[int]) -> tuple[list[dict], dict]:
    import joblib

    artifact = joblib.load(model_path)
    feature_cols = artifact["features"]
    model = artifact["model"]
    metadata = artifact.get("metadata", {})
    importances = _feature_importance_map(artifact)
    if df.empty:
        return [], artifact

    df = df.sort_values(["game_date", "game_id"]).tail(limit or len(df)).copy()
    probabilities = model.predict_proba(clean_numeric_frame(df, feature_cols))[:, 1]
    df["home_win_probability"] = probabilities

    games = []
    for _, row in df.iterrows():
        home_prob = safe_float(row.get("home_win_probability"))
        away_prob = None if home_prob is None else 1 - home_prob
        home = row.get("home_team")
        away = row.get("away_team")
        pitcher_status = row.get("pitcher_data_status") or ("proxy" if row.get("home_probable_pitcher") or row.get("away_probable_pitcher") else "missing")
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
                "confidence_score": None if home_prob is None else max(home_prob, 1 - home_prob),
                "home_probable_pitcher": row.get("home_probable_pitcher") or "TBD",
                "away_probable_pitcher": row.get("away_probable_pitcher") or "TBD",
                "home_pitcher_summary": _pitcher_summary(row, "home"),
                "away_pitcher_summary": _pitcher_summary(row, "away"),
                "pitcher_edge": "Pitcher proxy edge" if pitcher_status in {"proxy", "partial_proxy"} else "Pitcher proxy missing",
                "pitcher_data_status": pitcher_status,
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
                "model_name": metadata.get("model_name") or artifact.get("model_name"),
                "model_id": metadata.get("model_id"),
                "top_factor_label": (_explanation(row, home, away, home_prob, importances, feature_cols)["top_factors"] or [{}])[0].get("label"),
                "data_quality": {
                    "pitcher_data": pitcher_status,
                    "travel_data": "estimated" if safe_float(row.get("estimated_travel_km")) is not None else "missing",
                    "schedule_fatigue": "used" if safe_float(row.get("schedule_fatigue_diff")) is not None else "missing",
                },
                "feature_values": {
                    "run_diff_14_diff": safe_float(row.get("run_diff_14_diff")),
                    "win_pct_14_diff": safe_float(row.get("win_pct_14_diff")),
                    "pitcher_runs_allowed_diff": safe_float(row.get("pitcher_runs_allowed_diff")),
                    "schedule_fatigue_diff": safe_float(row.get("schedule_fatigue_diff")),
                    "travel_km_diff": safe_float(row.get("travel_km_diff")),
                    "home_split_advantage": safe_float(row.get("home_split_advantage")),
                },
                "explanation": _explanation(row, home, away, home_prob, importances, feature_cols),
                "trend": _trend(row),
            }
        )
    return games, artifact


def _append_prediction_log(games: list[dict], artifact: dict, generated_at: str) -> None:
    payload = _load_json(TRACKING_LOG_JSON) or {"metadata": {}, "predictions": []}
    rows = payload.get("predictions", [])
    by_id = {row.get("prediction_id"): row for row in rows}
    model_id = artifact.get("metadata", {}).get("model_id") or f"mlb_moneyline_{APP_VERSION}"
    model_name = artifact.get("metadata", {}).get("model_name") or artifact.get("model_name")
    generated_day = generated_at[:10]
    appended = 0
    updated = 0
    for game in games:
        if game.get("prediction_mode") != "model":
            continue
        prediction_id = f"MLB-{game.get('game_id')}-{model_id}-{generated_day}"
        row = {
            "prediction_id": prediction_id,
            "sport": "MLB",
            "model_version": APP_VERSION,
            "model_id": model_id,
            "model_name": model_name,
            "generated_at": generated_at,
            "game_id": game.get("game_id"),
            "season": game.get("season"),
            "game_date": game.get("game_date"),
            "home": game.get("home"),
            "away": game.get("away"),
            "model_pick": game.get("model_pick"),
            "home_win_probability": game.get("home_win_probability"),
            "away_win_probability": game.get("away_win_probability"),
            "confidence": game.get("confidence_score"),
            "confidence_label": game.get("confidence"),
            "prediction_mode": "model",
            "status_at_prediction": game.get("status"),
            "result_status": "pending" if game.get("result") == "Pending" else "scored",
            "actual_winner": game.get("home") if game.get("result") == "Home won" else game.get("away") if game.get("result") == "Away won" else None,
            "model_result": game.get("model_result", "Pending").lower(),
        }
        existing = by_id.get(prediction_id)
        if existing is None:
            rows.append(row)
            by_id[prediction_id] = row
            appended += 1
        else:
            old_prob = safe_float(existing.get("home_win_probability"))
            new_prob = safe_float(row.get("home_win_probability"))
            result_changed = existing.get("model_result") in {None, "pending", "Pending"} and row.get("model_result") != "pending"
            probability_changed = old_prob is None or new_prob is None or abs(old_prob - new_prob) >= 0.002
            if result_changed or probability_changed:
                existing_result = str(existing.get("model_result", "")).lower()
                if existing_result in {"win", "loss", "push", "no_result"} and row.get("model_result") == "pending":
                    for key in (
                        "result_status",
                        "actual_winner",
                        "model_result",
                        "home_score",
                        "away_score",
                        "scored_at",
                    ):
                        if key in existing:
                            row[key] = existing[key]
                existing.update(row)
                updated += 1
    payload = {
        "metadata": {
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": utc_now(),
            "real_data": True,
            "appended": appended,
            "updated": updated,
            "row_count": len(rows),
        },
        "predictions": rows,
    }
    write_json_and_js(payload, resolve_project_path(TRACKING_LOG_JSON), resolve_project_path(TRACKING_LOG_JS), "__MODEL_PREDICTIONS_LOG__")


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
        payload = _payload([], "trained_model", "home_win", real_data=False, reason="No rows matched the export filters.")
        write_json_and_js(payload, json_path, js_path, "__MLB_PREDICTIONS__")
        console.print("[yellow]No MLB rows matched the export filters; wrote an empty payload.[/yellow]")
        return

    games, artifact = _score_games(df, model_path, limit)
    artifact_meta = artifact.get("metadata", {})
    generated_at = utc_now()
    payload = _payload(
        games,
        artifact_meta.get("model_name") or artifact.get("model_name") or "trained_model",
        "home_win",
        real_data=True,
        metadata={
            "generated_at": generated_at,
            "prediction_mode": "model",
            "model_name": artifact_meta.get("model_name") or artifact.get("model_name"),
            "model_id": artifact_meta.get("model_id"),
            "feature_count": len(artifact.get("features", [])),
        },
    )
    write_json_and_js(payload, json_path, js_path, "__MLB_PREDICTIONS__")
    if json_path.name == "mlb_predictions.json":
        _append_prediction_log(games, artifact, generated_at)
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
    games, artifact = _score_games(df, model_path, limit)
    artifact_meta = artifact.get("metadata", {})
    payload = _payload(
        games,
        f"{artifact_meta.get('model_name') or artifact.get('model_name') or 'trained_model'}_backtest",
        "home_win",
        real_data=True,
        metadata={
            "prediction_mode": "historical_backtest",
            "test_season": season,
            "model_name": artifact_meta.get("model_name") or artifact.get("model_name"),
            "model_id": artifact_meta.get("model_id"),
            "feature_count": len(artifact.get("features", [])),
        },
    )
    payload["metadata"]["mode"] = "real"
    write_json_and_js(payload, resolve_project_path(output_file), resolve_project_path(js_out), "__MLB_BACKTEST_PREDICTIONS__")
    console.print(f"[green]Wrote[/green] {len(games)} MLB backtest predictions -> {resolve_project_path(output_file)}")


if __name__ == "__main__":
    app()
