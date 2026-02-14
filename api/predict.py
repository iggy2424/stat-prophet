"""
Main Prediction API Endpoint - Lightweight Version
Uses Claude for predictions (no heavy ML dependencies)
"""

from http.server import BaseHTTPRequestHandler
import json
import os

class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler"""
    
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
            "endpoints": {
                "POST /api/predict": "Get prediction for a player prop"
            }
        }
        self._send_json(200, response)
    
    def do_POST(self):
        try:
            import anthropic
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            player_name = data.get('player_name', 'Unknown Player')
            stat_type = data.get('stat_type', 'points')
            line = data.get('line', 0)
            
            if not player_name or line <= 0:
                return self._send_json(400, {"error": "player_name and line are required"})
            
            # Use Claude for prediction
            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            
            prompt = f"""You are an expert NBA analyst. Analyze this player prop bet and provide your prediction.

Player: {player_name}
Stat: {stat_type}
Line: {line}

Based on your knowledge of this player's typical performance, provide:
1. Your prediction (OVER or UNDER)
2. Confidence percentage (0-100)
3. 3 key factors supporting your prediction
4. 2 risks to consider

Respond in JSON format:
{{
    "prediction": "OVER" or "UNDER",
    "probability": number,
    "confidence": "high" or "medium" or "low",
    "factors": ["factor1", "factor2", "factor3"],
    "risks": ["risk1", "risk2"],
    "summary": "Brief 1-2 sentence summary"
}}"""

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse Claude's response
            response_text = message.content[0].text
            
            # Try to extract JSON from response
            try:
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0]
                
                prediction_data = json.loads(response_text.strip())
            except:
                prediction_data = {
                    "prediction": "UNKNOWN",
                    "probability": 50,
                    "confidence": "low",
                    "factors": [],
                    "risks": [],
                    "summary": response_text[:200]
                }
            
            response = {
                "success": True,
                "player": player_name,
                "prop": {
                    "stat": stat_type,
                    "line": line
                },
                "prediction": prediction_data
            }
            
            self._send_json(200, response)
            
        except Exception as e:
            self._send_json(500, {"error": str(e)})
    
    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
