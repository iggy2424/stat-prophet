"""Game model against sportsbook spreads, totals and moneylines (holdout games only).

  python research/odds/game_lines_test.py

Lines: research/odds/pull_game_lines.py (7 books, 60-120 minutes before tip).
Models (research/injuries/backtest.py, its cache injury_backtest.pkl, built from games
before each date only):
  v1      ratings-v1 as live
  injury  v1 margin + K_MARGIN x (home adj - away adj); total + K_TOTAL x (home + away adj)
Games: 2025-26 regular season from 1 Feb 2026 and 2026-27 so far (neither used for tuning).

Rules, fixed before seeing any result:
  line     the most common line across books; price = average over books at that line
  spread   edge = model margin + home spread line; bet home if edge >= 3 points, away if <= -3
  total    edge = model total - line; over if >= 5, under if <= -5
  money    model win chance vs Pinnacle's with its margin removed; bet a side when the model
           is 5 points higher, at the average price across books
  1 unit a bet, pushes return the stake. 95% ranges resample whole games.
Other thresholds are shown as secondary rows (read with the number of rows in mind).
"""
import json
from pathlib import Path
from statistics import mode

import numpy as np
import pandas as pd
from scipy.stats import norm

ROOT = Path(__file__).resolve().parents[2]
LINES = ROOT / "research" / ".cache" / "odds" / "game_lines"
K_MARGIN, K_TOTAL, MARGIN_SD = 0.305, 0.335, 14.9  # from research/injuries/results_2026-11-10.txt
MAIN = {"spread": 3.0, "total": 5.0, "money": 0.05}
SECONDARY = {"spread": [1.5, 5.0], "total": [3.0, 8.0], "money": [0.0, 0.10]}
rng = np.random.default_rng(7)


def dec(a: float) -> float:
    return 1 + a / 100 if a > 0 else 1 + 100 / abs(a)


