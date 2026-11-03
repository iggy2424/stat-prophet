"""Player stats sync: player box scores from BallDontLie, checked against the final score.

BallDontLie /stats returns one row per player per game, 100 rows a page, and accepts many
dates in one request, so a whole day of games usually costs 3 requests.

BallDontLie games are matched to ours by ET date plus home and away team codes (their
abbreviations are the same as API-Sports codes). A game is saved, and marked done in
games.players_synced_at, only when:
  - BallDontLie shows it as Final, and
  - each team's player points add up to that team's final score in our games table.
Anything else stays pending for the next run and is listed in the job's error message.
Preseason games are skipped because BallDontLie does not cover them.
"""
from collections import defaultdict
from datetime import timedelta

from . import db, timeutil
from .balldontlie import BallDontLie
from .boxscores import RESYNC_AFTER, _int
from .errors import PartialSync
from .names import search_name

DATES_PER_REQUEST = 7
PLAYED_STATS = ("pts", "fga", "fta", "reb", "ast", "stl", "blk", "turnover", "pf")

GAME_COLS = (
    "id,season,stage,start_time,game_date_et,home_team_id,away_team_id,home_score,away_score,"
    "players_synced_at,home:teams!games_home_team_id_fkey(code),away:teams!games_away_team_id_fkey(code)"
)


def _minutes(v) -> float:
    """Minutes come as '33:15', '33' or '' for players who did not play."""
    if not v:
        return 0.0
    text = str(v)
    try:
        if ":" in text:
            m, s = text.split(":", 1)
            return round(int(m) + int(s) / 60, 1)
        return round(float(text), 1)
    except ValueError:
        return 0.0


def _stat_cols(s: dict) -> dict:
    return {
        "points": _int(s.get("pts")), "fgm": _int(s.get("fgm")), "fga": _int(s.get("fga")),
        "ftm": _int(s.get("ftm")), "fta": _int(s.get("fta")),
        "tpm": _int(s.get("fg3m")), "tpa": _int(s.get("fg3a")),
        "off_reb": _int(s.get("oreb")), "def_reb": _int(s.get("dreb")), "tot_reb": _int(s.get("reb")),
        "assists": _int(s.get("ast")), "steals": _int(s.get("stl")), "blocks": _int(s.get("blk")),
        "turnovers": _int(s.get("turnover")), "fouls": _int(s.get("pf")),
    }


def _pending_games(season: int | None, limit: int) -> list[dict]:
    query = {"select": GAME_COLS, "status": "eq.finished", "stage": "gt.1",
             "players_synced_at": "is.null", "order": "start_time.desc", "limit": str(limit)}
    if season:
        query["season"] = f"eq.{season}"
    games = db.select("games", query)

    # Recent games synced too soon after the buzzer get one more pass for stat corrections
    since = (timeutil.today_et() - timedelta(days=2)).isoformat()
    recent = db.select("games", {"select": GAME_COLS, "status": "eq.finished", "stage": "gt.1",
                                 "game_date_et": f"gte.{since}", "players_synced_at": "not.is.null"})
    for g in recent:
        synced, start = timeutil.parse_utc(g["players_synced_at"]), timeutil.parse_utc(g["start_time"])
        if synced - start < RESYNC_AFTER and timeutil.now_utc() - start >= RESYNC_AFTER:
            games.append(g)
    return games


def _fetch_rows(api: BallDontLie, dates: list[str]) -> list[dict]:
    rows = []
    for i in range(0, len(dates), DATES_PER_REQUEST):
        rows += api.get_all("stats", {"dates[]": dates[i:i + DATES_PER_REQUEST]})
    return rows


def _group_by_game(rows: list[dict]) -> dict:
    """BallDontLie rows grouped under (date, home code, away code)."""
    codes = {r["team"]["id"]: r["team"]["abbreviation"] for r in rows if r.get("team")}
    games = {}
    for r in rows:
        g = r.get("game") or {}
        home, away = codes.get(g.get("home_team_id")), codes.get(g.get("visitor_team_id"))
        if not home or not away:
            continue
        key = ((g.get("date") or "")[:10], home, away)
        games.setdefault(key, {"game": g, "rows": []})["rows"].append(r)
    return games


