"""Pre-game features for every player game. Every value uses only earlier games.

Player form   recent averages (exponential, last 10, season to date) of minutes, points,
              rebounds, assists, 3s and shot attempts, per minute rates, rest days
Opponent      the opponent's pace, defensive rating and what it allows (rebounds, assists, 3s)
Teammates     missing_min / missing_pts: recent minutes and points of the team's regulars
              who did not play. Taken from the box score, so it knows about late scratches
              a pre-game injury report would miss: slightly optimistic, noted in the results.
"""
import math

import pandas as pd

STATS = ["points", "tot_reb", "assists", "tpm"]
FORM = STATS + ["minutes", "fga", "tpa", "fta"]
TEAM_HALFLIFE = 15   # team games
REGULAR_MIN = 15     # minutes a game to count as a regular
REGULAR_RECENT = 5   # ...who played in at least one of the team's last 5 games


def _prior(g, col: str, how: str, n: float):
    """Value of col from earlier rows of the same group only."""
    s = g[col].shift(1)
    if how == "ewm":
        return s.ewm(halflife=n, min_periods=1).mean()
    if how == "roll":
        return s.rolling(int(n), min_periods=1).mean()
    if how == "std":
        return s.rolling(int(n), min_periods=3).std()
    return s.expanding(min_periods=1).mean()


def player_form(p: pd.DataFrame) -> pd.DataFrame:
    p = p.sort_values(["player_id", "game_date_et", "game_id"]).reset_index(drop=True)
    by_player = p.groupby("player_id", group_keys=False)
    by_season = p.groupby(["player_id", "season"], group_keys=False)
    out = {}
    for col in FORM:
        out[f"{col}_ewm3"] = by_player.apply(lambda g: _prior(g, col, "ewm", 3))
        out[f"{col}_ewm10"] = by_player.apply(lambda g: _prior(g, col, "ewm", 10))
        out[f"{col}_l10"] = by_player.apply(lambda g: _prior(g, col, "roll", 10))
        out[f"{col}_season"] = by_season.apply(lambda g: _prior(g, col, "expanding", 0))
    for col in ("minutes", "points"):
        out[f"{col}_sd10"] = by_player.apply(lambda g: _prior(g, col, "std", 10))
    f = pd.DataFrame(out)
    for col in STATS + ["fga", "tpa", "fta"]:
        f[f"{col}_per_min"] = f[f"{col}_ewm10"] / f["minutes_ewm10"].clip(lower=1)
    f["prior_games"] = by_player.cumcount()
    f["season_games"] = by_season.cumcount()
    rest = by_player["game_date_et"].diff().dt.days
    f["rest_days"] = rest.fillna(10).clip(upper=10)
    f["back_to_back"] = (rest == 1).astype(int)
    f["long_break"] = (rest > 14).astype(int)  # back from injury or a new season
    return pd.concat([p, f], axis=1)


def team_form(t: pd.DataFrame) -> pd.DataFrame:
    """Each team's pre-game pace, ratings and what it allows, exponential over both seasons."""
    opp = t.rename(columns={c: f"opp_{c}" for c in ("points", "possessions", "tot_reb", "assists", "tpm")})
    opp = opp[["game_id", "team_id", "opp_points", "opp_possessions", "opp_tot_reb", "opp_assists", "opp_tpm"]]
    t = t.merge(opp.rename(columns={"team_id": "opponent_id"}), on=["game_id", "opponent_id"])
    t["pace"] = (t["possessions"] + t["opp_possessions"]) / 2
    t["off_rtg"] = t["points"] / t["possessions"] * 100
    t["def_rtg"] = t["opp_points"] / t["opp_possessions"] * 100
    t = t.sort_values(["team_id", "game_date_et", "game_id"]).reset_index(drop=True)
    g = t.groupby("team_id", group_keys=False)
    cols = {"pace": "pace", "off_rtg": "off_rtg", "def_rtg": "def_rtg",
            "allowed_reb": "opp_tot_reb", "allowed_ast": "opp_assists", "allowed_tpm": "opp_tpm"}
    for name, col in cols.items():
        t[f"team_{name}"] = g.apply(lambda x: _prior(x, col, "ewm", TEAM_HALFLIFE))
    return t[["game_id", "team_id"] + [f"team_{n}" for n in cols]]