def lines() -> pd.DataFrame:
    rows = []
    for f in sorted(LINES.glob("snap_*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        for gid, ev in d["events"].items():
            home, away = ev["home_team"], ev["away_team"]
            spread, total, h2h = [], [], {}
            for b in ev["bookmakers"]:
                for m in b["markets"]:
                    o = {x["name"]: x for x in m["outcomes"]}
                    if m["key"] == "spreads" and home in o and away in o:
                        spread.append((o[home]["point"], o[home]["price"], o[away]["price"]))
                    elif m["key"] == "totals" and "Over" in o and "Under" in o:
                        total.append((o["Over"]["point"], o["Over"]["price"], o["Under"]["price"]))
                    elif m["key"] == "h2h" and home in o and away in o:
                        h2h[b["key"]] = (o[home]["price"], o[away]["price"])
            r = {"game_id": int(gid)}
            if spread:
                line = mode(s[0] for s in spread)
                at = [s for s in spread if s[0] == line]
                r.update(spread_line=line, spread_home=np.mean([dec(s[1]) for s in at]),
                         spread_away=np.mean([dec(s[2]) for s in at]))
            if total:
                line = mode(t[0] for t in total)
                at = [t for t in total if t[0] == line]
                r.update(total_line=line, over=np.mean([dec(t[1]) for t in at]), under=np.mean([dec(t[2]) for t in at]))
            if h2h:
                r.update(ml_home=np.mean([dec(v[0]) for v in h2h.values()]),
                         ml_away=np.mean([dec(v[1]) for v in h2h.values()]))
                if "pinnacle" in h2h:
                    ih, ia = (1 / dec(x) for x in h2h["pinnacle"])
                    r["pin_home"] = ih / (ih + ia)
            rows.append(r)
    return pd.DataFrame(rows)


def bets(df: pd.DataFrame, model: str, market: str, t: float) -> pd.DataFrame:
    m = df[f"{model}_margin"]
    real_m = df.home_pts - df.away_pts
    if market == "spread":
        edge = m + df.spread_line
        side = np.sign(edge).where(edge.abs() >= t, 0)
        cover = real_m + df.spread_line  # > 0 home covers
        price = np.where(side > 0, df.spread_home, df.spread_away)
        res = np.sign(cover) * side
    elif market == "total":
        tot = df[f"{model}_total"]
        edge = tot - df.total_line
        side = np.sign(edge).where(edge.abs() >= t, 0)
        res = np.sign(df.home_pts + df.away_pts - df.total_line) * side
        price = np.where(side > 0, df.over, df.under)
    else:
        p = norm.cdf(m / MARGIN_SD)
        side = pd.Series(np.where(p - df.pin_home >= max(t, 1e-9), 1,
                                  np.where((1 - p) - (1 - df.pin_home) >= max(t, 1e-9), -1, 0)), index=df.index)
        res = np.sign(real_m) * side
        price = np.where(side > 0, df.ml_home, df.ml_away)
    profit = np.where(res > 0, price - 1, np.where(res < 0, -1.0, 0.0))
    out = pd.DataFrame({"game_id": df.game_id, "side": side, "profit": profit, "won": res > 0, "push": res == 0})
    return out[out.side != 0]


def summary(b: pd.DataFrame) -> str:
    if b.empty:
        return "no bets"
    n = len(b)
    roi = b.profit.mean()
    boot = [rng.choice(b.profit.values, n).mean() for _ in range(2000)]
    lo, hi = np.percentile(boot, [2.5, 97.5])
    decided = (~b.push).sum()
    return (f"{n:4d} bets  won {b.won.sum() / max(decided, 1):5.1%}  return {roi:+6.1%} "
            f"(95% {lo:+.1%} to {hi:+.1%})")


def main():
    bt = pd.read_pickle(ROOT / "research" / ".cache" / "injury_backtest.pkl")
    bt = bt[(bt.season == 2026) | (bt.day >= "2026-02-01")]
    df = bt.merge(lines(), on="game_id")
    df["v1_margin"] = df.v1_home - df.v1_away
    df["v1_total"] = df.v1_home + df.v1_away
    df["injury_margin"] = df.v1_margin + K_MARGIN * (df.adj_home - df.adj_away)
    df["injury_total"] = df.v1_total + K_TOTAL * (df.adj_home + df.adj_away)
    real_m, real_t = df.home_pts - df.away_pts, df.home_pts + df.away_pts
    print(f"{len(df)} of {len(bt)} holdout games have lines "
          f"({df.spread_line.notna().sum()} spread, {df.total_line.notna().sum()} total, "
          f"{df.pin_home.notna().sum()} Pinnacle moneyline)\n")

    print("How close is each to the real result (average points off)?")
    print(f"  margin: market {(-df.spread_line - real_m).abs().mean():.2f}   v1 {(df.v1_margin - real_m).abs().mean():.2f}"
          f"   injury {(df.injury_margin - real_m).abs().mean():.2f}")
    print(f"  total:  market {(df.total_line - real_t).abs().mean():.2f}   v1 {(df.v1_total - real_t).abs().mean():.2f}"
          f"   injury {(df.injury_total - real_t).abs().mean():.2f}")
    won = (real_m > 0).astype(float)
    sub = df.pin_home.notna()
    won = won[sub]
    ll = lambda p: -(won * np.log(p) + (1 - won) * np.log(1 - p)).mean()
    print(f"  win chance log loss (lower is better): Pinnacle {ll(df.pin_home[sub]):.4f}   "
          f"v1 {ll(norm.cdf(df.v1_margin[sub] / MARGIN_SD)):.4f}   "
          f"injury {ll(norm.cdf(df.injury_margin[sub] / MARGIN_SD)):.4f}")

    for market, unit in (("spread", "points"), ("total", "points"), ("money", "")):
        print(f"\n{market.upper()}")
        for model in ("v1", "injury"):
            for t in [MAIN[market]] + SECONDARY[market]:
                label = f"{t:.0%}" if market == "money" else f"{t:g} {unit}"
                tag = "MAIN" if t == MAIN[market] else "    "
                print(f"  {tag} {model:6} edge >= {label:9} {summary(bets(df, model, market, t))}")
    print("\nBy period, main rules:")
    for name, sel in (("2025-26 Feb-Apr", df.season == 2025), ("2026-27", df.season == 2026)):
        for market in MAIN:
            for model in ("v1", "injury"):
                print(f"  {name:16} {market:6} {model:6} {summary(bets(df[sel], model, market, MAIN[market]))}")


if __name__ == "__main__":
    main()
