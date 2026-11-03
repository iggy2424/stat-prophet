"""Projection test: how well can we predict a player's points, rebounds, assists and 3s?

  python research/projections/evaluate.py

Only games the player played are scored (a prop on a player who sits is void). A player
needs 5 earlier games in our data. Two time splits, never shuffled:
  A  train on 2025-26 before February, test on February to the end of the playoffs
  B  train on all of 2025-26, test on 2026-27 so far (early season, the hard case)

Models
  season    season to date average (last season's if no games yet)
  last10    last 10 games
  ewm10     exponential average, half-life 10 games, across seasons
  min_rate  recent minutes (ewm3) x per minute rate (ewm10)
  lgbm      LightGBM on every feature in features.py, plus versions without opponent
            and without missing teammate features to see what each adds

Probabilities: each projection becomes a full distribution (normal for points, negative
binomial for the counts), fitted on the last 20% of the training period. The test line is
the ewm10 average rounded to the nearest .5, a stand-in until real sportsbook lines.
We check whether "60% over" happens 60% of the time.
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


def fit_lgbm(train: pd.DataFrame, stat: str, cols: list[str]):
    """Train with early stopping on the last 20% of the training period (by date)."""
    cut = train["game_date_et"].quantile(0.8)
    fit, val = train[train["game_date_et"] < cut], train[train["game_date_et"] >= cut]
    params = {**PARAMS, "objective": "poisson" if stat in COUNTS else "regression"}
    model = lgb.train(params, lgb.Dataset(fit[cols], fit[stat]), num_boost_round=3000,
                      valid_sets=[lgb.Dataset(val[cols], val[stat])],
                      callbacks=[lgb.early_stopping(100, verbose=False)])
    # Refit on all of train with the chosen number of trees
    final = lgb.train(params, lgb.Dataset(train[cols], train[stat]), num_boost_round=model.best_iteration or 200)
    return final, model.predict(val[cols], num_iteration=model.best_iteration), val


def fit_spread(pred: np.ndarray, actual: np.ndarray, stat: str):
    """How spread out results are around a projection: variance = a*mu + b*mu^2."""
    mu = np.clip(pred, 0.1, None)
    sq = (actual - mu) ** 2
    a, b = np.linalg.lstsq(np.column_stack([mu, mu ** 2]), sq, rcond=None)[0]
    return max(a, 0.05), max(b, 0.0)


def prob_over(mu: np.ndarray, line: np.ndarray, spread, stat: str) -> np.ndarray:
    """Negative binomial for every stat, points included: results are skewed (a few big
    nights), and a normal curve put "over" about 5 points too high on points in the first test."""
    a, b = spread
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


def run_split(name: str, train: pd.DataFrame, test: pd.DataFrame) -> dict:
    print(f"\n=== Split {name}: train {len(train):,} games "
          f"({train.game_date_et.min():%d %b %Y} to {train.game_date_et.max():%d %b %Y}), "
          f"test {len(test):,} ({test.game_date_et.min():%d %b %Y} to {test.game_date_et.max():%d %b %Y})")
    no_opp = [c for c in F.FEATURES if c not in F.OPPONENT]
    no_mates = [c for c in F.FEATURES if c not in F.TEAMMATES]
    results = {}
    for stat in F.STATS:
        y = test[stat].to_numpy(float)
        preds = {k: v.to_numpy(float) for k, v in baselines(test, stat).items()}
        model, val_pred, val = fit_lgbm(train, stat, F.FEATURES)
        preds["lgbm"] = model.predict(test[F.FEATURES])
        preds["lgbm_no_opp"] = fit_lgbm(train, stat, no_opp)[0].predict(test[no_opp])
        preds["lgbm_no_mates"] = fit_lgbm(train, stat, no_mates)[0].predict(test[no_mates])

        rows = [(k, np.mean(np.abs(p - y)), np.sqrt(np.mean((p - y) ** 2)), np.mean(p - y)) for k, p in preds.items()]
        print(f"\n{LABEL[stat]}  (average {y.mean():.1f})")
        print(f"  {'model':<14}{'MAE':>7}{'RMSE':>7}{'bias':>7}")
        for k, mae, rmse, bias in rows:
            print(f"  {k:<14}{mae:7.2f}{rmse:7.2f}{bias:+7.2f}")

        # Probabilities against the stand-in line
        line = np.round(test[f"{stat}_ewm10"].to_numpy(float) * 2) / 2
        line = np.where(line == np.floor(line), line + 0.5, line)  # always x.5, no pushes
        over = (y > line).astype(float)
        spread = fit_spread(val_pred, val[stat].to_numpy(float), stat)
        p = prob_over(preds["lgbm"], line, spread, stat)
        brier = np.mean((p - over) ** 2)
        base = np.mean((over.mean() - over) ** 2)
        print(f"  over/under vs ewm10 line {np.median(line):.1f} median: over {over.mean():.1%} of the time, "
              f"Brier {brier:.4f} (always the base rate: {base:.4f})")
        for label, n, mean_p, hit in calibration(p, over):
            print(f"    model says {label:<9} {n:6,} props   said {mean_p:5.1%}  happened {hit:5.1%}")
        # Most stand-in lines go under, so compare leans with simply always taking under
        strong = np.abs(p - 0.5) >= 0.1
        side_right = ((p > 0.5) == (over == 1))[strong].mean()
        always_under = (over == 0)[strong].mean()
        print(f"    leans of 60%+ either way: {strong.sum():,} props, right {side_right:.1%} "
              f"(always under on the same props: {always_under:.1%})")
        for side, m in (("over", p >= 0.6), ("under", p <= 0.4)):
            if m.sum() >= 30:
                hit = over[m].mean() if side == "over" else 1 - over[m].mean()
                print(f"      {side:<5} leans: {m.sum():6,} props, right {hit:.1%}")

        if name == "A":
            imp = pd.Series(model.feature_importance("gain"), index=F.FEATURES)
            top = (imp / imp.sum()).sort_values(ascending=False).head(8)
            print("  top factors: " + ", ".join(f"{k} {v:.0%}" for k, v in top.items()))
        results[stat] = {k: (mae, rmse, bias) for k, mae, rmse, bias in rows}
    return results


def main():
    players, teams = data.load()
    df = F.build(players, teams)
    df = df[df["prior_games"] >= MIN_PRIOR]
    last = df[df["season"] == 2025]
    feb = pd.Timestamp("2026-02-01")
    run_split("A", last[last["game_date_et"] < feb], last[last["game_date_et"] >= feb])
    run_split("B", last, df[df["season"] == 2026])


if __name__ == "__main__":
    main()
