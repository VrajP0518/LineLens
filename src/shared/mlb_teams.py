"""MLB team normalization helpers used by schedules, features, and scoring."""

from __future__ import annotations

from typing import Any

MLB_TEAM_ID_TO_ABBREV = {
    108: "LAA",
    109: "AZ",
    110: "BAL",
    111: "BOS",
    112: "CHC",
    113: "CIN",
    114: "CLE",
    115: "COL",
    116: "DET",
    117: "HOU",
    118: "KC",
    119: "LAD",
    120: "WSH",
    121: "NYM",
    133: "ATH",
    134: "PIT",
    135: "SD",
    136: "SEA",
    137: "SF",
    138: "STL",
    139: "TB",
    140: "TEX",
    141: "TOR",
    142: "MIN",
    143: "PHI",
    144: "ATL",
    145: "CWS",
    146: "MIA",
    147: "NYY",
    158: "MIL",
}

MLB_TEAM_NAME_TO_ABBREV = {
    "arizona diamondbacks": "AZ",
    "athletics": "ATH",
    "atlanta braves": "ATL",
    "baltimore orioles": "BAL",
    "boston red sox": "BOS",
    "chicago cubs": "CHC",
    "chicago white sox": "CWS",
    "cincinnati reds": "CIN",
    "cleveland guardians": "CLE",
    "colorado rockies": "COL",
    "detroit tigers": "DET",
    "houston astros": "HOU",
    "kansas city royals": "KC",
    "los angeles angels": "LAA",
    "los angeles dodgers": "LAD",
    "miami marlins": "MIA",
    "milwaukee brewers": "MIL",
    "minnesota twins": "MIN",
    "new york mets": "NYM",
    "new york yankees": "NYY",
    "oakland athletics": "OAK",
    "philadelphia phillies": "PHI",
    "pittsburgh pirates": "PIT",
    "san diego padres": "SD",
    "san francisco giants": "SF",
    "seattle mariners": "SEA",
    "st. louis cardinals": "STL",
    "st louis cardinals": "STL",
    "tampa bay rays": "TB",
    "texas rangers": "TEX",
    "toronto blue jays": "TOR",
    "washington nationals": "WSH",
}

MLB_ABBREV_ALIASES = {
    "ARI": "AZ",
    "ATH": "ATH",
    "CHW": "CWS",
    "OAK": "ATH",
    "SDP": "SD",
    "SFG": "SF",
    "TBR": "TB",
    "WSN": "WSH",
}


def normalize_mlb_abbrev(value: Any) -> str:
    code = str(value or "").strip().upper()
    if not code:
        return "UNK"
    return MLB_ABBREV_ALIASES.get(code, code)


def mlb_team_abbreviation(team: dict[str, Any] | Any) -> str:
    info = team.get("team", team) if isinstance(team, dict) else {}
    team_id = info.get("id") if isinstance(info, dict) else None
    if team_id in MLB_TEAM_ID_TO_ABBREV:
        return MLB_TEAM_ID_TO_ABBREV[team_id]
    if isinstance(info, dict):
        for key in ("abbreviation", "teamCode", "fileCode"):
            if info.get(key):
                return normalize_mlb_abbrev(info[key])
        name = info.get("name")
        if name:
            mapped = MLB_TEAM_NAME_TO_ABBREV.get(str(name).strip().lower())
            if mapped:
                return mapped
            return normalize_mlb_abbrev(name)
    mapped = MLB_TEAM_NAME_TO_ABBREV.get(str(team or "").strip().lower())
    return mapped or normalize_mlb_abbrev(team)


def mlb_team_display_name(team: dict[str, Any] | Any) -> str:
    info = team.get("team", team) if isinstance(team, dict) else {}
    if isinstance(info, dict) and info.get("name"):
        return str(info["name"])
    return mlb_team_abbreviation(team)
