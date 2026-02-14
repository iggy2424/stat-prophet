"""
Players Search API Endpoint
Search and list NBA players
"""

from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse

from utils.api_sports import APISportsClient


class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler for players"""
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle player search requests"""
        try:
            # Parse query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            search = query_params.get('search', [None])[0]
            team_id = query_params.get('team', [None])[0]
            player_id = query_params.get('id', [None])[0]
            
            api_sports = APISportsClient()
            
            if player_id:
                # Get specific player
                player = api_sports.get_player(int(player_id))
                if not player:
                    return self._error_response(404, f"Player not found: {player_id}")
                
                # Also get their stats
                stats = api_sports.get_player_season_averages(int(player_id))
                recent = api_sports.get_player_recent_form(int(player_id))
                
                response = {
                    "success": True,
                    "player": player,
                    "season_stats": stats,
                    "recent_form": recent
                }
                
            elif search:
                # Search players by name
                players = api_sports.search_players(search)
                
                # Format results
                formatted = []
                for p in players[:20]:  # Limit to 20 results
                    formatted.append({
                        "id": p.get("id"),
                        "name": f"{p.get('firstname', '')} {p.get('lastname', '')}".strip(),
                        "team": p.get("team", {}).get("name") if isinstance(p.get("team"), dict) else None,
                        "position": p.get("leagues", {}).get("standard", {}).get("pos") if p.get("leagues") else None,
                        "jersey": p.get("leagues", {}).get("standard", {}).get("jersey") if p.get("leagues") else None
                    })
                
                response = {
                    "success": True,
                    "count": len(formatted),
                    "players": formatted
                }
                
            elif team_id:
                # Get players by team
                players = api_sports.get_players_by_team(int(team_id))
                
                formatted = []
                for p in players:
                    formatted.append({
                        "id": p.get("id"),
                        "name": f"{p.get('firstname', '')} {p.get('lastname', '')}".strip(),
                        "position": p.get("leagues", {}).get("standard", {}).get("pos") if p.get("leagues") else None,
                        "jersey": p.get("leagues", {}).get("standard", {}).get("jersey") if p.get("leagues") else None
                    })
                
                response = {
                    "success": True,
                    "count": len(formatted),
                    "players": formatted
                }
                
            else:
                # Return API info
                response = {
                    "success": True,
                    "api": "Players Search API",
                    "usage": {
                        "search": "GET /api/players?search=LeBron",
                        "by_team": "GET /api/players?team=17",
                        "by_id": "GET /api/players?id=236"
                    }
                }
            
            return self._success_response(response)
            
        except Exception as e:
            print(f"Players API error: {e}")
            return self._error_response(500, str(e))
    
    def _success_response(self, data: dict):
        """Send a successful JSON response"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def _error_response(self, status_code: int, message: str):
        """Send an error JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            "success": False,
            "error": message
        }).encode('utf-8'))
