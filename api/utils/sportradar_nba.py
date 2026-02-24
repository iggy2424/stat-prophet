"""
Sportradar NBA API utility
Fetches real player season averages and recent game stats to enrich Claude predictions.
Trial key endpoint: https://api.sportradar.com/nba/trial/v8/en/
"""

import os
import time
import unicodedata
import requests
from datetime import datetime, timedelta

SPORTRADAR_KEY = os.environ.get("SPORTRADAR_NBA_KEY")
BASE_URL = "https://api.sportradar.com/nba/trial/v8/en"


def _get(endpoint):
    """Make a GET request to Sportradar API. Returns parsed JSON or None on failure."""
    try:
        url = f"{BASE_URL}/{endpoint}?api_key={SPORTRADAR_KEY}"
        r = requests.get(url, timeout=6)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def _normalize(name):
    """Strip accents and lowercase — so Dončić == doncic, etc."""
    return unicodedata.normalize("NFD", name).encode("ascii", "ignore").decode().strip().lower()


def _find_base_date():
    """
    Returns the base datetime to search from.
    Tries current dates first (paid API). If no closed games found,
    falls back to 365 days ago (trial API which has prior-season data).
    """
    now = datetime.utcnow()
    for days_ago in range(0, 3):
        date = now - timedelta(days=days_ago)
        schedule = _get(f"games/{date.year}/{date.month:02d}/{date.day:02d}/schedule")
        if schedule and any(g.get("status") in ("closed", "complete") for g in schedule.get("games", [])):
            return now  # current dates have live data
        time.sleep(0.5)
    # No current data — trial API, use prior-season dates
    return now - timedelta(days=365)


def get_player_stats(player_name):
    """
    Looks up an NBA player by name in recent game summaries.
    Returns a dict with season averages + last game stats, or None if not found.
    Automatically handles trial API date offset.
    """
    if not SPORTRADAR_KEY:
        return None

    target = _normalize(player_name)
    base = _find_base_date()

    for days_ago in range(0, 6):
        date = base - timedelta(days=days_ago)
        schedule = _get(f"games/{date.year}/{date.month:02d}/{date.day:02d}/schedule")
        if not schedule:
            time.sleep(0.5)
            continue

        closed_games = [g for g in schedule.get("games", []) if g.get("status") in ("closed", "complete")]
        for game in closed_games:
            time.sleep(0.4)  # respect trial rate limit
            summary = _get(f"games/{game['id']}/summary")
            if not summary:
                continue
            for side in ("home", "away"):
                for player in summary.get(side, {}).get("players", []):
                    if _normalize(player.get("full_name", "")) == target:
                        return _build_stats(player["id"], player.get("statistics", {}), game, summary)

    return None


def _build_stats(player_id, last_game_stats, game_info, summary):
    """Combines season averages (from player profile) with last game stats."""
    season_avg = {}
    try:
        time.sleep(0.4)
        profile = _get(f"players/{player_id}/profile")
        if profile:
            player_data = profile.get("player", {})
            seasons = player_data.get("seasons", [])
            for s in sorted(seasons, key=lambda x: x.get("year", 0), reverse=True):
                if s.get("type") == "REG":
                    teams = s.get("teams", [])
                    if teams:
                        avg = teams[0].get("average", {})
                        if avg.get("points"):
                            season_avg = avg
                            break
    except Exception:
        pass

    home_team = summary.get("home", {}).get("market", "") + " " + summary.get("home", {}).get("name", "")
    away_team = summary.get("away", {}).get("market", "") + " " + summary.get("away", {}).get("name", "")
    game_date = game_info.get("scheduled", "")[:10]

    return {
        "season_avg": season_avg,
        "last_game": last_game_stats,
        "game_date": game_date,
        "matchup": f"{away_team} @ {home_team}",
    }


def format_stats_for_prompt(stats):
    """Converts the stats dict into a clean text block to inject into the Claude prompt."""
    if not stats:
        return ""

    lines = []
    avg = stats.get("season_avg", {})
    last = stats.get("last_game", {})

    if avg:
        lines.append("REAL 2024-25 SEASON AVERAGES (per game):")
        for key, label in [
            ("points", "PPG"), ("rebounds", "RPG"), ("assists", "APG"),
            ("steals", "SPG"), ("blocks", "BPG"), ("three_points_made", "3PM"),
            ("field_goals_made", "FGM"), ("field_goals_att", "FGA"),
            ("free_throws_made", "FTM"), ("turnovers", "TOV"), ("minutes", "MIN"),
        ]:
            val = avg.get(key)
            if val is not None:
                lines.append(f"  {label}: {val}")

    if last:
        lines.append(f"\nMOST RECENT GAME STATS ({stats.get('game_date', 'recent')}):")
        for key, label in [
            ("points", "PTS"), ("rebounds", "REB"), ("assists", "AST"),
            ("steals", "STL"), ("three_points_made", "3PM"),
            ("field_goals_made", "FGM"), ("field_goals_att", "FGA"), ("minutes", "MIN"),
        ]:
            val = last.get(key)
            if val is not None:
                lines.append(f"  {label}: {val}")

    return "\n".join(lines)
