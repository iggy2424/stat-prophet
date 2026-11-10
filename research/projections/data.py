"""Download player and team box scores from Supabase into research/.cache (not in git).

  python research/projections/data.py          download (or refresh) the cache
Other scripts call load(), which downloads only if the cache is missing.
"""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from backend import config, db  # noqa: E402

CACHE = ROOT / "research" / ".cache"
PAGE = 1000

PLAYER_COLS = ("game_id,player_id,team_id,opponent_id,is_home,season,stage,game_date_et,position,"
               "minutes,points,fgm,fga,ftm,fta,tpm,tpa,off_reb,def_reb,tot_reb,assists,steals,blocks,turnovers,fouls,plus_minus")
TEAM_COLS = "game_id,team_id,opponent_id,season,stage,game_date_et,points,possessions,tot_reb,assists,tpm"


def _all(table: str, select: str, order: str) -> pd.DataFrame:
    rows = []
    while True:
        page = db.select(table, {"select": select, "stage": "gt.1", "order": order,
                                 "limit": str(PAGE), "offset": str(len(rows))})
        rows += page
        if len(page) < PAGE:
            return pd.DataFrame(rows)


def download() -> None:
    config.load_local_env()
    CACHE.mkdir(parents=True, exist_ok=True)
    players = _all("player_game_stats", PLAYER_COLS, "game_id.asc,player_id.asc")
    teams = _all("team_game_stats", TEAM_COLS, "game_id.asc,team_id.asc")
    players.to_pickle(CACHE / "player_games.pkl")
    teams.to_pickle(CACHE / "team_games.pkl")
    print(f"saved {len(players)} player rows, {len(teams)} team rows to {CACHE}")


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    if not (CACHE / "player_games.pkl").exists():
        download()
    players = pd.read_pickle(CACHE / "player_games.pkl")
    teams = pd.read_pickle(CACHE / "team_games.pkl")
    for df in (players, teams):
        df["game_date_et"] = pd.to_datetime(df["game_date_et"])
    players["minutes"] = players["minutes"].astype(float)
    return players, teams


if __name__ == "__main__":
    download()
