"""Download historical game lines (moneyline, spread, total) from The Odds API.

  python research/odds/pull_game_lines.py           plan only: snapshots and credit cost
  python research/odds/pull_game_lines.py --one     the first snapshot only (cost and match check)
  python research/odds/pull_game_lines.py --go      everything

Games: the holdout games of the injury backtest (research/injuries/backtest.py, its cache
research/.cache/injury_backtest.pkl): 2025-26 regular season from 1 Feb 2026, and 2026-27.
Snapshots: one per group of tip times on a day (a group starts at a tip and takes every tip
within the next 60 minutes), taken 60 minutes before the group's first tip, so each game's
lines are 60 to 120 minutes before tip. One historical /odds call returns every game, and
costs 10 per market for 1 region (BOOKS bill as one region) = 30 credits.

Raw responses go to research/.cache/odds/game_lines/ (not in git); a stopped run restarts
without paying twice. Stops if credits would fall below KEEP_CREDITS.
"""
import json
import sys
from datetime import timedelta
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from backend import config  # noqa: E402
from pull_props import BOOKS, OddsApi, _iso, _utc, our_games  # noqa: E402

MARKETS = ["h2h", "spreads", "totals"]
COST = 10 * len(MARKETS)
KEEP_CREDITS = 17_000
GROUP = timedelta(minutes=60)
OUT = ROOT / "research" / ".cache" / "odds" / "game_lines"


def snapshots() -> list[tuple[str, list[dict]]]:
    bt = pd.read_pickle(ROOT / "research" / ".cache" / "injury_backtest.pkl")
    want = set(bt[(bt.season == 2026) | (bt.day >= "2026-02-01")].game_id)
    games = [g for s in (2025, 2026) for g in our_games(s) if g["id"] in want]
    out = []
    for day in sorted({g["game_date_et"] for g in games}):
        group, first = [], None
        for g in sorted((g for g in games if g["game_date_et"] == day), key=lambda g: g["start_time"]):
            t = _utc(g["start_time"])
            if first is not None and t - first > GROUP:
                out.append((_iso(first - timedelta(minutes=60)), group))
                group, first = [], None
            if first is None:
                first = t
            group.append(g)
        out.append((_iso(first - timedelta(minutes=60)), group))
    return out


def main():
    config.load_local_env()
    OUT.mkdir(parents=True, exist_ok=True)
    snaps = snapshots()
    todo = [s for s in snaps if not (OUT / f"snap_{s[0].replace(':', '')}.json").exists()]
    n_games = sum(len(g) for _, g in snaps)
    print(f"{n_games} games, {len(snaps)} snapshots, {len(todo)} to fetch, {COST * len(todo):,} credits")
    if "--one" not in sys.argv and "--go" not in sys.argv:
        return
    if "--one" in sys.argv:
        todo = todo[:1]

    api = OddsApi()
    unmatched = []
    for when, group in todo:
        if api.remaining is not None and api.remaining - COST < KEEP_CREDITS:
            print(f"stopping: {api.remaining:,} credits left, keeping {KEEP_CREDITS:,}")
            break
        before = api.remaining
        resp = api.get("/odds", {"date": when, "markets": ",".join(MARKETS), "bookmakers": ",".join(BOOKS),
                                 "oddsFormat": "american"})
        matched = {}
        for g in group:
            ev = [e for e in resp.get("data", []) if e["home_team"] == g["home"] and e["away_team"] == g["away"]
                  and abs(_utc(e["commence_time"]) - _utc(g["start_time"])) <= timedelta(hours=6)]
            if len(ev) == 1:
                matched[g["id"]] = ev[0]
            else:
                unmatched.append((g["id"], g["game_date_et"], g["away"], g["home"], len(ev)))
        (OUT / f"snap_{when.replace(':', '')}.json").write_text(
            json.dumps({"snapshot": when, "timestamp": resp.get("timestamp"), "games": group,
                        "events": {str(k): v for k, v in matched.items()}}), encoding="utf-8")
        cost = f", cost {before - api.remaining}" if before is not None else ""
        print(f"{when}: {len(matched)}/{len(group)} matched, {api.remaining:,} credits left{cost}", flush=True)
    (OUT / "unmatched.json").write_text(json.dumps(unmatched), encoding="utf-8")
    print(f"done: {len(list(OUT.glob('snap_*.json')))} snapshots saved, {len(unmatched)} games not matched this run")


if __name__ == "__main__":
    main()
