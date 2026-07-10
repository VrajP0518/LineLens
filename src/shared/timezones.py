"""Small timezone helpers that work even when Windows Python lacks tzdata."""

from __future__ import annotations

from calendar import monthrange
from datetime import datetime, timedelta, timezone, tzinfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def _nth_weekday(year: int, month: int, weekday: int, occurrence: int) -> int:
    first_weekday, _ = monthrange(year, month)
    return 1 + ((weekday - first_weekday) % 7) + (occurrence - 1) * 7


class NorthAmericanEastern(tzinfo):
    """Eastern time fallback using current US/Canadian DST rules."""

    def utcoffset(self, value: datetime | None) -> timedelta:
        return timedelta(hours=-4 if self.dst(value) else -5)

    def dst(self, value: datetime | None) -> timedelta:
        if value is None:
            return timedelta(0)
        start = datetime(value.year, 3, _nth_weekday(value.year, 3, 6, 2))
        end = datetime(value.year, 11, _nth_weekday(value.year, 11, 6, 1))
        current = value.replace(tzinfo=None)
        return timedelta(hours=1) if start <= current < end else timedelta(0)

    def tzname(self, value: datetime | None) -> str:
        return "EDT" if self.dst(value) else "EST"


def safe_zone(name: str) -> tzinfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        if name in {"America/Toronto", "America/New_York"}:
            return NorthAmericanEastern()
        if name == "Asia/Tokyo":
            return timezone(timedelta(hours=9), "JST")
        return timezone.utc

