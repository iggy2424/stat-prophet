"""Projection test: how well can we predict a player's points, rebounds, assists and 3s?

  python research/projections/evaluate.py

Only games the player played are scored (a prop on a player who sits is void). A player
needs 5 earlier games in our data. Splits are by date, never shuffled:
  A  test February 2026 to the end of the 2025-26 playoffs, train on everything before
  B  test 2026-27 so far (early season), train on 2024-25 and 2025-26
  C  test the first weeks of 2025-26 (to 30 Nov 2025), train on 2024-25: a bigger
     early season test than B

Models
  season, last10, ewm10, min_rate   simple averages (see baselines())
  lgbm_v1   first version: v1 features, trained on the test's latest season only
  lgbm_v2   all features (adds last season's averages and missing minutes at the
            player's position), trained on every earlier season
  v2_no_prev, v2_no_mates           v2 without last season's averages / missing teammates

Probabilities: each projection becomes a negative binomial distribution. v1 fitted one
spread on the last 20% of the training period. v2 fits the spread from honest forward
predictions (each block of the training period predicted by a model trained only on
earlier games), separately for a player's first 10 games of a season and the rest.
The test line is the ewm10 average rounded to x.5, a stand-in until real sportsbook lines.
"""
import sys
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy import stats as st

sys.path.insert(0, str(Path(__file__).resolve().parent))
import data  # noqa: E402
import features as F  # noqa: E402

MIN_PRIOR = 5
EARLY_GAMES = 10  # a player's first games of a season get their own spread
COUNTS = {"tot_reb", "assists", "tpm"}
LABEL = {"points": "PTS", "tot_reb": "REB", "assists": "AST", "tpm": "3PM"}
PARAMS = dict(learning_rate=0.03, num_leaves=15, min_data_in_leaf=50, bagging_fraction=0.8, bagging_freq=1,
              feature_fraction=0.8, lambda_l2=1.0, verbose=-1, seed=1)


def baselines(df: pd.DataFrame, stat: str) -> dict:
    season = df[f"{stat}_season"].fillna(df[f"{stat}_ewm10"])
    return {
        "season": season,
        "last10": df[f"{stat}_l10"],
        "ewm10": df[f"{stat}_ewm10"],
        "min_rate": df["minutes_ewm3"] * df[f"{stat}_per_min"],
    }


def _params(stat: str) -> dict:
    return {**PARAMS, "objective": "poisson" if stat in COUNTS else "regression"}


def fit_lgbm(train: pd.DataFrame, stat: str, cols: list[str]):
    """Pick the number of trees on the last 20% of the training period, then refit on all of it."""
    cut = train["game_date_et"].quantile(0.8)
    fit, val = train[train["game_date_et"] < cut], train[train["game_date_et"] >= cut]
    model = lgb.train(_params(stat), lgb.Dataset(fit[cols], fit[stat]), num_boost_round=3000,
                      valid_sets=[lgb.Dataset(val[cols], val[stat])],
                      callbacks=[lgb.early_stopping(100, verbose=False)])
    rounds = model.best_iteration or 200
    final = lgb.train(_params(stat), lgb.Dataset(train[cols], train[stat]), num_boost_round=rounds)
    return final, rounds, model.predict(val[cols], num_iteration=rounds), val


def forward_predictions(train: pd.DataFrame, stat: str, cols: list[str], rounds: int) -> pd.DataFrame:
    """Predict each 2 month block of the training period from games before it only."""
    start = train["game_date_et"].min() + pd.DateOffset(months=3)
    edges = list(pd.date_range(start, train["game_date_et"].max() + pd.Timedelta(days=1), freq="2MS"))
    edges = [start] + [e for e in edges if e > start] + [train["game_date_et"].max() + pd.Timedelta(days=1)]
    parts = []
    for lo, hi in zip(edges, edges[1:]):
        before, block = train[train["game_date_et"] < lo], train[(train["game_date_et"] >= lo) & (train["game_date_et"] < hi)]
        if len(block) == 0 or len(before) < 2000:
            continue
        model = lgb.train(_params(stat), lgb.Dataset(before[cols], before[stat]), num_boost_round=rounds)
        parts.append(pd.DataFrame({"pred": model.predict(block[cols]), "actual": block[stat].to_numpy(float),
                                   "early": (block["season_games"] < EARLY_GAMES).to_numpy()}))
    return pd.concat(parts, ignore_index=True)


