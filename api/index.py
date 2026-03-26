from http.server import BaseHTTPRequestHandler
import json
import os
import time
import hmac
import hashlib
import base64
import unicodedata
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs

# ── ET timezone helpers (DST-aware) ──────────────────────────────────────────
def _dst_offset(utc_dt):
    """Return ET UTC offset (-4 EDT or -5 EST) for a naive UTC datetime."""
    y = utc_dt.year
    # 2nd Sunday of March at 2:00 AM UTC → DST starts
    mar1 = datetime(y, 3, 1, 2, 0)
    dst_start = mar1 + timedelta(days=(6 - mar1.weekday()) % 7 + 7)
    # 1st Sunday of November at 2:00 AM UTC → DST ends
    nov1 = datetime(y, 11, 1, 2, 0)
    dst_end = nov1 + timedelta(days=(6 - nov1.weekday()) % 7)
    return -4 if dst_start <= utc_dt < dst_end else -5

def _et_now():
    """Return current datetime in ET (naive, DST-aware)."""
    try:
        from zoneinfo import ZoneInfo
        from datetime import timezone as _tz
        return datetime.now(ZoneInfo('America/New_York')).replace(tzinfo=None)
    except Exception:
        now = datetime.utcnow()
        return now + timedelta(hours=_dst_offset(now))

def _utc_to_et_date(utc_dt):
    """Convert a UTC-aware or naive datetime to ET date string (DST-aware)."""
    try:
        from zoneinfo import ZoneInfo
        from datetime import timezone as _tz
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=_tz.utc)
        return utc_dt.astimezone(ZoneInfo('America/New_York')).strftime('%Y-%m-%d')
    except Exception:
        naive = utc_dt.replace(tzinfo=None) if utc_dt.tzinfo else utc_dt
        return (naive + timedelta(hours=_dst_offset(naive))).strftime('%Y-%m-%d')

# ── Session verification ─────────────────────────────────────────────────────
_JWT_SECRET   = (os.environ.get("JWT_SECRET") or "").encode()
_COOKIE_NAME  = "whop_session"

def _verify_session(req_headers) -> bool:
    raw = req_headers.get("Cookie") or req_headers.get("cookie") or ""
    token = None
    for part in raw.split(";"):
        k, _, v = part.strip().partition("=")
        if k == _COOKIE_NAME:
            token = v.strip()
            break
    if not token:
        return False
    try:
        header, body, sig = token.split(".")
        expected = base64.urlsafe_b64encode(
            hmac.new(_JWT_SECRET, f"{header}.{body}".encode(), hashlib.sha256).digest()
        ).rstrip(b"=").decode()
        if not hmac.compare_digest(sig, expected):
            return False
        padding = 4 - len(body) % 4
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * padding))
        return payload.get("exp", 0) > time.time()
    except Exception:
        return False


def _ascii(s):
    """Strip accents and return ASCII-lowercase (e.g. 'Jokić' → 'jokic')."""
    return unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode('ascii').lower().strip()

_NAME_SUFFIXES = {'jr', 'sr', 'ii', 'iii', 'iv'}

def _strip_suffix(s):
    """Remove trailing name suffixes: Jr., Sr., II, III, IV (case-insensitive)."""
    parts = str(s).strip().split()
    if parts and parts[-1].lower().rstrip('.') in _NAME_SUFFIXES:
        parts = parts[:-1]
    return ' '.join(parts)


