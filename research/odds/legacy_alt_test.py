"""The old engine's over picks, replayed on 2025-26 alternate lines.

  python research/odds/legacy_alt_test.py

Lines: research/.cache/odds/2025_alt/ (pull_alt.py), about 60 minutes before tip, 6 US books.
Box scores: research/.cache (projections/data.py). Only games before the pick's date are used.

A faithful port of the legacy engine (stat-prophet-legacy/api/index.py, picks loop and
_score_pick), in two versions:
  REG  regular season rules as of 9-14 Apr 2026 (odds -250, 75% points-only 70% tier, H2H 30/20, 18/12)
  PO   playoff rules from 15 Apr 2026, the final code (odds -300, 70% tier all stats, H2H 40/28, 25/15)
Both: alternate points / rebounds / assists, best over price across books per line; last 10 =
the player's games (minutes > 0) among his team's last 10 finished games this season; start at
the highest line under that average and take the first line that passes every gate; at most 6
picks per game by score; opponent defence rank from its last 20 games when there is no H2H.
Players who did not play are void (refunded) and left out. Returns per 1 unit; 95% ranges
resample whole games.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "research" / "projections"))
from backend import config, db  # noqa: E402
from backend.names import search_name  # noqa: E402
import data  # noqa: E402

ALT = ROOT / "research" / ".cache" / "odds" / "2025_alt"
OUT = ROOT / "research" / "odds" / "legacy_alt_2025-26.txt"
SEASON = 2025
MARKET = {"player_points_alternate": "points", "player_rebounds_alternate": "rebounds",
          "player_assists_alternate": "assists"}
COL = {"points": "points", "rebounds": "tot_reb", "assists": "assists"}
MIN_LINE = {"points": 10.5, "rebounds": 3.5, "assists": 2.5}
CV_DOWN_MAX = {"points": 0.40, "rebounds": 0.45, "assists": 0.50}
VERSIONS = {
    "REG": {"odds": -250, "tier70": "points75", "h2h4": (30, 20), "h2h13": (18, 12)},
    "PO": {"odds": -300, "tier70": "all70", "h2h4": (40, 28), "h2h13": (25, 15)},
}
rng = np.random.default_rng(7)
lines_out = []


def say(s=""):
    print(s, flush=True)
    lines_out.append(s)


def dec(american: float) -> float:
    return 1 + (american / 100 if american > 0 else 100 / -american)


# ── Inputs ────────────────────────────────────────────────────────────────────

def alt_lines():
    """game -> (our_game, {(player name, stat): {line: (best over price, book)}})."""
    out = {}
    for f in sorted(ALT.glob("game_*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        ladder = defaultdict(dict)
        for b in (d["odds"].get("data") or {}).get("bookmakers") or []:
            for m in b["markets"]:
                stat = MARKET.get(m["key"])
                for o in m["outcomes"] if stat else []:
                    if o["name"] != "Over" or o.get("point") is None or not o.get("description"):
                        continue
                    k, pt = (o["description"], stat), float(o["point"])
                    if pt not in ladder[k] or o["price"] > ladder[k][pt][0]:
                        ladder[k][pt] = (o["price"], b["key"])
        out[d["our_game"]["id"]] = (d["our_game"], ladder)
    return out


def defence_ranks(teams: pd.DataFrame):
    """date -> team -> stat -> rank (0 = allows least, 1 = allows most), last 20 games before date."""
    t = teams[teams.season == SEASON].sort_values("game_date_et")
    opp = t.merge(t[["game_id", "team_id", "points", "tot_reb", "assists"]].rename(
        columns={"team_id": "opponent_id", "points": "o_pts", "tot_reb": "o_reb", "assists": "o_ast"}),
        on=["game_id", "opponent_id"])
    cache = {}

    def at(date):
        if date not in cache:
            before = opp[opp.game_date_et < date].groupby("team_id").tail(20)
            avg = before.groupby("team_id")[["o_pts", "o_reb", "o_ast"]].mean()
            ranks = {}
            for stat, c in (("points", "o_pts"), ("rebounds", "o_reb"), ("assists", "o_ast")):
                order = avg[c].sort_values().index.tolist()
                n = len(order)
                for i, tid in enumerate(order):
                    ranks.setdefault(tid, {})[stat] = i / (n - 1) if n > 1 else 0.5
            cache[date] = ranks
        return cache[date]
    return at


# ── The legacy rules ──────────────────────────────────────────────────────────

def score_pick(v: dict, line: float, stat: str, opp_vals: np.ndarray, def_rank, rules: dict):
    """legacy _score_pick: (score, tier) or None."""
    vals, mins = v["vals"], v["mins"]
    n = len(vals)
    avg = vals.mean()
    if line < MIN_LINE[stat] or n < 6 or avg <= line or mins.mean() < 20:
        return None
    below = vals[vals <= line]
    if len(below) >= 2 and np.std(below, ddof=1) / line > CV_DOWN_MAX[stat]:
        return None
    if len(below) == 1 and (line - below[0]) / line > 0.40:
        return None
    hr = (vals > line).mean()
    if hr >= 1.0:
        p1 = 40
    elif hr >= 0.9:
        p1 = 35
    elif hr >= 0.8:
        p1 = 25
    elif rules["tier70"] == "all70" and hr >= 0.7:
        p1 = 15
    elif rules["tier70"] == "points75" and hr >= 0.75 and stat == "points":
        p1 = 15
    else:
        return None
    n_opp = len(opp_vals)
    if n_opp >= 4:
        ohr = (opp_vals > line).mean()
        if ohr >= 0.75:
            p2 = rules["h2h4"][0]
        elif ohr >= 0.5:
            p2 = rules["h2h4"][1]
        else:
            return None
    elif n_opp >= 1:
        p2 = rules["h2h13"][0] if (opp_vals > line).mean() >= 0.5 else rules["h2h13"][1]
    elif def_rank is not None:
        p2 = 25 if def_rank >= 0.70 else 20 if def_rank >= 0.40 else 14
    else:
        p2 = 20
    mid = n // 2
    ratio = vals[mid:].mean() / max(vals[:mid].mean(), 0.001)
    if ratio > 1.05:
        p3 = 30
    elif ratio >= 0.90:
        p3 = 20
    elif ratio >= 0.80:
        p3 = 10
    else:
        return None
    bonus = 5 if avg > 0 and np.std(vals, ddof=1) / avg < 0.15 and hr >= 0.9 else 0
    total = p1 + p2 + p3 + bonus
    if total < 75:
        return None
    return total, "ELITE LOCK" if total >= 90 else "STRONG PICK" if total >= 80 else "SOLID VALUE"


# ── Scoring ───────────────────────────────────────────────────────────────────

def summary(b: pd.DataFrame) -> str:
    if b.empty:
        return "no bets"
    g = b.groupby("game_id").profit.agg(["sum", "count"])
    s, c = g["sum"].to_numpy(), g["count"].to_numpy()
    boot = [s[i].sum() / c[i].sum() for i in (rng.integers(0, len(s), len(s)) for _ in range(2000))]
    lo, hi = np.percentile(boot, [2.5, 97.5])
    decided = b[b.result != "push"]
    return (f"{len(b):5,} bets, won {(decided.result == 'win').mean():.1%}, avg price {b.price.median():.2f}, "
            f"return {b.profit.mean():+.1%} ({b.profit.sum():+.1f} units), 95% range {lo:+.1%} to {hi:+.1%}")


def main():
    config.load_local_env()
    players, teams = data.load()
    p = players[(players.season == SEASON) & (players.minutes > 0)].sort_values(["game_date_et", "game_id"])
    t = teams[teams.season == SEASON].sort_values(["game_date_et", "game_id"])
    team_games = {tid: g[["game_id", "game_date_et", "opponent_id"]].to_numpy() for tid, g in t.groupby("team_id")}
    by_pt = {k: g for k, g in p.groupby(["player_id", "team_id"])}
    played = {(r.game_id, r.player_id): r for r in p.itertuples()}
    names = {r["id"]: search_name(r["full_name"]) for r in db.select("players", {"select": "id,full_name"})}
    roster = p.groupby("team_id").player_id.agg(lambda s: set(s))
    rank_at = defence_ranks(teams)
    games = alt_lines()
    say(f"Old engine replay on alternate lines, 2025-26 regular season: {len(games)} games")
    say(f"months: {sorted({g['game_date_et'][:7] for g, _ in games.values()})}")

    picks = {v: [] for v in VERSIONS}
    stats = defaultdict(int)
    for gid, (g, ladder) in games.items():
        date = pd.Timestamp(g["game_date_et"])
        home, away = g["home_team_id"], g["away_team_id"]
        cand = {tid: {names.get(pid): pid for pid in roster.get(tid, set())} for tid in (home, away)}
        ranks = rank_at(date)
        found = {}
        for (pname, stat), lad in ladder.items():
            stats["props"] += 1
            s = search_name(pname)
            hit = [(tid, cand[tid][s]) for tid in (home, away) if s in cand[tid]]
            if not hit:  # nickname: unique last name across both teams
                last = s.split()[-1] if s else ""
                hit = [(tid, pid) for tid in (home, away) for nm, pid in cand[tid].items()
                       if nm and nm.split()[-1] == last]
            if len(hit) != 1:
                stats["name not matched"] += 1
                continue
            found[(pname, stat)] = hit[0]
        for version, rules in VERSIONS.items():
            game_picks = []
            for (pname, stat), (tid, pid) in found.items():
                tg = team_games[tid]
                last10 = [x[0] for x in tg if x[1] < date][-10:]
                hist = by_pt.get((pid, tid))
                if hist is None:
                    continue
                h = hist[hist.game_date_et < date]
                l10 = h[h.game_id.isin(last10)]
                if l10.empty:
                    continue
                v = {"vals": l10[COL[stat]].to_numpy(float), "mins": l10.minutes.to_numpy(float)}
                opp = home if tid == away else away
                opp_vals = h[h.opponent_id == opp][COL[stat]].to_numpy(float)
                def_rank = ranks.get(opp, {}).get(stat)
                avg = v["vals"].mean()
                for line in sorted((x for x in ladder[(pname, stat)] if avg > x), reverse=True):
                    price, book = ladder[(pname, stat)][line]
                    if price < rules["odds"]:
                        continue
                    sc = score_pick(v, line, stat, opp_vals, def_rank, rules)
                    if sc:
                        game_picks.append({"game_id": gid, "date": date, "player_id": pid, "player": pname,
                                           "stat": stat, "line": line, "american": price, "book": book,
                                           "score": sc[0], "tier": sc[1]})
                        break
            game_picks.sort(key=lambda x: -x["score"])
            picks[version] += game_picks[:6]
    say(f"props with lines: {stats['props']:,}; names not matched: {stats['name not matched']:,}")

    out = {}
    for version, rows in picks.items():
        b = pd.DataFrame(rows)
        pl = [played.get((r.game_id, r.player_id)) for r in b.itertuples()]
        b["actual"] = [getattr(x, COL[s]) if x is not None else np.nan for x, s in zip(pl, b.stat)]
        void = b.actual.isna()
        b = b[~void].copy()
        b["price"] = b.american.map(dec)
        b["result"] = np.where(b.actual > b.line, "win", np.where(b.actual == b.line, "push", "loss"))
        b["profit"] = np.select([b.result == "win", b.result == "push"], [b.price - 1, 0.0], -1.0)
        out[version] = b
        rules = VERSIONS[version]
        say(f"\n=== {version}: odds limit {rules['odds']}, {'70% tier all stats' if rules['tier70'] == 'all70' else '75% tier points only'}, "
            f"H2H {rules['h2h4']}/{rules['h2h13']}  ({int(void.sum())} void: player did not play)")
        say(f"  ALL               {summary(b)}")
        say(f"  Nov-Dec 2025      {summary(b[b.date < '2026-01-01'])}")
        say(f"  Mar-Apr 2026      {summary(b[b.date >= '2026-01-01'])}")
        for m in sorted(b.date.dt.strftime('%Y-%m').unique()):
            say(f"    {m}         {summary(b[b.date.dt.strftime('%Y-%m') == m])}")
        for s in MIN_LINE:
            say(f"  {s:<17} {summary(b[b.stat == s])}")
        for tier in ("ELITE LOCK", "STRONG PICK", "SOLID VALUE"):
            say(f"  {tier:<17} {summary(b[b.tier == tier])}")
        for lo, hi, lab in ((-300, -200, "-300 to -201"), (-200, -150, "-200 to -151"), (-150, -110, "-150 to -111"),
                            (-110, 10000, "-110 or better")):
            say(f"  odds {lab:<12} {summary(b[(b.american >= lo) & (b.american < hi)])}")
        for bk in sorted(b.book.unique()):
            say(f"  book {bk:<12} {summary(b[b.book == bk])}")
        say(f"  picks per game day: {b.groupby('date').size().median():.0f} (median)")

    # Does the replay reproduce the live record? Regular season overlap 11 Mar to 14 Apr 2026.
    live = pd.DataFrame(db.select("pick_history", {"select": "pick_date,game_id,player_name,stat,line,over_odds,result",
                                                   "pick_date": "gte.2026-03-11", "limit": "5000"}))
    live = live[(live.pick_date <= "2026-04-14") & live.game_id.isin(list(games))]
    live["key"] = live.player_name.map(search_name) + "|" + live.stat
    say(f"\n=== Live picks vs replay, regular season games 11 Mar to 14 Apr 2026 in this sample")
    settled = live[live.result.isin(["win", "loss"])]
    lp = np.where(settled.result == "win", settled.over_odds.map(dec) - 1, -1.0)
    say(f"  live: {len(live)} picks, {len(settled)} settled, won {(settled.result == 'win').mean():.1%}, return {lp.mean():+.1%}")
    for version, b in out.items():
        r = b[(b.date >= "2026-03-11") & (b.date <= "2026-04-14")]
        rk = set(zip(r.game_id, r.player.map(search_name) + "|" + r.stat))
        lk = set(zip(live.game_id, live.key))
        same_line = len(set(zip(r.game_id, r.player.map(search_name) + "|" + r.stat, r.line))
                        & set(zip(live.game_id, live.key, live.line)))
        say(f"  {version}: {len(r)} picks, {summary(r)}")
        say(f"       same player+stat as live: {len(rk & lk)} ({len(rk & lk) / max(len(lk), 1):.0%} of live picks), "
            f"same line too: {same_line}")
    OUT.write_text("\n".join(lines_out) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
