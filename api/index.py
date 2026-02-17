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
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            data_type = query_params.get('type', [None])[0]
            
            if data_type:
                self._handle_data_request(data_type)
            else:
                response = {
                    "api": "Stat Prophet Prediction API",
                    "version": "2.0.0",
                    "status": "running"
                }
                self._send_json(200, response)
        except Exception as e:
            self._send_json(500, {"error": str(e)})
    
    def _handle_data_request(self, data_type):
        import requests
        
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
        
        if data_type == 'players':
            url = f"{SUPABASE_URL}/rest/v1/players?select=id,name,team_id,position,sport,teams(id,name,city,abbreviation,conference)&order=name"
            response = requests.get(url, headers=headers)
            players = response.json()
            
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
            url = f"{SUPABASE_URL}/rest/v1/teams?select=*&order=city"
            response = requests.get(url, headers=headers)
            teams = response.json()
            self._send_json(200, {"success": True, "teams": teams, "count": len(teams)})
        
        else:
            self._send_json(400, {"error": "Invalid type. Use 'players' or 'teams'"})
    
    def do_POST(self):
        try:
            import anthropic
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            player_name = data.get('player_name', 'Unknown')
            stat_type = data.get('stat_type', 'points')
            line = data.get('line', 0)
            direction = data.get('direction', 'OVER')
            opponent = data.get('opponent', 'Unknown')
            
            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            
            prompt = f"""You are an NBA statistics expert. A user wants to know the probability of a specific betting outcome.

PLAYER: {player_name}
STAT: {stat_type}
OPPONENT: {opponent}
BET: {direction} {line}

The user is asking: "What is the percentage chance that {player_name} scores {direction} {line} {stat_type} in their next game against {opponent}?"

Think about:
- This player's typical season average for this stat
- Their recent performance trends
- How often they hit this type of line historically
- The opponent's defensive strength

IMPORTANT: 
- If the bet is "{direction} {line}", give the probability that THIS SPECIFIC BET WINS
- For example, if someone bets "UNDER 10 points" for LeBron (who averages 25+), the probability should be very LOW (like 2-5%) because LeBron almost never scores under 10
- If someone bets "OVER 25 points" for LeBron, the probability should be around 50-60% based on his averages
- Factor in the opponent's defense - tough defenders lower scoring probability

Respond ONLY with this JSON format:
{{"probability": <number 0-100 representing chance this exact bet wins>, "confidence": "high"/"medium"/"low", "factors": ["reason1", "reason2"], "risks": ["risk1"], "summary": "one sentence explanation"}}"""

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            try:
                if "```" in response_text:
                    response_text = response_text.split("```")[1].replace("json", "").strip()
                prediction = json.loads(response_text)
            except:
                prediction = {"probability": 50, "confidence": "low", "summary": response_text[:200]}
            
            prediction['direction'] = direction
            
            self._send_json(200, {
                "success": True, 
                "player": player_name, 
                "stat": stat_type, 
                "line": line, 
                "direction": direction,
                "opponent": opponent,
                "prediction": prediction
            })
            
        except Exception as e:
            self._send_json(500, {"error": str(e)})
    
    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
