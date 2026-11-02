"""Handlers behind /api?type=...

Each handler takes the parsed query params and returns (status, body). Handlers read
from Supabase only. The one exception is games: when games should be in progress and
the last live sync started more than LIVE_MAX_AGE ago, it runs the live sync first
(usually 1 API request). Every viewer shares that one refresh.
"""
from datetime import date, timedelta

from . import db, sync, timeutil

# API-Sports updates live games about every 15 seconds; refreshing faster gains nothing
LIVE_MAX_AGE = timedelta(seconds=15)

TEAM_FIELDS = "id,name,nickname,code,logo_url"
GAME_SELECT = (
    "id,season,stage,start_time,game_date_et,status,status_detail,home_score,away_score,"
    f"home:teams!games_home_team_id_fkey({TEAM_FIELDS}),"
    f"away:teams!games_away_team_id_fkey({TEAM_FIELDS})"
)


def _param(params: dict, name: str, default: str | None = None) -> str | None:
    values = params.get(name)
    return values[0] if values else default


def _last_run_started(job: str):
    """Start time of the latest run, successful or not, so failures are not retried in a tight loop."""
    rows = db.select("sync_log", {
        "select": "started_at",
        "job": f"eq.{job}",
        "order": "started_at.desc",
        "limit": "1",
    })
    return timeutil.parse_utc(rows[0]["started_at"]) if rows else None


def _live_stale(games: list[dict]) -> bool:
    now = timeutil.now_utc()
    in_window = any(
        g["status"] == "live"
        or (g["status"] == "scheduled" and timeutil.parse_utc(g["start_time"]) <= now)
        for g in games
    )
    if not in_window:
        return False
    last = _last_run_started("live")
    return not last or now - last > LIVE_MAX_AGE


def games(params: dict) -> tuple[int, dict]:
    """Games for one US Eastern date. ?date=YYYY-MM-DD, defaults to today."""
    raw = _param(params, "date")
    try:
        day = date.fromisoformat(raw) if raw else timeutil.today_et()
    except ValueError:
        return 400, {"error": "date must be YYYY-MM-DD"}

    query = {"select": GAME_SELECT, "game_date_et": f"eq.{day.isoformat()}", "order": "start_time.asc"}
    rows = db.select("games", query)

    refreshed = None
    if day == timeutil.today_et() and _live_stale(rows):
        refreshed = sync.run_job("live")
        rows = db.select("games", query)

    return 200, {
        "date": day.isoformat(),
        "today": timeutil.today_et().isoformat(),
        "games": rows,
        "scores_refreshed": bool(refreshed and refreshed["ok"]),
    }


def sync_status(params: dict) -> tuple[int, dict]:
    """Latest run of each sync job, for spotting failures."""
    rows = db.select("sync_log", {
        "select": "job,started_at,finished_at,ok,api_requests,rows_written,message",
        "order": "started_at.desc",
        "limit": "50",
    })
    latest = {}
    for r in rows:
        latest.setdefault(r["job"], r)
    return 200, {"jobs": latest}


def run_sync(params: dict) -> tuple[int, dict]:
    """Run one sync job: ?type=sync&job=<name from sync.JOBS>. Cron only."""
    job = _param(params, "job")
    if job not in sync.JOBS:
        return 400, {"error": f"job must be one of {sorted(sync.JOBS)}"}
    result = sync.run_job(job)
    return (200 if result["ok"] else 500), result


MEMBER_ROUTES = {
    "games": games,
    "sync_status": sync_status,
}

CRON_ROUTES = {
    "sync": run_sync,
}
