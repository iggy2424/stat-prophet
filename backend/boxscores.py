"""Team box score sync: both teams' totals for finished games, from API-Sports.

Per game, 1 request: /games/statistics?id=. A game is marked done (games.box_synced_at)
only when both teams came back. Anything incomplete is left for the next run instead of
being half saved. Games that finished in the last two days are synced again once, at
least 5 hours after tip off, to pick up any stat corrections made after the final buzzer.

Player box scores come from BallDontLie instead (see player_stats.py): API-Sports player
data was missing players in most games.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from . import db, timeutil
from .apisports import ApiSports
from .errors import PartialSync

WORKERS = 4
RESYNC_AFTER = timedelta(hours=5)


def _int(v) -> int | None:
    if v is None or v == "":
        return None
    try:
        return int(str(v).replace("+", ""))
    except ValueError:
        return None


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


def _fetch_game(api: ApiSports, game: dict) -> list[dict] | None:
    """Return both team rows for one game, or None if the data is incomplete."""
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
    return team_rows if len(team_rows) == 2 else None


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


def sync_boxscores(api: ApiSports, season: int | None = None, limit: int = 240) -> int:
    """Sync team totals for up to `limit` finished games without them, newest first."""
    games = _pending_games(season, limit)
    if not games:
        return 0

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = list(pool.map(lambda g: _fetch_game(api, g), games))
    done = [(g["id"], rows) for g, rows in zip(games, results) if rows]

    team_rows = [row for _, rows in done for row in rows]
    db.upsert("team_game_stats", team_rows, on_conflict="game_id,team_id")
    db.update_in("games", "id", [gid for gid, _ in done],
                 {"box_synced_at": timeutil.now_utc().isoformat()})

    incomplete = len(games) - len(done)
    if incomplete:
        # Recorded as a failure so it shows in sync_log; the games stay pending and retry next run
        raise PartialSync(f"{incomplete} of {len(games)} games had incomplete team stats; "
                          f"saved {len(done)}, the rest will retry", len(team_rows))
    return len(team_rows)
