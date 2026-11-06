"""Real-line test: projection model v2 against sportsbook player prop lines, 2025-26.

  python research/odds/real_line_test.py

Lines come from research/odds/pull_props.py (The Odds API, 60 minutes before tip, 7 books).

Lines
  main line   each book's line with the most even over/under prices (books also list
              alternate lines for the same player)
  consensus   the most common main line across books for a player and market
  market      each book's over chance with its margin removed, averaged over the books
              whose main line is the consensus; Pinnacle on its own as a second benchmark
  Whole number lines can push and are left out (counted in the data checks).

Model: v2 (research/projections), retrained for each block of the season on games before
the block only (walk-forward), with the spread fitted from forward predictions.

Main test, fixed before seeing results: 1 unit on every prop where the model's chance
beats the market's by 5 points or more, at the average price across books. The 95% range
comes from resampling whole games (props in one game move together). Everything else is
secondary and should be read with the number of slices in mind.
"""
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "research" / "projections"))
from backend import config, db  # noqa: E402
from backend.names import search_name  # noqa: E402
import data  # noqa: E402
import evaluate as E  # noqa: E402
import features as F  # noqa: E402

SEASON = 2025
ODDS = ROOT / "research" / ".cache" / "odds" / str(SEASON)
MARKET = {"player_points": "points", "player_rebounds": "tot_reb", "player_assists": "assists", "player_threes": "tpm"}
BLOCKS = ["2025-10-21", "2025-12-01", "2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-07-01"]
MAIN_EDGE = 0.05
rng = np.random.default_rng(7)


def dec(a):
    a = np.asarray(a, float)
    return np.where(a > 0, 1 + a / 100, 1 + 100 / np.abs(a))


