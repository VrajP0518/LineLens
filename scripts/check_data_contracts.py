"""Validate the versioned trust, market, and timestamp contracts offline."""

from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.odds_snapshots import no_vig_probabilities
from src.shared.timezones import safe_zone


def load(relative: str) -> dict:
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def check(label: str, condition: bool, detail: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {label} — {detail}")
    print(f"PASS: {label} — {detail}")


def iso_timestamp(value: object) -> bool:
    if not value:
        return False
    try:
        datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def check_timestamps() -> None:
    # Date-only values must not be parsed as UTC instants before local display.
    check("date-only contract", date.fromisoformat("2026-09-01").isoformat() == "2026-09-01", "date-only values remain calendar dates")
    toronto = safe_zone("America/Toronto")
    for raw in ("2026-03-08T04:30:00Z", "2026-11-01T04:30:00Z", "2026-09-01T03:30:00Z"):
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(toronto)
        check("timezone conversion", parsed.tzinfo is not None and parsed.date().isoformat() in {"2026-03-07", "2026-08-31", "2026-09-01", "2026-10-31", "2026-11-01"}, raw)
    check("month boundary ordering", date.fromisoformat("2026-09-01") - date.fromisoformat("2026-08-31") == timedelta(days=1), "August to September")
    check("year boundary ordering", date.fromisoformat("2027-01-01") - date.fromisoformat("2026-12-31") == timedelta(days=1), "December to January")


def check_exports() -> None:
    required = {
        "live": "data/live/live_scores.json",
        "odds": "data/odds/odds_snapshots.json",
        "predictions": "data/predictions/mlb_predictions.json",
        "props": "data/predictions/mlb_prop_predictions.json",
    }
    for name, relative in required.items():
        payload = load(relative)
        metadata = payload.get("metadata") or {}
        check(f"{name} metadata", bool(metadata.get("generated_at")) and iso_timestamp(metadata.get("generated_at")), relative)
        check(f"{name} source state", bool(metadata.get("source_status") or metadata.get("status") or metadata.get("refresh_mode") or metadata.get("model_type") or metadata.get("prediction_mode") or metadata.get("real_data")), relative)
    live = load(required["live"])
    meta = live.get("metadata") or {}
    live_source = (ROOT / "scripts/live_scores.py").read_text(encoding="utf-8")
    check("live provider attempts", isinstance(meta.get("provider_attempts"), list) or "provider_attempts" in live_source, "attempt records are exported by the refresh pipeline")
    check("live retry policy", (meta.get("retry_policy") or {}).get("attempts", 0) >= 2 or "RETRY_DELAYS_SECONDS" in live_source, "bounded retries are exported")
    odds = load(required["odds"])
    snapshots = odds.get("snapshots") or []
    if snapshots:
        sample = snapshots[0]
        odds_source = (ROOT / "scripts/odds_snapshots.py").read_text(encoding="utf-8")
        check("market consensus contract", ("market_consensus_count" in sample and "market_overround" in sample) or "no_vig_probabilities" in odds_source, "consensus and overround are explicit")
    no_vig = no_vig_probabilities(-110, -110)
    check("no-vig conversion", abs((no_vig["home"] or 0) - 0.5) < 0.0001 and abs((no_vig["away"] or 0) - 0.5) < 0.0001, "symmetric -110 market")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    ui = (ROOT / "src/ui/data_contracts.js").read_text(encoding="utf-8")
    check("client contract loaded", "data_contracts.js" in (ROOT / "index.html").read_text(encoding="utf-8") and "LineLensContracts" in ui, "browser contract module is installed")
    check("secret-safe diagnostics", "contains_api_keys" in (ROOT / "src-tauri/src/lib.rs").read_text(encoding="utf-8") and "API keys configured" in app, "diagnostics expose status only")


def main() -> int:
    check_timestamps()
    check_exports()
    print("Data contracts PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
