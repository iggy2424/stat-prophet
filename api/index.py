from http.server import BaseHTTPRequestHandler
import json
import os
from urllib.parse import urlparse, parse_qs
from collections import defaultdict
from difflib import get_close_matches
from statistics import mode, median

# API Keys
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
ODDS_API_KEY = os.environ.get("ODDS_API_KEY")
API_SPORTS_KEY = os.environ.get("API_SPORTS_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Odds API Config
ODDS_BASE = "https://api.the-odds-api.com/v4"
SPORT = "basketball_nba"

# API-Sports Config
API_SPORTS_BASE = "https://v2.nba.api-sports.io"

# Stat mappings
STAT_TO_MARKET = {
    "points": "player_points",
    "rebounds": "player_rebounds",
    "assists": "player_assists",
    "steals": "player_steals",
    "blocks": "player_blocks",
    "three-pointers": "player_threes",
    "3pm": "player_threes",
    "pra": "player_points_rebounds_assists",
}

STAT_TO_API_SPORTS = {
    "points": "points",
    "rebounds": "totReb",
    "assists": "assists",
    "steals": "steals",
    "blocks": "blocks",
    "three-pointers": "tpm",
    "3pm": "tpm",
}

SHARP_BOOKS = ["pinnacle", "draftkings", "fanduel"]
SOFT_BOOKS = ["betmgm", "caesars", "bovada", "mybookieag"]


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
                    "version": "3.0.0",
                    "status": "running",
                    "features": ["API-Sports Integration", "Odds API Integration", "Claude Analysis"]
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
            import requests
            import anthropic
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            player_name = data.get('player_name', 'Unknown')
            stat_type = data.get('stat_type', 'points').lower()
            line = float(data.get('line', 0))
            direction = data.get('direction', 'OVER')
            opponent = data.get('opponent', 'Unknown')
            player_team = data.get('player_team', '')
            
            # ═══════════════════════════════════════════════════════
            # STEP 1: Get player stats from API-Sports
            # ═══════════════════════════════════════════════════════
            player_stats = self._get_player_stats(player_name, stat_type, requests)
            
            # ═══════════════════════════════════════════════════════
            # STEP 2: Get odds data from The Odds API
            # ═══════════════════════════════════════════════════════
            odds_data = self._get_odds_data(player_name, stat_type, player_team, opponent, requests)
            
            # ═══════════════════════════════════════════════════════
            # STEP 3: Calculate Python-based metrics
            # ═══════════════════════════════════════════════════════
            analysis = self._calculate_analysis(player_stats, line, direction, odds_data)
            
            # ═══════════════════════════════════════════════════════
            # STEP 4: Build context for Claude
            # ═══════════════════════════════════════════════════════
            context = self._build_claude_context(
                player_name, stat_type, line, direction, opponent,
                player_stats, odds_data, analysis
            )
            
            # ═══════════════════════════════════════════════════════
            # STEP 5: Get Claude's synthesis
            # ═══════════════════════════════════════════════════════
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            
            # Determine if we have player stats or odds-only
            has_player_stats = player_stats.get('games_played', 0) > 0
            has_odds_data = odds_data.get('summary', {}).get('consensus_line') is not None
            
            if has_odds_data and not has_player_stats:
                # ODDS-ONLY MODE
                prompt = f"""{context}

You are analyzing this bet using MARKET DATA ONLY (no player statistics available).

IMPORTANT: The odds data IS valuable for making predictions. Use these signals:

1. **Consensus Line vs User's Line**: If user's line differs from market consensus, there may be value
2. **Sharp vs Soft Book Delta**: If sharp books (Pinnacle, DraftKings) differ from soft books, follow the sharps
3. **Implied Probabilities**: Shows which side the market favors
4. **Line Movement**: Indicates where smart money is going
5. **Best Available Price**: Better prices = better value

RULES:
- You CAN make OVER/UNDER recommendations based on market signals alone
- If market is perfectly neutral (50/50), lean toward the user's selection with LEAN confidence
- If there's a sharp/soft discrepancy, follow the sharp money
- Only say NO BET if the market shows significant value AGAINST the user's selection

Respond with ONLY this JSON format:
{{
    "recommendation": "OVER" or "UNDER" or "NO BET",
    "confidence_tier": "STRONG" or "MODERATE" or "LEAN",
    "probability": <number 40-60 for neutral markets, adjust based on signals>,
    "key_factors_for": ["market signal 1", "market signal 2"],
    "key_factors_against": ["risk 1"],
    "market_alignment": "ALIGNED" or "CONFLICTING" or "NEUTRAL",
    "summary": "2-3 sentence synthesis focusing on market signals"
}}"""
            else:
                # FULL DATA MODE
                prompt = f"""{context}

Based on ALL the data above, provide your final analysis.

IMPORTANT RULES:
1. Do NOT recalculate any numbers - use the pre-calculated values provided
2. Identify the 2-3 STRONGEST signals (agree or conflict)
3. If player stats and market odds conflict, explain why
4. Give a final call: OVER, UNDER, or NO BET

Respond with ONLY this JSON format:
{{
    "recommendation": "OVER" or "UNDER" or "NO BET",
    "confidence_tier": "STRONG" or "MODERATE" or "LEAN",
    "probability": <number 0-100>,
    "key_factors_for": ["reason1", "reason2"],
    "key_factors_against": ["risk1", "risk2"],
    "market_alignment": "ALIGNED" or "CONFLICTING" or "NEUTRAL",
    "summary": "2-3 sentence synthesis of the key signals"
}}"""

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            try:
                if "```" in response_text:
                    response_text = response_text.split("```")[1].replace("json", "").strip()
                prediction = json.loads(response_text)
            except:
                prediction = {
                    "recommendation": direction,
                    "confidence_tier": "LEAN",
                    "probability": 50,
                    "key_factors_for": [],
                    "key_factors_against": [],
                    "market_alignment": "NEUTRAL",
                    "summary": response_text[:300]
                }
            
            # ═══════════════════════════════════════════════════════
            # STEP 6: Build final response
            # ═══════════════════════════════════════════════════════
            self._send_json(200, {
                "success": True,
                "player": player_name,
                "stat": stat_type,
                "line": line,
                "direction": direction,
                "opponent": opponent,
                "prediction": prediction,
                "player_stats": player_stats,
                "odds_data": odds_data.get("summary", {}),
                "analysis": analysis
            })
            
        except Exception as e:
            import traceback
            self._send_json(500, {"error": str(e), "trace": traceback.format_exc()})
    
    # ═══════════════════════════════════════════════════════════════
    # API-SPORTS: Get player's last 30 games
    # ═══════════════════════════════════════════════════════════════
    def _get_player_stats(self, player_name, stat_type, requests):
        try:
            headers = {
                "x-rapidapi-key": API_SPORTS_KEY,
                "x-rapidapi-host": "v2.nba.api-sports.io"
            }
            
            # Search for player
            first_name = player_name.split()[0]
            search_url = f"{API_SPORTS_BASE}/players?search={first_name}"
            response = requests.get(search_url, headers=headers)
            players = response.json().get("response", [])
            
            if not players:
                return {"error": "Player not found", "games": []}
            
            # Find best match
            player_id = None
            for p in players:
                full_name = f"{p.get('firstname', '')} {p.get('lastname', '')}".strip()
                if player_name.lower() in full_name.lower() or full_name.lower() in player_name.lower():
                    player_id = p.get("id")
                    break
            
            if not player_id and players:
                player_id = players[0].get("id")
            
            if not player_id:
                return {"error": "Player ID not found", "games": []}
            
            # Try multiple seasons (2024-25 season could be listed as 2024 or 2025)
            games = []
            for season in ["2024", "2025"]:
                stats_url = f"{API_SPORTS_BASE}/players/statistics?id={player_id}&season={season}"
                response = requests.get(stats_url, headers=headers)
                games = response.json().get("response", [])
                if games:
                    break
            
            if not games:
                return {"error": "No games found for any season", "games": [], "player_id": player_id}
            
            # Extract relevant stat from each game
            stat_key = STAT_TO_API_SPORTS.get(stat_type, "points")
            game_stats = []
            
            for game in games[:30]:  # Last 30 games
                minutes = game.get("min")
                if minutes and minutes != "0:00" and minutes != "0":
                    stat_value = game.get(stat_key, 0)
                    if stat_value is not None:
                        game_stats.append({
                            "value": int(stat_value) if stat_value else 0,
                            "minutes": minutes,
                            "date": game.get("game", {}).get("date", ""),
                            "opponent": game.get("team", {}).get("name", "")
                        })
            
            if not game_stats:
                return {"error": "No valid game stats", "games": [], "player_id": player_id, "raw_games_count": len(games)}
            
            # Calculate stats
            values = [g["value"] for g in game_stats]
            
            return {
                "player_id": player_id,
                "games": game_stats[:10],  # Only return last 10 for response size
                "games_played": len(game_stats),
                "season_avg": round(sum(values) / len(values), 1) if values else 0,
                "last_5_avg": round(sum(values[:5]) / min(5, len(values)), 1) if values else 0,
                "last_10_avg": round(sum(values[:10]) / min(10, len(values)), 1) if values else 0,
                "max_last_10": max(values[:10]) if values else 0,
                "min_last_10": min(values[:10]) if values else 0,
            }
            
        except Exception as e:
            return {"error": str(e), "games": []}
    
    # ═══════════════════════════════════════════════════════════════
    # ODDS API: Get market data
    # ═══════════════════════════════════════════════════════════════
    def _get_odds_data(self, player_name, stat_type, player_team, opponent, requests):
        try:
            # Step 1: Get today's NBA events
            events_url = f"{ODDS_BASE}/sports/{SPORT}/events"
            response = requests.get(events_url, params={"apiKey": ODDS_API_KEY})
            events = response.json()
            
            if not events:
                return {"error": "No NBA events today", "summary": {}}
            
            # Step 2: Find matching event
            event = None
            for e in events:
                home = e.get("home_team", "").lower()
                away = e.get("away_team", "").lower()
                opp_lower = opponent.lower()
                
                if opp_lower in home or opp_lower in away or home in opp_lower or away in opp_lower:
                    event = e
                    break
            
            if not event:
                # Fuzzy match
                all_teams = []
                for e in events:
                    all_teams.append((e["home_team"], e))
                    all_teams.append((e["away_team"], e))
                
                matches = get_close_matches(opponent, [t[0] for t in all_teams], n=1, cutoff=0.5)
                if matches:
                    for team, evt in all_teams:
                        if team == matches[0]:
                            event = evt
                            break
            
            if not event:
                return {"error": f"Event not found for opponent: {opponent}", "summary": {}, "available_events": [f"{e['away_team']} @ {e['home_team']}" for e in events[:5]]}
            
            event_id = event["id"]
            
            # Step 3: Get prop lines
            market_key = STAT_TO_MARKET.get(stat_type, "player_points")
            odds_url = f"{ODDS_BASE}/sports/{SPORT}/events/{event_id}/odds"
            params = {
                "apiKey": ODDS_API_KEY,
                "regions": "us",
                "markets": market_key,
                "oddsFormat": "american"
            }
            response = requests.get(odds_url, params=params)
            odds_data = response.json()
            
            # Step 4: Parse and analyze
            player_odds = self._parse_player_odds(odds_data, market_key, player_name)
            
            return {
                "event": {
                    "id": event_id,
                    "home_team": event["home_team"],
                    "away_team": event["away_team"],
                    "commence_time": event.get("commence_time", "")
                },
                "summary": player_odds
            }
            
        except Exception as e:
            return {"error": str(e), "summary": {}}
    
    def _parse_player_odds(self, odds_data, market_key, player_name):
        """Parse odds data and calculate consensus, sharp/soft delta, etc."""
        player_books = defaultdict(dict)
        
        for bookmaker in odds_data.get("bookmakers", []):
            book_key = bookmaker["key"]
            for market in bookmaker.get("markets", []):
                if market["key"] != market_key:
                    continue
                
                for outcome in market.get("outcomes", []):
                    player = outcome.get("description", "")
                    if not player:
                        continue
                    
                    side = outcome["name"]
                    price = outcome["price"]
                    point = outcome.get("point")
                    
                    if side == "Over":
                        player_books[player][book_key] = player_books[player].get(book_key, {})
                        player_books[player][book_key]["over_price"] = price
                        player_books[player][book_key]["line"] = point
                    elif side == "Under":
                        player_books[player][book_key] = player_books[player].get(book_key, {})
                        player_books[player][book_key]["under_price"] = price
                        if point:
                            player_books[player][book_key]["line"] = point
        
        # Find our player (fuzzy match)
        matched_player = None
        player_data = {}
        
        for p in player_books.keys():
            if player_name.lower() in p.lower() or p.lower() in player_name.lower():
                matched_player = p
                player_data = player_books[p]
                break
        
        if not matched_player:
            matches = get_close_matches(player_name, list(player_books.keys()), n=1, cutoff=0.5)
            if matches:
                matched_player = matches[0]
                player_data = player_books[matches[0]]
        
        if not player_data:
            return {"error": "Player not found in odds", "available_players": list(player_books.keys())[:10]}
        
        # Calculate consensus and analysis
        lines = []
        over_prices = []
        under_prices = []
        sharp_lines = []
        soft_lines = []
        
        for book, data in player_data.items():
            if data.get("line"):
                lines.append(data["line"])
                if book in SHARP_BOOKS:
                    sharp_lines.append(data["line"])
                if book in SOFT_BOOKS:
                    soft_lines.append(data["line"])
            if data.get("over_price"):
                over_prices.append(data["over_price"])
            if data.get("under_price"):
                under_prices.append(data["under_price"])
        
        if not lines:
            return {"error": "No lines found"}
        
        # Consensus line
        try:
            consensus_line = mode(lines)
        except:
            consensus_line = round(median(lines) * 2) / 2
        
        # Sharp vs Soft
        sharp_consensus = round(sum(sharp_lines) / len(sharp_lines) * 2) / 2 if sharp_lines else None
        soft_consensus = round(sum(soft_lines) / len(soft_lines) * 2) / 2 if soft_lines else None
        sharp_soft_delta = round(sharp_consensus - soft_consensus, 1) if sharp_consensus and soft_consensus else None
        
        # Implied probabilities
        def american_to_implied(odds):
            if odds > 0:
                return 100 / (odds + 100)
            else:
                return abs(odds) / (abs(odds) + 100)
        
        avg_over_implied = round(sum(american_to_implied(p) for p in over_prices) / len(over_prices) * 100, 1) if over_prices else None
        avg_under_implied = round(sum(american_to_implied(p) for p in under_prices) / len(under_prices) * 100, 1) if under_prices else None
        
        # Market lean
        market_lean = "NEUTRAL"
        if avg_over_implied and avg_under_implied:
            if avg_over_implied > avg_under_implied + 3:
                market_lean = "UNDER"
            elif avg_under_implied > avg_over_implied + 3:
                market_lean = "OVER"
        
        # Line movement signal
        line_movement = "No significant movement"
        if sharp_soft_delta:
            if sharp_soft_delta > 0.4:
                line_movement = f"Sharp books HIGHER by {sharp_soft_delta} → UNDER pressure"
            elif sharp_soft_delta < -0.4:
                line_movement = f"Sharp books LOWER by {abs(sharp_soft_delta)} → OVER pressure"
        
        return {
            "matched_player": matched_player,
            "consensus_line": consensus_line,
            "books_count": len(player_data),
            "line_spread": max(lines) - min(lines),
            "sharp_consensus": sharp_consensus,
            "soft_consensus": soft_consensus,
            "sharp_soft_delta": sharp_soft_delta,
            "line_movement": line_movement,
            "avg_over_implied": avg_over_implied,
            "avg_under_implied": avg_under_implied,
            "market_lean": market_lean,
            "best_over_price": max(over_prices) if over_prices else None,
            "best_under_price": max(under_prices) if under_prices else None,
            "lines_by_book": {book: data.get("line") for book, data in player_data.items() if data.get("line")}
        }
    
    # ═══════════════════════════════════════════════════════════════
    # ANALYSIS: Python calculations
    # ═══════════════════════════════════════════════════════════════
    def _calculate_analysis(self, player_stats, line, direction, odds_data):
        """Calculate hit rates, trends, edge, and confidence."""
        games = player_stats.get("games", [])
        
        if not games:
            return {"error": "No games to analyze"}
        
        values = [g["value"] for g in games]
        
        # Hit rates
        def hit_rate(vals, line, direction):
            if direction == "OVER":
                hits = sum(1 for v in vals if v > line)
            else:
                hits = sum(1 for v in vals if v < line)
            return round(hits / len(vals) * 100, 1) if vals else 0
        
        hit_rate_5 = hit_rate(values[:5], line, direction) if len(values) >= 5 else None
        hit_rate_10 = hit_rate(values[:10], line, direction) if len(values) >= 10 else None
        hit_rate_season = hit_rate(values, line, direction)
        
        # Recency-weighted average (more weight on recent games)
        weights = [1.5, 1.4, 1.3, 1.2, 1.1] + [1.0] * (len(values) - 5)
        weights = weights[:len(values)]
        weighted_avg = round(sum(v * w for v, w in zip(values, weights)) / sum(weights), 1) if values else 0
        
        # Trend detection
        last_5_avg = sum(values[:5]) / min(5, len(values)) if values else 0
        rest_avg = sum(values[5:]) / len(values[5:]) if len(values) > 5 else last_5_avg
        
        if last_5_avg > rest_avg * 1.1:
            trend = "HOT 🔥"
        elif last_5_avg < rest_avg * 0.9:
            trend = "COLD ❄️"
        else:
            trend = "STABLE"
        
        # Edge calculation
        projection = weighted_avg
        edge = round(projection - line, 1)
        
        # Confidence score (0-100)
        confidence = 50
        
        # Adjust for hit rate
        if hit_rate_10:
            if hit_rate_10 >= 70:
                confidence += 15
            elif hit_rate_10 >= 60:
                confidence += 10
            elif hit_rate_10 <= 30:
                confidence -= 15
            elif hit_rate_10 <= 40:
                confidence -= 10
        
        # Adjust for trend
        if trend == "HOT 🔥" and direction == "OVER":
            confidence += 10
        elif trend == "COLD ❄️" and direction == "UNDER":
            confidence += 10
        elif trend == "HOT 🔥" and direction == "UNDER":
            confidence -= 10
        elif trend == "COLD ❄️" and direction == "OVER":
            confidence -= 10
        
        # Adjust for edge
        if abs(edge) >= 3:
            confidence += 10 if (edge > 0 and direction == "OVER") or (edge < 0 and direction == "UNDER") else -10
        
        # Adjust for market alignment
        odds_summary = odds_data.get("summary", {})
        market_lean = odds_summary.get("market_lean", "NEUTRAL")
        if market_lean == direction:
            confidence += 5
        elif market_lean != "NEUTRAL" and market_lean != direction:
            confidence -= 5
        
        confidence = max(10, min(95, confidence))
        
        return {
            "weighted_avg": weighted_avg,
            "projection": projection,
            "edge": edge,
            "hit_rate_last_5": hit_rate_5,
            "hit_rate_last_10": hit_rate_10,
            "hit_rate_season": hit_rate_season,
            "trend": trend,
            "confidence_score": confidence,
            "games_analyzed": len(values)
        }
    
    # ═══════════════════════════════════════════════════════════════
    # BUILD CLAUDE CONTEXT
    # ═══════════════════════════════════════════════════════════════
    def _build_claude_context(self, player_name, stat_type, line, direction, opponent, player_stats, odds_data, analysis):
        """Build the full context block for Claude."""
        
        odds_summary = odds_data.get("summary", {})
        
        return f"""
═══════════════════════════════════════════════════════════════
STAT PROPHET ANALYSIS: {player_name} {stat_type.upper()} {direction} {line}
vs {opponent}
═══════════════════════════════════════════════════════════════

PLAYER PERFORMANCE DATA (API-Sports):
  Season Average:     {player_stats.get('season_avg', 'N/A')}
  Last 5 Games Avg:   {player_stats.get('last_5_avg', 'N/A')}
  Last 10 Games Avg:  {player_stats.get('last_10_avg', 'N/A')}
  Range (Last 10):    {player_stats.get('min_last_10', 'N/A')} - {player_stats.get('max_last_10', 'N/A')}
  Games Analyzed:     {player_stats.get('games_played', 0)}

PYTHON-CALCULATED ANALYSIS:
  Weighted Projection: {analysis.get('weighted_avg', 'N/A')}
  Edge vs Line:        {analysis.get('edge', 'N/A')} ({'+' if analysis.get('edge', 0) > 0 else ''}{analysis.get('edge', 0)} from {line})
  Hit Rate (Last 5):   {analysis.get('hit_rate_last_5', 'N/A')}%
  Hit Rate (Last 10):  {analysis.get('hit_rate_last_10', 'N/A')}%
  Hit Rate (Season):   {analysis.get('hit_rate_season', 'N/A')}%
  Trend:               {analysis.get('trend', 'N/A')}
  System Confidence:   {analysis.get('confidence_score', 50)}/100

ODDS API MARKET DATA:
  Consensus Line:      {odds_summary.get('consensus_line', 'N/A')} ({odds_summary.get('books_count', 0)} books)
  Line Spread:         {odds_summary.get('line_spread', 'N/A')} pts variation
  Sharp Books Line:    {odds_summary.get('sharp_consensus', 'N/A')}
  Soft Books Line:     {odds_summary.get('soft_consensus', 'N/A')}
  Sharp-Soft Delta:    {odds_summary.get('sharp_soft_delta', 'N/A')}
  Line Movement:       {odds_summary.get('line_movement', 'N/A')}
  
  Implied Probability: OVER {odds_summary.get('avg_over_implied', 'N/A')}% | UNDER {odds_summary.get('avg_under_implied', 'N/A')}%
  Market Lean:         {odds_summary.get('market_lean', 'N/A')}
  Best Prices:         OVER {odds_summary.get('best_over_price', 'N/A')} | UNDER {odds_summary.get('best_under_price', 'N/A')}

USER'S SELECTION: {direction} {line}
═══════════════════════════════════════════════════════════════
"""
    
    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
