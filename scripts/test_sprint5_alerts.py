"""Offline alert contract smoke test (no network and no browser required)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    payload = json.loads((ROOT / "data/sprint5/alerts.json").read_text(encoding="utf-8"))
    alerts = payload.get("alerts", [])
    keys = [row.get("deduplication_key") for row in alerts if row.get("deduplication_key")]
    assert len(keys) == len(set(keys)), "duplicate alert deduplication keys"
    for row in alerts:
        assert row.get("alert_id") and row.get("alert_type") and row.get("deep_link_target")
        assert isinstance(row.get("read", False), bool)
    status = json.loads((ROOT / "data/sprint5/notification_status.json").read_text(encoding="utf-8"))
    assert status.get("local_center") is True and status.get("native_notifications") == "deferred"
    print("Sprint 5 alert smoke test passed: deduplication, read state, deep links, local center, native-notification boundary.")


if __name__ == "__main__":
    main()