def missing_teammates(p: pd.DataFrame) -> pd.DataFrame:
    """For each team game: recent minutes and points of regulars who did not play."""
    alpha = 1 - math.exp(math.log(0.5) / 10)
    ewm_min, ewm_pts, last_seen = {}, {}, {}          # player -> value / (team, team game index)
    team_index = {}                                    # team -> games played so far
    rows = []
    games = p.sort_values(["game_date_et", "game_id"]).groupby(["season", "game_date_et", "game_id", "team_id"], sort=False)
    season_now = None
    for (season, _, game_id, team_id), box in games:
        if season != season_now:
            # New season: last season's regulars only count once they play for the team again,
            # so summer departures are not "missing"
            last_seen, team_index, season_now = {}, {}, season
        idx = team_index.get(team_id, 0)
        present = set(box["player_id"])
        missing_min = missing_pts = 0.0
        for pid, (team, seen) in last_seen.items():
            if team == team_id and pid not in present and idx - seen <= REGULAR_RECENT and ewm_min[pid] >= REGULAR_MIN:
                missing_min += ewm_min[pid]
                missing_pts += ewm_pts[pid]
        rows.append((game_id, team_id, missing_min, missing_pts))
        for pid, m, pts in zip(box["player_id"], box["minutes"], box["points"]):
            ewm_min[pid] = m if pid not in ewm_min else ewm_min[pid] + alpha * (m - ewm_min[pid])
            ewm_pts[pid] = pts if pid not in ewm_pts else ewm_pts[pid] + alpha * (pts - ewm_pts[pid])
            last_seen[pid] = (team_id, idx)  # a traded player stops counting for his old team
        team_index[team_id] = idx + 1
    return pd.DataFrame(rows, columns=["game_id", "team_id", "missing_min", "missing_pts"])


def build(players: pd.DataFrame, teams: pd.DataFrame) -> pd.DataFrame:
    df = player_form(players)
    tf = team_form(teams)
    df = df.merge(tf, on=["game_id", "team_id"], how="left")
    opp = tf.rename(columns={"team_id": "opponent_id",
                             **{c: c.replace("team_", "opp_") for c in tf.columns if c.startswith("team_") and c != "team_id"}})
    df = df.merge(opp, on=["game_id", "opponent_id"], how="left")
    df = df.merge(missing_teammates(players), on=["game_id", "team_id"], how="left")
    league_pace = df["team_pace"].mean()
    df["game_pace"] = df["team_pace"] * df["opp_pace"] / league_pace
    df["is_home"] = df["is_home"].astype(int)
    df["is_playoffs"] = (df["stage"] == 3).astype(int)
    pos = df["position"].fillna("")
    df["pos_g"] = pos.str.contains("G").astype(int)
    df["pos_f"] = pos.str.contains("F").astype(int)
    df["pos_c"] = pos.str.contains("C").astype(int)
    return df.sort_values(["game_date_et", "game_id", "player_id"]).reset_index(drop=True)


FEATURES = (
    [f"{c}_{w}" for c in FORM for w in ("ewm3", "ewm10", "l10", "season")]
    + ["minutes_sd10", "points_sd10"]
    + [f"{c}_per_min" for c in STATS + ["fga", "tpa", "fta"]]
    + ["prior_games", "season_games", "rest_days", "back_to_back", "long_break", "is_home", "is_playoffs",
       "pos_g", "pos_f", "pos_c"]
    + ["team_pace", "team_off_rtg", "game_pace"]
    + ["opp_pace", "opp_def_rtg", "opp_allowed_reb", "opp_allowed_ast", "opp_allowed_tpm"]
    + ["missing_min", "missing_pts"]
)
OPPONENT = ["opp_pace", "opp_def_rtg", "opp_allowed_reb", "opp_allowed_ast", "opp_allowed_tpm", "game_pace"]
TEAMMATES = ["missing_min", "missing_pts"]
