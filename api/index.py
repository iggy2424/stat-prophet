from http.server import BaseHTTPRequestHandler
import json
import os
import unicodedata
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs

# Supabase setup
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# API-Sports (api-sports.io) — works from cloud servers
AS_KEY = os.environ.get("API_SPORTS_KEY") or ""

# The Odds API — real sportsbook prop lines
ODDS_API_KEY = os.environ.get("ODDS_API_KEY") or ""

# SportsDataIO — MLB/NFL schedules + future props
SPORTSDATA_KEY = os.environ.get("SPORTSDATA_KEY") or ""

MLB_TEAMS = {
    'LAD': ('Los Angeles', 'Dodgers'), 'CIN': ('Cincinnati', 'Reds'),
    'TOR': ('Toronto', 'Blue Jays'), 'PIT': ('Pittsburgh', 'Pirates'),
    'KC':  ('Kansas City', 'Royals'), 'CHC': ('Chicago', 'Cubs'),
    'CLE': ('Cleveland', 'Guardians'), 'TB': ('Tampa Bay', 'Rays'),
    'PHI': ('Philadelphia', 'Phillies'), 'SEA': ('Seattle', 'Mariners'),
    'ARI': ('Arizona', 'Diamondbacks'), 'SF': ('San Francisco', 'Giants'),
    'CHW': ('Chicago', 'White Sox'), 'DET': ('Detroit', 'Tigers'),
    'NYM': ('New York', 'Mets'), 'BAL': ('Baltimore', 'Orioles'),
    'MIN': ('Minnesota', 'Twins'), 'LAA': ('Los Angeles', 'Angels'),
    'MIA': ('Miami', 'Marlins'), 'COL': ('Colorado', 'Rockies'),
    'ATH': ('Oakland', 'Athletics'), 'BOS': ('Boston', 'Red Sox'),
    'ATL': ('Atlanta', 'Braves'), 'TEX': ('Texas', 'Rangers'),
    'NYY': ('New York', 'Yankees'), 'HOU': ('Houston', 'Astros'),
    'STL': ('St. Louis', 'Cardinals'), 'MIL': ('Milwaukee', 'Brewers'),
    'SD':  ('San Diego', 'Padres'), 'WSH': ('Washington', 'Nationals'),
}

# Stat label → Odds API market key (main line)
STAT_MARKET_MAP = {
    'points':          'player_points',
    'rebounds':        'player_rebounds',
    'assists':         'player_assists',
    'three-pointers':  'player_threes',
    'steals':          'player_steals',
    'blocks':          'player_blocks',
    'turnovers':       'player_turnovers',
}

# Stat label → Odds API alternate lines market key
STAT_ALT_MARKET_MAP = {
    'points':          'player_points_alternate',
    'rebounds':        'player_rebounds_alternate',
    'assists':         'player_assists_alternate',
    'three-pointers':  'player_threes_alternate',
    'steals':          'player_steals_alternate',
    'blocks':          'player_blocks_alternate',
    'turnovers':       'player_turnovers_alternate',
}

