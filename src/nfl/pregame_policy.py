"""Feature policy shared by training and current NFL publication."""
from __future__ import annotations

import re

FEATURE_POLICY_VERSION = 2


def is_pregame_feature(name: str) -> bool:
    if name in {"spread_line", "rest_diff"}:
        return True
    if not name.startswith(("home_", "away_")):
        return False
    field = name.split("_", 1)[1]
    # Current-game weekly player totals are outcomes, not pregame predictors.
    if field.startswith("weekly_"):
        return bool(re.search(r"_l[1-9]\d*$", field))
    if field in {"score", "cover", "cover_probability", "cover_margin", "team_x", "team_y"}:
        return False
    return field in {
        "games_played", "team_rest", "opponent_rest", "team_rest_diff",
        "team_short_week", "team_long_rest", "travel_miles", "road_trip_b2b",
        "team_moneyline", "opponent_moneyline", "team_spread_odds", "opponent_spread_odds",
        "inj_out", "inj_doubtful", "inj_questionable", "inj_total", "inj_practice_dnp",
        "inj_practice_limited", "inj_practice_full",
    } or bool(re.fullmatch(r"(pf|pa|point_diff|win_pct|off_epa|off_success|pass_rate|def_epa|def_success)_l[1-9]\d*", field))
