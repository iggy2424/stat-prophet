"""
Supabase Database Client
Handles all database operations for Stat Prophet
"""

import os
from typing import Optional, Dict, List
from datetime import datetime, date
from supabase import create_client, Client


class SupabaseClient:
    """Client for interacting with Supabase database"""
    
    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY are required")
        
        self.client: Client = create_client(url, key)
    
    # ============== PLAYERS ==============
    
    def get_player(self, player_id: int) -> Optional[Dict]:
        """Get player by ID"""
        result = self.client.table("players").select("*").eq("id", player_id).execute()
        return result.data[0] if result.data else None
    
    def search_players(self, name: str, limit: int = 20) -> List[Dict]:
        """Search players by name"""
        result = self.client.table("players")\
            .select("*")\
            .ilike("full_name", f"%{name}%")\
            .limit(limit)\
            .execute()
        return result.data
    
    def upsert_player(self, player_data: Dict) -> Dict:
        """Insert or update player"""
        result = self.client.table("players").upsert(player_data).execute()
        return result.data[0] if result.data else None
    
    def get_players_by_team(self, team_id: int) -> List[Dict]:
        """Get all players on a team"""
        result = self.client.table("players")\
            .select("*")\
            .eq("team_id", team_id)\
            .execute()
        return result.data
    
    # ============== PLAYER STATS ==============
    
    def get_player_stats(
        self, 
        player_id: int, 
        limit: int = 10,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Dict]:
        """Get player's game stats"""
        query = self.client.table("player_stats")\
            .select("*")\
            .eq("player_id", player_id)\
            .order("game_date", desc=True)
        
        if start_date:
            query = query.gte("game_date", start_date.isoformat())
        if end_date:
            query = query.lte("game_date", end_date.isoformat())
        
        query = query.limit(limit)
        result = query.execute()
        return result.data
    
    def insert_player_stats(self, stats: Dict) -> Dict:
        """Insert player game stats"""
        result = self.client.table("player_stats").insert(stats).execute()
        return result.data[0] if result.data else None
    
    def bulk_insert_stats(self, stats_list: List[Dict]) -> List[Dict]:
        """Insert multiple player game stats"""
        result = self.client.table("player_stats").insert(stats_list).execute()
        return result.data
    
    # ============== SEASON AVERAGES ==============
    
    def get_season_averages(self, player_id: int, season: int = 2024) -> Optional[Dict]:
        """Get player's cached season averages"""
        result = self.client.table("season_averages")\
            .select("*")\
            .eq("player_id", player_id)\
            .eq("season", season)\
            .execute()
        return result.data[0] if result.data else None
    
    def upsert_season_averages(self, player_id: int, season: int, averages: Dict) -> Dict:
        """Update or insert season averages"""
        data = {
            "player_id": player_id,
            "season": season,
            **averages
        }
        result = self.client.table("season_averages").upsert(data).execute()
        return result.data[0] if result.data else None
    
    # ============== PREDICTIONS ==============
    
    def save_prediction(self, prediction: Dict) -> Dict:
        """Save a new prediction"""
        result = self.client.table("predictions").insert(prediction).execute()
        return result.data[0] if result.data else None
    
    def get_predictions(
        self,
        player_id: Optional[int] = None,
        stat_type: Optional[str] = None,
        limit: int = 50,
        unsettled_only: bool = False
    ) -> List[Dict]:
        """Get predictions with filters"""
        query = self.client.table("predictions")\
            .select("*, players(full_name)")\
            .order("game_date", desc=True)
        
        if player_id:
            query = query.eq("player_id", player_id)
        if stat_type:
            query = query.eq("stat_type", stat_type)
        if unsettled_only:
            query = query.is_("hit", "null")
        
        query = query.limit(limit)
        result = query.execute()
        return result.data
    
    def settle_prediction(self, prediction_id: int, actual_value: float) -> Dict:
        """Settle a prediction with actual result"""
        # First get the prediction to determine if it hit
        pred = self.client.table("predictions")\
            .select("line, predicted_direction")\
            .eq("id", prediction_id)\
            .execute()
        
        if not pred.data:
            return None
        
        line = pred.data[0]["line"]
        direction = pred.data[0]["predicted_direction"]
        
        # Determine if prediction hit
        if direction == "OVER":
            hit = actual_value > line
        else:  # UNDER
            hit = actual_value < line
        
        # Update prediction
        result = self.client.table("predictions")\
            .update({
                "actual_value": actual_value,
                "hit": hit,
                "settled_at": datetime.now().isoformat()
            })\
            .eq("id", prediction_id)\
            .execute()
        
        return result.data[0] if result.data else None
    
    def get_prediction_accuracy(
        self, 
        stat_type: Optional[str] = None,
        days: int = 30
    ) -> Dict:
        """Get prediction accuracy stats"""
        # Use the database function
        result = self.client.rpc(
            "get_prediction_accuracy",
            {"p_stat_type": stat_type, "p_days": days}
        ).execute()
        
        if result.data:
            return result.data[0]
        return {"total_predictions": 0, "hits": 0, "hit_rate": 0}
    
    # ============== TEAMS ==============
    
    def get_teams(self) -> List[Dict]:
        """Get all teams"""
        result = self.client.table("teams").select("*").execute()
        return result.data
    
    def upsert_team(self, team_data: Dict) -> Dict:
        """Insert or update team"""
        result = self.client.table("teams").upsert(team_data).execute()
        return result.data[0] if result.data else None
    
    # ============== CACHING HELPERS ==============
    
    def is_player_cached(self, player_id: int) -> bool:
        """Check if player exists in cache"""
        result = self.client.table("players")\
            .select("id")\
            .eq("id", player_id)\
            .execute()
        return len(result.data) > 0
    
    def is_stats_fresh(self, player_id: int, max_age_hours: int = 6) -> bool:
        """Check if player stats are recent enough"""
        result = self.client.table("player_stats")\
            .select("created_at")\
            .eq("player_id", player_id)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data:
            return False
        
        last_update = datetime.fromisoformat(result.data[0]["created_at"].replace("Z", "+00:00"))
        age = datetime.now(last_update.tzinfo) - last_update
        return age.total_seconds() < max_age_hours * 3600


# Singleton instance
_db_client: Optional[SupabaseClient] = None

def get_db() -> SupabaseClient:
    """Get or create database client singleton"""
    global _db_client
    if _db_client is None:
        _db_client = SupabaseClient()
    return _db_client


# Example usage
if __name__ == "__main__":
    db = get_db()
    
    # Search for players
    players = db.search_players("LeBron")
    print(f"Found {len(players)} players")
    
    # Get prediction accuracy
    accuracy = db.get_prediction_accuracy()
    print(f"Accuracy: {accuracy}")