# Stat label → API-Sports response field name
STAT_FIELD_MAP = {
    'points':          'points',
    'rebounds':        'totReb',
    'assists':         'assists',
    'three-pointers':  'tpm',
    'steals':          'steals',
    'blocks':          'blocks',
    'turnovers':       'turnovers',
}


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
                self._handle_data_request(data_type, query_params)
            else:
                response = {
                    "api": "Stat Prophet Prediction API",
                    "version": "2.1.0",
                    "status": "running",
                    "features": ["predictions", "parlay"]
                }
                self._send_json(200, response)
        except Exception as e:
            self._send_json(500, {"error": str(e)})
    
    def _handle_data_request(self, data_type, query_params=None):
        import requests

        if data_type == 'games':
            sport = (query_params or {}).get('sport', ['ALL'])[0].upper()
            self._handle_games(requests, sport)
            return

        if data_type == 'odds':
            self._handle_odds(requests, query_params)
            return

        if data_type == 'player_stats':
            self._handle_player_stats(requests, query_params)
            return

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
            self._send_json(400, {"error": "Invalid type"})

    # ── GAMES (API-Sports: api-sports.io) ────────────────────────────────────
    def _handle_games(self, requests, sport):
        if sport == 'ALL':
            nba, nba_d = self._fetch_nba(requests)
            nfl, nfl_d = self._fetch_nfl(requests)
            mlb, mlb_d = self._fetch_mlb(requests)
            self._send_json(200, {"success": True, "NBA": nba, "NFL": nfl, "MLB": mlb,
                                  "_debug": {"key_set": bool(AS_KEY), "key_len": len(AS_KEY),
                                             "nba": nba_d, "nfl": nfl_d, "mlb": mlb_d}})
        elif sport == 'NBA':
            games, debug = self._fetch_nba(requests)
            self._send_json(200, {"success": True, "sport": "NBA", "games": games, "_debug": debug})
        elif sport == 'NFL':
            games, debug = self._fetch_nfl(requests)
            self._send_json(200, {"success": True, "sport": "NFL", "games": games, "_debug": debug})
        elif sport == 'MLB':
            games, debug = self._fetch_mlb(requests)
            self._send_json(200, {"success": True, "sport": "MLB", "games": games, "_debug": debug})
        else:
            self._send_json(400, {"error": "Unknown sport"})

    def _fetch_nba(self, requests):
        games = []
        debug = []
        headers = {"x-apisports-key": AS_KEY}
        today = datetime.utcnow()
        for i in range(4):
            day = today + timedelta(days=i)
            date_str = day.strftime("%Y-%m-%d")
            url = f"https://v2.nba.api-sports.io/games?date={date_str}"
            try:
                resp = requests.get(url, headers=headers, timeout=8)
                debug.append({"date": date_str, "status": resp.status_code})
                if resp.status_code == 200:
                    for g in resp.json().get('response', []):
                        status_obj = g.get('status', {})
                        # API-Sports NBA uses numeric short: 1=Scheduled, 2=In Progress, 3=Finished
                        short = status_obj.get('short') if isinstance(status_obj, dict) else None
                        if short in (1, 2):  # scheduled or live only
                            teams = g.get('teams', {})
                            h = teams.get('home', {})
                            a = teams.get('visitors', {})  # API-Sports uses 'visitors' for away
                            scores = g.get('scores', {})
                            h_pts = scores.get('home', {}).get('points') if scores else None
                            a_pts = scores.get('visitors', {}).get('points') if scores else None
                            date_obj = g.get('date') or {}
                            sched = date_obj.get('start', '') if isinstance(date_obj, dict) else str(date_obj)
                            games.append({'id': g.get('id'), 'sport': 'NBA',
                                'status': 'inprogress' if short == 2 else 'scheduled',
                                'scheduled': sched,
                                'home': {'name': h.get('name',''), 'alias': h.get('code',''), 'points': h_pts},
                                'away': {'name': a.get('name',''), 'alias': a.get('code',''), 'points': a_pts}})
            except Exception as e:
                debug.append({"date": date_str, "error": str(e)})
            if len(games) >= 6:
                break
        return games[:8], debug

    def _fetch_nfl(self, requests):
        games = []
        debug = []
        headers = {"x-apisports-key": AS_KEY}
        today = datetime.utcnow()
        # Try current and next season
        for season in [today.year, today.year - 1]:
            url = f"https://v1.american-football.api-sports.io/games?league=1&season={season}"
            try:
                resp = requests.get(url, headers=headers, timeout=8)
                debug.append({"season": season, "status": resp.status_code, "preview": resp.text[:80]})
                if resp.status_code != 200:
                    continue
                for g in resp.json().get('response', []):
                    status_obj = g.get('game', {}).get('status', {}) or g.get('status', {})
                    short = status_obj.get('short', '') if isinstance(status_obj, dict) else ''
                    if short in ('NS', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4', 'HT', 'OT'):
                        game_info = g.get('game', g)
                        date_info = game_info.get('date', {})
                        sched = date_info.get('date', '') if isinstance(date_info, dict) else str(date_info)
                        try:
                            dt = datetime.fromisoformat(sched) if sched else None
                            if dt and dt < today - timedelta(days=1):
                                continue
                        except Exception:
                            pass
                        teams = g.get('teams', {})
                        h = teams.get('home', {})
                        a = teams.get('away', {})
                        scores = g.get('scores', {})
                        h_pts = scores.get('home', {}).get('total') if scores else None
                        a_pts = scores.get('away', {}).get('total') if scores else None
                        h_alias = h.get('name','')[:3].upper()
                        a_alias = a.get('name','')[:3].upper()
                        games.append({'id': game_info.get('id'), 'sport': 'NFL',
                            'status': 'inprogress' if short != 'NS' else 'scheduled',
                            'scheduled': sched,
                            'home': {'name': h.get('name',''), 'alias': h_alias, 'points': h_pts},
                            'away': {'name': a.get('name',''), 'alias': a_alias, 'points': a_pts}})
                if games:
                    break
            except Exception as e:
                debug.append({"season": season, "error": str(e)})
        games.sort(key=lambda x: x.get('scheduled', ''))
        return games[:8], debug

    def _fetch_mlb(self, requests):
        games = []
        debug = []
        today = datetime.utcnow()
        for i in range(7):
            day = today + timedelta(days=i)
            date_str = day.strftime("%Y-%b-%d").upper()
            url = f"https://api.sportsdata.io/v3/mlb/scores/json/GamesByDate/{date_str}"
            try:
                resp = requests.get(url, params={"key": SPORTSDATA_KEY}, timeout=8)
                debug.append({"date": date_str, "status": resp.status_code})
                if resp.status_code == 200:
                    for g in resp.json():
                        status = g.get('Status', '')
                        if status not in ('Scheduled', 'InProgress', 'Live'):
                            continue
                        h_key = g.get('HomeTeam', '')
                        a_key = g.get('AwayTeam', '')
                        h_city, h_name = MLB_TEAMS.get(h_key, ('', h_key))
                        a_city, a_name = MLB_TEAMS.get(a_key, ('', a_key))
                        games.append({
                            'id': g.get('GameID'), 'sport': 'MLB',
                            'status': 'inprogress' if status in ('InProgress', 'Live') else 'scheduled',
                            'scheduled': g.get('DateTime') or g.get('Day', ''),
                            'home': {'name': f"{h_city} {h_name}".strip(), 'alias': h_key, 'points': g.get('HomeTeamRuns')},
                            'away': {'name': f"{a_city} {a_name}".strip(), 'alias': a_key, 'points': g.get('AwayTeamRuns')},
                        })
            except Exception as e:
                debug.append({"date": date_str, "error": str(e)})
            if len(games) >= 8:
                break
        return games[:8], debug

    def do_POST(self):
        try:
            import anthropic
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            # Check if this is a parlay request
            if data.get('type') == 'parlay':
                self._handle_parlay(data, anthropic)
                return
            
            # Regular single prediction
            player_name = data.get('player_name', 'Unknown')
            stat_type = data.get('stat_type', 'points')
            sport = data.get('sport', 'NBA')
            line = data.get('line', 0)
            direction = data.get('direction', 'OVER')
            opponent = data.get('opponent', 'Unknown')
            player_stats = data.get('player_stats')
            player_stats_vs_opp = data.get('player_stats_vs_opp')

            sport_context = {
                'NBA': 'NBA basketball',
                'NFL': 'NFL football',
                'MLB': 'MLB baseball'
            }.get(sport, 'NBA basketball')

            # Build real stats context if available
            stats_context = ""
            if player_stats:
                stats_context += f"\nREAL SEASON STATS (use these as ground truth, do NOT rely on training knowledge for averages):"
                stats_context += f"\n- Season average {stat_type}: {player_stats['avg']} over {player_stats['games']} games this season"
                if player_stats.get('last_5_avg') is not None:
                    stats_context += f"\n- Last 5 games average: {player_stats['last_5_avg']}"
            if player_stats_vs_opp:
                stats_context += f"\n- vs {opponent}: {player_stats_vs_opp['avg']} avg over {player_stats_vs_opp['games']} games"

            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

            prompt = f"""You are a professional {sport_context} statistics expert. A user wants to know the probability of a specific prop bet outcome.

SPORT: {sport}
PLAYER: {player_name}
STAT: {stat_type}
OPPONENT: {opponent}
BET: {direction} {line}
{stats_context}

The user is asking: "What is the percentage chance that {player_name} goes {direction} {line} {stat_type} against {opponent}?"

{'CRITICAL: The real stats above are from the current season API data. Base your probability and analysis on these actual numbers, not on your training knowledge of the player.' if stats_context else 'Use your training knowledge of this player\'s stats and tendencies.'}

Think about:
- How the season average compares to the prop line (use the real stats above if provided)
- Their performance vs this specific opponent if shown
- The opponent's defensive strength for this specific stat
- How far the line is from the actual average (a line far above average should have low OVER probability)

IMPORTANT:
- Give the probability that THIS SPECIFIC BET WINS
- Be realistic: if the line is significantly above the player's actual average, the OVER probability must be below 50%
- Factor in matchup quality

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
                "data_source": "claude_knowledge",
                "prediction": prediction
            })
            
        except Exception as e:
            self._send_json(500, {"error": str(e)})
    
    def _handle_parlay(self, data, anthropic):
        """Handle parlay calculation requests"""
        try:
            legs = data.get('legs', [])
            
            if len(legs) < 2:
                self._send_json(400, {"error": "Parlay requires at least 2 legs"})
                return
            
            if len(legs) > 6:
                self._send_json(400, {"error": "Maximum 6 legs allowed"})
                return
            
            # Format legs for Claude
            legs_text = ""
            for i, leg in enumerate(legs, 1):
                legs_text += f"""
Leg {i}: {leg['player']} {leg['direction']} {leg['line']} {leg['stat']} vs {leg['opponent']}
  - Individual probability: {leg['probability']}%
"""
            
            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            
            prompt = f"""You are an NBA statistics expert analyzing a parlay bet. The user has combined multiple prop bets into one parlay.

PARLAY LEGS:
{legs_text}

Analyze this parlay and provide:
1. COMBINED PROBABILITY: Calculate the realistic combined probability. 
   - Start with multiplying individual probabilities, but adjust for:
   - Correlation between bets (same game = correlated, different games = independent)
   - If multiple players from same game, their stats may be inversely correlated
   - Typically parlays have lower real probability than simple multiplication suggests

2. CHECK FOR CORRELATIONS:
   - Are any legs from the same game? (increases risk)
   - Are there conflicting bets? (e.g., two players from same team both going OVER assists)
   - Same player different stats? (correlated)

3. OVERALL ANALYSIS: Brief assessment of this parlay's quality

Respond ONLY with this JSON format:
{{
    "combined_probability": <realistic percentage 0-100>,
    "implied_odds": <American odds like "250" or "1500" based on probability>,
    "analysis": "1-2 sentence overall assessment",
    "correlation_warning": "warning if legs are correlated, or null if independent"
}}

IMPORTANT RULES:
- A 2-leg parlay of two 50% bets should be around 20-25% (not exactly 25% due to variance)
- A 3-leg parlay of three 50% bets should be around 10-12%
- Add correlation penalties when legs are from same game
- Be realistic - most parlays are hard to hit"""

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            try:
                if "```" in response_text:
                    response_text = response_text.split("```")[1].replace("json", "").strip()
                parlay_result = json.loads(response_text)
            except:
                # Fallback calculation
                combined = 100
                for leg in legs:
                    combined = combined * (leg['probability'] / 100)
                combined = round(combined * 0.9, 1)  # 10% penalty for variance
                
                parlay_result = {
                    "combined_probability": combined,
                    "implied_odds": str(round((100 / combined - 1) * 100)) if combined > 0 else "9999",
                    "analysis": "Parlay calculated using basic probability multiplication.",
                    "correlation_warning": None
                }
            
            self._send_json(200, {
                "success": True,
                "parlay": parlay_result,
                "legs_count": len(legs)
            })
            
        except Exception as e:
            self._send_json(500, {"error": str(e)})
    
    # ── ODDS (The Odds API: the-odds-api.com) ────────────────────────────────
    def _handle_odds(self, requests, query_params):
        player_name   = (query_params or {}).get('player_name',   [''])[0]
        team_name     = (query_params or {}).get('team_name',     [''])[0].lower()
        opponent_name = (query_params or {}).get('opponent_name', [''])[0].lower()
        stat          = (query_params or {}).get('stat',          [''])[0].lower()

        if not ODDS_API_KEY:
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name)
            self._send_json(200, no_odds if no_odds else {"found": False, "reason": "ODDS_API_KEY not configured"})
            return

        market     = STAT_MARKET_MAP.get(stat)
        alt_market = STAT_ALT_MARKET_MAP.get(stat)
        if not market:
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name)
            self._send_json(200, no_odds if no_odds else {"found": False, "reason": f"No market mapping for stat: {stat}"})
            return

        # Step 1 — get upcoming NBA events
        try:
            resp = requests.get(
                "https://api.the-odds-api.com/v4/sports/basketball_nba/events",
                params={"apiKey": ODDS_API_KEY},
                timeout=8
            )
            if resp.status_code != 200:
                self._send_json(200, {"found": False, "reason": f"Events API {resp.status_code}"})
                return
            events = resp.json()
        except Exception as e:
            self._send_json(200, {"found": False, "reason": str(e)})
            return

        # Step 2 — find the game matching player's team vs opponent
        event_id = None
        for ev in events:
            home = ev.get('home_team', '').lower()
            away = ev.get('away_team', '').lower()
            team_match = team_name in home or team_name in away
            opp_match  = opponent_name in home or opponent_name in away
            if team_match and opp_match:
                event_id = ev['id']
                break

        if not event_id:
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name)
            self._send_json(200, no_odds if no_odds else {"found": False, "reason": "No upcoming game found for this matchup"})
            return

        # Step 3 — fetch main + alternate lines in one call
        markets_param = f"{market},{alt_market}" if alt_market else market
        try:
            resp = requests.get(
                f"https://api.the-odds-api.com/v4/sports/basketball_nba/events/{event_id}/odds",
                params={"apiKey": ODDS_API_KEY, "regions": "us",
                        "markets": markets_param, "oddsFormat": "american"},
                timeout=10
            )
            if resp.status_code != 200:
                self._send_json(200, {"found": False, "reason": f"Props API {resp.status_code}"})
                return
            odds_data = resp.json()
        except Exception as e:
            self._send_json(200, {"found": False, "reason": str(e)})
            return

        # Step 4 — parse main line + alternate lines from outcomes
        player_lower = player_name.lower()
        player_last  = player_lower.split()[-1] if player_lower else ''

        def name_matches(description):
            desc = (description or '').lower().rstrip('.')
            return desc == player_lower or (player_last and desc.endswith(player_last) and len(player_last) > 3)

        main_result    = {"found": False}
        alt_lines_dict = {}  # {point_value: {over_odds, under_odds, bookmaker}}

        for bookmaker in odds_data.get('bookmakers', []):
            bm_title = bookmaker.get('title', bookmaker.get('key', ''))
            for mkt in bookmaker.get('markets', []):
                mkt_key = mkt.get('key', '')

                if mkt_key == market and not main_result['found']:
                    over_out = under_out = None
                    for outcome in mkt.get('outcomes', []):
                        if name_matches(outcome.get('description', '')):
                            if outcome.get('name') == 'Over':
                                over_out = outcome
                            elif outcome.get('name') == 'Under':
                                under_out = outcome
                    if over_out:
                        main_result = {
                            "found":      True,
                            "line":       over_out.get('point'),
                            "over_odds":  over_out.get('price'),
                            "under_odds": under_out.get('price') if under_out else None,
                            "bookmaker":  bm_title,
                        }

                elif mkt_key == alt_market:
                    for outcome in mkt.get('outcomes', []):
                        if not name_matches(outcome.get('description', '')):
                            continue
                        pt = outcome.get('point')
                        nm = outcome.get('name')
                        if pt is None:
                            continue
                        if pt not in alt_lines_dict:
                            alt_lines_dict[pt] = {'over_odds': None, 'under_odds': None, 'bookmaker': bm_title}
                        if nm == 'Over' and alt_lines_dict[pt]['over_odds'] is None:
                            alt_lines_dict[pt]['over_odds'] = outcome.get('price')
                            alt_lines_dict[pt]['bookmaker'] = bm_title
                        elif nm == 'Under' and alt_lines_dict[pt]['under_odds'] is None:
                            alt_lines_dict[pt]['under_odds'] = outcome.get('price')

        if not main_result['found']:
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name)
            self._send_json(200, no_odds if no_odds else {"found": False, "reason": "Player not found in prop markets"})
            return

        # Step 5 — fetch player's real season stats from API-Sports (overall + vs opponent)
        stats_data    = self._get_player_game_stats(requests, player_name, stat, opponent_name)
        stat_values   = stats_data['all']      if stats_data else None
        vs_opp_values = stats_data['vs_opp']   if stats_data else None

        # Step 6 — compute hit rates and build sorted alternate lines list
        def to_prob(odds):
            if odds is None: return 0.5
            return (-odds) / (-odds + 100) if odds < 0 else 100 / (odds + 100)

        hit_rates        = {}
        vs_opp_hit_rates = {}
        player_stats     = None
        player_stats_vs_opp = None

        if stat_values:
            n   = len(stat_values)
            avg = round(sum(stat_values) / n, 1)
            last5 = stat_values[-5:] if n >= 5 else stat_values
            last5_avg = round(sum(last5) / len(last5), 1)
            for pt in alt_lines_dict:
                hit_rates[str(pt)] = round(sum(1 for v in stat_values if v > pt) / n, 3)
            player_stats = {"games": n, "avg": avg, "last_5_avg": last5_avg}

        if vs_opp_values:
            n_o   = len(vs_opp_values)
            avg_o = round(sum(vs_opp_values) / n_o, 1)
            for pt in alt_lines_dict:
                vs_opp_hit_rates[str(pt)] = round(sum(1 for v in vs_opp_values if v > pt) / n_o, 3)
            player_stats_vs_opp = {"games": n_o, "avg": avg_o}

        alt_lines = []
        best_edge  = -999
        best_pt    = None
        for pt in sorted(alt_lines_dict.keys()):
            entry = alt_lines_dict[pt]
            if entry['over_odds'] is None:
                continue
            hit_rate        = hit_rates.get(str(pt))
            vs_opp_hit_rate = vs_opp_hit_rates.get(str(pt))
            implied  = to_prob(entry['over_odds'])
            edge     = round(hit_rate - implied, 3) if hit_rate is not None else None
            alt_lines.append({
                "line":             pt,
                "over_odds":        entry['over_odds'],
                "under_odds":       entry['under_odds'],
                "hit_rate":         hit_rate,
                "vs_opp_hit_rate":  vs_opp_hit_rate,
                "implied":          round(implied, 3),
                "edge":             edge,
                "best_value":       False,
            })
            if edge is not None and edge > best_edge:
                best_edge = edge
                best_pt   = pt

        # Only flag best value on lines the player actually hits >50% of the time
        if best_pt is not None and best_edge > 0:
            best_al = next((al for al in alt_lines if al['line'] == best_pt), None)
            if best_al and best_al['hit_rate'] is not None and best_al['hit_rate'] > 0.50:
                best_al['best_value'] = True

        self._send_json(200, {
            **main_result,
            "has_live_odds":       True,
            "alternate_lines":     alt_lines,
            "player_stats":        player_stats,
            "player_stats_vs_opp": player_stats_vs_opp,
        })

    # ── PLAYER STATS (standalone — works without odds) ───────────────────────
    def _handle_player_stats(self, requests, query_params):
        player_name   = (query_params or {}).get('player_name',   [''])[0]
        stat          = (query_params or {}).get('stat',          [''])[0].lower()
        opponent_name = (query_params or {}).get('opponent_name', [''])[0].lower()
        sport         = (query_params or {}).get('sport',         ['NBA'])[0].upper()

        empty = {"success": True, "player_stats": None, "player_stats_vs_opp": None}

        if sport != 'NBA' or not player_name or not stat:
            self._send_json(200, empty)
            return

        stats_data = self._get_player_game_stats(requests, player_name, stat, opponent_name or None)
        if not stats_data:
            self._send_json(200, empty)
            return

        stat_values   = stats_data['all']
        vs_opp_values = stats_data['vs_opp']

        player_stats = None
        if stat_values:
            n = len(stat_values)
            last5 = stat_values[-5:] if n >= 5 else stat_values
            player_stats = {"games": n, "avg": round(sum(stat_values) / n, 1), "last_5_avg": round(sum(last5) / len(last5), 1)}

        player_stats_vs_opp = None
        if vs_opp_values:
            n_o = len(vs_opp_values)
            player_stats_vs_opp = {"games": n_o, "avg": round(sum(vs_opp_values) / n_o, 1)}

        self._send_json(200, {
            "success": True,
            "player_stats": player_stats,
            "player_stats_vs_opp": player_stats_vs_opp,
        })

    def _build_no_odds_response(self, requests, player_name, stat, opponent_name):
        """Fallback: generate synthetic alt lines from player game log when no live odds exist."""
        import math
        stats_data = self._get_player_game_stats(requests, player_name, stat, opponent_name or None)
        if not stats_data or not stats_data['all']:
            return None
        stat_values   = stats_data['all']
        vs_opp_values = stats_data['vs_opp']
        n   = len(stat_values)
        avg = sum(stat_values) / n
        last5     = stat_values[-5:] if n >= 5 else stat_values
        last5_avg = round(sum(last5) / len(last5), 1)

        # 11 lines ending in .5, step 1.0, centered around avg
        start = max(0.5, math.floor(avg - 5) + 0.5)
        synthetic_lines = []
        for i in range(11):
            pt   = round(start + i, 1)
            hr   = round(sum(1 for v in stat_values if v > pt) / n, 3)
            vo_hr = None
            if vs_opp_values:
                n_o   = len(vs_opp_values)
                vo_hr = round(sum(1 for v in vs_opp_values if v > pt) / n_o, 3) if n_o > 0 else None
            synthetic_lines.append({
                "line": pt, "over_odds": None, "under_odds": None,
                "hit_rate": hr, "vs_opp_hit_rate": vo_hr,
                "implied": None, "edge": None, "best_value": False,
            })

        player_stats = {"games": n, "avg": round(avg, 1), "last_5_avg": last5_avg}
        player_stats_vs_opp = None
        if vs_opp_values:
            n_o = len(vs_opp_values)
            player_stats_vs_opp = {"games": n_o, "avg": round(sum(vs_opp_values) / n_o, 1)}

        return {
            "found": False, "has_live_odds": False,
            "alternate_lines":     synthetic_lines,
            "player_stats":        player_stats,
            "player_stats_vs_opp": player_stats_vs_opp,
        }

    def _get_player_game_stats(self, requests, player_name, stat, opponent_name=None):
        """Return {"all": [...], "vs_opp": [...] or None} for the player's 2025 season."""
        if not AS_KEY:
            return None
        stat_field = STAT_FIELD_MAP.get(stat)
        if not stat_field:
            return None

        def _ascii(s):
            return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode('ascii').lower().strip()

        name_parts = player_name.strip().split()
        last_name  = name_parts[-1] if name_parts else player_name
        # Strip diacritics for the API search query (e.g. Dončić → Doncic)
        last_name_ascii = _ascii(last_name)
        pl_lower  = player_name.lower().strip()
        pl_ascii  = _ascii(player_name)
        try:
            r = requests.get(
                "https://v2.nba.api-sports.io/players",
                params={"search": last_name_ascii},
                headers={"x-apisports-key": AS_KEY},
                timeout=6
            )
            players = r.json().get('response', [])
            player_id = None
            for p in players:
                full = (p.get('firstname', '') + ' ' + p.get('lastname', '')).lower().strip()
                if full == pl_lower or _ascii(full) == pl_ascii:
                    player_id = p['id']
                    break
            if not player_id:
                return None

            r = requests.get(
                "https://v2.nba.api-sports.io/players/statistics",
                params={"id": player_id, "season": 2025},
                headers={"x-apisports-key": AS_KEY},
                timeout=8
            )
            games_resp = r.json().get('response', [])

            # Build list of (game_id, team_id, stat_value) for played games
            game_entries = []
            for g in games_resp:
                mins = g.get('min', '0') or '0'
                m = int(str(mins).split(':')[0]) if ':' in str(mins) else int(float(mins or 0))
                if m > 0:
                    v = g.get(stat_field)
                    if v is not None:
                        gid = (g.get('game') or {}).get('id')
                        tid = (g.get('team') or {}).get('id')
                        game_entries.append((gid, tid, float(v)))

            if not game_entries:
                return None

            all_values = [e[2] for e in game_entries]
            vs_opp_values = None

            # Fetch team's full schedule to map game_id → opponent name
            if opponent_name:
                team_id = next((e[1] for e in game_entries if e[1]), None)
                if team_id:
                    try:
                        r2 = requests.get(
                            "https://v2.nba.api-sports.io/games",
                            params={"team": team_id, "season": 2025},
                            headers={"x-apisports-key": AS_KEY},
                            timeout=8
                        )
                        team_games = r2.json().get('response', [])
                        game_opp_map = {}
                        for tg in team_games:
                            gid = tg.get('id')
                            if not gid:
                                continue
                            teams = tg.get('teams', {})
                            home = teams.get('home', {})
                            away = teams.get('visitors', {})
                            opp = away if home.get('id') == team_id else home
                            game_opp_map[gid] = (opp.get('name') or '').lower()

                        opp_lower = opponent_name.lower()
                        opp_words = [w for w in opp_lower.split() if len(w) > 3]
                        vs_opp_values = [
                            val for gid, tid, val in game_entries
                            if gid and (
                                opp_lower in game_opp_map.get(gid, '') or
                                any(w in game_opp_map.get(gid, '') for w in opp_words)
                            )
                        ]
                        if not vs_opp_values:
                            vs_opp_values = None
                    except Exception:
                        pass

            return {"all": all_values, "vs_opp": vs_opp_values}
        except Exception:
            return None

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
