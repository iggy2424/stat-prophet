"""Strategy lab: rule-based prop strategies on 2025-26 main lines (no model needed).

  python research/odds/strategies.py

Settings are chosen on the development period (21 Oct 2025 to 31 Jan 2026) only; the
chosen setting of each strategy is then checked once on the holdout (1 Feb to 13 Jun 2026).
Returns are per 1 unit staked; 95% ranges resample whole games.

Strategies
  ev_pinnacle   a book's price beats Pinnacle's fair price (margin removed) on the same line
  ev_consensus  the same, against the other books' average fair price (3+ other books)
  off_line      a book's line is a point or more away from Pinnacle's: take the better side there
  legacy_main   the old engine's over rules (last 10 hit rate, average, minutes, downside
                volatility, trend), on main lines at the best price
  known_out     overs for players whose team is missing a regular who also missed the
                previous game (known before tip, so no hindsight)
  overreact     after a big game (last game far above the line) bet under; after a bad game, over
  b2b_under     unders on the second night of a back-to-back
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "research" / "projections"))
sys.path.insert(0, str(ROOT / "research" / "odds"))
from backend import config, db  # noqa: E402
from backend.names import search_name  # noqa: E402
import data  # noqa: E402
import features as F  # noqa: E402
from real_line_test import MARKET, ODDS, dec  # noqa: E402

DEV_END = pd.Timestamp("2026-02-01")
rng = np.random.default_rng(11)
STAT_KEY = {"player_points": "points", "player_rebounds": "rebounds", "player_assists": "assists", "player_threes": "threes"}
LEGACY_MIN_LINE = {"points": 10.5, "rebounds": 3.5, "assists": 2.5, "threes": 0}
LEGACY_CV_DOWN = {"points": 0.40, "rebounds": 0.45, "assists": 0.50, "threes": 0.50}


# ── Data ──────────────────────────────────────────────────────────────────────

def book_main_lines() -> pd.DataFrame:
    """One row per game, book, market, player: that book's main line and both prices."""
    rows = []
    for f in sorted(ODDS.glob("game_*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        for b in (d["odds"].get("data") or {}).get("bookmakers") or []:
            for m in b["markets"]:
                for o in m["outcomes"]:
                    if o.get("description") and o.get("point") is not None:
                        rows.append((d["our_game"]["id"], b["key"], m["key"], o["description"], o["name"], o["point"], o["price"]))
    df = pd.DataFrame(rows, columns=["game_id", "book", "market", "player", "side", "line", "price"])
    w = df.pivot_table(index=["game_id", "book", "market", "player", "line"], columns="side", values="price",
                       aggfunc="first").reset_index().dropna(subset=["Over", "Under"])
    w["dec_over"], w["dec_under"] = dec(w.Over), dec(w.Under)
    io, iu = 1 / w.dec_over, 1 / w.dec_under
    w["fair_over"] = io / (io + iu)
    w["balance"] = np.abs(io - iu)
    return w.sort_values("balance").groupby(["game_id", "book", "market", "player"], as_index=False).first()


def history(players: pd.DataFrame) -> dict:
    """player -> (dates, game ids, values per stat, minutes), oldest first, for last-10 rules."""
    p = players.sort_values(["player_id", "game_date_et", "game_id"])
    out = {}
    for pid, g in p.groupby("player_id"):
        out[pid] = {"date": g.game_date_et.to_numpy(), "game": g.game_id.to_numpy(),
                    "opp": g.opponent_id.to_numpy(), "minutes": g.minutes.to_numpy(float),
                    "points": g.points.to_numpy(float), "rebounds": g.tot_reb.to_numpy(float),
                    "assists": g.assists.to_numpy(float), "threes": g.tpm.to_numpy(float)}
    return out


def known_absences(p: pd.DataFrame) -> pd.DataFrame:
    """Per team game: recent points of regulars missing this game AND the team's previous game."""
    alpha = 1 - math.exp(math.log(0.5) / 10)
    ewm_min, ewm_pts, last_seen, prev_missing = {}, {}, {}, {}
    team_index, rows, season_now = {}, [], None
    for (season, _, game_id, team_id), box in p.sort_values(["game_date_et", "game_id"]).groupby(
            ["season", "game_date_et", "game_id", "team_id"], sort=False):
        if season != season_now:
            last_seen, team_index, prev_missing, season_now = {}, {}, {}, season
        idx = team_index.get(team_id, 0)
        present = set(box.player_id)
        missing = {pid for pid, (team, seen) in last_seen.items()
                   if team == team_id and pid not in present and idx - seen <= 5 and ewm_min[pid] >= 20}
        known = missing & prev_missing.get(team_id, set())
        rows.append((game_id, team_id, sum(ewm_pts[x] for x in known), sum(ewm_min[x] for x in known)))
        prev_missing[team_id] = missing
        for pid, m, pts in zip(box.player_id, box.minutes, box.points):
            ewm_min[pid] = m if pid not in ewm_min else ewm_min[pid] + alpha * (m - ewm_min[pid])
            ewm_pts[pid] = pts if pid not in ewm_pts else ewm_pts[pid] + alpha * (pts - ewm_pts[pid])
            last_seen[pid] = (team_id, idx)
        team_index[team_id] = idx + 1
    return pd.DataFrame(rows, columns=["game_id", "team_id", "known_out_pts", "known_out_min"])


def legacy_over(h: dict, i: int, stat: str, line: float) -> bool:
    """The old engine's over gates and score (>= 75), using the player's 10 games before index i."""
    lo = max(0, i - 10)
    vals, mins = h[stat][lo:i], h["minutes"][lo:i]
    n = len(vals)
    if line < LEGACY_MIN_LINE[stat] or n < 6 or vals.mean() <= line or mins.mean() < 20:
        return False
    below = vals[vals <= line]
    if n >= 5 and len(below) >= 2 and np.std(below, ddof=1) / line > LEGACY_CV_DOWN[stat]:
        return False
    if n >= 5 and len(below) == 1 and (line - below[0]) / line > 0.40:
        return False
    hr = (vals > line).mean()
    p1 = 40 if hr >= 1 else 35 if hr >= .9 else 25 if hr >= .8 else 15 if hr >= .7 else None
    if p1 is None:
        return False
    vs = h[stat][:i][h["opp"][:i] == h["opp"][i]]  # earlier games against tonight's opponent
    if len(vs) >= 4:
        opp_hr = (vs > line).mean()
        if opp_hr < .5:
            return False
        p2 = 40 if opp_hr >= .75 else 28
    elif len(vs) >= 1:
        p2 = 25 if (vs > line).mean() >= .5 else 15
    else:
        p2 = 20
    mid = n // 2
    ratio = vals[mid:].mean() / max(vals[:mid].mean(), 0.001)
    p3 = 30 if ratio > 1.05 else 20 if ratio >= .9 else 10 if ratio >= .8 else None
    if p3 is None:
        return False
    bonus = 5 if np.std(vals, ddof=1) / vals.mean() < .15 and hr >= .9 else 0
    return p1 + p2 + p3 + bonus >= 75


# ── Scoring ───────────────────────────────────────────────────────────────────

def settle(bets: pd.DataFrame) -> pd.DataFrame:
    """bets: game_id, side, line, price (decimal), actual. Adds profit per unit."""
    won = np.where(bets.side == "over", bets.actual > bets.line, bets.actual < bets.line)
    return bets.assign(profit=np.where(won, bets.price - 1, -1.0))


def summary(b: pd.DataFrame) -> dict:
    if b.empty:
        return {"n": 0}
    g = b.groupby("game_id").profit.agg(["sum", "count"])
    s, c = g["sum"].to_numpy(), g["count"].to_numpy()
    boot = [s[i].sum() / c[i].sum() for i in (rng.integers(0, len(s), len(s)) for _ in range(2000))]
    lo, hi = np.percentile(boot, [2.5, 97.5])
    return {"n": len(b), "won": float((b.profit > 0).mean()), "roi": float(b.profit.mean()),
            "units": float(b.profit.sum()), "lo": float(lo), "hi": float(hi)}


def fmt(s: dict) -> str:
    if not s["n"]:
        return "no bets"
    return (f"{s['n']:6,} bets, won {s['won']:.1%}, return {s['roi']:+.1%} ({s['units']:+.0f} units), "
            f"95% range {s['lo']:+.1%} to {s['hi']:+.1%}")


def run(name: str, grid: dict, make):
    """grid: label -> settings; make(settings) -> settled bets with game_date_et."""
    print(f"\n--- {name}")
    best, best_roi = None, -9
    for label, settings in grid.items():
        b = make(settings)
        dev = summary(b[b.game_date_et < DEV_END])
        print(f"  dev  {label:<34} {fmt(dev)}")
        if dev["n"] >= 150 and dev["roi"] > best_roi:
            best, best_roi = label, dev["roi"]
    if best is None:
        print("  no setting had 150+ development bets")
        return
    b = make(grid[best])
    print(f"  HOLDOUT, setting chosen on dev = {best}: {fmt(summary(b[b.game_date_et >= DEV_END]))}")


def main():
    config.load_local_env()
    print("loading lines and box scores...", flush=True)
    books = book_main_lines()
    players, _ = data.load()
    df = F.build(players)
    names = {r["id"]: search_name(r["full_name"]) for r in db.select("players", {"select": "id,full_name"})}
    df["sname"] = df.player_id.map(names)
    season = df[df.season == 2025]
    books["sname"] = books.player.map(search_name)
    last = season.assign(last=season.sname.str.split().str[-1]).groupby(["game_id", "last"])["sname"].agg(list)
    lost = ~books.sname.isin(set(names.values()))
    books.loc[lost, "sname"] = [
        (lambda c: c[0] if len(c) == 1 else s)(last.get((g, (s.split() or [""])[-1]), []))
        for g, s in zip(books.game_id[lost], books.sname[lost])]
    cols = ["game_id", "sname", "player_id", "team_id", "game_date_et", "points", "tot_reb", "assists", "tpm",
            "rest_days", "minutes_ewm3"]
    books = books.merge(season[cols], on=["game_id", "sname"], how="inner")
    books = books.merge(known_absences(players), on=["game_id", "team_id"], how="left")
    books["stat"] = books.market.map(STAT_KEY)
    books["actual"] = np.select([books.stat == s for s in STAT_KEY.values()],
                                [books.points, books.tot_reb, books.assists, books.tpm])
    books = books[books.line % 1 != 0]  # no pushes
    pin = books[books.book == "pinnacle"].set_index(["game_id", "market", "player_id"])[["line", "fair_over"]]
    pin.columns = ["pin_line", "pin_over"]
    books = books.join(pin, on=["game_id", "market", "player_id"])
    key = ["game_id", "market", "player_id"]
    cons = books.groupby(key).line.agg(lambda s: s.mode().median()).rename("cline")
    books = books.join(cons, on=key)
    print(f"  {len(books):,} book lines, {books.groupby(key).ngroups:,} props, "
          f"{books.pin_line.notna().groupby([books[k] for k in key]).any().sum():,} with a Pinnacle line")

    # One prop row: consensus line with average and best prices among books at it
    at = books[books.line == books.cline]
    props = at.groupby(key).agg(line=("line", "first"), actual=("actual", "first"), stat=("stat", "first"),
                                game_date_et=("game_date_et", "first"), best_over=("dec_over", "max"),
                                best_under=("dec_under", "max"), avg_over=("dec_over", "mean"),
                                avg_under=("dec_under", "mean"), fair_over=("fair_over", "mean"),
                                rest_days=("rest_days", "first"), known_out_pts=("known_out_pts", "first"),
                                minutes_ewm3=("minutes_ewm3", "first"), team_id=("team_id", "first")).reset_index()

    def bet(rows, side, price_col):
        return settle(pd.DataFrame({"game_id": rows.game_id, "game_date_et": rows.game_date_et, "side": side,
                                    "line": rows.line, "price": rows[price_col], "actual": rows.actual}))

    # 1. +EV against Pinnacle, same line, best book per prop and side
    same = books[(books.book != "pinnacle") & (books.line == books.pin_line)]
    def ev_pin(s):
        ev_o = same.pin_over * same.dec_over - 1
        ev_u = (1 - same.pin_over) * same.dec_under - 1
        o = same[ev_o >= s["ev"]].assign(ev=ev_o).sort_values("ev").groupby(key).tail(1)
        u = same[ev_u >= s["ev"]].assign(ev=ev_u).sort_values("ev").groupby(key).tail(1)
        return pd.concat([bet(o, "over", "dec_over"), bet(u, "under", "dec_under")])
    run("ev_pinnacle: price beats Pinnacle's fair price", {f"EV {x:.0%}+": {"ev": x} for x in (0.0, 0.02, 0.04, 0.06)}, ev_pin)

    # 2. +EV against the other books' average fair price (book itself left out)
    g = books.groupby(key + ["line"]).fair_over.agg(["sum", "count"]).rename(columns={"sum": "fsum", "count": "fcnt"})
    other = books.join(g, on=key + ["line"])
    other["others_over"] = (other.fsum - other.fair_over) / (other.fcnt - 1)
    other = other[other.fcnt - 1 >= 3]
    def ev_cons(s):
        ev_o = other.others_over * other.dec_over - 1
        ev_u = (1 - other.others_over) * other.dec_under - 1
        o = other[ev_o >= s["ev"]].assign(ev=ev_o).sort_values("ev").groupby(key).tail(1)
        u = other[ev_u >= s["ev"]].assign(ev=ev_u).sort_values("ev").groupby(key).tail(1)
        return pd.concat([bet(o, "over", "dec_over"), bet(u, "under", "dec_under")])
    run("ev_consensus: price beats the other books' fair price", {f"EV {x:.0%}+": {"ev": x} for x in (0.0, 0.02, 0.04, 0.06)}, ev_cons)

    # 3. Line a point or more away from Pinnacle's
    off = books[(books.book != "pinnacle") & books.pin_line.notna()]
    def off_line(s):
        lo = off[off.line <= off.pin_line - s["gap"]].sort_values("dec_over").groupby(key).tail(1)
        hi = off[off.line >= off.pin_line + s["gap"]].sort_values("dec_under").groupby(key).tail(1)
        return pd.concat([bet(lo, "over", "dec_over"), bet(hi, "under", "dec_under")])
    run("off_line: book's line away from Pinnacle's", {f"gap {x}+": {"gap": x} for x in (0.5, 1.0, 1.5, 2.0)}, off_line)

    # 4. The old engine's over rules on main lines, best price, price no worse than -300
    hist = history(players)
    pos = {pid: {gid: i for i, gid in enumerate(h["game"])} for pid, h in hist.items()}
    props["legacy"] = [legacy_over(hist[p], pos[p][gm], s, ln) if s != "threes" else False
                       for p, gm, s, ln in zip(props.player_id, props.game_id, props.stat, props.line)]
    def legacy(s):
        r = props[props.legacy & (props.best_over >= s["min_dec"])]
        if s.get("no_assists"):
            r = r[r.stat != "assists"]
        return bet(r, "over", "best_over")
    run("legacy_main: old engine's over rules on main lines", {
        "all, price -300 or better": {"min_dec": 1 + 100 / 300},
        "all, price -200 or better": {"min_dec": 1.5},
        "no assists, -300 or better": {"min_dec": 1 + 100 / 300, "no_assists": True}}, legacy)

    # 5. Known absences: overs for rotation players whose team lost a regular before tonight
    def known(s):
        r = props[(props.known_out_pts >= s["pts"]) & (props.minutes_ewm3 >= 20)]
        return bet(r, "over", "best_over")
    run("known_out: teammate out since the previous game, over", {f"missing {x}+ pts": {"pts": x} for x in (5, 10, 15, 20)}, known)

    # 6. Overreaction to the last game
    props["last_val"] = [hist[p][s][pos[p][gm] - 1] if pos[p][gm] > 0 else np.nan
                         for p, gm, s in zip(props.player_id, props.game_id, props.stat)]
    def overreact(s):
        big = props[props.last_val >= props.line * (1 + s["x"])]
        bad = props[props.last_val <= props.line * (1 - s["x"])]
        return pd.concat([bet(big, "under", "best_under"), bet(bad, "over", "best_over")])
    run("overreact: fade the last game", {f"last game {x:.0%}+ off the line": {"x": x} for x in (0.3, 0.5, 0.75)}, overreact)

    # 7. Second night of a back-to-back: unders
    def b2b(s):
        r = props[props.rest_days == 1]
        if s["stat"] != "all":
            r = r[r.stat == s["stat"]]
        return bet(r, "under", "best_under")
    run("b2b_under: second night of a back-to-back", {k: {"stat": k} for k in ("all", "points", "rebounds", "assists", "threes")}, b2b)


if __name__ == "__main__":
    main()
