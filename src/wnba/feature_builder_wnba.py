"""Build leakage-safe WNBA team-form and Elo features from schedule results."""

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from src.shared.export_utils import write_json_and_js
from src.shared.paths import PROCESSED_DIR, RAW_DIR, ROOT
from src.shared.version import APP_VERSION

OUTPUT_DIR = PROCESSED_DIR / "wnba"
WNBA_RAW_DIR = RAW_DIR / "wnba"
SUMMARY_JSON = ROOT / "data" / "reports" / "wnba_feature_summary.json"
SUMMARY_JS = ROOT / "data" / "reports" / "wnba_feature_summary.js"


def files(start: int | None = None, end: int | None = None) -> list[Path]:
    paths = sorted(WNBA_RAW_DIR.glob("schedule_*.json"))
    selected = []
    for path in paths:
        try:
            label = path.stem.split("_")[-1]
            season = int(label[:4]) if len(label) >= 4 else int(label)
        except ValueError:
            continue
        if (start is None or season >= start) and (end is None or season <= end):
            selected.append(path)
    return selected


def load_games(paths: list[Path]) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for path in paths:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        rows.extend(payload.get("games") or [])
    if not rows:
        return pd.DataFrame()
    frame = pd.DataFrame(rows).drop_duplicates(subset=["game_id"], keep="last")
    frame["game_date"] = pd.to_datetime(frame["game_date"], errors="coerce")
    frame = frame.dropna(subset=["game_date", "home", "away"]).sort_values(["game_date", "game_id"])
    return frame.reset_index(drop=True)


def mean_or_none(values: deque[float]) -> float | None:
    return None if not values else float(sum(values) / len(values))


def build_frame(games: pd.DataFrame) -> pd.DataFrame:
    if games.empty:
        return games
    history: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "elo": 1500.0,
        "dates": deque(maxlen=10),
        "wins": deque(maxlen=10),
        "margins": deque(maxlen=10),
        "for": deque(maxlen=10),
        "against": deque(maxlen=10),
    })
    output: list[dict[str, Any]] = []
    for _, row in games.iterrows():
        home = str(row["home"]).upper()
        away = str(row["away"]).upper()
        home_state, away_state = history[home], history[away]
        game_date = row["game_date"].date()
        def rest_days(state: dict[str, Any]) -> int | None:
            return None if not state["dates"] else max(0, (game_date - state["dates"][-1]).days)
        home_rest, away_rest = rest_days(home_state), rest_days(away_state)
        home_elo, away_elo = float(home_state["elo"]), float(away_state["elo"])
        home_margin, away_margin = mean_or_none(home_state["margins"]), mean_or_none(away_state["margins"])
        home_for, away_for = mean_or_none(home_state["for"]), mean_or_none(away_state["for"])
        home_against, away_against = mean_or_none(home_state["against"]), mean_or_none(away_state["against"])
        home_win_pct = mean_or_none(home_state["wins"])
        away_win_pct = mean_or_none(away_state["wins"])
        home_score, away_score = row.get("home_score"), row.get("away_score")
        completed = bool(row.get("completed")) and pd.notna(home_score) and pd.notna(away_score)
        output.append({
            **row.to_dict(),
            "game_date": row["game_date"].date().isoformat(),
            "home_win": row.get("home_win") if completed else None,
            "home_elo": home_elo,
            "away_elo": away_elo,
            "elo_diff": home_elo - away_elo,
            "home_win_pct_10": home_win_pct,
            "away_win_pct_10": away_win_pct,
            "win_pct_diff": (home_win_pct - away_win_pct) if home_win_pct is not None and away_win_pct is not None else None,
            "home_margin_avg_10": home_margin,
            "away_margin_avg_10": away_margin,
            "margin_diff": (home_margin - away_margin) if home_margin is not None and away_margin is not None else None,
            "home_points_for_avg_10": home_for,
            "away_points_for_avg_10": away_for,
            "points_for_diff": (home_for - away_for) if home_for is not None and away_for is not None else None,
            "home_points_against_avg_10": home_against,
            "away_points_against_avg_10": away_against,
            "points_against_diff": (away_against - home_against) if home_against is not None and away_against is not None else None,
            "home_rest_days": home_rest,
            "away_rest_days": away_rest,
            "rest_diff": (home_rest - away_rest) if home_rest is not None and away_rest is not None else None,
            "home_b2b": int(home_rest == 1),
            "away_b2b": int(away_rest == 1),
            "home_court": 1.0,
        })
        if completed:
            result = 1 if float(home_score) > float(away_score) else 0
            margin = float(home_score) - float(away_score)
            expected = 1 / (1 + 10 ** ((away_elo - home_elo - 55) / 400))
            change = 20 * (result - expected)
            home_state["elo"] += change
            away_state["elo"] -= change
            for state, scored, allowed, win, margin_value in [
                (home_state, float(home_score), float(away_score), result, margin),
                (away_state, float(away_score), float(home_score), 1 - result, -margin),
            ]:
                state["dates"].append(game_date)
                state["wins"].append(float(win))
                state["margins"].append(margin_value)
                state["for"].append(scored)
                state["against"].append(allowed)
    return pd.DataFrame(output)


