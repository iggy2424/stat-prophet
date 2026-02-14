from http.server import BaseHTTPRequestHandler
import json
import os
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        response = {
            "api": "Stat Prophet Prediction API",
            "version": "1.0.0",
            "status": "running",
            "usage": "POST to /api with player_name, stat_type, and line"
        }
        self._send_json(200, response)
    
    def do_POST(self):
        try:
            import anthropic
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            player_name = data.get('player_name', 'Unknown')
            stat_type = data.get('stat_type', 'points')
            line = data.get('line', 0)
            
            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            
            prompt = f"""You are an expert NBA analyst. Analyze this prop bet:

Player: {player_name}
Stat: {stat_type}
Line: {line}

Respond ONLY with JSON:
{{"prediction": "OVER" or "UNDER", "probability": number 0-100, "confidence": "high"/"medium"/"low", "factors": ["reason1", "reason2"], "risks": ["risk1"], "summary": "one sentence"}}"""

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
                prediction = {"prediction": "UNKNOWN", "probability": 50, "summary": response_text[:200]}
            
            self._send_json(200, {"success": True, "player": player_name, "stat": stat_type, "line": line, "prediction": prediction})
            
        except Exception as e:
            self._send_json(500, {"error": str(e)})
    
    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
