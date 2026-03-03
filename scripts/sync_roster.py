"""
NBA Roster Sync - Sportradar to Supabase
=========================================
Prerequisites:
  1. Run database/sportradar_sync_migration.sql in Supabase SQL Editor
  2. pip install requests  (already installed if you have run the app)

Usage:
  python scripts/sync_roster.py

Re-run any time to refresh rosters: after trades, at the start of each season, etc.
Rate limit: Sportradar trial = 1 req/sec, so this takes ~35 seconds total.
"""

import os
import sys
import time
import requests


# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if not os.path.exists(env_path):
        print('ERROR: .env not found at ' + os.path.abspath(env_path))
        sys.exit(1)
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip())

load_env()

SR_KEY = os.environ.get('SPORTRADAR_NBA_KEY', '')
SB_URL = os.environ.get('SUPABASE_URL', '')
SB_KEY = os.environ.get('SUPABASE_KEY', '')

if not all([SR_KEY, SB_URL, SB_KEY]):
    print('ERROR: Missing SPORTRADAR_NBA_KEY, SUPABASE_URL or SUPABASE_KEY in .env')
    sys.exit(1)

SR_BASE = 'https://api.sportradar.com/nba/trial/v8/en'

SB_HEADERS = {
    'apikey':        SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'resolution=merge-duplicates',
}


# ---------------------------------------------------------------------------
# Sportradar helpers
# ---------------------------------------------------------------------------

def sr_get(endpoint):
    url = SR_BASE + '/' + endpoint + '.json?api_key=' + SR_KEY
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

def sb_upsert(table, rows, on_conflict):
    """Insert or update rows using sportradar_id as the conflict key."""
    url = SB_URL + '/rest/v1/' + table + '?on_conflict=' + on_conflict
    r = requests.post(url, json=rows, headers=SB_HEADERS, timeout=30)
    if r.status_code not in (200, 201):
        print('\n  FAIL Supabase error ' + str(r.status_code) + ': ' + r.text[:400])
        return False
    return True

def sb_select(table, query=''):
    url = SB_URL + '/rest/v1/' + table + '?' + query
    r = requests.get(url, headers=SB_HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print('=' * 52)
    print('  NBA Roster Sync  |  Sportradar to Supabase')
    print('=' * 52)

    # Step 1: Fetch league hierarchy (all 30 teams)
    print('\n[1/3] Fetching league hierarchy from Sportradar...')
    try:
        hierarchy = sr_get('league/hierarchy')
    except requests.exceptions.HTTPError as e:
        print('ERROR: Sportradar returned ' + str(e.response.status_code))
        print('       Check that your SPORTRADAR_NBA_KEY is correct.')
        sys.exit(1)

    # API structure: { "league": {...}, "conferences": [...] }
    conferences = hierarchy.get('conferences', [])
    if not conferences:
        print('ERROR: No conference data in hierarchy response.')
        print('Raw keys:', list(hierarchy.keys()))
        sys.exit(1)

    teams_payload = []
    team_order    = []  # list of (sr_id, city, name)

    for conf in conferences:
        # Store short conference code to match existing NFL/MLB format (VARCHAR constraint)
        # Sportradar returns "EASTERN CONFERENCE" / "WESTERN CONFERENCE"
        conf_alias = conf.get('alias', conf.get('name', ''))
        conf_name  = 'EAST' if 'EAST' in conf_alias.upper() else 'WEST'
        for div in conf.get('divisions', []):
            div_name = div.get('name', '')  # e.g. "Southeast", "Atlantic" (all <=10 chars)
            for t in div.get('teams', []):
                sr_id = t['id']
                teams_payload.append({
                    'sportradar_id': sr_id,
                    'name':         t.get('name', ''),
                    'city':         t.get('market', ''),
                    'abbreviation': t.get('alias', ''),
                    'conference':   conf_name,
                    'division':     div_name,
                    'sport':        'NBA',
                })
                team_order.append((sr_id, t.get('market', ''), t.get('name', '')))

    print('  Found ' + str(len(teams_payload)) + ' NBA teams')

    # Step 2: Upsert teams into Supabase, then load their DB ids
    print('\n[2/3] Syncing teams to Supabase...')
    if not sb_upsert('teams', teams_payload, 'sportradar_id'):
        sys.exit(1)
    print('  OK ' + str(len(teams_payload)) + ' teams synced')

    # Fetch back the integer DB ids so we can link players to their team
    db_teams   = sb_select('teams', 'sport=eq.NBA&select=id,sportradar_id')
    team_db_id = {t['sportradar_id']: t['id'] for t in db_teams}
    print('  OK Loaded ' + str(len(team_db_id)) + ' team IDs from Supabase')

    # Step 3: Fetch each team's roster and build player list
    print('\n[3/3] Fetching rosters (1 req/sec - approx ' + str(len(team_order)) + ' seconds)...')
    time.sleep(2.0)  # ensure gap after hierarchy call before first team profile call
    all_players = []

    for idx, (sr_id, city, name) in enumerate(team_order, 1):
        label = city + ' ' + name
        prefix = '  [' + str(idx).zfill(2) + '/' + str(len(team_order)) + '] '
        print(prefix + label.ljust(28), end='', flush=True)

        try:
            profile = sr_get('teams/' + sr_id + '/profile')
            players = profile.get('players', [])
            db_tid  = team_db_id.get(sr_id)

            for p in players:
                full_name = (
                    p.get('full_name') or
                    (p.get('first_name', '').strip() + ' ' + p.get('last_name', '').strip()).strip()
                )
                if not full_name:
                    continue

                all_players.append({
                    'sportradar_id': p['id'],
                    'name':         full_name,
                    'position':     p.get('primary_position') or p.get('position', ''),
                    'team_id':      db_tid,
                    'sport':        'NBA',
                })

            print(str(len(players)) + ' players')

        except requests.exceptions.HTTPError as e:
            print('HTTP ' + str(e.response.status_code) + ' - skipped')
        except Exception as e:
            print('ERROR: ' + str(e))

        # Respect 1 req/sec rate limit on trial keys
        if idx < len(team_order):
            time.sleep(1.1)

    print('\n  Total players collected: ' + str(len(all_players)))

    # Upsert players in batches of 100
    print('  Upserting players to Supabase...')
    batch_size = 100
    n_batches  = max(1, (len(all_players) + batch_size - 1) // batch_size)

    for i in range(0, len(all_players), batch_size):
        batch = all_players[i : i + batch_size]
        if sb_upsert('players', batch, 'sportradar_id'):
            bn = i // batch_size + 1
            print('  OK Batch ' + str(bn) + '/' + str(n_batches) + ' (' + str(len(batch)) + ' players)')

    # Done
    print('\n' + '=' * 52)
    print('  SYNC COMPLETE')
    print('  Teams:   ' + str(len(teams_payload)))
    print('  Players: ' + str(len(all_players)))
    print('=' * 52)
    print()
    print('  The app now shows the full NBA roster in player search.')
    print('  Re-run after trades or at the start of each new season.')


if __name__ == '__main__':
    main()
