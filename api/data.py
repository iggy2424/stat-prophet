from http.server import BaseHTTPRequestHandler
import json
import os
from urllib.parse import urlparse, parse_qs

# Supabase setup
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

class handler(BaseHTTPRequestHandler):
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        try:
            import requests
            
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            
            # Determine what data to fetch
            data_type = query_params.get('type', ['players'])[0]
            
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
            
            if data_type == 'players':
                # Fetch all players with their team info
                url = f"{SUPABASE_URL}/rest/v1/players?select=id,name,team_id,position,sport,teams(id,name,city,abbreviation,conference)&order=name"
                response = requests.get(url, headers=headers)
                players = response.json()
                
                # Format the response
                formatted = []
                for p in players:
                    team = p.get('teams', {})
                    formatted.append({
                        "id": p['id'],
                        "name": p['name'],
                        "team_id": p['team_id'],
                        "position": p.get('position'),
                        "sport": p.get('sport', 'NBA'),
                        "team_name": team.get('name') if team else None,
                        "team_city": team.get('city') if team else None,
                        "team_abbrev": team.get('abbreviation') if team else None
                    })
                
                self._send_json(200, {"success": True, "players": formatted, "count": len(formatted)})
            
            elif data_type == 'teams':
                # Fetch all teams
                url = f"{SUPABASE_URL}/rest/v1/teams?select=*&order=city"
                response = requests.get(url, headers=headers)
                teams = response.json()
                
                self._send_json(200, {"success": True, "teams": teams, "count": len(teams)})
            
            else:
                self._send_json(400, {"error": "Invalid type. Use 'players' or 'teams'"})
                
        except Exception as e:
            self._send_json(500, {"error": str(e)})
    
    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
