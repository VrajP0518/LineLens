"""Build leakage-safe WNBA player prop rows from real player box-score exports.

The scoreboard export does not contain player stats. This module therefore
expects validated player box-score JSON files under data/raw/wnba and writes
empty, explicit exports when those files are not available.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "wnba"
PROCESSED_DIR = ROOT / "data" / "processed" / "wnba"
DATASET = PROCESSED_DIR / "wnba_player_props.csv"
CURRENT_DATASET = PROCESSED_DIR / "wnba_player_props_current.csv"
SUMMARY_JSON = ROOT / "data" / "reports" / "wnba_prop_dataset_summary.json"
SUMMARY_JS = ROOT / "data" / "reports" / "wnba_prop_dataset_summary.js"
SOURCE_URL = "https://www.kaggle.com/datasets/nicholascoplandunc/wnba-player-and-team-stats-2003-2025-120k-rows"
CURRENT_SOURCE_URL = "https://site.web.api.espn.com/apis/site/v2/sports/basketball/wnba/summary"

STATS = ("points", "rebounds", "assists")
FIELDNAMES = [
    "sport", "season", "game_date", "game_id", "player_id", "player_name", "team", "opponent",
    "home", "minutes", "points", "rebounds", "assists", "rest_days", "back_to_back",
    "season_avg_points_pre", "season_avg_rebounds_pre", "season_avg_assists_pre",
    "rolling_3_points", "rolling_5_points", "rolling_10_points",
    "rolling_3_rebounds", "rolling_5_rebounds", "rolling_10_rebounds",
    "rolling_3_assists", "rolling_5_assists", "rolling_10_assists",
    "minutes_rolling_5", "sample_size_pre", "source",
]


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def number(value: Any) -> float | None:
    try:
        return None if value in (None, "", "-", "N/A") else float(value)
    except (TypeError, ValueError):
        return None


def first(row: dict[str, Any], keys: Iterable[str]) -> Any:
    for key in keys:
        if row.get(key) not in (None, ""):
            return row[key]
    return None


def flatten(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        rows: list[dict[str, Any]] = []
        for item in payload:
            rows.extend(flatten(item))
        return rows
    if not isinstance(payload, dict):
        return []
    if any(key in payload for key in ("points", "pts", "rebounds", "reb", "assists", "ast")) and (payload.get("player_id") or payload.get("athlete") or payload.get("player")):
        return [payload]
    rows: list[dict[str, Any]] = []
    for value in payload.values():
        rows.extend(flatten(value))
    return rows


def source_rows(paths: list[Path], include_dnp: bool = False) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in paths:
        if path.suffix.lower() == ".csv":
            with path.open("r", encoding="utf-8", newline="") as handle:
                source_rows_for_file = list(csv.DictReader(handle))
        else:
            source_rows_for_file = flatten(load(path))
        for row in source_rows_for_file:
            player = row.get("player") if isinstance(row.get("player"), dict) else row.get("athlete") if isinstance(row.get("athlete"), dict) else {}
            team = row.get("team") if isinstance(row.get("team"), dict) else {}
            opponent = row.get("opponent") if isinstance(row.get("opponent"), dict) else {}
            dnp_value = first(row, ("did_not_play", "dnp", "inactive"))
            is_dnp = str(dnp_value or "").strip().lower() in {"true", "1", "yes", "y"}
            normalized = {
                "sport": "WNBA",
                "season": first(row, ("season",)) or first(player, ("season",)),
                "game_date": first(row, ("game_date", "date", "event_date")),
                "game_id": first(row, ("game_id", "event_id", "id")) or first(row, ("event_id",)),
                "player_id": first(row, ("player_id", "athlete_id")) or first(player, ("id", "uid", "guid")),
                "player_name": first(row, ("player_name", "athlete_display_name", "name", "display_name")) or first(player, ("displayName", "fullName", "name")),
                "team": first(row, ("team_abbreviation", "team_code", "team")) or first(team, ("abbreviation", "shortDisplayName", "displayName")),
                "opponent": first(row, ("opponent_abbreviation", "opponent_code", "opponent")) or first(opponent, ("abbreviation", "shortDisplayName", "displayName")),
                "home": first(row, ("home", "home_away")),
                "minutes": number(first(row, ("minutes", "min"))),
                "points": number(first(row, ("points", "pts"))),
                "rebounds": number(first(row, ("rebounds", "reb"))),
                "assists": number(first(row, ("assists", "ast"))),
                "did_not_play": is_dnp,
                "source": str(path.relative_to(ROOT)),
            }
            if is_dnp:
                if not include_dnp:
                    continue
                normalized["minutes"] = 0.0
                for stat in STATS:
                    normalized[stat] = normalized[stat] if normalized[stat] is not None else 0.0
            if normalized.get("player_id") and normalized.get("game_date") and normalized.get("game_id") and all(normalized.get(stat) is not None for stat in STATS):
                rows.append(normalized)
    return rows


def rolling(values: deque[float], count: int) -> float | None:
    sample = list(values)[-count:]
    return round(mean(sample), 4) if sample else None


def build(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    history: dict[str, dict[str, Any]] = defaultdict(lambda: {stat: deque(maxlen=20) for stat in STATS} | {"minutes": deque(maxlen=5), "dates": []})
    output: list[dict[str, Any]] = []
    for row in sorted(rows, key=lambda item: (str(item.get("player_id")), str(item.get("game_date")), str(item.get("game_id")))):
        key = str(row["player_id"])
        previous = history[key]
        prior_dates = previous["dates"]
        rest_days = None
        if prior_dates:
            try:
                rest_days = (datetime.fromisoformat(str(row["game_date"])[:10]) - datetime.fromisoformat(str(prior_dates[-1])[:10])).days
            except ValueError:
                rest_days = None
        item = {key: row.get(key) for key in FIELDNAMES if key in row}
        item.update({"sport": "WNBA", "sample_size_pre": len(previous["dates"]), "rest_days": rest_days, "back_to_back": rest_days == 1 if rest_days is not None else None})
        for stat in STATS:
            item[f"season_avg_{stat}_pre"] = rolling(previous[stat], 20)
            for count in (3, 5, 10):
                item[f"rolling_{count}_{stat}"] = rolling(previous[stat], count)
        item["minutes_rolling_5"] = rolling(previous["minutes"], 5)
        output.append({field: item.get(field) for field in FIELDNAMES})
        for stat in STATS:
            previous[stat].append(float(row[stat]))
        if row.get("minutes") is not None:
            previous["minutes"].append(float(row["minutes"]))
        prior_dates.append(row["game_date"])
    return output


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("all", "current"), default="all")
    args = parser.parse_args()
    paths = sorted(RAW_DIR.glob("player_boxscore*.json")) + sorted(RAW_DIR.glob("boxscore*.json")) + sorted(RAW_DIR.glob("player_boxscore*.csv")) + sorted(RAW_DIR.glob("boxscore*.csv"))
    raw = source_rows(paths)
    rows = build(raw)
    target = CURRENT_DATASET if args.mode == "current" else DATASET
    write_csv(target, rows)
    summary = {
        "metadata": {"sport": "WNBA", "generated_at": now(), "target_markets": list(STATS), "real_data": bool(rows), "data_quality": "real_player_boxscores" if rows else "player_boxscore_source_missing", "source_url": SOURCE_URL, "source_urls": [SOURCE_URL, CURRENT_SOURCE_URL], "source_note": "Historical public WNBA player-game export attributed to SportsDataverse/wehoop plus current completed-game ESPN summaries; verify source terms before redistribution.", "leakage_policy": "rolling values exclude the game being predicted"},
        "row_count": len(rows), "source_files": [str(path.relative_to(ROOT)) for path in paths], "feature_count": len(FIELDNAMES) - len(STATS),
    }
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    SUMMARY_JS.write_text(f"window.__WNBA_PROP_DATASET_SUMMARY__ = {json.dumps(summary, indent=2)};\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
