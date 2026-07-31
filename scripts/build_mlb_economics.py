"""Build the offline MLB payroll-versus-wins export.

The builder deliberately does not invent payroll values. It accepts the small
LineLens payroll schema or local Lahman-compatible Salaries.csv/Teams.csv
files, then joins those inputs to completed MLB results already available in
LineLens. The browser can therefore ship a useful setup state before a user
adds a licensed or locally sourced payroll file.
"""

from __future__ import annotations

import csv
import json
import math
import re
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "mlb_economics"
OUTPUT_JSON = OUTPUT_DIR / "mlb_economics.json"
OUTPUT_JS = OUTPUT_DIR / "mlb_economics.js"

TEAM_CONTEXT = {
    "ARI": ("Arizona Diamondbacks", "NL", "NL West"), "ATL": ("Atlanta Braves", "NL", "NL East"),
    "BAL": ("Baltimore Orioles", "AL", "AL East"), "BOS": ("Boston Red Sox", "AL", "AL East"),
    "CHC": ("Chicago Cubs", "NL", "NL Central"), "CWS": ("Chicago White Sox", "AL", "AL Central"),
    "CIN": ("Cincinnati Reds", "NL", "NL Central"), "CLE": ("Cleveland Guardians", "AL", "AL Central"),
    "COL": ("Colorado Rockies", "NL", "NL West"), "DET": ("Detroit Tigers", "AL", "AL Central"),
    "HOU": ("Houston Astros", "AL", "AL West"), "KC": ("Kansas City Royals", "AL", "AL Central"),
    "LAA": ("Los Angeles Angels", "AL", "AL West"), "LAD": ("Los Angeles Dodgers", "NL", "NL West"),
    "MIA": ("Miami Marlins", "NL", "NL East"), "MIL": ("Milwaukee Brewers", "NL", "NL Central"),
    "MIN": ("Minnesota Twins", "AL", "AL Central"), "NYM": ("New York Mets", "NL", "NL East"),
    "NYY": ("New York Yankees", "AL", "AL East"), "OAK": ("Athletics", "AL", "AL West"),
    "PHI": ("Philadelphia Phillies", "NL", "NL East"), "PIT": ("Pittsburgh Pirates", "NL", "NL Central"),
    "SD": ("San Diego Padres", "NL", "NL West"), "SEA": ("Seattle Mariners", "AL", "AL West"),
    "SF": ("San Francisco Giants", "NL", "NL West"), "STL": ("St. Louis Cardinals", "NL", "NL Central"),
    "TB": ("Tampa Bay Rays", "AL", "AL East"), "TEX": ("Texas Rangers", "AL", "AL West"),
    "TOR": ("Toronto Blue Jays", "AL", "AL East"), "WSH": ("Washington Nationals", "NL", "NL East"),
}

ALIASES = {
    "ANA": "LAA", "ATH": "OAK", "CHA": "CWS", "CHN": "CHC", "FLO": "MIA", "KCA": "KC",
    "LAN": "LAD", "MON": "WSH", "NYA": "NYY", "NYN": "NYM", "SDN": "SD", "SFN": "SF",
    "SLN": "STL", "TBA": "TB", "WAS": "WSH", "OAKLAND": "OAK", "ATHLETICS": "OAK",
}
NAME_ALIASES = {re.sub(r"[^a-z0-9]", "", value[0].lower()): key for key, value in TEAM_CONTEXT.items()}
for alias, code in ALIASES.items():
    NAME_ALIASES[re.sub(r"[^a-z0-9]", "", alias.lower())] = code


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def number(value: Any) -> float | None:
    if value is None or str(value).strip() in {"", "-", "NA", "N/A", "null", "None"}:
        return None
    try:
        parsed = float(str(value).replace(",", "").replace("$", "").strip())
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def integer(value: Any) -> int | None:
    parsed = number(value)
    return None if parsed is None else int(parsed)


