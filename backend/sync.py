"""Sync jobs: copy API-Sports data into Supabase.

Each job is wrapped by run_job(), which writes one sync_log row with the outcome,
the number of API-Sports requests used, and the error message if it failed.

Jobs
  teams     all 30 franchises (run once, then rarely)
  schedule  the full season schedule (daily)
  scores    status and scores for every game from yesterday to tomorrow (backup sweep)
  live      live games only, plus final scores for games that just ended (every 15s while games are on)
  boxscores team and player stats for finished games (see boxscores.py)
"""
import traceback
from datetime import timedelta

from . import db, timeutil
from .apisports import ApiSports
from .nba_teams import TEAMS, logo_url


def run_job(name: str, fn, *args) -> dict:
    """Run a job, log it to sync_log, and return the log row. Never raises."""
    api = ApiSports()
    log = db.insert("sync_log", {"job": name})
    result = {"ok": False, "rows_written": 0, "message": None}
    try:
        result["rows_written"] = fn(api, *args)
        result["ok"] = True
    except Exception as e:
        result["message"] = f"{type(e).__name__}: {e}\n{traceback.format_exc(limit=3)}"[:2000]
    values = {
        "finished_at": timeutil.now_utc().isoformat(),
        "ok": result["ok"],
        "api_requests": api.requests_used,
        "rows_written": result["rows_written"],
        "message": result["message"],
    }
    db.update("sync_log", {"id": log["id"]}, values)
    return {"job": name, **values}


# ── Teams ─────────────────────────────────────────────────────────────────────

def sync_teams(api: ApiSports) -> int:
    rows = []
    for t in api.get("teams"):
        if not t.get("nbaFranchise") or t.get("allStar"):
            continue
        code = t["code"]
        if code not in TEAMS:
            raise ValueError(f"Team code {code} ({t['name']}) missing from nba_teams.TEAMS")
        nba_id, odds_name = TEAMS[code]
        league = (t.get("leagues") or {}).get("standard") or {}
        rows.append({
            "id": t["id"],
            "nba_id": nba_id,
            "name": t["name"],
            "nickname": t["nickname"],
            "code": code,
            "city": t.get("city"),
            "conference": league.get("conference"),
            "division": league.get("division"),
            "logo_url": logo_url(nba_id),
            "odds_api_name": odds_name,
            "updated_at": timeutil.now_utc().isoformat(),
        })
    if len(rows) != 30:
        raise ValueError(f"Expected 30 NBA teams, got {len(rows)}")
    return db.upsert("teams", rows)


# ── Games ─────────────────────────────────────────────────────────────────────

def _status(g: dict) -> str:
    s = g.get("status") or {}
    long = (s.get("long") or "").lower()
    if "postpon" in long or "delay" in long:
        return "postponed"
    if "cancel" in long:
        return "canceled"
    return {1: "scheduled", 2: "live", 3: "finished"}.get(s.get("short"), "scheduled")


def _status_detail(g: dict) -> str | None:
    s = g.get("status") or {}
    if _status(g) != "live":
        return None
    if s.get("halftime"):
        return "Halftime"
    period = (g.get("periods") or {}).get("current")
    label = f"Q{period}" if period and period <= 4 else ("OT" if period else None)
    if (g.get("periods") or {}).get("endOfPeriod"):
        return f"End of {label}" if label else None
    clock = s.get("clock")
    return " ".join(x for x in [label, clock] if x) or None


def _game_row(g: dict, team_ids: set[int]) -> dict | None:
    home = g["teams"]["home"]["id"]
    away = g["teams"]["visitors"]["id"]
    if home not in team_ids or away not in team_ids:
        return None  # exhibition games against non NBA teams
    start = timeutil.parse_utc(g["date"]["start"])
    status = _status(g)
    scores = g.get("scores") or {}
    has_score = status in ("live", "finished")
    return {
        "id": g["id"],
        "season": g["season"],
        "stage": g.get("stage"),
        "start_time": start.isoformat(),
        "game_date_et": timeutil.et_date(start).isoformat(),
        "status": status,
        "status_detail": _status_detail(g),
        "home_team_id": home,
        "away_team_id": away,
        "home_score": (scores.get("home") or {}).get("points") if has_score else None,
        "away_score": (scores.get("visitors") or {}).get("points") if has_score else None,
        "updated_at": timeutil.now_utc().isoformat(),
    }


def _team_ids() -> set[int]:
    ids = {t["id"] for t in db.select("teams", {"select": "id"})}
    if not ids:
        raise ValueError("teams table is empty. Run the teams job first.")
    return ids


def sync_schedule(api: ApiSports, season: int | None = None) -> int:
    season = season or timeutil.current_season()
    team_ids = _team_ids()
    games = api.get("games", {"season": season, "league": "standard"})
    rows = [r for r in (_game_row(g, team_ids) for g in games) if r]
    return db.upsert("games", rows)


def sync_scores(api: ApiSports) -> int:
    """Refresh games from yesterday to tomorrow (UTC dates cover every ET game today)."""
    team_ids = _team_ids()
    today = timeutil.now_utc().date()
    rows = []
    for d in (today - timedelta(days=1), today, today + timedelta(days=1)):
        for g in api.get("games", {"date": d.isoformat()}):
            if g.get("league") not in (None, "standard"):
                continue
            row = _game_row(g, team_ids)
            if row:
                rows.append(row)
    return db.upsert("games", rows)


def sync_live(api: ApiSports) -> int:
    """Fast refresh while games are on: 1 request for every live game.

    Games that our table still shows as live, or that should have tipped off, but are
    missing from the live list have just finished (or not started yet). Those are
    fetched one by one so their final score is stored.
    """
    team_ids = _team_ids()
    rows = []
    live_ids = set()
    for g in api.get("games", {"live": "all"}):
        row = _game_row(g, team_ids)
        if row:
            rows.append(row)
            live_ids.add(row["id"])

    yesterday = (timeutil.today_et() - timedelta(days=1)).isoformat()
    candidates = db.select("games", {
        "select": "id,status,start_time",
        "game_date_et": f"gte.{yesterday}",
        "status": "in.(live,scheduled)",
        "start_time": f"lte.{timeutil.now_utc().isoformat()}",
    })
    for c in candidates:
        if c["id"] in live_ids:
            continue
        for g in api.get("games", {"id": c["id"]}):
            row = _game_row(g, team_ids)
            if row:
                rows.append(row)

    return db.upsert("games", rows) if rows else 0


from .boxscores import sync_boxscores  # noqa: E402  (imported here to keep jobs listed in one place)

JOBS = {
    "teams": sync_teams,
    "schedule": sync_schedule,
    "scores": sync_scores,
    "live": sync_live,
    "boxscores": sync_boxscores,
}