def load_lines():
    rows, snaps, books_per_game = [], [], []
    for f in sorted(ODDS.glob("game_*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        gid, odds = d["our_game"]["id"], d["odds"]
        commence = pd.Timestamp(d["event"]["commence_time"])
        if odds.get("timestamp"):
            snaps.append((commence - pd.Timestamp(odds["timestamp"])).total_seconds() / 60)
        books = (odds.get("data") or {}).get("bookmakers") or []
        books_per_game.append(len(books))
        for b in books:
            for m in b["markets"]:
                for o in m["outcomes"]:
                    rows.append((gid, b["key"], m["key"], o.get("description"), o["name"], o.get("point"), o["price"]))
    df = pd.DataFrame(rows, columns=["game_id", "book", "market", "player", "side", "line", "price"])
    df = df.dropna(subset=["player", "line"])
    wide = df.pivot_table(index=["game_id", "book", "market", "player", "line"], columns="side", values="price",
                          aggfunc="first").reset_index().dropna(subset=["Over", "Under"])
    io, iu = 1 / dec(wide.Over), 1 / dec(wide.Under)
    wide["fair_over"] = io / (io + iu)
    wide["dec_over"], wide["dec_under"] = dec(wide.Over), dec(wide.Under)
    wide["balance"] = np.abs(io - iu)
    main = wide.sort_values("balance").groupby(["game_id", "book", "market", "player"], as_index=False).first()
    cons = main.groupby(["game_id", "market", "player"])["line"].agg(lambda s: s.mode().median()).rename("cline")
    main = main.join(cons, on=["game_id", "market", "player"])
    at = main[main.line == main.cline]
    lines = at.groupby(["game_id", "market", "player", "cline"]).agg(
        fair_over=("fair_over", "mean"), books=("book", "nunique"),
        avg_over=("dec_over", "mean"), avg_under=("dec_under", "mean"),
        best_over=("dec_over", "max"), best_under=("dec_under", "max")).reset_index()
    for book in ("pinnacle", "draftkings", "fanduel"):
        b = at[at.book == book].set_index(["game_id", "market", "player"])
        lines = lines.join(b[["fair_over", "dec_over", "dec_under"]].add_prefix(f"{book}_"), on=["game_id", "market", "player"])
    checks = {"games with a file": len(books_per_game), "games with no lines": sum(n == 0 for n in books_per_game),
              "books per game (median)": float(np.median(books_per_game)) if books_per_game else 0,
              "minutes before tip (median, min, max)": (np.median(snaps), min(snaps), max(snaps)) if snaps else None,
              "book lines incl. alternates": len(wide), "main lines": len(main), "props (consensus)": len(lines),
              "books at the consensus (median)": float(lines.books.median()),
              "props by market": lines.market.value_counts().to_dict(),
              "main lines by book": main.book.value_counts().to_dict()}
    return lines, checks


def predictions(df: pd.DataFrame) -> pd.DataFrame:
    """v2 predictions for every 2025-26 player game, each block trained on earlier games only."""
    out = []
    for lo, hi in zip(BLOCKS, BLOCKS[1:]):
        train = df[(df.game_date_et < lo) & (df.prior_games >= E.MIN_PRIOR)]
        block = df[(df.game_date_et >= lo) & (df.game_date_et < hi) & (df.season == SEASON)].copy()
        if block.empty:
            continue
        for stat in MARKET.values():
            model, rounds, _, _ = E.fit_lgbm(train, stat, F.FEATURES)
            fwd = E.forward_predictions(train, stat, F.FEATURES, rounds)
            late = E.fit_spread(fwd.loc[~fwd.early, "pred"].to_numpy(), fwd.loc[~fwd.early, "actual"].to_numpy())
            early_rows = fwd[fwd.early]
            early = (E.fit_spread(early_rows.pred.to_numpy(), early_rows.actual.to_numpy())
                     if len(early_rows) >= 300 else late)
            is_early = (block.season_games < E.EARLY_GAMES).to_numpy()
            block[f"mu_{stat}"] = model.predict(block[F.FEATURES])
            block[f"a_{stat}"] = np.where(is_early, early[0], late[0])
            block[f"b_{stat}"] = np.where(is_early, early[1], late[1])
        block["block"] = lo
        out.append(block)
        print(f"  trained block from {lo}: {len(train):,} training games, {len(block):,} games predicted", flush=True)
    return pd.concat(out, ignore_index=True)


def brier(p, y):
    return float(np.mean((p - y) ** 2))


def logloss(p, y):
    p = np.clip(p, 1e-4, 1 - 1e-4)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def bands(p, y):
    out = []
    for lo, hi in zip([0, .3, .4, .45, .55, .6, .7], [.3, .4, .45, .55, .6, .7, 1.01]):
        m = (p >= lo) & (p < hi)
        if m.sum() >= 50:
            out.append(f"{lo:.0%}-{min(hi, 1):.0%}: {m.sum():,} said {p[m].mean():.1%} happened {y[m].mean():.1%}")
    return out


def bets(r: pd.DataFrame, edge: float, over_price: str, under_price: str, model_col: str = "model_over") -> dict:
    """1 unit where the model beats the market by `edge`; profit per bet at the given prices."""
    ov = (r[model_col] - r.fair_over >= edge) & r[over_price].notna()
    un = (r.fair_over - r[model_col] >= edge) & r[under_price].notna()
    profit = pd.concat([pd.Series(np.where(r.over[ov] == 1, r[over_price][ov] - 1, -1.0), index=r.index[ov]),
                        pd.Series(np.where(r.over[un] == 0, r[under_price][un] - 1, -1.0), index=r.index[un])])
    if profit.empty:
        return {"n": 0}
    games = r.loc[profit.index, "game_id"].to_numpy()
    by_game = pd.DataFrame({"g": games, "p": profit.to_numpy()}).groupby("g")["p"].agg(["sum", "count"])
    sums, counts = by_game["sum"].to_numpy(), by_game["count"].to_numpy()
    boot = []
    for _ in range(2000):
        i = rng.integers(0, len(sums), len(sums))
        boot.append(sums[i].sum() / counts[i].sum())
    lo, hi = np.percentile(boot, [2.5, 97.5])
    return {"n": len(profit), "overs": int(ov.sum()), "unders": int(un.sum()), "won": float((profit > 0).mean()),
            "roi": float(profit.mean()), "lo": float(lo), "hi": float(hi)}


def fmt(b: dict) -> str:
    if not b["n"]:
        return "no bets"
    return (f"{b['n']:5,} bets ({b['overs']} over, {b['unders']} under), won {b['won']:.1%}, "
            f"return {b['roi']:+.1%} (95% range {b['lo']:+.1%} to {b['hi']:+.1%})")


def main():
    config.load_local_env()
    unmatched = json.loads((ODDS / "unmatched.json").read_text()) if (ODDS / "unmatched.json").exists() else []
    lines, checks = load_lines()
    print("=== 1. Data checks")
    print(f"  games not matched to an Odds API event: {len(unmatched)}")
    for k, v in checks.items():
        print(f"  {k}: {v}")
    whole = lines.cline % 1 == 0
    print(f"  whole number lines left out (can push): {whole.sum():,}")
    lines = lines[~whole]

    players, _ = data.load()
    df = F.build(players)
    names = {r["id"]: search_name(r["full_name"]) for r in db.select("players", {"select": "id,full_name"})}
    df["sname"] = df.player_id.map(names)
    known = set(names.values())
    lines["sname"] = lines.player.map(search_name)
    # Nicknames (Alex Sarr = Alexandre Sarr, Herb Jones, Bones Hyland): a name we do not know
    # falls back to the last name, if exactly one player in that game has it
    season_rows = df[df.season == SEASON]
    last = season_rows.assign(last=season_rows.sname.str.split().str[-1]).groupby(["game_id", "last"])["sname"].agg(list)
    lost = ~lines.sname.isin(known)
    for i in lines.index[lost]:
        cand = last.get((lines.at[i, "game_id"], (lines.at[i, "sname"].split() or [""])[-1]), [])
        if len(cand) == 1:
            lines.at[i, "sname"] = cand[0]
    print(f"  nickname fallback matched {(lost & lines.sname.isin(known)).sum():,} of {lost.sum():,} unknown names")
    played = season_rows[["game_id", "sname"]].assign(played=True)
    lines = lines.merge(played, on=["game_id", "sname"], how="left")
    void = lines.played.isna() & lines.sname.isin(known)
    unknown = lines.played.isna() & ~lines.sname.isin(known)
    print(f"  props whose player played: {lines.played.notna().sum():,}; did not play (void): {void.sum():,}; "
          f"name not found: {unknown.sum():,}")
    if unknown.any():
        print(f"    names not found (top 10): {Counter(lines.player[unknown]).most_common(10)}")
    lines = lines[lines.played.notna()]

    print("\n=== Training v2 walk-forward (one model per block, earlier games only)")
    pred = predictions(df)
    res = lines.merge(pred, on=["game_id", "sname"], how="inner")
    res = res[res.prior_games >= E.MIN_PRIOR].copy()
    print(f"  scored props (player had 5+ earlier games): {len(res):,} of {len(lines):,}")
    res["stat"] = res.market.map(MARKET)
    res["actual"] = [row[s] for s, (_, row) in zip(res.stat, res.iterrows())]
    res["mu"] = [row[f"mu_{s}"] for s, (_, row) in zip(res.stat, res.iterrows())]
    a = np.array([row[f"a_{s}"] for s, (_, row) in zip(res.stat, res.iterrows())])
    b = np.array([row[f"b_{s}"] for s, (_, row) in zip(res.stat, res.iterrows())])
    res["model_over"] = E.prob_over(res.mu.to_numpy(), res.cline.to_numpy(), a, b)
    res["over"] = (res.actual > res.cline).astype(float)

    print("\n=== 2. Is the market itself sensible? (it should be well calibrated)")
    print(f"  over hit {res.over.mean():.1%}; market said {res.fair_over.mean():.1%} on average")
    for line in bands(res.fair_over.to_numpy(), res.over.to_numpy()):
        print(f"    market {line}")

    print("\n=== 3. Accuracy of the over chance (lower is better)")
    print(f"  {'':<16}{'n':>7}{'market':>9}{'model':>9}{'25/75':>9}{'50/50':>9}{'75/25':>9}   log loss market / model / 50-50")
    for name, r in [*((m, res[res.market == m]) for m in MARKET), ("all", res)]:
        y, mk, md = r.over.to_numpy(), r.fair_over.to_numpy(), r.model_over.to_numpy()
        blends = [brier(w * md + (1 - w) * mk, y) for w in (0.25, 0.5, 0.75)]
        print(f"  {name:<16}{len(r):7,}{brier(mk, y):9.4f}{brier(md, y):9.4f}" + "".join(f"{x:9.4f}" for x in blends)
              + f"   {logloss(mk, y):.4f} / {logloss(md, y):.4f} / {logloss((mk + md) / 2, y):.4f}")
    pin = res.dropna(subset=["pinnacle_fair_over"])
    print(f"  Pinnacle only ({len(pin):,} props): Pinnacle {brier(pin.pinnacle_fair_over, pin.over):.4f}, "
          f"all-book market {brier(pin.fair_over, pin.over):.4f}, model {brier(pin.model_over, pin.over):.4f}")
    print("  by block (market / model):")
    for blk, r in res.groupby("block"):
        print(f"    from {blk}: {len(r):6,} props  {brier(r.fair_over, r.over):.4f} / {brier(r.model_over, r.over):.4f}")
    early = res.season_games < E.EARLY_GAMES
    print(f"  player's first {E.EARLY_GAMES} games: {early.sum():,} props  "
          f"{brier(res.fair_over[early], res.over[early]):.4f} / {brier(res.model_over[early], res.over[early]):.4f}")

    print("\n=== 4. Model calibration and lean")
    for line in bands(res.model_over.to_numpy(), res.over.to_numpy()):
        print(f"    model {line}")
    for m in MARKET:
        r = res[res.market == m]
        print(f"  {m:<16} model minus line {np.mean(r.mu - r.cline):+.2f}, actual minus line {np.mean(r.actual - r.cline):+.2f}, "
              f"model says over {r.model_over.mean():.1%}, market {r.fair_over.mean():.1%}, happened {r.over.mean():.1%}")

    print(f"\n=== 5. MAIN TEST: edge {MAIN_EDGE:.0%}+, average price across books")
    print("  " + fmt(bets(res, MAIN_EDGE, "avg_over", "avg_under")))
    print("\n=== 6. Secondary bet tests (many slices: expect some to look good by chance)")
    for th in (0.03, 0.08, 0.12):
        print(f"  edge {th:.0%}+, average price: " + fmt(bets(res, th, "avg_over", "avg_under")))
    print(f"  edge 5%+, best price across books: " + fmt(bets(res, MAIN_EDGE, "best_over", "best_under")))
    for book in ("draftkings", "fanduel"):
        r = res[res[f"{book}_fair_over"].notna()]
        print(f"  edge 5%+ vs {book}'s own line and price: "
              + fmt(bets(r.assign(fair_over=r[f"{book}_fair_over"]), MAIN_EDGE, f"{book}_dec_over", f"{book}_dec_under")))
    r = res[res.pinnacle_fair_over.notna()]
    print(f"  edge 5%+ vs Pinnacle's chance, average price: "
          + fmt(bets(r.assign(fair_over=r.pinnacle_fair_over), MAIN_EDGE, "avg_over", "avg_under")))
    for m in MARKET:
        print(f"  {m:<16} edge 5%+: " + fmt(bets(res[res.market == m], MAIN_EDGE, "avg_over", "avg_under")))
    for blk, r in res.groupby("block"):
        print(f"  block from {blk}: " + fmt(bets(r, MAIN_EDGE, "avg_over", "avg_under")))
    res.to_pickle(ROOT / "research" / ".cache" / "real_line_results.pkl")


if __name__ == "__main__":
    main()
