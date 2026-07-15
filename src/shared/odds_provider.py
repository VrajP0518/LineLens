"""Optional odds provider helpers.

Core LineLens data refresh works without odds. If no configured provider key is
available, these helpers return a clean unavailable status instead of raising.
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

PROPLINE_BASE_URL = "https://api.prop-line.com/v1"
SHARPAPI_BASE_URL = "https://api.sharpapi.io/api/v1"

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
    propline_key_present = bool(os.getenv("PROPLINE_API_KEY") or os.getenv("PROP_LINE_API_KEY"))
    sharp_key_present = bool(os.getenv("SHARP_ODDS_API_KEY"))
    return {
        "provider": provider,
        "enabled": provider == "the_odds_api" and key_present,
        "key_present": key_present,
        "propline_key_present": propline_key_present,
        "sharp_key_present": sharp_key_present,
        "any_key_present": key_present or propline_key_present or sharp_key_present,
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


def fetch_events(sport: str) -> OddsResult:
    """Discover upcoming/in-play provider events without requesting markets.

    The main odds endpoint can omit an event before featured game markets are
    posted. The provider's events endpoint is quota-free and supplies the
    provider event id required by ``fetch_event_props``.
    """

    load_dotenv_if_present()
    config = odds_config_status()
    provider = str(config["provider"])
    sport_key = SPORT_KEYS.get(sport.upper())
    if provider != "the_odds_api":
        return OddsResult("unavailable", f"Odds provider '{provider}' is not supported yet.", provider, False, [])
    if not sport_key:
        return OddsResult("unsupported_sport", f"No odds sport key configured for {sport}.", provider, False, [])
    params = {"apiKey": os.getenv("ODDS_API_KEY", ""), "dateFormat": "iso"}
    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/events?" + urlencode(params)
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


def request_propline(url: str, config: dict[str, Any]) -> OddsResult:
    """Request PropLine data without exposing its key in URLs or exports."""

    load_dotenv_if_present()
    api_key = os.getenv("PROPLINE_API_KEY") or os.getenv("PROP_LINE_API_KEY")
    if not api_key:
        return OddsResult("missing_key", "PropLine is not configured.", "propline", False, [])
    try:
        timeout = max(3.0, float(config.get("timeout_seconds") or 8))
        request = Request(url, headers={"User-Agent": "LineLensSports/1.0", "X-API-Key": api_key})
        with urlopen(request, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
        return OddsResult("success", "Fetched MLB props from PropLine.", "propline", True, data)
    except HTTPError as error:
        if error.code in {401, 403}:
            return OddsResult("auth_failed", "PropLine rejected the configured key.", "propline", True, [])
        if error.code == 429:
            return OddsResult("quota_exhausted", "PropLine daily quota is exhausted; cached snapshots were preserved.", "propline", True, [])
        return OddsResult("provider_error", f"PropLine returned HTTP {error.code}; cached snapshots were preserved.", "propline", True, [])
    except (URLError, TimeoutError):
        return OddsResult("provider_unavailable", "PropLine could not be reached; cached snapshots were preserved.", "propline", True, [])
    except Exception:
        return OddsResult("failed", "PropLine request failed; cached snapshots were preserved.", "propline", True, [])


def request_sharpapi(url: str, config: dict[str, Any]) -> OddsResult:
    """Request SharpAPI data without exposing its key in URLs or exports."""

    load_dotenv_if_present()
    api_key = os.getenv("SHARP_ODDS_API_KEY")
    if not api_key:
        return OddsResult("missing_key", "SharpAPI is not configured.", "sharpapi", False, [])
    try:
        timeout = max(3.0, float(config.get("timeout_seconds") or 8))
        request = Request(url, headers={"User-Agent": "LineLensSports/1.0", "X-API-Key": api_key})
        with urlopen(request, timeout=timeout) as response:
            headers = {
                key.lower(): value
                for key, value in response.headers.items()
                if key.lower() in {"x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "x-data-delay", "x-request-id"}
            }
            body = json.loads(response.read().decode("utf-8"))
        rows = body.get("data", []) if isinstance(body, dict) else []
        return OddsResult("success", f"Fetched {len(rows)} odds rows from SharpAPI.", "sharpapi", True, rows, headers)
    except HTTPError as error:
        if error.code in {401, 403}:
            return OddsResult("auth_failed", "SharpAPI rejected the configured key or access tier.", "sharpapi", True, [])
        if error.code == 429:
            return OddsResult("quota_exhausted", "SharpAPI quota is exhausted; cached snapshots were preserved.", "sharpapi", True, [])
        return OddsResult("provider_error", f"SharpAPI returned HTTP {error.code}; cached snapshots were preserved.", "sharpapi", True, [])
    except (URLError, TimeoutError):
        return OddsResult("provider_unavailable", "SharpAPI could not be reached; cached snapshots were preserved.", "sharpapi", True, [])
    except Exception:
        return OddsResult("failed", "SharpAPI request failed; cached snapshots were preserved.", "sharpapi", True, [])


def fetch_sharpapi_props(sport: str, markets: list[str] | None = None) -> OddsResult:
    """Fetch current player props from SharpAPI's normalized odds snapshot."""

    return fetch_sharpapi_odds(sport, "props")


def fetch_sharpapi_odds(sport: str, market: str = "main") -> OddsResult:
    """Fetch a current SharpAPI odds category for the supported MLB fallback."""

    load_dotenv_if_present()
    config = odds_config_status()
    if sport.upper() != "MLB":
        return OddsResult("unsupported_sport", f"SharpAPI prop fallback is not configured for {sport}.", "sharpapi", False, [])
    if not config.get("sharp_key_present"):
        return OddsResult("missing_key", "SharpAPI is not configured.", "sharpapi", False, [])
    params = {"league": "mlb", "market": market, "limit": "200"}
    url = f"{SHARPAPI_BASE_URL}/odds?{urlencode(params)}"
    return request_sharpapi(url, config)


def fetch_propline_events(sport: str) -> OddsResult:
    """Discover PropLine events for the optional MLB market fallback."""

    load_dotenv_if_present()
    config = odds_config_status()
    sport_key = SPORT_KEYS.get(sport.upper())
    if not sport_key:
        return OddsResult("unsupported_sport", f"No PropLine sport key configured for {sport}.", "propline", False, [])
    url = f"{PROPLINE_BASE_URL}/sports/{sport_key}/events"
    return request_propline(url, config)


def fetch_propline_event_props(sport: str, event_id: str, markets: list[str] | None = None) -> OddsResult:
    """Fetch event-level MLB player props from PropLine."""

    load_dotenv_if_present()
    config = odds_config_status()
    sport_key = SPORT_KEYS.get(sport.upper())
    if not sport_key or not event_id:
        return OddsResult("unsupported_sport", f"No PropLine event key configured for {sport}.", "propline", False, [])
    selected = markets or DEFAULT_PROP_MARKETS.get(sport.upper(), [])
    params = {"markets": ",".join(selected)}
    url = f"{PROPLINE_BASE_URL}/sports/{sport_key}/events/{event_id}/odds?{urlencode(params)}"
    return request_propline(url, config)
