"""Game predictions from team ratings: predicted score, total and home win probability.

Model 'ratings-v1': possessions x points per possession.
  pace       = home pace x away pace / league pace
  home score = pace x (home off rating x away def rating / league rating) / 100 + HOME_COURT / 2
  away score = the same the other way round, minus HOME_COURT / 2
  win prob   = normal probability that the real margin lands on the predicted side, sd MARGIN_SD

Ratings come from the blended team_rankings window (this season, plus last season counted
as 10 games). HOME_COURT and MARGIN_SD come from a walk-forward test on 2025-26 (1,074
regular season games, only games before each date): winner right 69%, margin off by 11.7
on average, total off by 15.3, and the win probabilities matched how often favourites won.

A prediction is only written while the game has not started, so the saved number is
always the one made before tip off. The record is graded from games' final scores.
"""
import math
from datetime import timedelta

from . import db, timeutil

MODEL = "ratings-v1"
HOME_COURT = 1.8  # points, 2025-26 average home margin
MARGIN_SD = 14.9  # points, spread of real margins around the predicted margin in the test


class NoApi:
    """Predictions use our own tables only; run_job still expects a client to count requests."""
    requests_used = 0


def _win_prob(margin: float) -> float:
    return 0.5 * (1 + math.erf(margin / MARGIN_SD / math.sqrt(2)))


def _ratings(season: int) -> tuple[dict, float, float]:
    """Blended ratings by team id, plus the league average rating and pace."""
    teams = db.select("team_rankings", {"select": "team_id,off_rating,def_rating,pace",
                                        "window_name": "eq.blended", "season": f"eq.{season}"})
    if len(teams) != 30:
        raise ValueError(f"Expected blended ratings for 30 teams in {season}, got {len(teams)}")
    league_rating = sum(t["off_rating"] for t in teams) / 30
    league_pace = sum(t["pace"] for t in teams) / 30
    return {t["team_id"]: t for t in teams}, league_rating, league_pace


def predict(home: dict, away: dict, league_rating: float, league_pace: float) -> dict:
    pace = home["pace"] * away["pace"] / league_pace
    home_pts = pace * home["off_rating"] * away["def_rating"] / league_rating / 100 + HOME_COURT / 2
    away_pts = pace * away["off_rating"] * home["def_rating"] / league_rating / 100 - HOME_COURT / 2
    return {
        "home_points": round(home_pts, 1),
        "away_points": round(away_pts, 1),
        "home_win_prob": round(_win_prob(home_pts - away_pts), 3),
    }


def prediction_rows(games: list[dict], season: int) -> list[dict]:
    ratings, league_rating, league_pace = _ratings(season)
    now = timeutil.now_utc().isoformat()
    rows = []
    for g in games:
        home, away = ratings[g["home_team_id"]], ratings[g["away_team_id"]]
        rows.append({
            "game_id": g["id"], "model": MODEL, "predicted_at": now,
            **predict(home, away, league_rating, league_pace),
            "inputs": {"home": home, "away": away, "league_rating": round(league_rating, 2),
                       "league_pace": round(league_pace, 2)},
        })
    return rows


def sync_predictions(_api: NoApi) -> int:
    """Predict today's and tomorrow's games (US Eastern) that have not started yet."""
    today = timeutil.today_et()
    games = db.select("games", {
        "select": "id,season,stage,home_team_id,away_team_id",
        "status": "eq.scheduled", "stage": "gt.1",
        "game_date_et": f"in.({today.isoformat()},{(today + timedelta(days=1)).isoformat()})",
        "start_time": f"gt.{timeutil.now_utc().isoformat()}",
    })
    rows = [r for season in {g["season"] for g in games}
            for r in prediction_rows([g for g in games if g["season"] == season], season)]
    return db.upsert("game_predictions", rows, on_conflict="game_id") if rows else 0
