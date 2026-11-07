"""Download historical ALTERNATE player prop lines (points, rebounds, assists) from The Odds
API for chosen months of the 2025-26 season, to test the legacy engine's rules on the lines
it actually used.

  python research/odds/pull_alt.py                 plan only: games and credit cost
  python research/odds/pull_alt.py --one           download a single test game
  python research/odds/pull_alt.py --go            download every chosen game

Uses the Odds API event already matched and saved by pull_props.py
(research/.cache/odds/2025/game_<id>.json), so no event lists are paid for. Snapshot is the
same as the main-line pull: MINUTES_BEFORE minutes before tip. Regular season only.
Raw responses go to research/.cache/odds/2025_alt/ (not in git); saved games are skipped on
a rerun. Stops if credits would fall below KEEP_CREDITS.
"""
import json
import sys
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "research" / "odds"))
from backend import config  # noqa: E402
from pull_props import BOOKS, MINUTES_BEFORE, OddsApi, _iso, _utc  # noqa: E402

MARKETS = ["player_points_alternate", "player_rebounds_alternate", "player_assists_alternate"]
MONTHS = ("2025-11", "2025-12", "2026-03", "2026-04")
KEEP_CREDITS = 22_000
COST_PER_GAME = 10 * len(MARKETS)

SRC = ROOT / "research" / ".cache" / "odds" / "2025"
OUT = ROOT / "research" / ".cache" / "odds" / "2025_alt"


def chosen_games() -> list[dict]:
    games = []
    for f in sorted(SRC.glob("game_*.json")):
        saved = json.loads(f.read_text(encoding="utf-8"))
        g = saved["our_game"]
        if g["stage"] == 2 and g["game_date_et"][:7] in MONTHS:
            games.append({"our_game": g, "event": saved["event"]})
    return sorted(games, key=lambda x: x["our_game"]["start_time"])


def main():
    config.load_local_env()
    OUT.mkdir(parents=True, exist_ok=True)
    games = chosen_games()
    todo = [x for x in games if not (OUT / f"game_{x['our_game']['id']}.json").exists()]
    print(f"{len(games)} games in {', '.join(MONTHS)} (regular season), {len(games) - len(todo)} saved, "
          f"{len(todo)} to fetch, {COST_PER_GAME * len(todo):,} credits")
    if "--one" in sys.argv:
        todo = todo[:1]
    elif "--go" not in sys.argv:
        return

    api = OddsApi()
    for i, x in enumerate(todo, 1):
        g, ev = x["our_game"], x["event"]
        if api.remaining is not None and api.remaining - COST_PER_GAME < KEEP_CREDITS:
            print(f"stopping: {api.remaining:,} credits left, keeping {KEEP_CREDITS:,}")
            break
        snap = _utc(ev["commence_time"]) - timedelta(minutes=MINUTES_BEFORE)
        odds = api.get(f"/events/{ev['id']}/odds", {"date": _iso(snap), "markets": ",".join(MARKETS),
                                                    "bookmakers": ",".join(BOOKS), "oddsFormat": "american"})
        (OUT / f"game_{g['id']}.json").write_text(json.dumps({"our_game": g, "event": ev, "odds": odds}),
                                                  encoding="utf-8")
        if i % 25 == 0 or i == len(todo):
            print(f"{i}/{len(todo)} ({g['game_date_et']}), {api.remaining:,} credits left", flush=True)
    print(f"finished: {len(list(OUT.glob('game_*.json')))} games saved, {api.remaining:,} credits left")


if __name__ == "__main__":
    main()