def _check_game(game: dict, bdl: dict | None, team_by_code: dict) -> str | None:
    """Return why the game cannot be saved, or None if it checks out."""
    if not bdl:
        return "not in BallDontLie"
    g = bdl["game"]
    if g.get("status") != "Final":
        return f"BallDontLie status {g.get('status')}"
    points = defaultdict(int)
    for r in bdl["rows"]:
        points[team_by_code.get(r["team"]["abbreviation"])] += r.get("pts") or 0
    for side in ("home", "away"):
        tid, score = game[f"{side}_team_id"], game[f"{side}_score"]
        if points[tid] != score:
            return f"{game[side]['code']} players add up to {points[tid]}, final score {score}"
    return None


def _build_rows(game: dict, bdl: dict, team_by_code: dict) -> tuple[list[dict], dict]:
    home, away = game["home_team_id"], game["away_team_id"]
    base = {"game_id": game["id"], "season": game["season"], "stage": game["stage"],
            "game_date_et": game["game_date_et"]}
    stat_rows, players = [], {}
    for r in bdl["rows"]:
        p, tid, mins = r.get("player") or {}, team_by_code.get(r["team"]["abbreviation"]), _minutes(r.get("min"))
        # A few seconds of garbage time shows as '0' minutes, sometimes with a free throw made,
        # so a row counts as played if it has minutes or any stat
        played = mins > 0 or any(r.get(k) for k in PLAYED_STATS)
        if not p.get("id") or tid not in (home, away) or not played:
            continue  # did not play
        full = f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip()
        players[p["id"]] = {
            "id": p["id"], "first_name": p.get("first_name"), "last_name": p.get("last_name"),
            "full_name": full, "search_name": search_name(full), "team_id": tid,
            "position": p.get("position") or None, "jersey_number": p.get("jersey_number"),
            "height": p.get("height"), "last_game_at": game["start_time"],
        }
        stat_rows.append({
            **base, "player_id": p["id"], "team_id": tid, "opponent_id": away if tid == home else home,
            "is_home": tid == home, "position": p.get("position") or None, "minutes": mins,
            **_stat_cols(r), "plus_minus": _int(r.get("plus_minus")),
        })
    return stat_rows, players


def _save_players(player_info: dict) -> None:
    """Upsert players, but never let an older game overwrite a newer team or position."""
    if not player_info:
        return
    ids = list(player_info)
    existing = {}
    for i in range(0, len(ids), 200):
        rows = db.select("players", {"select": "id,last_game_at",
                                     "id": f"in.({','.join(str(x) for x in ids[i:i + 200])})"})
        existing.update({r["id"]: r["last_game_at"] for r in rows})
    now = timeutil.now_utc().isoformat()
    rows = []
    for pid, info in player_info.items():
        known = existing.get(pid)
        if known and timeutil.parse_utc(known) >= timeutil.parse_utc(info["last_game_at"]):
            continue
        rows.append({**info, "updated_at": now})
    if rows:
        db.upsert("players", rows)


def sync_players(api: BallDontLie, season: int | None = None, limit: int = 300) -> int:
    """Sync player stats for up to `limit` finished games, newest first."""
    games = _pending_games(season, limit)
    if not games:
        return 0
    team_by_code = {t["code"]: t["id"] for t in db.select("teams", {"select": "id,code"})}
    bdl_games = _group_by_game(_fetch_rows(api, sorted({g["game_date_et"] for g in games})))

    stat_rows, player_info, done, problems = [], {}, [], []
    for game in games:
        key = (game["game_date_et"], game["home"]["code"], game["away"]["code"])
        bdl = bdl_games.get(key)
        problem = _check_game(game, bdl, team_by_code)
        if problem:
            problems.append(f"{game['game_date_et']} {key[2]}@{key[1]} (game {game['id']}): {problem}")
            continue
        rows, players = _build_rows(game, bdl, team_by_code)
        stat_rows += rows
        for pid, info in players.items():
            if pid not in player_info or info["last_game_at"] > player_info[pid]["last_game_at"]:
                player_info[pid] = info
        done.append((game["id"], bdl["game"]["id"]))

    _save_players(player_info)
    db.upsert("player_game_stats", stat_rows, on_conflict="game_id,player_id")
    now = timeutil.now_utc().isoformat()
    for game_id, bdl_id in done:
        db.update("games", {"id": game_id}, {"bdl_id": bdl_id, "players_synced_at": now})

    if problems:
        # Recorded as a failure so it shows in sync_log; these games stay pending and retry next run
        listed = "; ".join(problems[:10]) + (f"; and {len(problems) - 10} more" if len(problems) > 10 else "")
        raise PartialSync(f"{len(problems)} of {len(games)} games not saved: {listed}", len(stat_rows))
    return len(stat_rows)
