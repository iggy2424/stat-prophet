from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs
import requests

SPORTRADAR_API_KEY = os.environ.get("SPORTRADAR_API_KEY", "")


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            qs = parse_qs(parsed.query)
            sport = qs.get('sport', ['NBA'])[0].upper()

            if sport == 'ALL':
                nba = self._fetch_nba()
                nfl = self._fetch_nfl()
                mlb = self._fetch_mlb()
                self._send_json(200, {"success": True, "NBA": nba, "NFL": nfl, "MLB": mlb})
            elif sport == 'NBA':
                self._send_json(200, {"success": True, "sport": "NBA", "games": self._fetch_nba()})
            elif sport == 'NFL':
                self._send_json(200, {"success": True, "sport": "NFL", "games": self._fetch_nfl()})
            elif sport == 'MLB':
                self._send_json(200, {"success": True, "sport": "MLB", "games": self._fetch_mlb()})
            else:
                self._send_json(400, {"error": "Invalid sport. Use NBA, NFL, MLB, or ALL"})
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def _fetch_nba(self):
        games = []
        today = datetime.utcnow()
        for i in range(5):
            day = today + timedelta(days=i)
            url = (
                f"https://api.sportradar.com/nba/trial/v8/en/games"
                f"/{day.year}/{day.month:02d}/{day.day:02d}/schedule.json"
                f"?api_key={SPORTRADAR_API_KEY}"
            )
            try:
                resp = requests.get(url, timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    for g in data.get('games', []):
                        status = g.get('status', '')
                        if status in ('scheduled', 'created', 'inprogress', 'halftime'):
                            home = g.get('home', {})
                            away = g.get('away', {})
                            games.append({
                                'id': g.get('id'),
                                'sport': 'NBA',
                                'status': status,
                                'scheduled': g.get('scheduled'),
                                'home': {
                                    'name': home.get('name', ''),
                                    'alias': home.get('alias', ''),
                                    'points': g.get('home_points')
                                },
                                'away': {
                                    'name': away.get('name', ''),
                                    'alias': away.get('alias', ''),
                                    'points': g.get('away_points')
                                }
                            })
            except Exception:
                pass
            if len(games) >= 5:
                break
        return games[:8]

    def _fetch_nfl(self):
        games = []
        today = datetime.utcnow()
        # Try postseason first, then regular season for 2024
        for season_type in ['PST', 'REG']:
            url = (
                f"https://api.sportradar.com/nfl/official/trial/v7/en/games"
                f"/2024/{season_type}/schedule.json"
                f"?api_key={SPORTRADAR_API_KEY}"
            )
            try:
                resp = requests.get(url, timeout=8)
                if resp.status_code != 200:
                    continue
                data = resp.json()
                for week in data.get('weeks', []):
                    for g in week.get('games', []):
                        status = g.get('status', '')
                        if status in ('scheduled', 'created', 'inprogress'):
                            sched = g.get('scheduled', '')
                            try:
                                dt = datetime.fromisoformat(sched.replace('Z', '+00:00'))
                                dt_naive = dt.replace(tzinfo=None)
                                if dt_naive >= today - timedelta(hours=4):
                                    home = g.get('home', {})
                                    away = g.get('away', {})
                                    scoring = g.get('scoring') or {}
                                    games.append({
                                        'id': g.get('id'),
                                        'sport': 'NFL',
                                        'status': status,
                                        'scheduled': sched,
                                        'home': {
                                            'name': home.get('name', ''),
                                            'alias': home.get('alias', ''),
                                            'points': scoring.get('home_points')
                                        },
                                        'away': {
                                            'name': away.get('name', ''),
                                            'alias': away.get('alias', ''),
                                            'points': scoring.get('away_points')
                                        }
                                    })
                            except Exception:
                                pass
                if games:
                    break
            except Exception:
                pass
        games.sort(key=lambda x: x.get('scheduled', ''))
        return games[:8]

    def _fetch_mlb(self):
        games = []
        today = datetime.utcnow()
        for i in range(10):
            day = today + timedelta(days=i)
            url = (
                f"https://api.sportradar.com/mlb/trial/v7/en/games"
                f"/{day.year}/{day.month:02d}/{day.day:02d}/schedule.json"
                f"?api_key={SPORTRADAR_API_KEY}"
            )
            try:
                resp = requests.get(url, timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    for g in data.get('games', []):
                        status = g.get('status', '')
                        if status in ('scheduled', 'created', 'inprogress'):
                            home = g.get('home', {})
                            away = g.get('away', {})
                            # MLB uses abbr_name or market for alias
                            home_alias = home.get('abbr_name') or (home.get('market', '')[:3].upper() if home.get('market') else '')
                            away_alias = away.get('abbr_name') or (away.get('market', '')[:3].upper() if away.get('market') else '')
                            games.append({
                                'id': g.get('id'),
                                'sport': 'MLB',
                                'status': status,
                                'scheduled': g.get('scheduled'),
                                'home': {
                                    'name': home.get('name', ''),
                                    'alias': home_alias,
                                    'points': g.get('home_runs')
                                },
                                'away': {
                                    'name': away.get('name', ''),
                                    'alias': away_alias,
                                    'points': g.get('away_runs')
                                }
                            })
            except Exception:
                pass
            if len(games) >= 5:
                break
        return games[:8]

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