def _match_player_odds(event_odds, player_ascii):
    """
    Look up a player in event_odds by ascii name.
    Falls back to last-name + first-initial matching so
    'jayson tatum' matches 'j. tatum' and vice versa.
    """
    if player_ascii in event_odds:
        return event_odds[player_ascii]
    parts = _ascii(_strip_suffix(player_ascii)).split()
    if len(parts) < 2:
        return {}
    first, last = parts[0], parts[-1]
    first_initial = first[0]
    for key in event_odds:
        kparts = key.split()
        if len(kparts) < 2:
            continue
        if kparts[-1] != last:
            continue
        kfirst = kparts[0].rstrip('.')
        if kfirst == first or kfirst == first_initial:
            return event_odds[key]
    return {}


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
        if not _verify_session(self.headers):
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "unauthorized"}).encode())
            return

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

        if data_type == 'ai_picks':
            self._handle_ai_picks(requests)
            return

        if data_type == 'ai_picks_debug':
            self._handle_ai_picks_debug(requests, query_params)
            return

        if data_type == 'pick_history':
            self._handle_pick_history(requests, query_params or {})
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

    def _fetch_nba(self, requests, et_date=None):
        games = []
        debug = []
        headers = {"x-apisports-key": AS_KEY}
        if et_date:
            # AI picks mode: fetch ET date + next UTC date to catch late games
            # (games after 7 PM ET = after midnight UTC fall under the next UTC date in API-Sports)
            from datetime import timezone as _tz
            et_dt = datetime.strptime(et_date, '%Y-%m-%d')
            next_utc = (et_dt + timedelta(days=1)).strftime('%Y-%m-%d')
            date_strings = [et_date, next_utc]
        else:
            # Games dashboard: 4-day lookahead from UTC
            today = datetime.utcnow()
            date_strings = [(today + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(4)]
        for date_str in date_strings:
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
                            # When fetching by et_date: skip games from next UTC date that are
                            # actually tomorrow ET (start >= 05:00 UTC = midnight ET)
                            if et_date and date_str != et_date and sched:
                                try:
                                    sched_utc = datetime.fromisoformat(sched.replace('Z', '').replace('+00:00', ''))
                                    if sched_utc.hour >= 5:  # 05:00+ UTC = after midnight ET = tomorrow ET
                                        continue
                                except Exception:
                                    pass
                            games.append({'id': g.get('id'), 'sport': 'NBA',
                                'status': 'inprogress' if short == 2 else 'scheduled',
                                'scheduled': sched,
                                'home': {'name': h.get('name',''), 'alias': h.get('code',''), 'api_id': h.get('id'), 'points': h_pts, 'logo': h.get('logo','')},
                                'away': {'name': a.get('name',''), 'alias': a.get('code',''), 'api_id': a.get('id'), 'points': a_pts, 'logo': a.get('logo','')}})
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

            if data.get('type') == 'parlay_validate':
                import requests as _req_mod
                self._handle_parlay_validate(_req_mod, data)
                return

            if data.get('type') == 'gpt_chat':
                import requests as _req_mod
                self._handle_gpt_chat(_req_mod, data)
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
        db_player_id  = (query_params or {}).get('player_id',     [None])[0]

        if not ODDS_API_KEY:
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name, db_player_id)
            self._send_json(200, no_odds if no_odds else {"found": False, "reason": "ODDS_API_KEY not configured"})
            return

        market     = STAT_MARKET_MAP.get(stat)
        alt_market = STAT_ALT_MARKET_MAP.get(stat)
        if not market:
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name, db_player_id)
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
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name, db_player_id)
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
                no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name, db_player_id)
                self._send_json(200, no_odds if no_odds else {"found": False, "reason": f"Props API {resp.status_code}"})
                return
            odds_data = resp.json()
        except Exception as e:
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name, db_player_id)
            self._send_json(200, no_odds if no_odds else {"found": False, "reason": str(e)})
            return

        # Step 4 — parse main line + alternate lines from outcomes
        player_lower = player_name.lower()
        player_ascii_full = _ascii(player_name)
        player_norm = _ascii(_strip_suffix(player_name))          # "kelly oubre"
        player_last_ascii = player_norm.split()[-1] if player_norm else ''  # "oubre"

        def name_matches(description):
            desc       = (description or '').lower().rstrip('.')
            desc_ascii = _ascii(description or '').rstrip('.')
            desc_norm  = _ascii(_strip_suffix(description or ''))  # strip Jr. from desc too
            return (desc == player_lower
                    or desc_ascii == player_ascii_full
                    or desc_norm  == player_norm
                    or (player_last_ascii and len(player_last_ascii) > 3
                        and desc_norm.endswith(player_last_ascii)))

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
            no_odds = self._build_no_odds_response(requests, player_name, stat, opponent_name, db_player_id)
            self._send_json(200, no_odds if no_odds else {"found": False, "reason": "Player not found in prop markets"})
            return

        # Step 5 — fetch player's real season stats from API-Sports (overall + vs opponent)
        as_id      = self._resolve_api_sports_id(requests, player_name, db_player_id)
        stats_data = self._get_player_game_stats(requests, player_name, stat, opponent_name, api_sports_id=as_id)
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
                "highest_safe":     False,
            })
            if edge is not None and edge > best_edge:
                best_edge = edge
                best_pt   = pt

        # Only flag best value on lines the player actually hits >50% of the time
        if best_pt is not None and best_edge > 0:
            best_al = next((al for al in alt_lines if al['line'] == best_pt), None)
            if best_al and best_al['hit_rate'] is not None and best_al['hit_rate'] > 0.50:
                best_al['best_value'] = True

        # ── HIGHEST SAFE BET ──────────────────────────────────────────────────
        # Only computed when a real game was found (live odds path)
        safe_pt = None
        vs_opp_games = len(vs_opp_values) if vs_opp_values else 0

        if vs_opp_games >= 3:
            # Condition A: highest line where player hit OVER 75%+ of the time vs this opponent
            for al in sorted(alt_lines, key=lambda x: x['line'], reverse=True):
                if al.get('vs_opp_hit_rate') is not None and al['vs_opp_hit_rate'] >= 0.75:
                    safe_pt = al['line'] - 1
                    break

        if safe_pt is None and player_stats and player_stats.get('last_5_avg') is not None:
            # Condition B: highest line not exceeding mean(season_avg, last_5_avg)
            target = (player_stats['avg'] + player_stats['last_5_avg']) / 2
            for al in sorted(alt_lines, key=lambda x: x['line'], reverse=True):
                if al['line'] <= target:
                    safe_pt = al['line'] - 1
                    break

        if safe_pt is not None:
            for al in alt_lines:
                if al['line'] == safe_pt:
                    al['highest_safe'] = True
                    al['best_value'] = False  # HIGHEST SAFE overwrites BEST VALUE on same card
                    break

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
        db_player_id  = (query_params or {}).get('player_id',     [None])[0]

        empty = {"success": True, "player_stats": None, "player_stats_vs_opp": None}

        if sport != 'NBA' or not player_name or not stat:
            self._send_json(200, empty)
            return

        as_id      = self._resolve_api_sports_id(requests, player_name, db_player_id)
        stats_data = self._get_player_game_stats(requests, player_name, stat, opponent_name or None, api_sports_id=as_id)
        if not stats_data:
            self._send_json(200, empty)
            return

        stat_values   = stats_data['all']
        vs_opp_values = stats_data['vs_opp']

        player_stats = None
        if stat_values:
            n = len(stat_values)
            last5 = stat_values[-5:] if n >= 5 else stat_values
            player_stats = {"games": n, "avg": round(sum(stat_values) / n, 1), "last_5_avg": round(sum(last5) / len(last5), 1), "values": stat_values}

        player_stats_vs_opp = None
        if vs_opp_values:
            n_o = len(vs_opp_values)
            player_stats_vs_opp = {"games": n_o, "avg": round(sum(vs_opp_values) / n_o, 1)}

        self._send_json(200, {
            "success": True,
            "player_stats": player_stats,
            "player_stats_vs_opp": player_stats_vs_opp,
        })

    def _build_no_odds_response(self, requests, player_name, stat, opponent_name, db_player_id=None):
        """Fallback: generate synthetic alt lines from player game log when no live odds exist."""
        import math
        as_id      = self._resolve_api_sports_id(requests, player_name, db_player_id)
        stats_data = self._get_player_game_stats(requests, player_name, stat, opponent_name or None, api_sports_id=as_id)
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
                "implied": None, "edge": None, "best_value": False, "highest_safe": False,
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

    def _resolve_api_sports_id(self, requests, player_name, db_player_id=None):
        """
        Return the best API-Sports player ID for this player.
        1. If db_player_id given, check Supabase for a stored api_sports_id first.
        2. Fall back to live name search (candidate_ids logic).
        3. Write the discovered ID back to Supabase so the next call is instant.
        """

        # --- Step 1: Supabase lookup ---
        if db_player_id and SUPABASE_URL and SUPABASE_KEY:
            try:
                sb_headers = {
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                }
                r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/players",
                    params={"id": f"eq.{db_player_id}", "select": "api_sports_id"},
                    headers=sb_headers, timeout=5
                )
                rows = r.json()
                if rows and rows[0].get('api_sports_id'):
                    return rows[0]['api_sports_id']
            except Exception:
                pass

        # --- Step 2: Live name search ---
        # Strip Jr./Sr./II/III before parsing so "Kelly Oubre Jr." → last="Oubre"
        name_norm   = _strip_suffix(player_name)
        name_parts  = name_norm.strip().split()
        last_name   = name_parts[-1] if name_parts else name_norm
        first_name  = name_parts[0] if len(name_parts) > 1 else ''
        last_ascii  = _ascii(last_name)
        first_ascii = _ascii(first_name)
        pl_lower    = player_name.lower().strip()
        pl_ascii    = _ascii(player_name)
        pl_norm     = _ascii(name_norm)   # suffix-stripped ascii for loose matching

        candidate_ids = []
        for search_term in filter(None, [last_ascii, first_ascii]):
            try:
                r = requests.get(
                    "https://v2.nba.api-sports.io/players",
                    params={"search": search_term},
                    headers={"x-apisports-key": AS_KEY},
                    timeout=6
                )
                for p in r.json().get('response', []):
                    full = (p.get('firstname', '') + ' ' + p.get('lastname', '')).lower().strip()
                    full_norm = _ascii(_strip_suffix(full))
                    if (full == pl_lower or _ascii(full) == pl_ascii or full_norm == pl_norm) and p['id'] not in candidate_ids:
                        candidate_ids.append(p['id'])
            except Exception:
                pass

        if not candidate_ids and len(last_ascii) > 7:
            try:
                r = requests.get(
                    "https://v2.nba.api-sports.io/players",
                    params={"search": last_ascii},
                    headers={"x-apisports-key": AS_KEY},
                    timeout=6
                )
                for p in r.json().get('response', []):
                    if _ascii(p.get('lastname', '')) == last_ascii and p['id'] not in candidate_ids:
                        candidate_ids.append(p['id'])
            except Exception:
                pass

        if not candidate_ids:
            return None

        # Pick the candidate that actually has season-2025 stats
        best_id = None
        for pid in candidate_ids:
            try:
                r = requests.get(
                    "https://v2.nba.api-sports.io/players/statistics",
                    params={"id": pid, "season": 2025},
                    headers={"x-apisports-key": AS_KEY},
                    timeout=6
                )
                played = [
                    g for g in r.json().get('response', [])
                    if int(str(g.get('min', '0') or '0').split(':')[0]) > 0
                ]
                if played:
                    best_id = pid
                    break
            except Exception:
                pass

        if best_id is None:
            best_id = candidate_ids[0]

        # --- Step 3: Write back to Supabase so future calls are instant ---
        if db_player_id and best_id and SUPABASE_URL and SUPABASE_KEY:
            try:
                sb_headers = {
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                }
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/players",
                    params={"id": f"eq.{db_player_id}"},
                    json={"api_sports_id": best_id},
                    headers=sb_headers, timeout=5
                )
            except Exception:
                pass

        return best_id

    def _get_player_game_stats(self, requests, player_name, stat, opponent_name=None, api_sports_id=None):
        """Return {"all": [...], "vs_opp": [...] or None} for the player's 2025 season.
        api_sports_id should be pre-resolved via _resolve_api_sports_id() — if provided
        this function skips all name-search API calls entirely.
        """
        if not AS_KEY:
            return None
        stat_field = STAT_FIELD_MAP.get(stat)
        if not stat_field:
            return None

        if not api_sports_id:
            return None  # caller must resolve ID via _resolve_api_sports_id first

        # Fetch stats for the resolved ID directly
        game_entries = []
        for player_id in [api_sports_id]:
            try:
                r = requests.get(
                    "https://v2.nba.api-sports.io/players/statistics",
                    params={"id": player_id, "season": 2025},
                    headers={"x-apisports-key": AS_KEY},
                    timeout=8
                )
                games_resp = r.json().get('response', [])
                entries = []
                for g in games_resp:
                    mins = g.get('min', '0') or '0'
                    m = int(str(mins).split(':')[0]) if ':' in str(mins) else int(float(mins or 0))
                    if m > 0:
                        v = g.get(stat_field)
                        if v is not None:
                            gid = (g.get('game') or {}).get('id')
                            tid = (g.get('team') or {}).get('id')
                            entries.append((gid, tid, float(v)))
                if entries:
                    game_entries = entries
                    break  # found a candidate with real data
            except Exception:
                pass

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
                        val for gid, _, val in game_entries
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

    # ── PARLAY VALIDATE ───────────────────────────────────────────────────────
    def _handle_parlay_validate(self, requests, body):
        """
        Given a list of picks (from AI Picks), for each team that has 2+ picks
        find the last 5 shared games and check how many times all players on that
        team simultaneously hit their respective stat lines.
        """
        from concurrent.futures import ThreadPoolExecutor

        picks = body.get('picks', [])

        # Group by team_abbrev
        teams = {}
        for p in picks:
            abbrev = p.get('team_abbrev', '')
            if abbrev not in teams:
                teams[abbrev] = {'team_name': p.get('team_name', abbrev), 'picks': []}
            teams[abbrev]['picks'].append(p)

        # Only validate teams that contributed 2+ picks
        qualified = {k: v for k, v in teams.items() if len(v['picks']) >= 2}

        if not qualified:
            self._send_json(200, {'success': True, 'teams': []})
            return

        result_teams = []

        for abbrev, tdata in qualified.items():
            team_picks = tdata['picks']

            def resolve_player(pick):
                stat_field = STAT_FIELD_MAP.get(pick.get('stat', ''))
                if not stat_field:
                    return None
                as_id = self._resolve_api_sports_id(requests, pick['name'], None)
                if not as_id:
                    return None
                try:
                    r = requests.get(
                        "https://v2.nba.api-sports.io/players/statistics",
                        params={"id": as_id, "season": 2025},
                        headers={"x-apisports-key": AS_KEY},
                        timeout=12,
                    )
                    entries = r.json().get('response', [])
                    game_data = {}
                    for entry in entries:
                        mins = entry.get('min', '0') or '0'
                        try:
                            m = int(str(mins).split(':')[0]) if ':' in str(mins) else int(float(mins or 0))
                        except Exception:
                            m = 0
                        if m <= 0:
                            continue
                        v = entry.get(stat_field)
                        if v is None:
                            continue
                        game = entry.get('game', {}) or {}
                        gid = game.get('id')
                        gdate = game.get('date', '') or ''
                        if isinstance(gdate, dict):
                            gdate = gdate.get('start', '') or ''
                        if gid:
                            game_data[gid] = {'date': str(gdate)[:10], 'value': float(v)}
                    return {
                        'name': pick['name'],
                        'stat': pick.get('stat', ''),
                        'line': pick.get('line', 0),
                        'game_data': game_data,
                    }
                except Exception:
                    return None

            with ThreadPoolExecutor(max_workers=8) as ex:
                raw = list(ex.map(resolve_player, team_picks))

            player_results = [r for r in raw if r and r['game_data']]

            if len(player_results) < 2:
                continue

            # Intersect game IDs across all players on this team
            game_id_sets = [set(pr['game_data'].keys()) for pr in player_results]
            shared_gids = sorted(set.intersection(*game_id_sets), reverse=True)[:5]

            if not shared_gids:
                continue

            game_rows = []
            all_hit_count = 0

            for gid in shared_gids:
                player_game_results = []
                all_hit = True
                date_str = ''

                for pr in player_results:
                    gdata = pr['game_data'][gid]
                    val = gdata['value']
                    hit = val > pr['line']
                    if not hit:
                        all_hit = False
                    date_str = date_str or gdata.get('date', '')
                    player_game_results.append({
                        'name': pr['name'],
                        'stat': pr['stat'],
                        'line': pr['line'],
                        'value': val,
                        'hit': hit,
                    })

                if all_hit:
                    all_hit_count += 1

                game_rows.append({
                    'game_id': gid,
                    'date': date_str,
                    'players': player_game_results,
                    'all_hit': all_hit,
                })

            result_teams.append({
                'team_name': tdata['team_name'],
                'team_abbrev': abbrev,
                'game_rows': game_rows,
                'all_hit_count': all_hit_count,
                'total_games': len(game_rows),
            })

        self._send_json(200, {'success': True, 'teams': result_teams})

    # ── TRENDBET GPT ──────────────────────────────────────────────────────────
    def _tool_get_player_recent_games(self, requests, player_name, num_games=5):
        """Fetch last N played games for a player with real stats + opponent + date."""
        as_id = self._resolve_api_sports_id(requests, player_name, None)
        if not as_id:
            return {'error': f'Player not found: {player_name}'}
        try:
            r = requests.get(
                "https://v2.nba.api-sports.io/players/statistics",
                params={"id": as_id, "season": 2025},
                headers={"x-apisports-key": AS_KEY},
                timeout=12,
            )
            entries = r.json().get('response', [])
        except Exception as e:
            return {'error': str(e)}

        played = []
        team_id = None
        for entry in entries:
            mins_raw = entry.get('min', '0') or '0'
            try:
                m = int(str(mins_raw).split(':')[0]) if ':' in str(mins_raw) else int(float(mins_raw or 0))
            except Exception:
                m = 0
            if m <= 0:
                continue
            gid = (entry.get('game') or {}).get('id')
            if team_id is None:
                team_id = (entry.get('team') or {}).get('id')
            played.append({
                'game_id':   gid,
                'minutes':   mins_raw,
                'points':    entry.get('points'),
                'rebounds':  entry.get('totReb'),
                'assists':   entry.get('assists'),
                'steals':    entry.get('steals'),
                'blocks':    entry.get('blocks'),
                'turnovers': entry.get('turnovers'),
                'fgm':       entry.get('fgm'),
                'fga':       entry.get('fga'),
            })

        played.sort(key=lambda x: x['game_id'] or 0, reverse=True)
        recent = played[:num_games]

        # Enrich with opponent, date, final score via team schedule
        if team_id and recent:
            try:
                r2 = requests.get(
                    "https://v2.nba.api-sports.io/games",
                    params={"team": team_id, "season": 2025},
                    headers={"x-apisports-key": AS_KEY},
                    timeout=10,
                )
                gmap = {}
                for tg in r2.json().get('response', []):
                    gid = tg.get('id')
                    if not gid:
                        continue
                    date_val = (tg.get('date') or {}).get('start', '') or ''
                    teams    = tg.get('teams', {})
                    home     = teams.get('home', {})
                    away     = teams.get('visitors', {})
                    opp      = away if home.get('id') == team_id else home
                    s_home   = (tg.get('scores', {}).get('home') or {}).get('points')
                    s_away   = (tg.get('scores', {}).get('visitors') or {}).get('points')
                    gmap[gid] = {
                        'date':     date_val[:10] if date_val else '',
                        'opponent': opp.get('name', ''),
                        'score':    f"{s_home}-{s_away}" if s_home is not None else 'N/A',
                    }
                for g in recent:
                    info = gmap.get(g['game_id'], {})
                    g['date']        = info.get('date', '')
                    g['opponent']    = info.get('opponent', '')
                    g['final_score'] = info.get('score', '')
                    del g['game_id']
            except Exception:
                pass

        return {'player': player_name, 'season': 2025, 'games': recent}

    def _tool_get_player_season_stats(self, requests, player_name):
        """Get player's season averages for the current season."""
        as_id = self._resolve_api_sports_id(requests, player_name, None)
        if not as_id:
            return {'error': f'Player not found: {player_name}'}
        try:
            r = requests.get(
                "https://v2.nba.api-sports.io/players/statistics",
                params={"id": as_id, "season": 2025},
                headers={"x-apisports-key": AS_KEY},
                timeout=12,
            )
            entries = r.json().get('response', [])
        except Exception as e:
            return {'error': str(e)}

        pts, reb, ast, mins = [], [], [], []
        for entry in entries:
            m_raw = entry.get('min', '0') or '0'
            try:
                m = int(str(m_raw).split(':')[0]) if ':' in str(m_raw) else int(float(m_raw or 0))
            except Exception:
                m = 0
            if m <= 0:
                continue
            if entry.get('points')  is not None: pts.append(float(entry['points']))
            if entry.get('totReb')  is not None: reb.append(float(entry['totReb']))
            if entry.get('assists') is not None: ast.append(float(entry['assists']))
            mins.append(m)

        n = len(pts)
        if not n:
            return {'error': f'No 2025 season data found for {player_name}'}

        def avg(lst): return round(sum(lst) / len(lst), 1) if lst else None

        return {
            'player':         player_name,
            'season':         2025,
            'games_played':   n,
            'avg_points':     avg(pts),
            'avg_rebounds':   avg(reb),
            'avg_assists':    avg(ast),
            'avg_minutes':    avg(mins),
            'last5_points':   avg(pts[-5:]),
            'last5_rebounds': avg(reb[-5:]),
            'last5_assists':  avg(ast[-5:]),
        }

    def _execute_gpt_tool(self, requests, tool_name, tool_input):
        if tool_name == 'get_player_recent_games':
            return self._tool_get_player_recent_games(
                requests,
                tool_input.get('player_name', ''),
                min(int(tool_input.get('num_games', 5)), 10),
            )
        if tool_name == 'get_player_season_stats':
            return self._tool_get_player_season_stats(
                requests,
                tool_input.get('player_name', ''),
            )
        return {'error': f'Unknown tool: {tool_name}'}

    def _handle_gpt_chat(self, requests, body):
        """
        TrendBetGPT — agentic sports betting analyst.
        Claude uses tool calls to fetch real player stats from API-Sports before answering.
        """
        import anthropic
        import json as _json
        from concurrent.futures import ThreadPoolExecutor
        from datetime import datetime, timezone

        question   = (body.get('question') or '').strip()
        image_b64  = body.get('image_b64')
        image_type = body.get('image_type', 'image/png')

        if not question:
            self._send_json(400, {'success': False, 'error': 'No question provided'})
            return

        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

        # Light static context (today's schedule + cached picks — free to include)
        ctx_lines = []
        try:
            nba_games, _ = self._fetch_nba(requests)
            if nba_games:
                rows = []
                for g in nba_games:
                    h_pts = g['home'].get('points')
                    a_pts = g['away'].get('points')
                    score = f"{a_pts}-{h_pts}" if h_pts is not None else 'TBD'
                    rows.append(f"  {g['away']['name']} @ {g['home']['name']}  {score}  ({g.get('status','')})")
                ctx_lines.append('TODAY\'S NBA GAMES:\n' + '\n'.join(rows))
        except Exception:
            pass

        try:
            if SUPABASE_URL and SUPABASE_KEY:
                _sb_h = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
                _cr = requests.get(
                    f"{SUPABASE_URL}/rest/v1/ai_picks_cache?select=data,cached_at&id=eq.1",
                    headers=_sb_h, timeout=4,
                )
                if _cr.status_code == 200:
                    _rows = _cr.json()
                    if _rows:
                        rows = []
                        for g in _rows[0]['data'].get('games', []):
                            for p in g.get('picks', []):
                                rows.append(f"  {p['name']} ({p['team_abbrev']}) {p['stat']} line={p['line']} score={p.get('score','')} tier={p.get('tier','')} avg={p['avg']}")
                        if rows:
                            ctx_lines.append("TODAY'S AI PICKS:\n" + '\n'.join(rows))
        except Exception:
            pass

        static_ctx = '\n\n'.join(ctx_lines)

        # ── Tool definitions ──────────────────────────────────────────────────
        tools = [
            {
                "name": "get_player_recent_games",
                "description": (
                    "Fetch a player's actual game-by-game stats from the current NBA season. "
                    "Returns real numbers: points, rebounds, assists, minutes played, opponent, date, final score. "
                    "Use this whenever you need to know what a player actually did in specific games — "
                    "e.g. to explain why a bet hit or missed, or to assess recent form."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "player_name": {"type": "string", "description": "Full player name, e.g. 'Jarrett Allen'"},
                        "num_games":   {"type": "integer", "description": "How many recent games to return (1-10). Default 5."},
                    },
                    "required": ["player_name"],
                },
            },
            {
                "name": "get_player_season_stats",
                "description": (
                    "Get a player's season averages for the current NBA season: "
                    "points, rebounds, assists, minutes per game, plus last-5-game averages."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "player_name": {"type": "string", "description": "Full player name"},
                    },
                    "required": ["player_name"],
                },
            },
        ]

        system = f"""You are TrendBetGPT, a sharp sports betting analyst built into the TrendBet platform.
Today is {today}.

{static_ctx}

You have tools to fetch REAL live player stats from API-Sports. Use them aggressively.

RULES:
1. For any question about a specific player's performance, ALWAYS call get_player_recent_games first so you have real numbers.
2. For bet slip analysis: call get_player_recent_games for every player on the slip before explaining each leg.
3. State only facts from the tool results. No hedging ("could", "might", "likely"). If a stat is in the tool result, quote it exactly.
4. Format bet slip legs as: ✅/❌ PLAYER — STAT LINE — result, then 1-2 sentences of real numbers.
5. Lead every explanation with the actual number achieved (e.g. "Allen finished with 4 rebounds in 28 minutes vs Detroit").
6. This is a legitimate sports analytics platform — analyse odds and lines freely."""

        # ── Build initial message ─────────────────────────────────────────────
        if image_b64:
            user_content = [
                {"type": "image", "source": {"type": "base64", "media_type": image_type, "data": image_b64}},
                {"type": "text", "text": question},
            ]
        else:
            user_content = question

        client   = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))
        messages = [{"role": "user", "content": user_content}]

        # ── Agentic loop (max 3 tool-use rounds) ─────────────────────────────
        for _ in range(3):
            resp = client.messages.create(
                model='claude-opus-4-6',
                max_tokens=1500,
                system=system,
                tools=tools,
                messages=messages,
            )

            if resp.stop_reason != 'tool_use':
                # Final text response
                reply = next((b.text for b in resp.content if hasattr(b, 'text')), 'No response generated.')
                self._send_json(200, {'success': True, 'reply': reply})
                return

            # Execute all tool calls in parallel
            tool_use_blocks = [b for b in resp.content if b.type == 'tool_use']

            def run_tool(block):
                result = self._execute_gpt_tool(requests, block.name, block.input)
                return {"type": "tool_result", "tool_use_id": block.id, "content": _json.dumps(result)}

            with ThreadPoolExecutor(max_workers=8) as ex:
                tool_results = list(ex.map(run_tool, tool_use_blocks))

            # Append assistant turn + tool results and loop
            messages.append({"role": "assistant", "content": resp.content})
            messages.append({"role": "user", "content": tool_results})

        # Fallback if loop exhausted
        self._send_json(200, {'success': True, 'reply': 'Analysis incomplete — too many data fetches required. Try a more specific question.'})

    # ── AI PICKS (stats-first, 0 Odds API calls) ─────────────────────────────
    def _handle_ai_picks(self, requests):
        from concurrent.futures import ThreadPoolExecutor

        # ── Today's ET date (canonical date for all picks logic) ─────────────
        et_today = _et_now().strftime('%Y-%m-%d')

        # ── Supabase shared cache (2 hours, same ET date only) ────────────────
        _AI_PICKS_TTL_HOURS = 2
        sb_headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        }
        old_data = None   # stale cached picks for merging
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                cr = requests.get(
                    f"{SUPABASE_URL}/rest/v1/ai_picks_cache?select=data,cached_at&id=eq.1",
                    headers=sb_headers, timeout=5,
                )
                if cr.status_code == 200:
                    rows = cr.json()
                    if rows:
                        cached_at = datetime.fromisoformat(rows[0]['cached_at'].replace('Z', '+00:00'))
                        age_hours = (datetime.now(timezone.utc) - cached_at).total_seconds() / 3600
                        cached_et_date = _utc_to_et_date(cached_at)
                        if age_hours < _AI_PICKS_TTL_HOURS and cached_et_date == et_today:
                            # If any scheduled game has no odds yet, recompute so we pick up
                            # props that went live after the cache was written.
                            cached_games = (rows[0]['data'] or {}).get('games', [])
                            has_missing_odds = any(
                                not g.get('has_odds_event') and g.get('status') == 'scheduled'
                                for g in cached_games
                            )
                            if not has_missing_odds:
                                self._send_json(200, rows[0]['data'])
                                return
                        # Cache stale or from a different day — save for merging only if same ET date
                        if cached_et_date == et_today:
                            old_data = rows[0]['data']
            except Exception:
                pass

        games, _ = self._fetch_nba(requests, et_date=et_today)
        if not games:
            self._send_json(200, {"success": True, "games": []})
            return

        # ── Step 1: Fetch player props per event in parallel, cache 4 hrs ──────
        # Per-event endpoint is the only reliable way to get alternate player props.
        # Cost: 3 markets × num_events (e.g. 8 games = 24 credits), done ONCE per 4h.
        ODDS_STAT_MAP = {
            'player_points_alternate':   'points',
            'player_rebounds_alternate': 'rebounds',
            'player_assists_alternate':  'assists',
        }
        # odds_by_event: event_id -> {ascii_player_name -> {stat -> {line -> {over, under, bm}}}}
        odds_by_event     = {}
        event_id_to_teams = {}  # event_id -> (home_lower, away_lower)

        if ODDS_API_KEY:
            # 1a — get today's event list (free, no credits)
            try:
                ev_resp = requests.get(
                    "https://api.the-odds-api.com/v4/sports/basketball_nba/events",
                    params={"apiKey": ODDS_API_KEY},
                    timeout=8,
                )
                events_list = ev_resp.json() if ev_resp.status_code == 200 else []
            except Exception:
                events_list = []

            for ev in events_list:
                event_id_to_teams[ev['id']] = (
                    ev.get('home_team', '').lower(),
                    ev.get('away_team', '').lower(),
                )

            # 1b — fetch props for each event in parallel
            def fetch_event_props(eid):
                try:
                    r = requests.get(
                        f"https://api.the-odds-api.com/v4/sports/basketball_nba/events/{eid}/odds",
                        params={
                            "apiKey":     ODDS_API_KEY,
                            "regions":    "us",
                            "markets":    ",".join(ODDS_STAT_MAP.keys()),
                            "oddsFormat": "american",
                        },
                        timeout=10,
                    )
                    if r.status_code != 200:
                        return eid, {}
                    player_lines = {}
                    for bm in r.json().get('bookmakers', []):
                        bm_title = bm.get('title', bm.get('key', ''))
                        for mkt in bm.get('markets', []):
                            stat_name = ODDS_STAT_MAP.get(mkt.get('key', ''))
                            if not stat_name:
                                continue
                            for outcome in mkt.get('outcomes', []):
                                aname = _ascii(outcome.get('description', ''))
                                pt    = outcome.get('point')
                                nm    = outcome.get('name')
                                if not aname or pt is None:
                                    continue
                                player_lines.setdefault(aname, {}).setdefault(stat_name, {}).setdefault(pt, {'over': None, 'under': None, 'bm': bm_title})
                                entry = player_lines[aname][stat_name][pt]
                                if nm == 'Over':
                                    price = outcome.get('price')
                                    if price is not None and (entry['over'] is None or price > entry['over']):
                                        entry['over'] = price
                                        entry['bm'] = bm_title
                                elif nm == 'Under':
                                    price = outcome.get('price')
                                    if price is not None and (entry['under'] is None or price > entry['under']):
                                        entry['under'] = price
                    return eid, player_lines
                except Exception:
                    return eid, {}

            with ThreadPoolExecutor(max_workers=16) as executor:
                for eid, player_lines in executor.map(fetch_event_props, event_id_to_teams.keys()):
                    odds_by_event[eid] = player_lines

        # ── Step 2: Match our game objects → Odds API event IDs ──────────────
        # Use last word (nickname) matching: "LA Clippers" == "Los Angeles Clippers"
        # because both end with "clippers". Full-name substring matching fails here.
        def _nick(name):
            parts = name.strip().split()
            return parts[-1] if parts else name

        game_to_event = {}
        for g in games:
            h_nick = _nick(g['home']['name'].lower())
            a_nick = _nick(g['away']['name'].lower())
            for eid, (oh, oa) in event_id_to_teams.items():
                if h_nick == _nick(oh) and a_nick == _nick(oa):
                    game_to_event[g['id']] = eid
                    break
                if h_nick == _nick(oa) and a_nick == _nick(oh):
                    game_to_event[g['id']] = eid
                    break

        # ── Step 3: Fetch API-Sports team season stats in parallel ────────────
        team_info = {}
        for g in games:
            for side in ['home', 'away']:
                t = g[side]
                if t.get('api_id') and t['alias'] not in team_info:
                    team_info[t['alias']] = {'api_id': t['api_id'], 'name': t['name']}

        def fetch_team_player_stats(alias):
            api_id = team_info[alias]['api_id']
            empty  = (alias, {}, [], {})
            try:
                # -- Player season stats --
                stats_r = requests.get(
                    "https://v2.nba.api-sports.io/players/statistics",
                    params={"team": api_id, "season": 2025},
                    headers={"x-apisports-key": AS_KEY},
                    timeout=10,
                )
                if stats_r.status_code != 200:
                    return empty

                # -- Team schedule: last-10 completed game IDs + opponent map --
                last10_gids  = []
                game_opp_map = {}
                for _attempt in range(2):
                    try:
                        sched_r = requests.get(
                            "https://v2.nba.api-sports.io/games",
                            params={"team": api_id, "season": 2025},
                            headers={"x-apisports-key": AS_KEY},
                            timeout=12,
                        )
                        if sched_r.status_code == 200:
                            completed = []
                            for g in sched_r.json().get('response', []):
                                status_obj = g.get('status') or {}
                                short = status_obj.get('short') if isinstance(status_obj, dict) else None
                                if short == 3:
                                    date_val = (g.get('date') or {}).get('start', '') or ''
                                    completed.append((date_val, g))
                            completed.sort(key=lambda x: x[0])
                            last10_gids = [g['id'] for _, g in completed[-10:] if g.get('id')]
                            for _, g in completed:
                                gid = g.get('id')
                                if not gid:
                                    continue
                                teams = g.get('teams', {})
                                home  = teams.get('home', {})
                                away  = teams.get('visitors', {})
                                opp   = away if home.get('id') == api_id else home
                                game_opp_map[gid] = (opp.get('name') or '').lower()
                            break  # success
                    except Exception:
                        pass

                # -- Build player_data: stats as (game_id, value) tuples + mins dict --
                stats_entries = stats_r.json().get('response', [])
                player_data = {}
                # Track gid appearance order from API response (roughly chronological)
                gid_order = []
                gid_order_set = set()
                for entry in stats_entries:
                    player = entry.get('player', {})
                    pid    = player.get('id')
                    if not pid:
                        continue
                    mins = entry.get('min', '0') or '0'
                    try:
                        m = int(str(mins).split(':')[0]) if ':' in str(mins) else int(float(mins or 0))
                    except Exception:
                        m = 0
                    gid = (entry.get('game') or {}).get('id')
                    if not gid:
                        continue
                    # Track unique gids in response order (best proxy for chronological order)
                    if gid not in gid_order_set:
                        gid_order.append(gid)
                        gid_order_set.add(gid)
                    if m <= 0:
                        continue
                    if pid not in player_data:
                        name = f"{player.get('firstname', '')} {player.get('lastname', '')}".strip()
                        player_data[pid] = {
                            'name': name, 'ascii': _ascii(name),
                            'points': [], 'rebounds': [], 'assists': [],
                            'mins': {},
                        }
                    player_data[pid]['mins'][gid] = m
                    pts = entry.get('points')
                    reb = entry.get('totReb')
                    ast = entry.get('assists')
                    if pts is not None: player_data[pid]['points'].append((gid, float(pts)))
                    if reb is not None: player_data[pid]['rebounds'].append((gid, float(reb)))
                    if ast is not None: player_data[pid]['assists'].append((gid, float(ast)))

                # Fallback: if schedule fetch failed, use API response order (roughly
                # chronological) rather than gid number (gids are NOT sequential by date)
                if not last10_gids and gid_order:
                    last10_gids = gid_order[-10:]

                return alias, player_data, last10_gids, game_opp_map
            except Exception:
                return empty

        team_results   = {}
        team_last10    = {}
        team_schedules = {}
        if team_info and AS_KEY:
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = {alias: executor.submit(fetch_team_player_stats, alias) for alias in team_info}
                for alias, f in futures.items():
                    _, pd, l10, opp_map = f.result()
                    team_results[alias]   = pd
                    team_last10[alias]    = l10
                    team_schedules[alias] = opp_map

        # ── Step 4: Build picks using 3-pillar scoring system ────────────────
        output = []
        for g in games:
            eid            = game_to_event.get(g['id'])
            event_odds     = odds_by_event.get(eid, {})
            has_odds_event = eid is not None and bool(event_odds)
            game_picks     = []

            for side in ['home', 'away']:
                alias        = g[side]['alias']
                player_data  = team_results.get(alias, {})
                last10_gids  = team_last10.get(alias, [])
                game_opp_map = team_schedules.get(alias, {})
                opponent     = g['away']['name'] if side == 'home' else g['home']['name']

                for pid, pdata in player_data.items():
                    player_odds = _match_player_odds(event_odds, pdata['ascii'])
                    if not player_odds:
                        continue

                    best_pick = None
                    for stat_name in ('points', 'rebounds', 'assists'):
                        values_all = pdata[stat_name]   # [(game_id, float), ...]
                        lines_dict = player_odds.get(stat_name, {})
                        if not lines_dict or not values_all:
                            continue

                        # Quick avg of last-10 to filter qualifying lines
                        gid_set = set(last10_gids)
                        last10_q = [
                            v for gid, v in sorted(
                                [(gid, v) for gid, v in values_all if gid in gid_set],
                                key=lambda x: last10_gids.index(x[0])
                            )
                        ]
                        if not last10_q:
                            continue
                        avg_q = sum(last10_q) / len(last10_q)

                        # Try lines from highest to lowest where avg > line
                        qualifying = sorted(
                            [l for l in lines_dict if avg_q > l],
                            reverse=True
                        )

                        stat_pick = None
                        for try_line in qualifying:
                            odds_entry = lines_dict[try_line]
                            over_odds  = odds_entry.get('over')
                            # Odds quality gate: reject juice worse than -200
                            if over_odds is not None and over_odds < -200:
                                continue
                            scored = self._score_pick(
                                values_all, try_line, stat_name,
                                last10_gids, game_opp_map,
                                opponent, pdata['mins']
                            )
                            if scored:
                                score, tier, details = scored
                                stat_pick = {
                                    'stat':       stat_name,
                                    'line':       try_line,
                                    'over_odds':  over_odds,
                                    'under_odds': odds_entry.get('under'),
                                    'bookmaker':  odds_entry.get('bm', ''),
                                    **details,
                                }
                                break  # highest qualifying line that clears all gates

                        if not stat_pick:
                            continue

                        if best_pick is None or stat_pick['score'] > best_pick['score']:
                            best_pick = stat_pick

                    if not best_pick:
                        continue

                    game_picks.append({
                        'name':        pdata['name'],
                        'team_abbrev': alias,
                        'team_name':   g[side]['name'],
                        'game_id':     g['id'],
                        'home':        g['home'],
                        'away':        g['away'],
                        'scheduled':   g.get('scheduled', ''),
                        'status':      g.get('status', 'scheduled'),
                        **best_pick,
                    })

            game_picks.sort(key=lambda x: x['score'], reverse=True)
            output.append({
                'game_id':        g['id'],
                'home':           g['home'],
                'away':           g['away'],
                'scheduled':      g.get('scheduled', ''),
                'status':         g.get('status', 'scheduled'),
                'has_odds_event': has_odds_event,
                'picks':          game_picks[:6],
            })

        # ── Merge with previous cycle's picks ────────────────────────────────
        # Merge is scoped by game_id — finished games are excluded from _fetch_nba,
        # so once all today's games finish, tomorrow's new game_ids won't match and
        # the merge naturally produces zero carry-overs (automatic reset).
        if old_data:
            old_games = {g['game_id']: g for g in old_data.get('games', [])}
            for game in output:
                old_game = old_games.get(game['game_id'])
                if not old_game:
                    continue
                # Union picks — dedup by (name, stat), prefer higher score
                existing = {(p['name'], p['stat']): p for p in game['picks']}
                for old_pick in old_game.get('picks', []):
                    key = (old_pick['name'], old_pick['stat'])
                    if key not in existing or old_pick['score'] > existing[key]['score']:
                        existing[key] = old_pick
                game['picks'] = sorted(existing.values(), key=lambda x: x['score'], reverse=True)[:10]

        result = {"success": True, "games": output}

        # ── Write cache FIRST (highest priority) ──────────────────────────────
        # ── Write cache FIRST (highest priority) ──────────────────────────────
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/ai_picks_cache?id=eq.1",
                    headers={**sb_headers, "Content-Type": "application/json"},
                    json={"data": result,
                          "cached_at": datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')},
                    timeout=8,
                )
            except Exception:
                pass

        # ── Save picks to pick_history (upsert every fresh compute, skip existing) ─
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                pick_date = et_today
                history_rows = []
                for game in output:
                    for pick in game['picks']:
                        is_home = pick['team_abbrev'] == pick.get('home', {}).get('alias')
                        opp = pick.get('away', {}).get('name', '') if is_home else pick.get('home', {}).get('name', '')
                        history_rows.append({
                            "pick_date":   pick_date,
                            "game_id":     pick['game_id'],
                            "player_name": pick['name'],
                            "team_abbrev": pick['team_abbrev'],
                            "opponent":    opp,
                            "stat":        pick['stat'],
                            "line":        pick['line'],
                            "over_odds":   pick.get('over_odds'),
                            "bookmaker":   pick.get('bookmaker', ''),
                            "tier":        pick.get('tier'),
                            "score":       pick.get('score'),
                            "scheduled":   pick.get('scheduled', ''),
                        })
                if history_rows:
                    requests.post(
                        f"{SUPABASE_URL}/rest/v1/pick_history?on_conflict=pick_date,player_name,stat",
                        headers={**sb_headers, "Content-Type": "application/json",
                                 "Prefer": "resolution=ignore-duplicates"},
                        json=history_rows, timeout=8,
                    )
            except Exception:
                pass

        self._send_json(200, result)

    def _score_pick(self, values_all, line, stat, last10_gids,
                    game_opp_map, opponent_name, mins_by_gid):
        """
        Run Stage 1 (hard gates) + Stage 2 (3-pillar scoring) for one player/stat/line.
        values_all  = [(game_id, float), ...] full season entries
        last10_gids = [game_id, ...] 10 most recent completed games, chronological
        Returns (score, tier, details_dict) or None if any gate/kill condition fires.
        """
        import statistics as _stats

        # ── Prepare last-10 entries (chronological order) ────────────────────
        gid_set = set(last10_gids)
        last10_entries = sorted(
            [(gid, v) for gid, v in values_all if gid in gid_set],
            key=lambda x: last10_gids.index(x[0])
        )
        last10_vals  = [v for _, v in last10_entries]
        games_played = len(last10_vals)
        if not games_played:
            return None

        avg_last10  = sum(last10_vals) / games_played
        mins_last10 = [mins_by_gid.get(gid, 0) for gid, _ in last10_entries]
        avg_mins    = sum(mins_last10) / len(mins_last10) if mins_last10 else 0

        # ── Stage 1: Hard Gates ───────────────────────────────────────────────
        MIN_LINE = {'points': 10.5, 'rebounds': 3.5, 'assists': 2.5}
        if line < MIN_LINE.get(stat, 0):     return None
        if games_played < 6:                 return None
        if avg_last10 <= line:               return None
        if avg_mins < 20:                    return None

        # ── Pillar 1: Consistency ─────────────────────────────────────────────
        hit_count = sum(1 for v in last10_vals if v > line)
        hit_rate  = hit_count / games_played

        # Points has higher variance — allow 75% floor; rebounds/assists keep 80%
        if   hit_rate >= 1.0:                        p1 = 40
        elif hit_rate >= 0.9:                        p1 = 35
        elif hit_rate >= 0.8:                        p1 = 25
        elif hit_rate >= 0.75 and stat == 'points':  p1 = 15
        else:                                        return None  # kill

        # ── Pillar 2: Matchup Context ─────────────────────────────────────────
        opp_lower  = opponent_name.lower()
        opp_words  = [w for w in opp_lower.split() if len(w) > 3]
        vs_opp_vals = [
            v for gid, v in values_all
            if opp_lower in game_opp_map.get(gid, '')
            or any(w in game_opp_map.get(gid, '') for w in opp_words)
        ]
        n_opp  = len(vs_opp_vals)
        opp_hr = sum(1 for v in vs_opp_vals if v > line) / n_opp if n_opp else None

        if n_opp >= 4:
            if   opp_hr >= 0.75: p2 = 30
            elif opp_hr >= 0.50: p2 = 20
            else:                return None  # bad H2H history = kill
        elif n_opp >= 1:
            p2 = 18 if opp_hr >= 0.50 else 12
        else:
            p2 = 20  # no H2H — true neutral (team def rank: Phase 2)

        # ── Pillar 3: Recency Trend ───────────────────────────────────────────
        mid      = len(last10_vals) // 2
        old_half = last10_vals[:mid]  if mid > 0            else last10_vals
        new_half = last10_vals[mid:]  if mid < games_played else last10_vals
        old_avg  = sum(old_half) / len(old_half) if old_half else 0.001
        new_avg  = sum(new_half) / len(new_half) if new_half else 0
        ratio    = new_avg / max(old_avg, 0.001)

        if   ratio > 1.05:  p3 = 30; trend = 'up'
        elif ratio >= 0.90: p3 = 20; trend = 'flat'
        elif ratio >= 0.80: p3 = 10; trend = 'down'
        else:               return None  # cooling player = kill

        # ── Volatility Bonus ──────────────────────────────────────────────────
        bonus = 0
        if games_played >= 5 and avg_last10 > 0:
            try:
                sd = _stats.stdev(last10_vals)
                cv = sd / avg_last10
                if cv < 0.15 and hit_rate >= 0.9:
                    bonus = 5
            except Exception:
                pass

        # ── Score + Tier ──────────────────────────────────────────────────────
        total = p1 + p2 + p3 + bonus

        if   total >= 90: tier = 'ELITE LOCK'
        elif total >= 80: tier = 'STRONG PICK'
        elif total >= 75: tier = 'SOLID VALUE'
        else:             return None

        last5 = last10_vals[-5:] if len(last10_vals) >= 5 else last10_vals
        return (total, tier, {
            'score':           total,
            'tier':            tier,
            'hit_rate':        round(hit_rate, 3),
            'avg':             round(avg_last10, 1),
            'last_5_avg':      round(sum(last5) / len(last5), 1),
            'games':           games_played,
            'vs_opp_games':    n_opp,
            'vs_opp_hit_rate': round(opp_hr, 3) if opp_hr is not None else None,
            'trend':           trend,
        })

    def _handle_pick_history(self, requests, query_params=None):
        """
        Returns lifetime stats + last 7 days of picks with win/loss results.
        Also auto-resolves pending picks whose game finished 3+ hours ago.
        """
        if not SUPABASE_URL or not SUPABASE_KEY:
            self._send_json(200, {"lifetime": {}, "daily": []})
            return

        sb_headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        }

        # ── Phase A: Auto-resolve pending picks ───────────────────────────────
        try:
            pr = requests.get(
                f"{SUPABASE_URL}/rest/v1/pick_history?select=*&result=is.null",
                headers=sb_headers, timeout=5,
            )
            pending = pr.json() if pr.status_code == 200 else []
        except Exception:
            pending = []

        now_utc = _et_now()  # ET-aware current time for pick_date alignment
        STAT_FIELD = {'points': 'points', 'rebounds': 'totReb', 'assists': 'assists'}

        for pick in pending:
            scheduled_str = pick.get('scheduled', '')
            if not scheduled_str:
                continue
            try:
                sched_dt = datetime.fromisoformat(
                    scheduled_str.replace('Z', '').replace('+00:00', ''))
            except Exception:
                continue
            if (now_utc - sched_dt).total_seconds() < 3 * 3600:
                continue  # game likely not finished yet

            api_id = self._resolve_api_sports_id(requests, pick['player_name'], None)
            if not api_id:
                continue
            try:
                sr = requests.get(
                    "https://v2.nba.api-sports.io/players/statistics",
                    params={"id": api_id, "season": 2025},
                    headers={"x-apisports-key": AS_KEY}, timeout=8,
                )
                if sr.status_code != 200:
                    continue
                stat_field = STAT_FIELD.get(pick['stat'])
                actual = None
                target_gid = int(pick['game_id']) if pick.get('game_id') is not None else None
                for entry in sr.json().get('response', []):
                    entry_gid = (entry.get('game') or {}).get('id')
                    if target_gid is not None and entry_gid is not None and int(entry_gid) == target_gid:
                        val = entry.get(stat_field)
                        try:
                            actual = float(val)
                        except Exception:
                            pass
                        break
                if actual is None:
                    continue
                result = 'win' if actual > float(pick['line']) else 'loss'
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/pick_history?id=eq.{pick['id']}",
                    headers={**sb_headers, "Content-Type": "application/json"},
                    json={"result": result, "actual_value": actual},
                    timeout=5,
                )
            except Exception:
                pass

        # ── Phase B: Fetch history and build response ─────────────────────────
        def calc_pnl(result, over_odds):
            try:
                odds = int(over_odds) if over_odds is not None else None
            except Exception:
                odds = None
            if result == 'win':
                if odds and odds < 0:
                    return round(100 * 100 / abs(odds), 2)
                elif odds and odds > 0:
                    return float(odds)
                return 100.0
            elif result == 'loss':
                return -100.0
            return 0.0  # pending

        # Lifetime totals
        try:
            ar = requests.get(
                f"{SUPABASE_URL}/rest/v1/pick_history?select=result,over_odds",
                headers=sb_headers, timeout=5,
            )
            all_picks = ar.json() if ar.status_code == 200 else []
        except Exception:
            all_picks = []

        lt_total   = len(all_picks)
        lt_won     = sum(1 for p in all_picks if p.get('result') == 'win')
        lt_lost    = sum(1 for p in all_picks if p.get('result') == 'loss')
        lt_pending = lt_total - lt_won - lt_lost
        lt_pnl     = sum(calc_pnl(p.get('result'), p.get('over_odds')) for p in all_picks)
        resolved   = lt_won + lt_lost
        lifetime   = {
            "total":    lt_total,
            "won":      lt_won,
            "lost":     lt_lost,
            "pending":  lt_pending,
            "win_rate": round(lt_won / resolved, 3) if resolved else 0,
            "total_pnl": round(lt_pnl, 2),
            "roi":       round(lt_pnl / (resolved * 100), 3) if resolved else 0,
        }

        # Fetch all history (no date limit)
        try:
            dr = requests.get(
                f"{SUPABASE_URL}/rest/v1/pick_history?select=*&order=pick_date.desc,created_at.desc",
                headers=sb_headers, timeout=10,
            )
            day_picks = dr.json() if dr.status_code == 200 else []
        except Exception:
            day_picks = []

        # Group by date
        from collections import OrderedDict
        days_map = OrderedDict()
        for p in day_picks:
            d = p['pick_date']
            if d not in days_map:
                days_map[d] = []
            days_map[d].append(p)

        daily = []
        for date_str, picks in days_map.items():
            won_d     = sum(1 for p in picks if p.get('result') == 'win')
            lost_d    = sum(1 for p in picks if p.get('result') == 'loss')
            pending_d = sum(1 for p in picks if p.get('result') is None)
            pnl_d     = sum(calc_pnl(p.get('result'), p.get('over_odds')) for p in picks)
            # Attach pnl to each pick for frontend
            for p in picks:
                p['pnl'] = calc_pnl(p.get('result'), p.get('over_odds'))
            daily.append({
                "date":    date_str,
                "picks":   picks,
                "summary": {
                    "total":   len(picks),
                    "won":     won_d,
                    "lost":    lost_d,
                    "pending": pending_d,
                    "pnl":     round(pnl_d, 2),
                },
            })

        self._send_json(200, {"lifetime": lifetime, "daily": daily})

    def _handle_ai_picks_debug(self, requests, query_params):
        """
        Lightweight debug: fetch stats + odds for ONE player only and show gate results.
        Usage: /api?type=ai_picks_debug&player=jokic
        """
        diag = {}  # step-by-step diagnostic output

        player_val  = query_params.get('player', '')
        if isinstance(player_val, list): player_val = player_val[0] if player_val else ''
        name_filter = _ascii(str(player_val)).strip()
        diag['name_filter'] = name_filter

        # Step 1: today's games
        games, _ = self._fetch_nba(requests)
        diag['games_today'] = [f"{g['away']['name']} @ {g['home']['name']} (id={g['id']})" for g in games]
        if not games:
            self._send_json(200, {"diag": diag, "error": "no games today"})
            return

        # Step 2: find which game/team the player is in
        target_alias  = None
        target_api_id = None
        target_game   = None
        target_side   = None
        for g in games:
            for side in ['home', 'away']:
                t = g[side]
                # quick check via team name / alias
                if name_filter:
                    # We'll confirm match after fetching roster; for now pick all teams
                    pass
                if target_alias is None:
                    # fetch all teams — we don't know which team yet without a roster
                    pass

        # Step 3: fetch stats for every team and find the player
        headers_as = {"x-apisports-key": AS_KEY}
        player_found = None
        player_team_alias = None
        player_game = None
        player_opponent = None

        for g in games:
            if player_found:
                break
            for side in ['home', 'away']:
                t    = g[side]
                alias   = t['alias']
                api_id  = t.get('api_id')
                if not api_id or not AS_KEY:
                    continue
                try:
                    r = requests.get(
                        f"https://v2.nba.api-sports.io/players/statistics?team={api_id}&season=2025",
                        headers=headers_as, timeout=12)
                    diag[f'stats_fetch_{alias}'] = r.status_code
                    if r.status_code != 200:
                        continue
                    player_data = {}
                    for entry in r.json().get('response', []):
                        pl = entry.get('player', {}); gm = entry.get('game', {}); tm = entry.get('team', {})
                        if tm.get('id') != api_id: continue
                        pid = pl.get('id'); gid = gm.get('id')
                        if not pid or not gid: continue
                        fn = pl.get('firstname',''); ln2 = pl.get('lastname','')
                        full = f"{fn} {ln2}".strip()
                        ascii_name = _ascii(full)
                        if name_filter and name_filter not in ascii_name:
                            continue
                        if pid not in player_data:
                            player_data[pid] = {'name': full, 'ascii': ascii_name, 'points': [], 'rebounds': [], 'assists': [], 'mins': {}}
                        def _f(v):
                            try: return float(v)
                            except: return 0.0
                        player_data[pid]['points'].append((gid, _f(entry.get('points'))))
                        player_data[pid]['rebounds'].append((gid, _f(entry.get('totReb'))))
                        player_data[pid]['assists'].append((gid, _f(entry.get('assists'))))
                        mins_raw = entry.get('min','0') or '0'
                        try: mins_val = int(str(mins_raw).split(':')[0])
                        except: mins_val = 0
                        player_data[pid]['mins'][gid] = mins_val

                    if not player_data:
                        continue

                    # Found the player — fetch schedule for last10
                    sr = requests.get(f"https://v2.nba.api-sports.io/games?team={api_id}&season=2025", headers=headers_as, timeout=10)
                    diag[f'schedule_fetch_{alias}'] = sr.status_code
                    last10_gids = []; game_opp_map = {}
                    if sr.status_code == 200:
                        completed = sorted(
                            [(g2['id'], g2) for g2 in sr.json().get('response', [])
                             if (g2.get('status',{}).get('short') if isinstance(g2.get('status'),dict) else None) == 3],
                            key=lambda x: x[0])
                        last10_gids = [gid2 for gid2, _ in completed[-10:]]
                        for gid2, g2 in completed:
                            teams2 = g2.get('teams', {})
                            h2 = teams2.get('home', {}); a2 = teams2.get('visitors', {})
                            opp = a2.get('name','') if h2.get('id') == api_id else h2.get('name','')
                            game_opp_map[gid2] = opp.lower()
                    if not last10_gids and player_data:
                        all_gids = set()
                        for pd2 in player_data.values():
                            for gid2, _ in pd2['points']: all_gids.add(gid2)
                        last10_gids = sorted(all_gids)[-10:]
                        diag['last10_source'] = 'fallback_from_stat_ids'
                    else:
                        diag['last10_source'] = 'schedule_api'

                    player_found    = player_data
                    player_team_alias = alias
                    player_game     = g
                    player_opponent = g['away']['name'] if side == 'home' else g['home']['name']
                    diag['last10_gids'] = last10_gids
                    diag['game_opp_map_sample'] = dict(list(game_opp_map.items())[:5])
                    break
                except Exception as ex:
                    diag[f'exception_{alias}'] = str(ex)

        if not player_found:
            self._send_json(200, {"diag": diag, "error": f"player '{name_filter}' not found in any team roster today"})
            return

        diag['player_found'] = {pid: pdata['name'] for pid, pdata in player_found.items()}

        # Step 4: fetch odds for this game
        ODDS_STAT_MAP = {'player_points_alternate': 'points', 'player_rebounds_alternate': 'rebounds', 'player_assists_alternate': 'assists'}
        player_odds_all = {}
        if ODDS_API_KEY:
            # find event id
            try:
                ev_resp = requests.get("https://api.the-odds-api.com/v4/sports/basketball_nba/events",
                    params={"apiKey": ODDS_API_KEY}, timeout=8)
                events_list = ev_resp.json() if ev_resp.status_code == 200 else []
                diag['odds_events_count'] = len(events_list)
            except Exception as ex:
                events_list = []; diag['odds_events_error'] = str(ex)
            eid = None
            gh = player_game['home']['name'].lower(); ga = player_game['away']['name'].lower()
            for ev in events_list:
                eh = ev.get('home_team','').lower(); ea = ev.get('away_team','').lower()
                if any(w in eh for w in gh.split() if len(w)>3) or any(w in ea for w in ga.split() if len(w)>3):
                    eid = ev['id']; break
            diag['matched_event_id'] = eid
            if eid:
                for mk, stat in ODDS_STAT_MAP.items():
                    try:
                        r2 = requests.get(f"https://api.the-odds-api.com/v4/sports/basketball_nba/events/{eid}/odds",
                            params={"apiKey": ODDS_API_KEY, "markets": mk, "regions": "us", "oddsFormat": "american"}, timeout=10)
                        diag[f'odds_{stat}_status'] = r2.status_code
                        if r2.status_code != 200: continue
                        for bm in r2.json().get('bookmakers', []):
                            for mkt in bm.get('markets', []):
                                for out in mkt.get('outcomes', []):
                                    if out.get('name','').lower() != 'over': continue
                                    pn = _ascii(out.get('description',''))
                                    ln = float(out.get('point', 0))
                                    player_odds_all.setdefault(pn, {}).setdefault(stat, {})[ln] = {'over': out.get('price'), 'bm': bm.get('title','')}
                    except Exception as ex:
                        diag[f'odds_{stat}_error'] = str(ex)

        MIN_LINE = {'points': 10.5, 'rebounds': 3.5, 'assists': 2.5}

        def score_debug(values_all, line, stat, last10_gids, game_opp_map, opponent_name, mins_by_gid):
            gid_set = set(last10_gids)
            last10_entries = sorted([(gid, v) for gid, v in values_all if gid in gid_set], key=lambda x: last10_gids.index(x[0]))
            last10_vals = [v for _, v in last10_entries]
            games_played = len(last10_vals)
            if not games_played: return False, "no_last10_data", {}
            avg_last10 = sum(last10_vals) / games_played
            mins_last10 = [mins_by_gid.get(gid, 0) for gid, _ in last10_entries]
            avg_mins = sum(mins_last10) / len(mins_last10) if mins_last10 else 0
            if line < MIN_LINE.get(stat, 0): return False, f"line {line} < min {MIN_LINE.get(stat,0)}", {}
            if games_played < 6:             return False, f"only {games_played} games in last10 (need 6)", {}
            if avg_last10 <= line:           return False, f"avg {round(avg_last10,1)} not above line {line}", {}
            if avg_mins < 20:                return False, f"avg_mins {round(avg_mins,1)} < 20", {}
            hit_count = sum(1 for v in last10_vals if v > line)
            hit_rate  = hit_count / games_played
            if hit_rate < 0.80: return False, f"hit_rate {round(hit_rate,2)} < 0.80 ({hit_count}/{games_played} games)", {'last10': last10_vals}
            opp_lower = opponent_name.lower()
            opp_words = [w for w in opp_lower.split() if len(w) > 3]
            vs_opp_vals = [v for gid, v in values_all if opp_lower in game_opp_map.get(gid,'') or any(w in game_opp_map.get(gid,'') for w in opp_words)]
            n_opp = len(vs_opp_vals)
            opp_hr = sum(1 for v in vs_opp_vals if v > line) / n_opp if n_opp else None
            if n_opp >= 4 and opp_hr < 0.50: return False, f"bad H2H vs opponent: {round(opp_hr,2)} on {n_opp} games", {}
            mid = len(last10_vals) // 2
            old_avg = sum(last10_vals[:mid]) / mid if mid else 0.001
            new_avg = sum(last10_vals[mid:]) / (games_played - mid) if games_played - mid else 0
            ratio = new_avg / max(old_avg, 0.001)
            if ratio < 0.80: return False, f"trend cooling: ratio {round(ratio,2)} < 0.80 (old_avg={round(old_avg,1)} new_avg={round(new_avg,1)})", {}
            p1 = 40 if hit_rate >= 1.0 else (35 if hit_rate >= 0.9 else 25)
            p2 = (30 if opp_hr and opp_hr >= 0.75 else 20) if n_opp >= 4 else (18 if n_opp >= 1 and opp_hr and opp_hr >= 0.5 else (12 if n_opp >= 1 else 20))
            p3 = 30 if ratio > 1.05 else (20 if ratio >= 0.90 else 10)
            total = p1 + p2 + p3
            if total < 75: return False, f"score {total} < 75 (p1={p1} p2={p2} p3={p3})", {}
            tier = 'ELITE LOCK' if total >= 90 else ('STRONG PICK' if total >= 80 else 'SOLID VALUE')
            return True, f"PASSED — score={total} tier={tier}", {'score': total, 'tier': tier, 'hit_rate': round(hit_rate,2), 'avg': round(avg_last10,1), 'last10': last10_vals}

        results = []
        for pid, pdata in player_found.items():
            player_odds = player_odds_all.get(pdata['ascii'], {})
            diag_key = f"odds_lines_for_{pdata['ascii']}"
            diag[diag_key] = {stat: sorted(lines.keys()) for stat, lines in player_odds.items()} if player_odds else "NO ODDS FOUND"
            for stat_name in ('points', 'rebounds', 'assists'):
                values_all = pdata[stat_name]
                lines_dict = player_odds.get(stat_name, {})
                if not lines_dict:
                    results.append({'player': pdata['name'], 'stat': stat_name, 'passed': False, 'reason': 'no odds available from Odds API', 'lines_checked': []})
                    continue
                for try_line in sorted(lines_dict.keys(), reverse=True)[:8]:
                    passed, reason, details = score_debug(values_all, try_line, stat_name, last10_gids, game_opp_map, player_opponent, pdata['mins'])
                    results.append({'player': pdata['name'], 'stat': stat_name, 'line': try_line, 'passed': passed, 'reason': reason, 'opponent': player_opponent, **details})

        self._send_json(200, {"diag": diag, "results": results})

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
