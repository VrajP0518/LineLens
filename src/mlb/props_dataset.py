"""Build leakage-safe MLB player-game rows for prop research models.

The builder consumes only explicitly supplied real player-game exports under
``data/raw/mlb``. It never turns team schedules into player statistics.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "mlb"
PROCESSED_DIR = ROOT / "data" / "processed" / "mlb"
DATASET = PROCESSED_DIR / "mlb_player_props.csv"
CURRENT_DATASET = PROCESSED_DIR / "mlb_player_props_current.csv"
SUMMARY_JSON = ROOT / "data" / "reports" / "mlb_prop_dataset_summary.json"
SUMMARY_JS = ROOT / "data" / "reports" / "mlb_prop_dataset_summary.js"
TARGETS = ("pitcher_strikeouts", "batter_hits", "batter_total_bases")
BASE_FIELDS = ["sport", "season", "game_date", "game_id", "player_id", "player_name", "team", "opponent", "home", "player_role", *TARGETS, "plate_appearances", "innings_pitched", "source"]
FEATURES = ["home", "season_avg_pre", "rolling_3", "rolling_5", "rolling_10", "sample_size_pre", "plate_appearances_pre", "innings_pitched_pre", "rest_days"]


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def number(value: Any) -> float | None:
    try:
        return None if value in (None, "", "-", "N/A") else float(value)
    except (TypeError, ValueError):
        return None


def first(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if row.get(key) not in (None, ""):
            return row[key]
    return None


def load_rows(path: Path) -> list[dict[str, Any]]:
    try:
        if path.suffix.lower() == ".csv":
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                return list(csv.DictReader(handle))
        if path.suffix.lower() == ".parquet":
            import pandas as pd
            return pd.read_parquet(path).to_dict(orient="records")
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("players", "player_games", "rows", "data"):
                if isinstance(payload.get(key), list):
                    return payload[key]
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        pass
    return []


def source_rows(paths: list[Path]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for path in paths:
        for raw in load_rows(path):
            row = {"sport": "MLB", "season": first(raw, "season"), "game_date": first(raw, "game_date", "date", "event_date"), "game_id": first(raw, "game_id", "event_id", "id"), "player_id": first(raw, "player_id", "athlete_id"), "player_name": first(raw, "player_name", "name", "display_name"), "team": first(raw, "team", "team_abbreviation"), "opponent": first(raw, "opponent", "opponent_abbreviation"), "home": first(raw, "home", "home_away"), "player_role": first(raw, "player_role", "role", "position_group"), "plate_appearances": number(first(raw, "plate_appearances", "pa")), "innings_pitched": number(first(raw, "innings_pitched", "ip")), "source": str(path.relative_to(ROOT))}
            for target in TARGETS:
                row[target] = number(first(raw, target))
            if not row["player_id"] or not row["player_name"] or not row["game_date"] or not row["game_id"]:
                continue
            if not any(row[target] is not None for target in TARGETS):
                continue
            output.append(row)
    return output


def build(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    states: dict[tuple[str, str], dict[str, Any]] = defaultdict(lambda: {"values": deque(maxlen=20), "dates": deque(maxlen=20), "pa": deque(maxlen=20), "ip": deque(maxlen=20)})
    output: list[dict[str, Any]] = []
    for row in sorted(rows, key=lambda item: (str(item.get("game_date")), str(item.get("game_id")), str(item.get("player_id")))):
        targets = [target for target in TARGETS if row.get(target) is not None]
        for target in targets:
            state = states[(str(row["player_id"]), target)]
            rest = None
            if state["dates"]:
                try:
                    rest = (datetime.fromisoformat(str(row["game_date"])[:10]) - datetime.fromisoformat(str(state["dates"][-1])[:10])).days
                except ValueError:
                    rest = None
            item = dict(row)
            item.update({"target_stat": target, "target_value": row[target], "season_avg_pre": mean(state["values"]) if state["values"] else None, "rolling_3": mean(list(state["values"])[-3:]) if state["values"] else None, "rolling_5": mean(list(state["values"])[-5:]) if state["values"] else None, "rolling_10": mean(list(state["values"])[-10:]) if state["values"] else None, "sample_size_pre": len(state["dates"]), "plate_appearances_pre": mean(state["pa"]) if state["pa"] else None, "innings_pitched_pre": mean(state["ip"]) if state["ip"] else None, "rest_days": rest})
            output.append(item)
            state["values"].append(float(row[target]))
            state["dates"].append(str(row["game_date"]))
            if row.get("plate_appearances") is not None:
                state["pa"].append(float(row["plate_appearances"]))
            if row.get("innings_pitched") is not None:
                state["ip"].append(float(row["innings_pitched"]))
    return output


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = BASE_FIELDS + ["target_stat", "target_value", *FEATURES]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows({field: row.get(field) for field in fields} for row in rows)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("all", "current"), default="all")
    args = parser.parse_args()
    paths = sorted(RAW_DIR.glob("player_game*.json")) + sorted(RAW_DIR.glob("player_game*.csv")) + sorted(RAW_DIR.glob("player_game*.parquet")) + sorted(RAW_DIR.glob("player_boxscore*.json")) + sorted(RAW_DIR.glob("player_boxscore*.csv")) + sorted(RAW_DIR.glob("player_boxscore*.parquet"))
    rows = build(source_rows(paths))
    target = CURRENT_DATASET if args.mode == "current" else DATASET
    write_csv(target, rows)
    summary = {"metadata": {"sport": "MLB", "generated_at": now(), "target_markets": list(TARGETS), "real_data": bool(rows), "data_quality": "real_player_games" if rows else "player_game_source_missing", "source_files": [str(path.relative_to(ROOT)) for path in paths], "leakage_policy": "rolling values exclude the game being predicted", "training_status": "manual_training_required"}, "row_count": len(rows), "feature_count": len(FEATURES), "source_files": [str(path.relative_to(ROOT)) for path in paths]}
    SUMMARY_JSON.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    SUMMARY_JS.write_text(f"window.__MLB_PROP_DATASET_SUMMARY__ = {json.dumps(summary, indent=2)};\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
