"""Build local MLB player-game parquet data from pybaseball Statcast rows.

The collector is explicit and resumable:
* raw Statcast responses are cached as local parquet chunks;
* only completed pitch events are aggregated into player-game rows;
* batter hits/total bases and pitcher strikeouts are derived from real events;
* no team schedule is converted into a player statistic.

This is a manual, user-triggered refresh. It is not called automatically at
app startup because a multi-season Statcast download can be large.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" / "mlb"
CHUNK_DIR = RAW_DIR / "statcast_chunks"
COMBINED_PARQUET = RAW_DIR / "player_game_pybaseball.parquet"
SUMMARY_JSON = ROOT / "data" / "reports" / "mlb_player_games_refresh.json"
SUMMARY_JS = ROOT / "data" / "reports" / "mlb_player_games_refresh.js"
SOURCE_URL = "https://pypi.org/project/pybaseball/2.0.0/"

HIT_EVENTS = {"single": 1, "double": 2, "triple": 3, "home_run": 4}
STRIKEOUT_EVENTS = {"strikeout", "strikeout_double_play"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def chunks(start: date, end: date, size: int) -> list[tuple[date, date]]:
    output: list[tuple[date, date]] = []
    cursor = start
    while cursor <= end:
        high = min(end, cursor + timedelta(days=max(1, size) - 1))
        output.append((cursor, high))
        cursor = high + timedelta(days=1)
    return output


def set_pybaseball_cache() -> None:
    cache_dir = RAW_DIR / "pybaseball_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("PYBASEBALL_CACHE", str(cache_dir))


def fetch_chunk(start: date, end: date, path: Path, force: bool) -> tuple[str, int]:
    if path.exists() and not force:
        try:
            import pandas as pd
            return "cached", int(len(pd.read_parquet(path)))
        except Exception:  # noqa: BLE001 - a corrupt cache is replaced below.
            path.unlink(missing_ok=True)
    set_pybaseball_cache()
    from pybaseball import statcast

    try:
        frame = statcast(str(start), str(end), verbose=False, parallel=False)
    except TypeError:  # pybaseball 2.0.0 does not expose every newer keyword.
        frame = statcast(str(start), str(end), verbose=False)
    if frame is None:
        frame = __import__("pandas").DataFrame()
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_parquet(path, index=False)
    return "downloaded", int(len(frame))


def text(value: Any) -> str:
    if value is None:
        return ""
    try:
        if value != value:  # NaN
            return ""
    except Exception:  # noqa: BLE001
        pass
    return str(value)


def name_map(ids: list[str]) -> dict[str, str]:
    if not ids:
        return {}
    try:
        set_pybaseball_cache()
        from pybaseball import playerid_reverse_lookup

        lookup = playerid_reverse_lookup(ids, key_type="mlbam")
        output: dict[str, str] = {}
        for _, row in lookup.iterrows():
            player_id = text(row.get("key_mlbam"))
            first = text(row.get("name_first")).strip()
            last = text(row.get("name_last")).strip()
            if player_id and (first or last):
                output[player_id] = " ".join(part for part in (first, last) if part).title()
        return output
    except Exception:  # noqa: BLE001 - unresolved IDs are excluded, never invented.
        return {}


def aggregate(frames: list[Any]) -> Any:
    import pandas as pd

    if not frames:
        return pd.DataFrame()
    frame = pd.concat(frames, ignore_index=True, sort=False)
    required = {"game_pk", "game_date", "at_bat_number", "events"}
    if not required.issubset(frame.columns):
        return pd.DataFrame()
    frame = frame.dropna(subset=["game_pk", "game_date", "at_bat_number"])
    frame["game_id"] = frame["game_pk"].astype(str)
    frame["event_name"] = frame["events"].fillna("").astype(str).str.lower()
    terminal = frame[frame["event_name"].ne("")].copy()
    if terminal.empty:
        return pd.DataFrame()
    terminal["game_date"] = pd.to_datetime(terminal["game_date"], errors="coerce").dt.strftime("%Y-%m-%d")
    terminal = terminal.dropna(subset=["game_date"])
    def column(frame: Any, name: str) -> Any:
        return frame[name].fillna("") if name in frame.columns else pd.Series("", index=frame.index)

    terminal["home_team"] = column(terminal, "home_team").astype(str)
    terminal["away_team"] = column(terminal, "away_team").astype(str)
    top = column(terminal, "inning_topbot").astype(str).str.lower().str.startswith("top")
    terminal["batter_team"] = terminal["away_team"].where(top, terminal["home_team"])
    terminal["batter_opponent"] = terminal["home_team"].where(top, terminal["away_team"])
    terminal["pitcher_team"] = terminal["home_team"].where(top, terminal["away_team"])
    terminal["pitcher_opponent"] = terminal["away_team"].where(top, terminal["home_team"])
    terminal["batter_home"] = (~top).map({True: "home", False: "away"})

    batter = terminal.dropna(subset=["batter"]).copy()
    batter["player_id"] = batter["batter"].astype(str)
    batter["player_name"] = column(batter, "player_name").astype(str)
    batter["hits_value"] = batter["event_name"].isin(HIT_EVENTS).astype(int)
    batter["total_bases_value"] = batter["event_name"].map(HIT_EVENTS).fillna(0).astype(int)
    batter_group = batter.groupby(["game_id", "game_date", "player_id", "player_name", "batter_team", "batter_opponent", "batter_home"], dropna=False)
    batter_rows = batter_group.agg(
        batter_hits=("hits_value", "sum"),
        batter_total_bases=("total_bases_value", "sum"),
        plate_appearances=("at_bat_number", "nunique"),
    ).reset_index()
    batter_rows["sport"] = "MLB"
    batter_rows["season"] = pd.to_datetime(batter_rows["game_date"]).dt.year
    batter_rows["team"] = batter_rows.pop("batter_team")
    batter_rows["opponent"] = batter_rows.pop("batter_opponent")
    batter_rows["home"] = batter_rows.pop("batter_home")
    batter_rows["player_role"] = "batter"
    batter_rows["pitcher_strikeouts"] = None
    batter_rows["innings_pitched"] = None

    pitcher = terminal.dropna(subset=["pitcher"]).copy()
    pitcher["player_id"] = pitcher["pitcher"].astype(str)
    pitcher_ids = sorted(set(pitcher["player_id"].tolist()))
    pitchers = pitcher.groupby(["game_id", "game_date", "player_id", "pitcher_team", "pitcher_opponent"], dropna=False)
    pitcher_rows = pitchers.agg(pitcher_strikeouts=("event_name", lambda values: int(values.isin(STRIKEOUT_EVENTS).sum()))).reset_index()
    pitcher_rows["player_name"] = pitcher_rows["player_id"].map(name_map(pitcher_ids))
    pitcher_rows = pitcher_rows[pitcher_rows["player_name"].notna() & pitcher_rows["player_name"].ne("")]
    pitcher_rows["sport"] = "MLB"
    pitcher_rows["season"] = pd.to_datetime(pitcher_rows["game_date"]).dt.year
    pitcher_rows["team"] = pitcher_rows.pop("pitcher_team")
    pitcher_rows["opponent"] = pitcher_rows.pop("pitcher_opponent")
    home_teams = terminal.groupby("game_id")["home_team"].first().to_dict()
    pitcher_rows["home"] = pitcher_rows.apply(lambda row: "home" if row["team"] == home_teams.get(row["game_id"]) else "away", axis=1)
    pitcher_rows["player_role"] = "pitcher"
    pitcher_rows["batter_hits"] = None
    pitcher_rows["batter_total_bases"] = None
    pitcher_rows["plate_appearances"] = None
    pitcher_rows["innings_pitched"] = None

    columns = ["sport", "season", "game_date", "game_id", "player_id", "player_name", "team", "opponent", "home", "player_role", "pitcher_strikeouts", "batter_hits", "batter_total_bases", "plate_appearances", "innings_pitched"]
    return pd.concat([batter_rows[columns], pitcher_rows[columns]], ignore_index=True).drop_duplicates(["game_id", "player_id", "player_role"])


def write_summary(payload: dict[str, Any]) -> None:
    SUMMARY_JSON.parent.mkdir(parents=True, exist_ok=True)
    text_payload = json.dumps(payload, indent=2)
    SUMMARY_JSON.write_text(text_payload + "\n", encoding="utf-8")
    SUMMARY_JS.write_text(f"window.__MLB_PLAYER_GAMES_REFRESH__ = {text_payload};\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-date", default="2023-03-30")
    parser.add_argument("--end-date", default=date.today().isoformat())
    parser.add_argument("--chunk-days", type=int, default=7)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    start = parse_date(args.start_date)
    end = parse_date(args.end_date)
    requested = chunks(start, end, args.chunk_days)
    if args.dry_run:
        print(json.dumps({"status": "dry_run", "source": SOURCE_URL, "chunks": len(requested), "start_date": str(start), "end_date": str(end)}, indent=2))
        return 0

    frames: list[Any] = []
    chunk_status: list[dict[str, Any]] = []
    for low, high in requested:
        path = CHUNK_DIR / f"statcast_{low:%Y%m%d}_{high:%Y%m%d}.parquet"
        status, rows = fetch_chunk(low, high, path, args.force)
        chunk_status.append({"path": str(path.relative_to(ROOT)), "start_date": str(low), "end_date": str(high), "status": status, "rows": rows})
        try:
            import pandas as pd
            frames.append(pd.read_parquet(path))
        except Exception:  # noqa: BLE001 - summary will show the failed chunk.
            continue
    output = aggregate(frames)
    COMBINED_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    output.to_parquet(COMBINED_PARQUET, index=False)
    summary = {"metadata": {"sport": "MLB", "generated_at": now(), "status": "success" if not output.empty else "no_player_rows", "real_data": not output.empty, "source": "pybaseball Statcast", "source_url": SOURCE_URL, "storage": "local parquet chunks and normalized player-game parquet", "targets": ["pitcher_strikeouts", "batter_hits", "batter_total_bases"], "note": "Pitch-level Statcast rows are aggregated only after real terminal events. Unresolved player IDs are excluded rather than named by inference."}, "row_count": int(len(output)), "source_chunks": chunk_status, "output": str(COMBINED_PARQUET.relative_to(ROOT))}
    write_summary(summary)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
