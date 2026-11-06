"""Download historical NBA player prop lines from The Odds API for one season.

  python research/odds/pull_props.py 2025              plan only: games, matches, credit cost
  python research/odds/pull_props.py 2025 --go         download

For every finished regular season, play-in and playoff game in our `games` table:
  1. once per game day, the list of events (1 credit), taken 3 hours before that day's
     first tip so every game is still upcoming; matched to our games by home and away team
     (teams.odds_api_name) and a start time within 6 hours
  2. the event's player props as they stood MINUTES_BEFORE minutes before tip off:
     MARKETS x 1 region (BOOKS are 7 bookmakers, which bill as one region) = 40 credits

Raw responses are saved in research/.cache/odds/<season>/ (not in git), so a run that
stops can be restarted without paying twice. The run stops if credits would fall below
KEEP_CREDITS.
"""
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from backend import config, db  # noqa: E402

BASE = "https://api.the-odds-api.com/v4/historical/sports/basketball_nba"
MARKETS = ["player_points", "player_rebounds", "player_assists", "player_threes"]
BOOKS = ["draftkings", "fanduel", "betmgm", "espnbet", "bovada", "betonlineag", "pinnacle"]
MINUTES_BEFORE = 60
KEEP_CREDITS = 40_000
COST_PER_GAME = 10 * len(MARKETS)  # 10 per market per region


def _iso(t: datetime) -> str:
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _utc(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


class OddsApi:
    def __init__(self):
        self.key = os.environ["ODDS_API_KEY"]
        self.remaining = None

    def get(self, path: str, params: dict) -> dict:
        """GET with retries on rate limits, server errors and dropped connections. Errors name
        the path and status only: the full URL carries the API key."""
        problem = None
        for attempt in range(6):
            try:
                r = requests.get(f"{BASE}{path}", params={"apiKey": self.key, **params}, timeout=60)
            except requests.RequestException as e:
                problem = type(e).__name__
            else:
                if r.status_code == 200:
                    self.remaining = int(r.headers.get("x-requests-remaining", -1))
                    return r.json()
                problem = f"HTTP {r.status_code}"
                if r.status_code != 429 and r.status_code < 500:
                    break  # a client error will not fix itself
            time.sleep(3 + 5 * attempt)
        raise RuntimeError(f"{path} failed: {problem}")


def our_games(season: int) -> list[dict]:
    games, off = [], 0
    names = {t["id"]: t["odds_api_name"] for t in db.select("teams", {"select": "id,odds_api_name"})}
    while True:
        page = db.select("games", {"select": "id,stage,game_date_et,start_time,home_team_id,away_team_id",
                                   "season": f"eq.{season}", "status": "eq.finished", "stage": "gt.1",
                                   "order": "start_time.asc", "limit": "1000", "offset": str(off)})
        games += page
        off += 1000
        if len(page) < 1000:
            break
    for g in games:
        g["home"], g["away"] = names[g["home_team_id"]], names[g["away_team_id"]]
    return games


def main():
    config.load_local_env()
    season, go = int(sys.argv[1]), "--go" in sys.argv
    out = ROOT / "research" / ".cache" / "odds" / str(season)
    out.mkdir(parents=True, exist_ok=True)
    games = our_games(season)
    days = sorted({g["game_date_et"] for g in games})
    done = {p.stem for p in out.glob("game_*.json")}
    todo = [g for g in games if f"game_{g['id']}" not in done]
    cost = len([d for d in days if not (out / f"events_{d}.json").exists()]) + COST_PER_GAME * len(todo)
    print(f"season {season}: {len(games)} games on {len(days)} days, {len(done)} already saved, "
          f"{len(todo)} to fetch, about {cost:,} credits")
    if not go:
        return

    api = OddsApi()
    unmatched = []
    for day in days:
        day_games = [g for g in todo if g["game_date_et"] == day]
        if not day_games:
            continue
        ev_file = out / f"events_{day}.json"
        if ev_file.exists():
            events = json.loads(ev_file.read_text(encoding="utf-8"))
        else:
            first = min(_utc(g["start_time"]) for g in games if g["game_date_et"] == day)
            events = api.get("/events", {"date": _iso(first - timedelta(hours=3))})
            ev_file.write_text(json.dumps(events), encoding="utf-8")
        for g in day_games:
            start = _utc(g["start_time"])
            match = [e for e in events.get("data", []) if e["home_team"] == g["home"] and e["away_team"] == g["away"]
                     and abs(_utc(e["commence_time"]) - start) <= timedelta(hours=6)]
            if len(match) != 1:
                unmatched.append((day, g["id"], g["away"], g["home"], len(match)))
                continue
            ev = match[0]
            if api.remaining is not None and api.remaining - COST_PER_GAME < KEEP_CREDITS:
                print(f"stopping: {api.remaining:,} credits left, keeping {KEEP_CREDITS:,}")
                break
            snap = _utc(ev["commence_time"]) - timedelta(minutes=MINUTES_BEFORE)
            odds = api.get(f"/events/{ev['id']}/odds", {"date": _iso(snap), "markets": ",".join(MARKETS),
                                                        "bookmakers": ",".join(BOOKS), "oddsFormat": "american"})
            (out / f"game_{g['id']}.json").write_text(json.dumps({"our_game": g, "event": ev, "odds": odds}), encoding="utf-8")
        else:
            print(f"{day}: done, {api.remaining:,} credits left, {len(unmatched)} not matched so far", flush=True)
            continue
        break
    (out / "unmatched.json").write_text(json.dumps(unmatched), encoding="utf-8")
    print(f"finished: {len(list(out.glob('game_*.json')))} games saved, {len(unmatched)} not matched, "
          f"{api.remaining:,} credits left")


if __name__ == "__main__":
    main()