def write_frame(frame: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False)


def summary(frame: pd.DataFrame, start: int | None, end: int | None) -> dict[str, Any]:
    return {
        "metadata": {
            "sport": "WNBA",
            "app": "LineLens Sports",
            "version": APP_VERSION,
            "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "row_count": int(len(frame)),
            "completed_rows": int(frame["home_win"].notna().sum()) if not frame.empty else 0,
            "seasons": sorted({int(value) for value in frame.get("season", pd.Series(dtype=int)).dropna().unique()}),
            "history_start": start,
            "history_end": end,
            "data_quality": "score_only_team_form_elo",
            "advanced_stats_status": "unavailable_from_stable_keyless_history_source",
            "player_availability_status": "not_used",
            "leakage_policy": "pregame_rolling_state_and_elo_only",
        },
        "features": [
            "elo_diff", "win_pct_diff", "margin_diff", "points_for_diff", "points_against_diff",
            "rest_diff", "home_b2b", "away_b2b", "home_court",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    history = sub.add_parser("build-history")
    history.add_argument("--start-season", type=int, required=True)
    history.add_argument("--end-season", type=int, required=True)
    history.add_argument("--output-file", default="data/processed/wnba/wnba_features_all.csv")
    current = sub.add_parser("build-current")
    current.add_argument("--season", type=int, required=True)
    current.add_argument("--start-season", type=int, required=True)
    current.add_argument("--end-season", type=int, required=True)
    current.add_argument("--output-file", default="data/processed/wnba/wnba_current_features.csv")
    args = parser.parse_args()
    if args.command == "build-history":
        frame = build_frame(load_games(files(args.start_season, args.end_season)))
        path = ROOT / args.output_file
        write_frame(frame, path)
        write_json_and_js(summary(frame, args.start_season, args.end_season), SUMMARY_JSON, SUMMARY_JS, "__WNBA_FEATURE_SUMMARY__")
        print(f"WNBA features: {len(frame)} rows -> {path}")
        return 0 if not frame.empty else 1
    all_frame = build_frame(load_games(files(args.start_season, args.season)))
    current_frame = all_frame[all_frame["season"].astype(int) == args.season].copy() if not all_frame.empty else all_frame
    path = ROOT / args.output_file
    write_frame(current_frame, path)
    write_json_and_js(summary(all_frame, args.start_season, args.end_season), SUMMARY_JSON, SUMMARY_JS, "__WNBA_FEATURE_SUMMARY__")
    print(f"WNBA current features: {len(current_frame)} rows -> {path}")
    return 0 if not current_frame.empty else 1


if __name__ == "__main__":
    raise SystemExit(main())
