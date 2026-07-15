"""Fetch real completed WNBA player box scores from ESPN for a season."""

from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.wnba.data_ingest_wnba import normalize_event

RAW_DIR = ROOT / "data" / "raw" / "wnba"
SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard"
SUMMARY_URL = "https://site.web.api.espn.com/apis/site/v2/sports/basketball/wnba/summary"


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def get_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    target = f"{url}?{urlencode(params or {})}"
    request = Request(target, headers={"User-Agent": "LineLensSports/1.0"})
    with urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("ESPN returned a non-object payload")
    return payload


def completed_events(season: int) -> list[dict[str, Any]]:
    payload = get_json(SCOREBOARD_URL, {"dates": str(season), "limit": 1000})
    events: list[dict[str, Any]] = []
    for event in payload.get("events", []) or []:
        normalized = normalize_event(event, season)
        if normalized and normalized.get("completed"):
            events.append(event)
    return events


def stat_block(group: dict[str, Any]) -> dict[str, Any] | None:
    for block in group.get("statistics", []) or []:
        keys = {str(key) for key in block.get("keys", []) or []}
        if {"minutes", "points", "rebounds", "assists"}.issubset(keys):
            return block
    return None


def number(value: Any) -> float | None:
    try:
        return None if value in (None, "", "-", "N/A") else float(value)
    except (TypeError, ValueError):
        return None


def player_rows(event: dict[str, Any]) -> list[dict[str, Any]]:
    event_id = str(event.get("id") or "")
    summary = get_json(SUMMARY_URL, {"event": event_id})
    normalized = normalize_event(event, int(str(event.get("date") or "0000")[:4])) or {}
    groups = summary.get("boxscore", {}).get("players", []) or []
    teams = [group.get("team", {}) for group in groups]
    rows: list[dict[str, Any]] = []
    for group in groups:
        team = group.get("team", {}) or {}
        team_id = str(team.get("id") or "")
        opponent = next((other for other in teams if str(other.get("id") or "") != team_id), {})
        block = stat_block(group)
        if not block:
            continue
        keys = [str(key) for key in block.get("keys", []) or []]
        for athlete in block.get("athletes", []) or []:
            identity = athlete.get("athlete", {}) or {}
            values = athlete.get("stats", []) or []
            stats = dict(zip(keys, values))
            rows.append({
                "sport": "WNBA",
                "season": normalized.get("season"),
                "game_date": normalized.get("game_date"),
                "game_id": event_id,
                "player_id": identity.get("id"),
                "player_name": identity.get("displayName") or identity.get("fullName"),
                "team": team.get("abbreviation"),
                "opponent": opponent.get("abbreviation"),
                "home": next((item.get("homeAway") for item in summary.get("boxscore", {}).get("teams", []) or [] if str((item.get("team") or {}).get("id")) == team_id), None),
                "minutes": number(stats.get("minutes")),
                "points": number(stats.get("points")),
                "rebounds": number(stats.get("rebounds")),
                "assists": number(stats.get("assists")),
                "did_not_play": bool(athlete.get("didNotPlay")),
                "source": "ESPN WNBA summary",
            })
    return rows


def main() -> int:
    season = 2026
    output = RAW_DIR / f"player_boxscore_{season}.json"
    events = completed_events(season)
    rows: list[dict[str, Any]] = []
    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(player_rows, event): str(event.get("id")) for event in events}
        for future in as_completed(futures):
            event_id = futures[future]
            try:
                rows.extend(future.result())
            except Exception as error:  # noqa: BLE001 - retain successful games and report failed IDs.
                failures.append(f"{event_id}: {type(error).__name__}")
    rows.sort(key=lambda row: (str(row.get("game_date")), str(row.get("game_id")), str(row.get("player_id"))))
    payload = {
        "metadata": {"sport": "WNBA", "season": season, "generated_at": now(), "source": "ESPN WNBA summary", "source_url": SUMMARY_URL, "real_data": bool(rows), "completed_events": len(events), "failed_events": failures},
        "players": rows,
    }
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "completed_events": len(events), "player_rows": len(rows), "failed_events": len(failures)}, indent=2))
    return 0 if rows or not events else 1


if __name__ == "__main__":
    raise SystemExit(main())
