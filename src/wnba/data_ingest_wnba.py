"""Ingest real WNBA schedule/results data from ESPN's public scoreboard feed.

The feed is used as the stable, keyless first source for the WNBA MVP. It
contains official schedule/status/score rows, but not a complete advanced
box-score history. The downstream feature report records that limitation
instead of inventing unavailable player or efficiency fields.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore[assignment,misc]

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "wnba"
URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard"
try:
    LOCAL_TZ = ZoneInfo("America/Toronto") if ZoneInfo else timezone.utc
except Exception:  # pragma: no cover - Windows environments may lack tzdata
    LOCAL_TZ = timezone.utc


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def safe_score(value: Any) -> int | None:
    try:
        return None if value in (None, "") else int(float(value))
    except (TypeError, ValueError):
        return None


def date_only(value: Any) -> str | None:
    text = str(value or "")
    if len(text) < 10 or text[4] != "-":
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            return parsed.astimezone(LOCAL_TZ).date().isoformat()
    except ValueError:
        pass
    return text[:10]


def status_calendar_date(value: Any, season: int) -> str | None:
    match = re.match(r"\s*(\d{1,2})/(\d{1,2})\s*-", str(value or ""))
    if not match:
        return None
    month, day = (int(part) for part in match.groups())
    return f"{season:04d}-{month:02d}-{day:02d}"


def normalize_event(event: dict[str, Any], season: int) -> dict[str, Any] | None:
    competition = (event.get("competitions") or [{}])[0]
    competitors = {row.get("homeAway"): row for row in competition.get("competitors", [])}
    home_row = competitors.get("home") or {}
    away_row = competitors.get("away") or {}
    home_team = home_row.get("team") or {}
    away_team = away_row.get("team") or {}
    home = str(home_team.get("abbreviation") or "").upper()
    away = str(away_team.get("abbreviation") or "").upper()
    if not home or not away:
        return None
    status_type = (competition.get("status") or {}).get("type") or event.get("status", {}).get("type", {}) or {}
    status = status_type.get("shortDetail") or status_type.get("description") or "Scheduled"
    completed = bool(status_type.get("completed") or "final" in str(status).lower())
    home_score = safe_score(home_row.get("score"))
    away_score = safe_score(away_row.get("score"))
    result = None
    if completed and home_score is not None and away_score is not None:
        result = 1 if home_score > away_score else 0
    game_date = date_only(event.get("date") or competition.get("date"))
    local_status_date = status_calendar_date(status, season)
    if local_status_date:
        game_date = local_status_date
    return {
        "sport": "WNBA",
        "season": season,
        "game_date": game_date,
        "game_id": str(event.get("id") or competition.get("id") or ""),
        "home": home,
        "away": away,
        "home_display": home_team.get("displayName") or home_team.get("name") or home,
        "away_display": away_team.get("displayName") or away_team.get("name") or away,
        "venue": (competition.get("venue") or {}).get("fullName") or (competition.get("venue") or {}).get("name"),
        "status": "Final" if completed else status,
        "completed": completed,
        "home_score": home_score,
        "away_score": away_score,
        "home_win": result,
        "source": "ESPN WNBA scoreboard",
    }


def fetch(season: int | None = None, target_date: str | None = None) -> dict[str, Any]:
    if requests is None:
        raise RuntimeError("requests package is required for WNBA ingestion")
    params: dict[str, Any] = {"limit": 1000}
    if target_date:
        params["dates"] = target_date.replace("-", "")
        season_value = int(target_date[:4])
    else:
        season_value = int(season or date.today().year)
        params["dates"] = str(season_value)
    response = requests.get(URL, params=params, timeout=30, headers={"User-Agent": "LineLensSports/1.0"})
    response.raise_for_status()
    payload = response.json()
    games = [row for event in payload.get("events", []) if (row := normalize_event(event, season_value))]
    return {
        "metadata": {
            "sport": "WNBA",
            "season": season_value,
            "generated_at": utc_now(),
            "source": "ESPN WNBA scoreboard",
            "source_url": URL,
            "real_data": True,
            "row_count": len(games),
            "query": params,
        },
        "games": games,
    }


def load_cached(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write(payload: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def run_history(start_season: int, end_season: int, force: bool = False) -> int:
    failures: list[str] = []
    for season in range(start_season, end_season + 1):
        path = RAW_DIR / f"schedule_{season}.json"
        if path.exists() and not force:
            print(f"WNBA {season}: cached {path}")
            continue
        try:
            payload = fetch(season=season)
            write(payload, path)
            print(f"WNBA {season}: fetched {len(payload['games'])} rows")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{season}: {type(exc).__name__}: {exc}")
            if path.exists():
                print(f"WNBA {season}: fetch failed; keeping cache {path}")
            else:
                print(f"WNBA {season}: {type(exc).__name__}: {exc}", file=sys.stderr)
    if failures and not any((RAW_DIR / f"schedule_{season}.json").exists() for season in range(start_season, end_season + 1)):
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    history = subparsers.add_parser("history")
    history.add_argument("--start-season", type=int, required=True)
    history.add_argument("--end-season", type=int, required=True)
    history.add_argument("--force", action="store_true")
    current = subparsers.add_parser("current")
    current.add_argument("--date", default=date.today().isoformat())
    args = parser.parse_args()
    if args.command == "history":
        return run_history(args.start_season, args.end_season, args.force)
    try:
        payload = fetch(target_date=args.date)
    except Exception as exc:  # noqa: BLE001 - refresh orchestrator converts this to a visible degraded status.
        print(f"WNBA source unavailable: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    path = RAW_DIR / f"schedule_{args.date[:10]}.json"
    write(payload, path)
    print(f"WNBA current: fetched {len(payload['games'])} rows to {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
