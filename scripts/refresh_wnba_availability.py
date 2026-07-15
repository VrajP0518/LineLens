"""Refresh official WNBA availability reports into a compact local export."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_JSON = ROOT / "data" / "odds" / "wnba_availability.json"
OUTPUT_JS = ROOT / "data" / "odds" / "wnba_availability.js"
REPORT_API = "https://www.wnba.com/api/injury-reports"
SOURCE_PAGE = "https://www.wnba.com/wnba-injury-report"
TEAM_NAMES = [
    "Atlanta Dream", "Chicago Sky", "Connecticut Sun", "Dallas Wings", "Golden State Valkyries",
    "Indiana Fever", "Las Vegas Aces", "Los Angeles Sparks", "Minnesota Lynx", "New York Liberty",
    "Phoenix Mercury", "Portland Fire", "Seattle Storm", "Toronto Tempo", "Washington Mystics",
]
STATUS_MAP = {"out": "out", "questionable": "questionable", "probable": "probable", "doubtful": "doubtful", "available": "confirmed_active"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def get(url: str, *, accept: str = "*/*") -> bytes:
    request = Request(url, headers={"User-Agent": "LineLensSports/1.0", "Accept": accept, "Referer": SOURCE_PAGE})
    with urlopen(request, timeout=45) as response:
        return response.read()


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def consume_phrase(lines: list[str], index: int, phrase: str) -> bool:
    tokens = phrase.split()
    return [line.lower() for line in lines[index:index + len(tokens)]] == [token.lower() for token in tokens]


def parse_pdf(pdf: bytes, report_url: str, reported_at: str) -> list[dict[str, object]]:
    from pypdf import PdfReader

    text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(pdf)).pages)
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines() if line.strip()]
    rows: list[dict[str, object]] = []
    current_date = None
    current_time = None
    matchup = None
    team = None
    index = 0
    while index < len(lines):
        line = lines[index]
        date_match = re.fullmatch(r"(\d{2}/\d{2}/\d{4})", line)
        if date_match:
            current_date = datetime.strptime(date_match.group(1), "%m/%d/%Y").strftime("%Y-%m-%d")
            index += 1
            continue
        if re.fullmatch(r"[A-Z]{2,3}@[A-Z]{2,3}", line):
            matchup = line
            index += 1
            continue
        if re.fullmatch(r"\d{2}:\d{2}", line):
            current_time = line
            index += 1
            continue
        matched_team = next((name for name in TEAM_NAMES if consume_phrase(lines, index, name)), None)
        if matched_team:
            team = matched_team
            index += len(matched_team.split())
            if index < len(lines) and lines[index].upper() == "NOT":
                index += 3 if lines[index:index + 3] == ["NOT", "YET", "SUBMITTED"] else 1
            continue
        if line.endswith(",") and index + 1 < len(lines):
            player_name = f"{line} {lines[index + 1]}".replace(", ", ", ").strip()
            status_index = index + 2
            status = STATUS_MAP.get(lines[status_index].lower()) if status_index < len(lines) else None
            if status and current_date and team:
                reason_start = status_index + 1
                reason_parts: list[str] = []
                while reason_start < len(lines):
                    candidate = lines[reason_start]
                    if re.fullmatch(r"\d{2}/\d{2}/\d{4}", candidate) or re.fullmatch(r"\d{2}:\d{2}", candidate) or re.fullmatch(r"[A-Z]{2,3}@[A-Z]{2,3}", candidate) or any(consume_phrase(lines, reason_start, name) for name in TEAM_NAMES) or (candidate.endswith(",") and reason_start + 1 < len(lines)):
                        break
                    reason_parts.append(candidate)
                    reason_start += 1
                last, first = [part.strip() for part in player_name.split(",", 1)]
                rows.append({"sport": "WNBA", "game_date": current_date, "game_time": current_time, "matchup": matchup, "team": team, "player_name": " ".join(part for part in (first, last) if part), "availability_status": status, "reported_status": lines[status_index], "reason": " ".join(reason_parts).strip() or None, "reported_at": reported_at, "source": "WNBA official injury report", "source_url": report_url})
                index = reason_start
                continue
        index += 1
    return rows


def write(payload: dict[str, object]) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(text + "\n", encoding="utf-8")
    OUTPUT_JS.write_text(f"window.__WNBA_AVAILABILITY__ = {text};\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    reported_at = now()
    try:
        report_index = json.loads(get(REPORT_API, accept="application/json"))
        links = report_index.get("links", []) if isinstance(report_index, dict) else []
        latest = links[-1] if links else None
        if not latest or not latest.get("href"):
            raise RuntimeError("The official WNBA endpoint returned no report links.")
        if args.dry_run:
            print(json.dumps({"status": "dry_run", "latest_report": latest}, indent=2))
            return 0
        rows = parse_pdf(get(str(latest["href"])), str(latest["href"]), reported_at)
        payload = {"metadata": {"sport": "WNBA", "generated_at": reported_at, "status": "success" if rows else "report_parsed_no_player_rows", "real_data": bool(rows), "report_date_label": report_index.get("dateLabel"), "report_url": latest["href"], "source_url": SOURCE_PAGE, "note": "Only explicit official report statuses are exported. Players not listed remain unknown."}, "players": rows}
    except Exception as error:  # noqa: BLE001 - write an honest unavailable state for the UI.
        payload = {"metadata": {"sport": "WNBA", "generated_at": reported_at, "status": "source_unavailable", "real_data": False, "source_url": SOURCE_PAGE, "error_type": type(error).__name__, "note": "Official WNBA availability could not be downloaded or parsed; no player status was inferred."}, "players": []}
    write(payload)
    print(json.dumps(payload["metadata"], indent=2))
    return 0 if payload["metadata"]["status"] != "source_unavailable" else 1


if __name__ == "__main__":
    raise SystemExit(main())
