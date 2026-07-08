"""Optional odds provider helpers.

Core LineLens data refresh works without odds. If ODDS_API_KEY is missing,
these helpers return a clean unavailable status instead of raising.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


SPORT_KEYS = {
    "NFL": "americanfootball_nfl",
    "MLB": "baseball_mlb",
}


def load_dotenv_if_present() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass
class OddsResult:
    status: str
    message: str
    provider: str
    enabled: bool
    data: list[dict[str, Any]]


def odds_config_status() -> dict[str, Any]:
    load_dotenv_if_present()
    provider = os.getenv("ODDS_PROVIDER") or os.getenv("MLB_ODDS_PROVIDER") or "the_odds_api"
    key_present = bool(os.getenv("ODDS_API_KEY"))
    return {
        "provider": provider,
        "enabled": provider == "the_odds_api" and key_present,
        "key_present": key_present,
        "region": os.getenv("ODDS_REGION", "us"),
        "markets": os.getenv("ODDS_MARKETS", "h2h,spreads,totals"),
        "sports": os.getenv("ODDS_SPORTS", "MLB,NFL"),
        "timeout_seconds": os.getenv("ODDS_TIMEOUT_SECONDS", "8"),
    }


def fetch_odds(sport: str) -> OddsResult:
    load_dotenv_if_present()
    config = odds_config_status()
    provider = str(config["provider"])
    if provider != "the_odds_api":
        return OddsResult("unavailable", f"Odds provider '{provider}' is not supported yet.", provider, False, [])
    api_key = os.getenv("ODDS_API_KEY")
    if not api_key:
        return OddsResult(
            "missing_key",
            "Odds unavailable - add ODDS_API_KEY to enable moneyline/spread/line movement data.",
            provider,
            False,
            [],
        )

    sport_key = SPORT_KEYS.get(sport.upper())
    if not sport_key:
        return OddsResult("unsupported_sport", f"No odds sport key configured for {sport}.", provider, False, [])

    params = {
        "apiKey": api_key,
        "regions": config["region"],
        "markets": config["markets"],
        "oddsFormat": "american",
    }
    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds?" + urlencode(params)
    try:
        timeout = max(3.0, float(config.get("timeout_seconds") or 8))
        request = Request(url, headers={"User-Agent": "LineLensSports/1.0"})
        with urlopen(request, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
        return OddsResult("success", f"Fetched {len(data)} odds events from The Odds API.", provider, True, data)
    except TimeoutError as exc:
        return OddsResult("timeout", f"Odds fetch timed out after {config.get('timeout_seconds', '8')} seconds: {exc}", provider, True, [])
    except Exception as exc:  # noqa: BLE001
        return OddsResult("failed", f"Odds fetch failed: {type(exc).__name__}: {exc}", provider, True, [])
