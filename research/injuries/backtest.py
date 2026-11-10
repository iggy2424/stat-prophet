"""Injury backtest: does adjusting the game model for missing players make it better?

  python research/injuries/backtest.py

Base model: ratings-v1 (backend/game_model.py), rebuilt here day by day from games before
each date only: blended ratings (this season + last season counted as 10 games), pace x
off x def / league, home court 1.8.

Player value: Game Score per minute (Hollinger) from the player's last 82 games before
the date, shrunk toward replacement level with M0 minutes, minus replacement level R.
value = points of Game Score above a replacement player, per minute.

Team adjustment for a game:
  tonight = sum of value x expected minutes (average of last 10 games) for players who play
  window  = sum of value x average minutes in the team's rating window (same weights as the
            ratings: this season 1 per game, last season 10 / its games), every player who
            appeared for the team in that window
  adj     = tonight - window
So a player who has been out all along is already in the ratings and changes nothing; a
star coming back adds; a player traded away counts as missing against last season's part.

Who plays: the real box score (players with minutes). That is a little optimistic (late
scratches look known), so a live version will do a bit worse than this.

Margin = v1 margin + K_MARGIN x (adj home - adj away); total = v1 total + K_TOTAL x
(adj home + adj away). K and R are chosen on the dev period only; the holdout is scored once.
  dev      2025-26 regular season to 31 Jan 2026 (after each team has 10 games)
  holdout  2025-26 regular season from 1 Feb 2026, and 2026-27 so far (after each team has 3)
Totals: the dev K for totals is reported, and the holdout is also scored with no total
adjustment (margin only), since injuries may move the margin more than the total.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import norm

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "research" / "projections"))
import data  # noqa: E402

HOME_COURT, MARGIN_SD, PRIOR_GAMES = 1.8, 14.9, 10.0
MIN_TEAM_GAMES = 10
RATE_GAMES, EXP_MIN_GAMES, M0 = 82, 10, 300
R_GRID = [0.25, 0.35, 0.45, 0.55, 0.65]
DEV_END = pd.Timestamp("2026-02-01")
rng = np.random.default_rng(7)


def game_score(p: pd.DataFrame) -> pd.Series:
    return (p.points + 0.4 * p.fgm - 0.7 * p.fga - 0.4 * (p.fta - p.ftm) + 0.7 * p.off_reb
            + 0.3 * p.def_reb + p.steals + 0.7 * p.assists + 0.7 * p.blocks - 0.4 * p.fouls - p.turnovers)


def load():
    players, teams = data.load()
    players = players[players.minutes > 0].copy()
    for c in ("points", "fgm", "fga", "ftm", "fta", "off_reb", "def_reb", "steals", "assists",
              "blocks", "fouls", "turnovers"):
        players[c] = players[c].fillna(0).astype(float)
    players["gs"] = game_score(players)
    opp = teams[["game_id", "team_id", "points", "possessions"]].rename(
        columns={"team_id": "opponent_id", "points": "opp_points", "possessions": "opp_poss"})
    paired = teams.merge(opp, on=["game_id", "opponent_id"])
    return players, paired


def ratings_at(paired, season, day):
    """Blended ratings per team from regular season games before day."""
    cur = paired[(paired.season == season) & (paired.stage == 2) & (paired.game_date_et < day)].assign(w=1.0)
    prev = paired[(paired.season == season - 1) & (paired.stage == 2)].copy()
    prev["w"] = PRIOR_GAMES / prev.groupby("team_id").game_id.transform("count")
    win = pd.concat([cur, prev])
    g = win.assign(wp=win.w * win.points, wposs=win.w * win.possessions, wop=win.w * win.opp_points,
                   woposs=win.w * win.opp_poss, wpace=win.w * (win.possessions + win.opp_poss) / 2
                   ).groupby("team_id").sum(numeric_only=True)
    r = pd.DataFrame({"off": g.wp / g.wposs * 100, "def": g.wop / g.woposs * 100, "pace": g.wpace / g.w})
    games_now = cur.groupby("team_id").size().reindex(r.index, fill_value=0)
    return r, r.off.mean(), r.pace.mean(), games_now, win


def v1(r, lr, lp, home, away):
    pace = r.pace[home] * r.pace[away] / lp
    hp = pace * r.off[home] * r.loc[away, "def"] / lr / 100 + HOME_COURT / 2
    ap = pace * r.off[away] * r.loc[home, "def"] / lr / 100 - HOME_COURT / 2
    return hp, ap


def player_state(players, day, R):
    """value per minute above replacement and expected minutes, from games before day."""
    before = players[players.game_date_et < day].sort_values("game_date_et")
    last = before.groupby("player_id").tail(RATE_GAMES)
    s = last.groupby("player_id")[["gs", "minutes"]].sum()
    value = (s.gs - R * s.minutes) / (s.minutes + M0)
    exp_min = before.groupby("player_id").tail(EXP_MIN_GAMES).groupby("player_id").minutes.mean()
    return value, exp_min


def build(players, paired, R):
    rows = []
    games = paired[(paired.season >= 2025) & (paired.stage == 2)]
    home_rows = games.merge(players[["game_id", "team_id", "is_home"]].drop_duplicates(["game_id", "team_id"]),
                            on=["game_id", "team_id"])
    home_rows = home_rows[home_rows.is_home]
    for (season, day), day_games in home_rows.groupby(["season", "game_date_et"]):
        r, lr, lp, games_now, win = ratings_at(paired, season, day)
        value, exp_min = player_state(players, day, R)
        # each player's weighted average minutes per team in that team's rating window
        wmin = win[["game_id", "team_id", "w"]].merge(players[["game_id", "team_id", "player_id", "minutes"]],
                                                      on=["game_id", "team_id"])
        wsum = win.groupby("team_id").w.sum()
        wm = (wmin.w * wmin.minutes).groupby([wmin.team_id, wmin.player_id]).sum()
        wmin = wm / wsum.reindex(wm.index.get_level_values(0)).values
        for g in day_games.itertuples():
            home, away = g.team_id, g.opponent_id
            need = MIN_TEAM_GAMES if season == 2025 else 3  # 2026-27 is only weeks old
            if min(games_now.get(home, 0), games_now.get(away, 0)) < need:
                continue
            hp, ap = v1(r, lr, lp, home, away)
            adj = {}
            for team in (home, away):
                playing = players[(players.game_id == g.game_id) & (players.team_id == team)].player_id
                tonight = (value.reindex(playing).fillna(0) * exp_min.reindex(playing).fillna(0)).sum()
                w = wmin.loc[team] if team in wmin.index.get_level_values(0) else pd.Series(dtype=float)
                window = (value.reindex(w.index).fillna(0) * w).sum()
                adj[team] = tonight - window
            rows.append({"game_id": g.game_id, "season": season, "day": day, "home_pts": g.points,
                         "away_pts": g.opp_points, "v1_home": hp, "v1_away": ap,
                         "adj_home": adj[home], "adj_away": adj[away]})
    return pd.DataFrame(rows)


def fit(df):
    """Least squares K for margin and total on the v1 misses."""
    x_m = df.adj_home - df.adj_away
    y_m = (df.home_pts - df.away_pts) - (df.v1_home - df.v1_away)
    x_t = df.adj_home + df.adj_away
    y_t = (df.home_pts + df.away_pts) - (df.v1_home + df.v1_away)
    return float((x_m * y_m).sum() / (x_m ** 2).sum()), float((x_t * y_t).sum() / (x_t ** 2).sum())


def score(df, km, kt):
    real_m, real_t = df.home_pts - df.away_pts, df.home_pts + df.away_pts
    base_m, base_t = df.v1_home - df.v1_away, df.v1_home + df.v1_away
    new_m = base_m + km * (df.adj_home - df.adj_away)
    new_t = base_t + kt * (df.adj_home + df.adj_away)
    out = {}
    for name, m, t in (("v1", base_m, base_t), ("injury", new_m, new_t)):
        p = norm.cdf(m / MARGIN_SD).clip(1e-6, 1 - 1e-6)
        won = (real_m > 0).astype(float)
        out[name] = {"winners": ((m > 0) == (real_m > 0)).mean(), "margin_miss": (m - real_m).abs().mean(),
                     "total_miss": (t - real_t).abs().mean(),
                     "log_loss": -(won * np.log(p) + (1 - won) * np.log(1 - p)).mean()}
    d_m = ((new_m - real_m).abs() - (base_m - real_m).abs()).values
    d_t = ((new_t - real_t).abs() - (base_t - real_t).abs()).values
    boot = lambda d: np.percentile([rng.choice(d, len(d)).mean() for _ in range(2000)], [2.5, 97.5])
    out["margin_gain_95"] = -boot(d_m)[::-1]
    out["total_gain_95"] = -boot(d_t)[::-1]
    return out


def show(label, df, km, kt):
    s = score(df, km, kt)
    print(f"\n{label}: {len(df)} games")
    print(f"  {'':8} {'winners':>8} {'margin off':>11} {'total off':>10} {'log loss':>9}")
    for name in ("v1", "injury"):
        x = s[name]
        print(f"  {name:8} {x['winners']:8.1%} {x['margin_miss']:11.2f} {x['total_miss']:10.2f} {x['log_loss']:9.4f}")
    gm, gt = s["margin_gain_95"], s["total_gain_95"]
    print(f"  margin improvement {s['v1']['margin_miss'] - s['injury']['margin_miss']:+.2f} points "
          f"(95% range {gm[0]:+.2f} to {gm[1]:+.2f}); total {s['v1']['total_miss'] - s['injury']['total_miss']:+.2f} "
          f"(95% range {gt[0]:+.2f} to {gt[1]:+.2f})")


def main():
    players, paired = load()
    best = None
    print("Choosing replacement level R on dev only (margin miss with K fitted on dev):")
    built = {}
    for R in R_GRID:
        df = build(players, paired, R)
        built[R] = df
        dev = df[(df.season == 2025) & (df.day < DEV_END)]
        km, kt = fit(dev)
        m = score(dev, km, kt)["injury"]["margin_miss"]
        print(f"  R={R:.2f}  K margin {km:.3f}  K total {kt:.3f}  dev margin off {m:.3f}")
        if best is None or m < best[0]:
            best = (m, R, km, kt)
    _, R, km, kt = best
    df = built[R]
    print(f"\nChosen: R={R}, K margin {km:.3f}, K total {kt:.3f}")
    adj = df.adj_home - df.adj_away
    print(f"Adjustment to the margin: median {km * adj.abs().median():.1f} points, "
          f"90th percentile {km * adj.abs().quantile(0.9):.1f}, max {km * adj.abs().max():.1f}")
    dev = df[(df.season == 2025) & (df.day < DEV_END)]
    show("DEV 2025-26 to 31 Jan (used to choose R and K)", dev, km, kt)
    show("HOLDOUT 2025-26 from 1 Feb", df[(df.season == 2025) & (df.day >= DEV_END)], km, kt)
    show("HOLDOUT 2026-27 so far", df[df.season == 2026], km, kt)
    print()
    print("Margin only (no total adjustment) = the v1 total column above.")
    df.to_pickle(ROOT / "research" / ".cache" / "injury_backtest.pkl")


if __name__ == "__main__":
    main()
