"""Handlers behind /api?type=...

Each handler takes the parsed query params and returns (status, body). Handlers read
from Supabase only. The one exception is games: when games should be in progress and
the last live sync started more than LIVE_MAX_AGE ago, it runs the live sync first
(usually 1 API request). Every viewer shares that one refresh.
"""
from datetime import date, timedelta

from . import db, game_model, sync, timeutil

# API-Sports updates live games about every 15 seconds; refreshing faster gains nothing
LIVE_MAX_AGE = timedelta(seconds=15)

TEAM_FIELDS = "id,name,nickname,code,logo_url"
GAME_SELECT = (
    "id,season,stage,start_time,game_date_et,status,status_detail,home_score,away_score,"
    f"home:teams!games_home_team_id_fkey({TEAM_FIELDS}),"
    f"away:teams!games_away_team_id_fkey({TEAM_FIELDS}),"
    "prediction:game_predictions(model,home_points,away_points,home_win_prob)"
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


RANKING_WINDOWS = ("blended", "season", "last10")
PRIOR_GAMES = 10  # must match params.prior_games in database/005_team_rankings_v2.sql


def team_rankings(params: dict) -> tuple[int, dict]:
    """All 30 teams with stats and ranks. ?season=2026&window=blended|season|last10."""
    current = timeutil.current_season()
    window = _param(params, "window", "blended")
    try:
        season = int(_param(params, "season", str(current)))
    except ValueError:
        return 400, {"error": "season must be a year, e.g. 2026"}
    if window not in RANKING_WINDOWS:
        return 400, {"error": f"window must be one of {list(RANKING_WINDOWS)}"}

    rows = db.select("team_rankings", {
        "select": "*", "window_name": f"eq.{window}", "season": f"eq.{season}",
        "order": "net_rating_rank.asc,code.asc",
    })
    return 200, {
        "season": season,
        "window": window,
        "seasons": [current, current - 1],
        "prior_games": PRIOR_GAMES,
        "teams": rows,
    }


def _grade(rows: list[dict]) -> dict:
    """Winner record and average misses for finished games with a prediction."""
    n = len(rows)
    if not n:
        return {"games": 0}
    right = margin_miss = total_miss = total_bias = 0.0
    for r in rows:
        g = r["game"]
        pred_margin = float(r["home_points"]) - float(r["away_points"])
        pred_total = float(r["home_points"]) + float(r["away_points"])
        margin, total = g["home_score"] - g["away_score"], g["home_score"] + g["away_score"]
        right += (pred_margin > 0) == (margin > 0)
        margin_miss += abs(pred_margin - margin)
        total_miss += abs(pred_total - total)
        total_bias += total - pred_total
    return {
        "games": n, "winners_right": int(right), "winners_wrong": n - int(right),
        "margin_miss": round(margin_miss / n, 1),   # average points off the real margin
        "total_miss": round(total_miss / n, 1),     # average points off the real total
        "total_bias": round(total_bias / n, 1),     # + means real totals came in higher
    }


def model_record(params: dict) -> tuple[int, dict]:
    """How the game prediction model has done on finished games. ?model=ratings-v1."""
    model = _param(params, "model", game_model.MODEL)
    query = {
        "select": "game_id,home_points,away_points,game:games!inner(status,game_date_et,home_score,away_score)",
        "model": f"eq.{model}", "game.status": "eq.finished", "order": "game_id.asc", "limit": "1000",
    }
    rows = []
    while True:  # Supabase returns at most 1,000 rows per request
        page = db.select("game_predictions", {**query, "offset": str(len(rows))})
        rows += page
        if len(page) < 1000:
            break
    week_ago = (timeutil.today_et() - timedelta(days=7)).isoformat()
    return 200, {
        "model": model,
        "all": _grade(rows),
        "last_7_days": _grade([r for r in rows if r["game"]["game_date_et"] >= week_ago]),
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
    """Run a sync job: ?type=sync&job=<name from sync.JOBS, or nightly>. Cron only.

    nightly runs every job in sync.NIGHTLY even if one fails, so a box score problem
    never stops player stats from syncing. Each job gets its own sync_log row.
    """
    job = _param(params, "job")
    if job == "nightly":
        results = [sync.run_job(name) for name in sync.NIGHTLY]
        return (200 if all(r["ok"] for r in results) else 500), {"jobs": results}
    if job not in sync.JOBS:
        return 400, {"error": f"job must be nightly or one of {sorted(sync.JOBS)}"}
    result = sync.run_job(job)
    return (200 if result["ok"] else 500), result


MEMBER_ROUTES = {
    "games": games,
    "team_rankings": team_rankings,
    "model_record": model_record,
    "sync_status": sync_status,
}

CRON_ROUTES = {
    "sync": run_sync,
}
