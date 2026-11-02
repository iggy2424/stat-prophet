"""Box score sync: team and player stats for finished games.

Per game, 2 API-Sports requests:
  /games/statistics?id=    both teams' totals
  /players/statistics?game= every player who appeared

A game is marked done (games.box_synced_at) only when both teams and at least one player
per team came back. Anything incomplete is left for the next run instead of being half saved.
Games that finished in the last two days are synced again once, at least 5 hours after
tip off, to pick up any stat corrections made after the final buzzer.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from . import db, timeutil
from .apisports import ApiSports
from .names import search_name

WORKERS = 4
RESYNC_AFTER = timedelta(hours=5)


def _int(v) -> int | None:
    if v is None or v == "":
        return None
    try:
        return int(str(v).replace("+", ""))
    except ValueError:
        return None


def _minutes(v) -> float:
    """API-Sports minutes come as '25' or '25:30'."""
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
        "points": _int(s.get("points")), "fgm": _int(s.get("fgm")), "fga": _int(s.get("fga")),
        "ftm": _int(s.get("ftm")), "fta": _int(s.get("fta")),
        "tpm": _int(s.get("tpm")), "tpa": _int(s.get("tpa")),
        "off_reb": _int(s.get("offReb")), "def_reb": _int(s.get("defReb")), "tot_reb": _int(s.get("totReb")),
        "assists": _int(s.get("assists")), "steals": _int(s.get("steals")), "blocks": _int(s.get("blocks")),
        "turnovers": _int(s.get("turnovers")), "fouls": _int(s.get("pFouls")),
    }


def _possessions(c: dict) -> float | None:
    parts = [c["fga"], c["fta"], c["off_reb"], c["turnovers"]]
    if any(p is None for p in parts):
        return None
    return round(c["fga"] + 0.44 * c["fta"] - c["off_reb"] + c["turnovers"], 1)


def _fetch_game(api: ApiSports, game: dict) -> dict | None:
    """Return rows for one game, or None if the data is incomplete."""
    gid, home, away = game["id"], game["home_team_id"], game["away_team_id"]
    base = {"game_id": gid, "season": game["season"], "stage": game["stage"], "game_date_et": game["game_date_et"]}

    team_rows = []
    for entry in api.get("games/statistics", {"id": gid}):
        tid = (entry.get("team") or {}).get("id")
        stats = (entry.get("statistics") or [{}])[0]
        if tid not in (home, away):
            continue
        cols = _stat_cols(stats)
        team_rows.append({
            **base, "team_id": tid, "opponent_id": away if tid == home else home,
            "is_home": tid == home, **cols, "possessions": _possessions(cols),
        })
    if len(team_rows) != 2:
        return None

    player_rows, players = [], {}
    for entry in api.get("players/statistics", {"game": gid}):
        p = entry.get("player") or {}
        tid = (entry.get("team") or {}).get("id")
        mins = _minutes(entry.get("min"))
        if not p.get("id") or tid not in (home, away) or mins <= 0:
            continue  # did not play
        full = f"{p.get('firstname') or ''} {p.get('lastname') or ''}".strip()
        players[p["id"]] = {
            "id": p["id"], "first_name": p.get("firstname"), "last_name": p.get("lastname"),
            "full_name": full, "search_name": search_name(full),
            "team_id": tid, "position": entry.get("pos"), "last_game_at": game["start_time"],
        }
        player_rows.append({
            **base, "player_id": p["id"], "team_id": tid, "opponent_id": away if tid == home else home,
            "is_home": tid == home, "position": entry.get("pos"), "minutes": mins,
            **_stat_cols(entry), "plus_minus": _int(entry.get("plusMinus")),
        })
    if {r["team_id"] for r in player_rows} != {home, away}:
        return None

    return {"game_id": gid, "teams": team_rows, "players": player_rows, "player_info": players}


def _pending_games(season: int | None, limit: int) -> list[dict]:
    cols = "id,season,stage,start_time,game_date_et,home_team_id,away_team_id,box_synced_at"
    query = {"select": cols, "status": "eq.finished", "box_synced_at": "is.null",
             "order": "start_time.desc", "limit": str(limit)}
    if season:
        query["season"] = f"eq.{season}"
    games = db.select("games", query)

    # Recent games synced too soon after the buzzer get one more pass
    since = (timeutil.today_et() - timedelta(days=2)).isoformat()
    recent = db.select("games", {"select": cols, "status": "eq.finished",
                                 "game_date_et": f"gte.{since}", "box_synced_at": "not.is.null"})
    for g in recent:
        synced, start = timeutil.parse_utc(g["box_synced_at"]), timeutil.parse_utc(g["start_time"])
        if synced - start < RESYNC_AFTER and timeutil.now_utc() - start >= RESYNC_AFTER:
            games.append(g)
    return games


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


def sync_boxscores(api: ApiSports, season: int | None = None, limit: int = 120) -> int:
    """Sync up to `limit` finished games without box scores, newest first."""
    games = _pending_games(season, limit)
    if not games:
        return 0

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = list(pool.map(lambda g: _fetch_game(api, g), games))
    done = [r for r in results if r]

    # Keep each player's newest game when the same player appears in several games
    player_info = {}
    for r in done:
        for pid, info in r["player_info"].items():
            if pid not in player_info or info["last_game_at"] > player_info[pid]["last_game_at"]:
                player_info[pid] = info
    _save_players(player_info)

    team_rows = [row for r in done for row in r["teams"]]
    player_rows = [row for r in done for row in r["players"]]
    db.upsert("team_game_stats", team_rows, on_conflict="game_id,team_id")
    db.upsert("player_game_stats", player_rows, on_conflict="game_id,player_id")
    db.update_in("games", "id", [r["game_id"] for r in done],
                 {"box_synced_at": timeutil.now_utc().isoformat()})

    incomplete = len(games) - len(done)
    if incomplete:
        # Recorded as a failure so it shows in sync_log; the games stay pending and retry next run
        raise RuntimeError(f"{incomplete} of {len(games)} games had incomplete box scores; "
                           f"saved {len(done)}, the rest will retry")
    return len(team_rows) + len(player_rows)
