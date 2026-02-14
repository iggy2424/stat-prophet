"""
Main Prediction API Endpoint
Vercel Serverless Function (Python)
"""

from http.server import BaseHTTPRequestHandler
import json
import os
from urllib.parse import parse_qs, urlparse

# Import our modules
from utils.api_sports import APISportsClient
from utils.ml_model import NBAStatPredictor
from utils.claude_reasoning import ClaudeReasoning


class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler"""
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        """Handle prediction requests"""
        try:
            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            # Extract parameters
            player_name = data.get('player_name')
            player_id = data.get('player_id')
            stat_type = data.get('stat_type', 'points')
            line = float(data.get('line', 0))
            include_reasoning = data.get('include_reasoning', True)
            
            if not player_name and not player_id:
                return self._error_response(400, "player_name or player_id is required")
            
            if line <= 0:
                return self._error_response(400, "line must be a positive number")
            
            # Initialize clients
            api_sports = APISportsClient()
            ml_model = NBAStatPredictor()
            
            # Step 1: Get player info if we only have name
            if not player_id:
                players = api_sports.search_players(player_name)
                if not players:
                    return self._error_response(404, f"Player not found: {player_name}")
                player = players[0]
                player_id = player['id']
                player_name = f"{player.get('firstname', '')} {player.get('lastname', '')}".strip()
            else:
                player = api_sports.get_player(player_id)
                if not player:
                    return self._error_response(404, f"Player not found: {player_id}")
                player_name = f"{player.get('firstname', '')} {player.get('lastname', '')}".strip()
            
            # Step 2: Get player statistics
            season_avg = api_sports.get_player_season_averages(player_id)
            recent_form = api_sports.get_player_recent_form(player_id, last_n=10)
            recent_games = recent_form.get('games', [])
            
            # Step 3: Get opponent info (if available)
            # For now, use default defensive rating
            opponent_def_rating = 110.0  # League average
            opponent = data.get('opponent', 'Unknown')
            is_home = data.get('is_home', True)
            rest_days = data.get('rest_days', 1)
            
            # Step 4: Run ML prediction
            ml_result = ml_model.predict(
                stat_type=stat_type,
                line=line,
                season_avg=season_avg,
                recent_games=recent_games,
                opponent_def_rating=opponent_def_rating,
                is_home=is_home,
                rest_days=rest_days
            )
            
            # Step 5: Add Claude reasoning (optional)
            if include_reasoning:
                try:
                    claude = ClaudeReasoning()
                    full_analysis = claude.analyze_prediction(
                        player_name=player_name,
                        stat_type=stat_type,
                        line=line,
                        ml_prediction=ml_result,
                        season_avg=season_avg,
                        recent_games=recent_games,
                        opponent=opponent
                    )
                except Exception as e:
                    print(f"Claude reasoning failed: {e}")
                    full_analysis = {
                        "ml_probability": ml_result.get("probability"),
                        "ml_prediction": ml_result.get("prediction"),
                        "ml_confidence": ml_result.get("confidence"),
                        "ml_factors": ml_result.get("factors"),
                        "claude_verdict": ml_result.get("prediction", "").upper(),
                        "summary": f"ML model predicts {ml_result.get('prediction', 'unknown').upper()} with {ml_result.get('probability', 50)}% confidence."
                    }
            else:
                full_analysis = {
                    "ml_probability": ml_result.get("probability"),
                    "ml_prediction": ml_result.get("prediction"),
                    "ml_confidence": ml_result.get("confidence"),
                    "ml_factors": ml_result.get("factors")
                }
            
            # Build response
            response = {
                "success": True,
                "player": {
                    "id": player_id,
                    "name": player_name,
                    "team": player.get('team', {}).get('name') if isinstance(player.get('team'), dict) else None
                },
                "prop": {
                    "stat": stat_type,
                    "line": line,
                    "opponent": opponent
                },
                "season_stats": season_avg,
                "recent_trend": recent_form.get('trend'),
                "prediction": full_analysis,
                "recommended_play": ml_result.get('recommended_play')
            }
            
            return self._success_response(response)
            
        except json.JSONDecodeError:
            return self._error_response(400, "Invalid JSON in request body")
        except Exception as e:
            print(f"Prediction error: {e}")
            return self._error_response(500, str(e))
    
    def do_GET(self):
        """Handle GET requests - return API info"""
        response = {
            "api": "Stat Prophet Prediction API",
            "version": "1.0.0",
            "endpoints": {
                "POST /api/predict": {
                    "description": "Get prediction for a player prop",
                    "body": {
                        "player_name": "string (required if no player_id)",
                        "player_id": "number (required if no player_name)",
                        "stat_type": "string (points, rebounds, assists, threes, steals, blocks, pra)",
                        "line": "number (required)",
                        "opponent": "string (optional)",
                        "is_home": "boolean (optional, default true)",
                        "rest_days": "number (optional, default 1)",
                        "include_reasoning": "boolean (optional, default true)"
                    }
                }
            }
        }
        return self._success_response(response)
    
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
