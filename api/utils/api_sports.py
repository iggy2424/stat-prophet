"""
API-Sports Client for NBA Data
Handles all communication with the API-Sports NBA endpoints
"""

import os
import requests
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta

class APISportsClient:
    """Client for interacting with API-Sports NBA API"""
    
    BASE_URL = "https://v2.nba.api-sports.io"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("API_SPORTS_KEY")
        if not self.api_key:
            raise ValueError("API_SPORTS_KEY is required")
        
        self.headers = {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": "v2.nba.api-sports.io"
        }
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make a request to the API-Sports endpoint"""
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            response = requests.get(url, headers=self.headers, params=params or {})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"API Request Error: {e}")
            return {"response": [], "errors": str(e)}
    
    # ============== PLAYERS ==============
    
    def search_players(self, name: str) -> List[Dict]:
        """Search for players by name"""
        data = self._make_request("players", {"search": name})
        return data.get("response", [])
    
    def get_player(self, player_id: int) -> Optional[Dict]:
        """Get player details by ID"""
        data = self._make_request("players", {"id": player_id})
        players = data.get("response", [])
        return players[0] if players else None
    
    def get_players_by_team(self, team_id: int, season: int = 2024) -> List[Dict]:
        """Get all players on a team for a given season"""
        data = self._make_request("players", {"team": team_id, "season": season})
        return data.get("response", [])
    
    # ============== TEAMS ==============
    
    def get_teams(self) -> List[Dict]:
        """Get all NBA teams"""
        data = self._make_request("teams", {"league": "standard"})
        return data.get("response", [])
    
    def get_team(self, team_id: int) -> Optional[Dict]:
        """Get team details by ID"""
        data = self._make_request("teams", {"id": team_id})
        teams = data.get("response", [])
        return teams[0] if teams else None
    
    # ============== GAMES ==============
    
    def get_games_by_date(self, date: str) -> List[Dict]:
        """Get all games on a specific date (format: YYYY-MM-DD)"""
        data = self._make_request("games", {"date": date})
        return data.get("response", [])
    
    def get_games_by_team(self, team_id: int, season: int = 2024) -> List[Dict]:
        """Get all games for a team in a season"""
        data = self._make_request("games", {"team": team_id, "season": season})
        return data.get("response", [])
    
    def get_live_games(self) -> List[Dict]:
        """Get all currently live games"""
        data = self._make_request("games", {"live": "all"})
        return data.get("response", [])
    
    def get_game(self, game_id: int) -> Optional[Dict]:
        """Get game details by ID"""
        data = self._make_request("games", {"id": game_id})
        games = data.get("response", [])
        return games[0] if games else None
    
    # ============== STATISTICS ==============
    
    def get_player_statistics(
        self, 
        player_id: int, 
        season: int = 2024,
        last_n_games: Optional[int] = None
    ) -> List[Dict]:
        """
        Get player statistics for a season
        Returns per-game stats
        """
        params = {"id": player_id, "season": season}
        data = self._make_request("players/statistics", params)
        stats = data.get("response", [])
        
        # Sort by date (most recent first) and limit if requested
        if stats and last_n_games:
            stats = sorted(stats, key=lambda x: x.get("game", {}).get("date", ""), reverse=True)
            stats = stats[:last_n_games]
        
        return stats
    
    def get_game_statistics(self, game_id: int) -> List[Dict]:
        """Get all player statistics for a specific game"""
        data = self._make_request("players/statistics", {"game": game_id})
        return data.get("response", [])
    
    def get_team_statistics(self, team_id: int, season: int = 2024) -> Optional[Dict]:
        """Get team statistics for a season"""
        data = self._make_request("teams/statistics", {"id": team_id, "season": season})
        stats = data.get("response", [])
        return stats[0] if stats else None
    
    # ============== STANDINGS ==============
    
    def get_standings(self, season: int = 2024, conference: str = None) -> List[Dict]:
        """Get NBA standings for a season"""
        params = {"league": "standard", "season": season}
        if conference:
            params["conference"] = conference  # "east" or "west"
        
        data = self._make_request("standings", params)
        return data.get("response", [])
    
    # ============== SEASONS ==============
    
    def get_seasons(self) -> List[int]:
        """Get all available seasons"""
        data = self._make_request("seasons")
        return data.get("response", [])
    
    # ============== HELPER METHODS ==============
    
    def get_player_season_averages(self, player_id: int, season: int = 2024) -> Dict:
        """
        Calculate season averages for a player
        Returns aggregated stats
        """
        stats = self.get_player_statistics(player_id, season)
        
        if not stats:
            return {}
        
        # Initialize aggregators
        totals = {
            "games": 0,
            "points": 0,
            "rebounds": 0,
            "assists": 0,
            "steals": 0,
            "blocks": 0,
            "turnovers": 0,
            "fgm": 0,
            "fga": 0,
            "tpm": 0,
            "tpa": 0,
            "ftm": 0,
            "fta": 0,
            "minutes": 0
        }
        
        for game_stat in stats:
            totals["games"] += 1
            totals["points"] += game_stat.get("points", 0) or 0
            totals["rebounds"] += (game_stat.get("totReb", 0) or 0)
            totals["assists"] += game_stat.get("assists", 0) or 0
            totals["steals"] += game_stat.get("steals", 0) or 0
            totals["blocks"] += game_stat.get("blocks", 0) or 0
            totals["turnovers"] += game_stat.get("turnovers", 0) or 0
            totals["fgm"] += game_stat.get("fgm", 0) or 0
            totals["fga"] += game_stat.get("fga", 0) or 0
            totals["tpm"] += game_stat.get("tpm", 0) or 0
            totals["tpa"] += game_stat.get("tpa", 0) or 0
            totals["ftm"] += game_stat.get("ftm", 0) or 0
            totals["fta"] += game_stat.get("fta", 0) or 0
            
            # Parse minutes (format: "32:45")
            mins = game_stat.get("min", "0:0") or "0:0"
            if ":" in str(mins):
                m, s = str(mins).split(":")
                totals["minutes"] += int(m) + int(s) / 60
            else:
                totals["minutes"] += float(mins) if mins else 0
        
        games = totals["games"]
        if games == 0:
            return {}
        
        return {
            "games_played": games,
            "ppg": round(totals["points"] / games, 1),
            "rpg": round(totals["rebounds"] / games, 1),
            "apg": round(totals["assists"] / games, 1),
            "spg": round(totals["steals"] / games, 1),
            "bpg": round(totals["blocks"] / games, 1),
            "topg": round(totals["turnovers"] / games, 1),
            "mpg": round(totals["minutes"] / games, 1),
            "fg_pct": round(totals["fgm"] / totals["fga"] * 100, 1) if totals["fga"] > 0 else 0,
            "three_pct": round(totals["tpm"] / totals["tpa"] * 100, 1) if totals["tpa"] > 0 else 0,
            "ft_pct": round(totals["ftm"] / totals["fta"] * 100, 1) if totals["fta"] > 0 else 0,
            "totals": totals
        }
    
    def get_player_recent_form(self, player_id: int, last_n: int = 5) -> Dict:
        """
        Get player's recent form (last N games)
        Useful for trend analysis
        """
        stats = self.get_player_statistics(player_id, last_n_games=last_n)
        
        if not stats:
            return {"games": [], "trend": "unknown"}
        
        games = []
        for stat in stats:
            games.append({
                "date": stat.get("game", {}).get("date"),
                "opponent": stat.get("team", {}).get("name"),
                "points": stat.get("points", 0),
                "rebounds": stat.get("totReb", 0),
                "assists": stat.get("assists", 0),
                "minutes": stat.get("min", "0"),
                "plus_minus": stat.get("plusMinus", 0)
            })
        
        # Calculate trend (comparing recent to earlier)
        if len(games) >= 4:
            recent_pts = sum(g["points"] or 0 for g in games[:2]) / 2
            earlier_pts = sum(g["points"] or 0 for g in games[2:4]) / 2
            
            if recent_pts > earlier_pts * 1.1:
                trend = "hot"
            elif recent_pts < earlier_pts * 0.9:
                trend = "cold"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
        
        return {
            "games": games,
            "trend": trend,
            "last_n": last_n
        }


# Example usage
if __name__ == "__main__":
    # Test the client
    client = APISportsClient()
    
    # Search for a player
    players = client.search_players("LeBron James")
    print(f"Found {len(players)} players")
    
    if players:
        player_id = players[0]["id"]
        
        # Get season averages
        averages = client.get_player_season_averages(player_id)
        print(f"Season averages: {averages}")
        
        # Get recent form
        form = client.get_player_recent_form(player_id)
        print(f"Recent form: {form['trend']}")
