"""US Eastern dates and NBA season logic.

The NBA schedules by US Eastern time, but API-Sports returns UTC. A 10pm ET tip off
is the next day in UTC, so "today's games" must always be decided in Eastern time.
"""
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def today_et() -> date:
    return now_utc().astimezone(ET).date()


def parse_utc(iso: str) -> datetime:
    """Parse API-Sports timestamps like '2026-11-02T02:00:00.000Z'."""
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def et_date(dt: datetime) -> date:
    return dt.astimezone(ET).date()


def season_for(d: date) -> int:
    """API-Sports season label: the 2026-27 season is 2026.

    A new season's preseason starts in early October, so August onwards counts as
    the new season. July and earlier belong to the season that started last year.
    """
    return d.year if d.month >= 8 else d.year - 1


def current_season() -> int:
    return season_for(today_et())
