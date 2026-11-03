"""Injury sync from BallDontLie /v1/player_injuries (2 requests: the list and the teams).

BallDontLie only gives the list as it is now. Every run compares it with player_injuries:
  new or changed player   -> player_injuries updated, a row added to injury_reports
  player gone from list   -> removed from player_injuries, an injury_reports row 'Cleared'
  unchanged               -> nothing written
so injury_reports is a history of what was known and when.

Runs in the nightly job and again on demand from the games endpoint (at most every
INJURY_MAX_AGE), because injury news changes through the day.
"""
from . import db, timeutil
from .balldontlie import BallDontLie

# A change in any of these is a new report
TRACKED = ("team_id", "status", "return_date", "description")


def _team_ids(api: BallDontLie) -> dict:
    """BallDontLie team id -> our team id, matched on team code."""
    ours = {t["code"]: t["id"] for t in db.select("teams", {"select": "id,code"})}
    return {t["id"]: ours.get(t["abbreviation"]) for t in api.get("teams").get("data", [])}


def _feed(api: BallDontLie) -> dict:
    team_ids = _team_ids(api)
    feed = {}
    for r in api.get_all("player_injuries"):
        p = r.get("player") or {}
        if not p.get("id"):
            continue
        feed[p["id"]] = {
            "player_id": p["id"],
            "player_name": f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip(),
            "team_id": team_ids.get(p.get("team_id")),
            "status": r.get("status") or "Unknown",
            "return_date": r.get("return_date") or None,
            "description": r.get("description") or None,
        }
    return feed


def sync_injuries(api: BallDontLie) -> int:
    """Bring player_injuries up to date and log every change. Returns the number of changes."""
    feed = _feed(api)
    current = {r["player_id"]: r for r in db.select("player_injuries", {"select": "*"})}
    if not feed and len(current) > 10:
        # An empty list in the middle of the season is a feed problem, not a healthy league
        raise ValueError(f"Injury feed came back empty while {len(current)} players are listed; nothing changed")

    now = timeutil.now_utc().isoformat()
    changed = [row for pid, row in feed.items()
               if pid not in current or any(str(current[pid][k] or "") != str(row[k] or "") for k in TRACKED)]
    cleared = [current[pid] for pid in current if pid not in feed]

    if changed:
        db.upsert("player_injuries", [
            {**row, "first_seen_at": now if row["player_id"] not in current
                or current[row["player_id"]]["status"] != row["status"]
                else current[row["player_id"]]["first_seen_at"],
             "updated_at": now}
            for row in changed], on_conflict="player_id")
    if cleared:
        db.delete_in("player_injuries", "player_id", [r["player_id"] for r in cleared])

    reports = [{**row, "seen_at": now} for row in changed] + [
        {"player_id": r["player_id"], "player_name": r["player_name"], "team_id": r["team_id"],
         "status": "Cleared", "return_date": None, "description": None, "seen_at": now}
        for r in cleared]
    if reports:
        db.insert_many("injury_reports", reports)
    return len(reports)