def season_value(value: Any) -> int | None:
    parsed = integer(value)
    return parsed if parsed and 1870 < parsed < 2200 else None


def team_id(value: Any, fallback_name: Any = "") -> str:
    raw = str(value or "").strip().upper()
    raw = ALIASES.get(raw, raw)
    if raw in TEAM_CONTEXT:
        return raw
    compact = re.sub(r"[^a-z0-9]", "", str(fallback_name or raw).lower())
    return NAME_ALIASES.get(compact, raw)


def team_context(code: str, name: str = "") -> tuple[str, str, str]:
    known = TEAM_CONTEXT.get(code)
    if known:
        return known
    return (name or code, "", "")


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def first_existing(paths: Iterable[Path]) -> Path | None:
    return next((path for path in paths if path.exists()), None)


def result_row(season: int, code: str, name: str, wins: int, losses: int, games: int | None = None, **extra: Any) -> dict[str, Any]:
    known_name, league, division = team_context(code, name)
    games_played = games if games is not None else wins + losses
    win_pct = wins / games_played if games_played else None
    return {
        "season": season,
        "team_id": code,
        "team_name": name or known_name,
        "league": extra.get("league") or league,
        "division": extra.get("division") or division,
        "wins": wins,
        "losses": losses,
        "games_played": games_played,
        "win_pct": round(win_pct, 6) if win_pct is not None else None,
        "postseason_result": extra.get("postseason_result"),
        "source": extra.get("source", "LineLens MLB results"),
    }


def load_custom_results() -> tuple[dict[tuple[int, str], dict[str, Any]], str | None]:
    path = first_existing([
        OUTPUT_DIR / "team_results.csv",
        OUTPUT_DIR / "results.csv",
        ROOT / "data" / "raw" / "mlb" / "team_results.csv",
    ])
    if not path:
        return {}, None
    rows: dict[tuple[int, str], dict[str, Any]] = {}
    for raw in read_csv(path):
        season = season_value(raw.get("season") or raw.get("yearID"))
        code = team_id(raw.get("team_id") or raw.get("team") or raw.get("teamID"), raw.get("team_name"))
        wins = integer(raw.get("wins") or raw.get("W"))
        losses = integer(raw.get("losses") or raw.get("L"))
        if season is None or not code or wins is None or losses is None:
            continue
        rows[(season, code)] = result_row(
            season, code, raw.get("team_name", ""), wins, losses,
            integer(raw.get("games_played") or raw.get("G")),
            league=raw.get("league"), division=raw.get("division"),
            postseason_result=raw.get("postseason_result"), source=str(path.relative_to(ROOT)),
        )
    return rows, str(path.relative_to(ROOT))


def load_lahman_results() -> tuple[dict[tuple[int, str], dict[str, Any]], str | None]:
    path = first_existing([
        OUTPUT_DIR / "Teams.csv",
        ROOT / "data" / "raw" / "mlb" / "Teams.csv",
        ROOT / "data" / "raw" / "mlb" / "lahman" / "Teams.csv",
    ])
    if not path:
        return {}, None
    rows: dict[tuple[int, str], dict[str, Any]] = {}
    for raw in read_csv(path):
        season = season_value(raw.get("yearID") or raw.get("season"))
        code = team_id(raw.get("teamID") or raw.get("team_id"), raw.get("name"))
        wins = integer(raw.get("W") or raw.get("wins"))
        losses = integer(raw.get("L") or raw.get("losses"))
        if season is None or not code or wins is None or losses is None:
            continue
        postseason = None
        if raw.get("WSWin") == "Y":
            postseason = "World Series champion"
        elif raw.get("LgWin") == "Y":
            postseason = "League champion"
        elif raw.get("DivWin") == "Y":
            postseason = "Division champion"
        elif raw.get("WCWin") == "Y":
            postseason = "Wild card"
        elif any(raw.get(key) for key in ("DivWin", "WCWin", "LgWin", "WSWin")):
            postseason = "Missed playoffs"
        rows[(season, code)] = result_row(
            season, code, raw.get("name", ""), wins, losses, integer(raw.get("G") or raw.get("games_played")),
            league=raw.get("lgID"), division=raw.get("divID"), postseason_result=postseason,
            source=str(path.relative_to(ROOT)),
        )
    return rows, str(path.relative_to(ROOT))