def fit_spread(pred: np.ndarray, actual: np.ndarray):
    """How spread out results are around a projection: variance = a*mu + b*mu^2."""
    mu = np.clip(pred, 0.1, None)
    a, b = np.linalg.lstsq(np.column_stack([mu, mu ** 2]), (actual - mu) ** 2, rcond=None)[0]
    return max(a, 0.05), max(b, 0.0)


def prob_over(mu: np.ndarray, line: np.ndarray, a, b) -> np.ndarray:
    """Negative binomial for every stat, points included: results are skewed (a few big
    nights), and a normal curve put "over" about 5 points too high on points in the first test.
    a and b may be arrays (one spread per row)."""
    mu = np.clip(mu, 0.1, None)
    var = a * mu + b * mu ** 2
    k = np.floor(line)  # over = at least k + 1
    wide = var > mu * 1.001  # more spread than Poisson: negative binomial, else Poisson
    r = mu ** 2 / np.maximum(var - mu, 1e-9)
    return np.where(wide, st.nbinom.sf(k, r, r / (r + mu)), st.poisson.sf(k, mu))


def calibration(p: np.ndarray, over: np.ndarray) -> list[tuple]:
    bins = [0, 0.3, 0.4, 0.45, 0.55, 0.6, 0.7, 1.01]
    out = []
    for lo, hi in zip(bins, bins[1:]):
        m = (p >= lo) & (p < hi)
        if m.sum() >= 30:
            out.append((f"{lo:.0%}-{min(hi, 1):.0%}", int(m.sum()), p[m].mean(), over[m].mean()))
    return out


def summary(p: np.ndarray, over: np.ndarray) -> str:
    cal = calibration(p, over)
    gap = sum(n * abs(mp - h) for _, n, mp, h in cal) / max(1, sum(n for _, n, _, _ in cal))
    parts = [f"Brier {np.mean((p - over) ** 2):.4f}", f"calibration gap {gap:.1%}"]
    for side, m in (("overs 60%+", p >= 0.6), ("unders 60%+", p <= 0.4)):
        if m.sum() >= 20:
            said = p[m].mean() if side.startswith("over") else 1 - p[m].mean()
            hit = over[m].mean() if side.startswith("over") else 1 - over[m].mean()
            parts.append(f"{side}: {m.sum():,} said {said:.0%} happened {hit:.0%}")
    return ", ".join(parts)


