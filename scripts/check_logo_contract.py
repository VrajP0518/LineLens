"""Validate team-logo metadata and the packaged rendering fallback."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    payload = json.loads((ROOT / "data" / "team_metadata.json").read_text(encoding="utf-8"))
    teams = payload.get("teams", [])
    failures: list[str] = []
    required_counts = {"NFL": 32, "MLB": 30, "WNBA": 12}

    for sport, minimum in required_counts.items():
        rows = [row for row in teams if row.get("sport") == sport]
        if len(rows) < minimum:
            failures.append(f"{sport} metadata has {len(rows)} teams; expected at least {minimum}")
        missing = [row.get("abbreviation", "unknown") for row in rows if not str(row.get("logo_url", "")).startswith("https://a.espncdn.com/i/teamlogos/")]
        if missing:
            failures.append(f"{sport} logo URLs missing or outside the approved ESPN host: {', '.join(missing)}")

    app_text = (ROOT / "app.js").read_text(encoding="utf-8")
    if "function renderTeamLogo" not in app_text or "onerror=" not in app_text or "nextElementSibling.hidden=false" not in app_text:
        failures.append("team logo renderer is missing its image-error fallback")

    config = json.loads((ROOT / "src-tauri" / "tauri.conf.json").read_text(encoding="utf-8"))
    img_sources = config.get("app", {}).get("security", {}).get("csp", {}).get("img-src", [])
    if "https://a.espncdn.com" not in img_sources:
        failures.append("Tauri CSP does not allow the approved ESPN logo host")

    if failures:
        print("FAIL: team logo contract")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print(f"PASS: team logo contract ({len(teams)} metadata rows; ESPN host and initials fallback verified)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