def load_line_lens_results() -> tuple[dict[tuple[int, str], dict[str, Any]], str | None, str | None]:
    path = ROOT / "data" / "predictions" / "mlb_predictions.json"
    payload = read_json(path)
    generated_at = (payload.get("metadata") or {}).get("generated_at")
    games = payload.get("games") or []
    aggregate: dict[tuple[int, str], dict[str, Any]] = {}
    seen_games: set[str] = set()
    for game in games:
        status = str(game.get("status") or "").lower()
        if "final" not in status and (number(game.get("home_score")) is None or number(game.get("away_score")) is None):
            continue
        game_key = str(game.get("game_id") or f"{game.get('game_date')}:{game.get('away')}:{game.get('home')}")
        if game_key in seen_games:
            continue
        seen_games.add(game_key)
        season = season_value(game.get("season") or str(game.get("game_date", ""))[:4])
        if season is None:
            continue
        away, home = team_id(game.get("away"), game.get("away_display")), team_id(game.get("home"), game.get("home_display"))
        away_score, home_score = number(game.get("away_score")), number(game.get("home_score"))
        if away_score is None or home_score is None or away == home:
            continue
        for code, name, won in (
            (away, game.get("away_display", ""), away_score > home_score),
            (home, game.get("home_display", ""), home_score > away_score),
        ):
            key = (season, code)
            current = aggregate.setdefault(key, result_row(season, code, name, 0, 0, source="data/predictions/mlb_predictions.json"))
            if won:
                current["wins"] += 1
            else:
                current["losses"] += 1
            current["games_played"] += 1
            current["win_pct"] = round(current["wins"] / current["games_played"], 6)
    return aggregate, "data/predictions/mlb_predictions.json" if aggregate else None, generated_at


def load_results() -> tuple[dict[tuple[int, str], dict[str, Any]], dict[str, Any]]:
    custom, custom_source = load_custom_results()
    lahman, lahman_source = load_lahman_results()
    live, live_source, generated_at = load_line_lens_results()
    results = dict(lahman)
    results.update(custom)
    for key, value in live.items():
        if key not in results:
            results[key] = value
    return results, {
        "custom": custom_source,
        "lahman": lahman_source,
        "line_lens": live_source,
        "generated_at": generated_at,
    }


def load_payroll() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    custom_path = first_existing([
        OUTPUT_DIR / "payroll.csv",
        ROOT / "data" / "raw" / "mlb" / "payroll.csv",
    ])
    rows: list[dict[str, Any]] = []
    source = None
    if custom_path:
        source = str(custom_path.relative_to(ROOT))
        for raw in read_csv(custom_path):
            season = season_value(raw.get("season"))
            code = team_id(raw.get("team_id") or raw.get("team"), raw.get("team_name"))
            payroll = number(raw.get("payroll"))
            if season is None or not code or payroll is None or payroll <= 0:
                continue
            name, league, division = team_context(code, raw.get("team_name", ""))
            adjusted = number(raw.get("inflation_adjusted_payroll") or raw.get("payroll_adjusted"))
            rows.append({
                "season": season, "team_id": code, "team_name": raw.get("team_name") or name,
                "league": raw.get("league") or league, "division": raw.get("division") or division,
                "payroll": payroll, "payroll_adjusted": adjusted, "payroll_basis": raw.get("payroll_basis") or "nominal",
                "payroll_source": raw.get("payroll_source") or source, "payroll_as_of": raw.get("payroll_as_of") or None,
            })
        return rows, {"source": source, "format": "LineLens payroll schema"}

    salaries_path = first_existing([
        OUTPUT_DIR / "Salaries.csv",
        ROOT / "data" / "raw" / "mlb" / "Salaries.csv",
        ROOT / "data" / "raw" / "mlb" / "lahman" / "Salaries.csv",
    ])
    if salaries_path:
        grouped: dict[tuple[int, str], float] = defaultdict(float)
        for raw in read_csv(salaries_path):
            season = season_value(raw.get("yearID") or raw.get("season"))
            code = team_id(raw.get("teamID") or raw.get("team_id"))
            salary = number(raw.get("salary") or raw.get("payroll"))
            if season is not None and code and salary is not None and salary > 0:
                grouped[(season, code)] += salary
        source = str(salaries_path.relative_to(ROOT))
        for (season, code), payroll in sorted(grouped.items()):
            name, league, division = team_context(code)
            rows.append({
                "season": season, "team_id": code, "team_name": name, "league": league, "division": division,
                "payroll": round(payroll, 2), "payroll_adjusted": None, "payroll_basis": "nominal",
                "payroll_source": "Lahman Salaries.csv", "payroll_as_of": f"{season}-12-31",
            })
        return rows, {"source": source, "format": "Lahman Salaries.csv"}

    return [], {"source": None, "format": None}