def run_split(name: str, train: pd.DataFrame, test: pd.DataFrame) -> None:
    print(f"\n=== Split {name}: train {len(train):,} games "
          f"({train.game_date_et.min():%d %b %Y} to {train.game_date_et.max():%d %b %Y}), "
          f"test {len(test):,} ({test.game_date_et.min():%d %b %Y} to {test.game_date_et.max():%d %b %Y})")
    latest = train[train["season"] == train["season"].max()]
    no_prev = [c for c in F.FEATURES if c not in F.PREV]
    no_mates = [c for c in F.FEATURES if c not in F.TEAMMATES]
    early = (test["season_games"] < EARLY_GAMES).to_numpy()
    for stat in F.STATS:
        y = test[stat].to_numpy(float)
        preds = {k: v.to_numpy(float) for k, v in baselines(test, stat).items()}
        v1, _, v1_val_pred, v1_val = fit_lgbm(latest, stat, F.FEATURES_V1)
        preds["lgbm_v1"] = v1.predict(test[F.FEATURES_V1])
        v2, rounds, _, _ = fit_lgbm(train, stat, F.FEATURES)
        preds["lgbm_v2"] = v2.predict(test[F.FEATURES])
        preds["v2_no_prev"] = fit_lgbm(train, stat, no_prev)[0].predict(test[no_prev])
        preds["v2_no_mates"] = fit_lgbm(train, stat, no_mates)[0].predict(test[no_mates])

        print(f"\n{LABEL[stat]}  (average {y.mean():.1f}; {early.sum():,} of the test games are a player's first {EARLY_GAMES} of the season)")
        print(f"  {'model':<13}{'MAE':>7}{'RMSE':>7}{'bias':>7}   first {EARLY_GAMES}: {'MAE':>5}{'bias':>7}")
        for k, p in preds.items():
            e = p - y
            early_part = f"{np.mean(np.abs(e[early])):5.2f}{np.mean(e[early]):+7.2f}" if early.sum() >= 30 else ""
            print(f"  {k:<13}{np.mean(np.abs(e)):7.2f}{np.sqrt(np.mean(e ** 2)):7.2f}{np.mean(e):+7.2f}"
                  f"   {'':>9}{early_part}")

        line = np.round(test[f"{stat}_ewm10"].to_numpy(float) * 2) / 2
        line = np.where(line == np.floor(line), line + 0.5, line)  # always x.5, no pushes
        over = (y > line).astype(float)

        a1, b1 = fit_spread(v1_val_pred, v1_val[stat].to_numpy(float))
        p1 = prob_over(preds["lgbm_v1"], line, a1, b1)
        fwd = forward_predictions(train, stat, F.FEATURES, rounds)
        late_spread = fit_spread(fwd.loc[~fwd.early, "pred"].to_numpy(), fwd.loc[~fwd.early, "actual"].to_numpy())
        early_rows = fwd[fwd.early]
        early_spread = (fit_spread(early_rows["pred"].to_numpy(), early_rows["actual"].to_numpy())
                        if len(early_rows) >= 300 else late_spread)
        a2 = np.where(early, early_spread[0], late_spread[0])
        b2 = np.where(early, early_spread[1], late_spread[1])
        p2 = prob_over(preds["lgbm_v2"], line, a2, b2)

        print(f"  over/under vs ewm10 line (median {np.median(line):.1f}, over {over.mean():.1%} of the time; "
              f"always the base rate: Brier {np.mean((over.mean() - over) ** 2):.4f})")
        print(f"    v1 probabilities: {summary(p1, over)}")
        print(f"    v2 probabilities: {summary(p2, over)}")
        if early.sum() >= 100:
            print(f"    first {EARLY_GAMES} games only, v1: {summary(p1[early], over[early])}")
            print(f"    first {EARLY_GAMES} games only, v2: {summary(p2[early], over[early])}")
            print(f"    (early spread fitted on {len(early_rows):,} forward predictions)")
        for label, n, mean_p, hit in calibration(p2, over):
            print(f"      v2 says {label:<9} {n:6,} props   said {mean_p:5.1%}  happened {hit:5.1%}")
        if name == "A":
            imp = pd.Series(v2.feature_importance("gain"), index=F.FEATURES)
            top = (imp / imp.sum()).sort_values(ascending=False).head(8)
            print("  top factors: " + ", ".join(f"{k} {v:.0%}" for k, v in top.items()))


def main():
    players, _ = data.load()
    df = F.build(players)
    df = df[df["prior_games"] >= MIN_PRIOR]
    feb = pd.Timestamp("2026-02-01")
    a_test = df[(df["season"] == 2025) & (df["game_date_et"] >= feb)]
    run_split("A", df[df["game_date_et"] < feb], a_test)
    run_split("B", df[df["season"] <= 2025], df[df["season"] == 2026])
    run_split("C", df[df["season"] == 2024], df[(df["season"] == 2025) & (df["game_date_et"] < pd.Timestamp("2025-12-01"))])


if __name__ == "__main__":
    main()
