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
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SPORT_KEYS = {
    "NFL": "americanfootball_nfl",
    "MLB": "baseball_mlb",
    "WNBA": "basketball_wnba",
}

DEFAULT_PROP_MARKETS = {
    "WNBA": ["player_points", "player_rebounds", "player_assists"],
    "MLB": ["pitcher_strikeouts", "batter_hits", "batter_total_bases", "batter_home_runs"],
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
    headers: dict[str, str] | None = None


def odds_config_status() -> dict[str, Any]:
    load_dotenv_if_present()
    requested_provider = os.getenv("ODDS_PROVIDER") or os.getenv("MLB_ODDS_PROVIDER") or "the_odds_api"
    # Only expose known provider labels. This prevents an accidentally misplaced
    # secret in a legacy provider variable from reaching metadata or the UI.
    provider = requested_provider if requested_provider == "the_odds_api" else "the_odds_api"
    key_present = bool(os.getenv("ODDS_API_KEY"))
    return {
        "provider": provider,
        "enabled": provider == "the_odds_api" and key_present,
        "key_present": key_present,
        "region": os.getenv("ODDS_REGION", "us"),
        "markets": os.getenv("ODDS_MARKETS", "h2h,spreads,totals"),
        "sports": os.getenv("ODDS_SPORTS", "MLB,WNBA,NFL"),
        "prop_markets": os.getenv("ODDS_PROP_MARKETS", ",".join(DEFAULT_PROP_MARKETS["WNBA"])),
        "mlb_prop_markets": os.getenv("ODDS_MLB_PROP_MARKETS", ",".join(DEFAULT_PROP_MARKETS["MLB"])),
        "max_events": int(os.getenv("ODDS_MAX_EVENTS", "32")),
        "max_prop_markets": int(os.getenv("ODDS_MAX_PROP_MARKETS", "3")),
        "min_refresh_minutes": int(os.getenv("ODDS_MIN_REFRESH_MINUTES", "10")),
        "preferred_bookmakers": os.getenv("ODDS_PREFERRED_BOOKMAKERS", ""),
        "timeout_seconds": os.getenv("ODDS_TIMEOUT_SECONDS", "8"),
    }


def request_odds(url: str, config: dict[str, Any]) -> OddsResult:
    provider = str(config["provider"])
    if not os.getenv("ODDS_API_KEY"):
        return OddsResult("missing_key", "Odds unavailable because ODDS_API_KEY is not configured.", provider, False, [])
    try:
        timeout = max(3.0, float(config.get("timeout_seconds") or 8))
        request = Request(url, headers={"User-Agent": "LineLensSports/1.0"})
        with urlopen(request, timeout=timeout) as response:
            headers = {
                key.lower(): value
                for key, value in response.headers.items()
                if key.lower() in {"x-requests-remaining", "x-requests-used", "x-requests-last"}
            }
            data = json.loads(response.read().decode("utf-8"))
        return OddsResult("success", f"Fetched {len(data)} odds rows from The Odds API.", provider, True, data, headers)
    except HTTPError as error:
        if error.code in {401, 403}:
            return OddsResult("auth_failed", "Odds provider rejected the configured key or access.", provider, True, [])
        if error.code == 429:
            return OddsResult("quota_exhausted", "Odds provider quota is exhausted; cached snapshots were preserved.", provider, True, [])
        return OddsResult("provider_error", f"Odds provider returned HTTP {error.code}; cached snapshots were preserved.", provider, True, [])
    except URLError:
        return OddsResult("provider_unavailable", "Odds provider could not be reached; cached snapshots were preserved.", provider, True, [])
    except TimeoutError:
        return OddsResult("timeout", "Odds provider timed out; cached snapshots were preserved.", provider, True, [])
    except Exception:
        return OddsResult("failed", "Odds provider request failed; cached snapshots were preserved.", provider, True, [])


def fetch_odds(sport: str, markets: str | None = None) -> OddsResult:
    load_dotenv_if_present()
    config = odds_config_status()
    provider = str(config["provider"])
    if provider != "the_odds_api":
        return OddsResult("unavailable", f"Odds provider '{provider}' is not supported yet.", provider, False, [])
    sport_key = SPORT_KEYS.get(sport.upper())
    if not sport_key:
        return OddsResult("unsupported_sport", f"No odds sport key configured for {sport}.", provider, False, [])
    params = {
        "apiKey": os.getenv("ODDS_API_KEY", ""),
        "regions": config["region"],
        "markets": markets or config["markets"],
        "oddsFormat": "american",
    }
    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds?" + urlencode(params)
    return request_odds(url, config)


def fetch_event_props(sport: str, event_id: str, markets: list[str] | None = None) -> OddsResult:
    """Fetch selected player markets for one matched event only."""

    load_dotenv_if_present()
    config = odds_config_status()
    provider = str(config["provider"])
    sport_key = SPORT_KEYS.get(sport.upper())
    if provider != "the_odds_api":
        return OddsResult("unavailable", f"Odds provider '{provider}' is not supported yet.", provider, False, [])
    if not sport_key or not event_id:
        return OddsResult("unsupported_sport", f"No event-prop sport key configured for {sport}.", provider, False, [])
    selected = markets or [part.strip() for part in str(config.get("prop_markets") or "").split(",") if part.strip()]
    selected = selected[: max(1, int(config.get("max_prop_markets") or 3))]
    params = {
        "apiKey": os.getenv("ODDS_API_KEY", ""),
        "regions": config["region"],
        "markets": ",".join(selected),
        "oddsFormat": "american",
    }
    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/events/{event_id}/odds?" + urlencode(params)
    return request_odds(url, config)