def build_export() -> dict[str, Any]:
    results, result_meta = load_results()
    payroll, payroll_meta = load_payroll()
    joined: list[dict[str, Any]] = []
    for salary in payroll:
        result = results.get((salary["season"], salary["team_id"]), {})
        games = result.get("games_played")
        wins = result.get("wins")
        win_pct = result.get("win_pct")
        is_current = salary["season"] == date.today().year
        complete = games is not None and games >= 162
        projected_wins = round(win_pct * 162, 2) if is_current and win_pct is not None and not complete else None
        joined.append({
            **salary,
            "wins": wins,
            "losses": result.get("losses"),
            "games_played": games,
            "win_pct": win_pct,
            "projected_wins": projected_wins,
            "is_current_season": is_current,
            "season_complete": complete,
            "postseason_result": result.get("postseason_result"),
            "results_source": result.get("source"),
        })
    seasons = sorted({row["season"] for row in joined})
    complete_rows = sum(1 for row in joined if row.get("wins") is not None)
    as_of_values = sorted({str(row["payroll_as_of"]) for row in joined if row.get("payroll_as_of")})
    if not payroll:
        setup_state = "payroll_required"
    elif not complete_rows:
        setup_state = "results_required"
    elif complete_rows < 2:
        setup_state = "insufficient_joined_rows"
    else:
        setup_state = "ready"
    metadata = {
        "app": "LineLens Sports",
        "generated_at": utc_now(),
        "real_data": bool(payroll),
        "data_available": setup_state == "ready",
        "setup_state": setup_state,
        "payroll_status": "available" if payroll else "setup_required",
        "results_status": "available" if results else "setup_required",
        "payroll_source": payroll_meta["source"],
        "payroll_format": payroll_meta["format"],
        "payroll_snapshot_date": as_of_values[-1] if as_of_values else None,
        "results_source": result_meta,
        "season_coverage": seasons,
        "payroll_rows": len(payroll),
        "joined_rows": len(joined),
        "limitations": [
            "Payroll is only shown when supplied by the local schema or Lahman-compatible source.",
            "Correlation does not establish causation; roster construction, injuries, development, schedule strength, and payroll definitions are not fully captured.",
            "Current-season projected wins use current win percentage multiplied by 162 and are labeled projections.",
        ],
    }
    return {"metadata": metadata, "rows": joined}


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = build_export()
    OUTPUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    OUTPUT_JS.write_text(f"window.__MLB_ECONOMICS__ = {json.dumps(payload, separators=(',', ':'))};\n", encoding="utf-8")
    meta = payload["metadata"]
    print(f"MLB economics export: {meta['setup_state']} | payroll rows={meta['payroll_rows']} | joined rows={meta['joined_rows']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
