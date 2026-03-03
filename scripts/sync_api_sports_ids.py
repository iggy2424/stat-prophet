"""
API-Sports ID Sync
==================
Matches every NBA player in Supabase to their API-Sports player ID and
writes it back into the api_sports_id column.

After this runs, the backend can do a single Supabase lookup to get the
API-Sports ID instead of searching by name on every request — eliminating
name-mismatch bugs and ghost-duplicate issues.

Prerequisites:
  1. Run database/add_api_sports_id.sql in Supabase SQL Editor
  2. pip install requests  (already installed if you have run the app)

Usage:
  python scripts/sync_api_sports_ids.py           # skip already-filled rows
  python scripts/sync_api_sports_ids.py --force   # re-check all players

Re-run after trades or new signings.
"""

import os
import sys
import time
import unicodedata
import argparse
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

AS_KEY  = os.environ.get('API_SPORTS_KEY', '')
SB_URL  = os.environ.get('SUPABASE_URL', '')
SB_KEY  = os.environ.get('SUPABASE_KEY', '')

if not all([AS_KEY, SB_URL, SB_KEY]):
    print('ERROR: Missing API_SPORTS_KEY, SUPABASE_URL or SUPABASE_KEY in .env')
    sys.exit(1)

AS_HEADERS = {'x-apisports-key': AS_KEY}
SB_HEADERS = {
    'apikey':        SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ascii(s):
    return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode('ascii').lower().strip()


def sb_get_players(force=False):
    """Fetch NBA players from Supabase. If not force, only those missing api_sports_id."""
    if force:
        url = f"{SB_URL}/rest/v1/players?sport=eq.NBA&select=id,name,api_sports_id&order=name"
    else:
        url = f"{SB_URL}/rest/v1/players?sport=eq.NBA&api_sports_id=is.null&select=id,name,api_sports_id&order=name"
    r = requests.get(url, headers=SB_HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_update_player(db_id, api_sports_id):
    """Write api_sports_id back to Supabase for one player."""
    url = f"{SB_URL}/rest/v1/players?id=eq.{db_id}"
    r = requests.patch(url, json={'api_sports_id': api_sports_id}, headers=SB_HEADERS, timeout=10)
    return r.status_code in (200, 204)


def find_api_sports_id(player_name):
    """
    Find all API-Sports IDs that match player_name (full-name match first,
    long-surname fallback second). Returns list of candidate IDs in order of
    preference, or [] if nothing found.
    """
    name_parts  = player_name.strip().split()
    last_name   = name_parts[-1] if name_parts else player_name
    first_name  = name_parts[0] if len(name_parts) > 1 else ''
    last_ascii  = _ascii(last_name)
    first_ascii = _ascii(first_name)
    pl_lower    = player_name.lower().strip()
    pl_ascii    = _ascii(player_name)

    candidate_ids = []

    # Pass 1 – search by last name, then first name; exact full-name match only
    for search_term in filter(None, [last_ascii, first_ascii]):
        try:
            r = requests.get(
                'https://v2.nba.api-sports.io/players',
                params={'search': search_term},
                headers=AS_HEADERS,
                timeout=8,
            )
            for p in r.json().get('response', []):
                full = (p.get('firstname', '') + ' ' + p.get('lastname', '')).lower().strip()
                if (full == pl_lower or _ascii(full) == pl_ascii) and p['id'] not in candidate_ids:
                    candidate_ids.append(p['id'])
        except Exception:
            pass

    # Pass 2 – last-name-only fallback for unique long surnames (> 7 chars)
    if not candidate_ids and len(last_ascii) > 7:
        try:
            r = requests.get(
                'https://v2.nba.api-sports.io/players',
                params={'search': last_ascii},
                headers=AS_HEADERS,
                timeout=8,
            )
            for p in r.json().get('response', []):
                if _ascii(p.get('lastname', '')) == last_ascii and p['id'] not in candidate_ids:
                    candidate_ids.append(p['id'])
        except Exception:
            pass

    return candidate_ids


def pick_best_candidate(candidate_ids):
    """
    Among multiple matching IDs, return the one that has actual season-2025
    stats. Skips ghost/duplicate entries with 0 records.
    """
    for pid in candidate_ids:
        try:
            r = requests.get(
                'https://v2.nba.api-sports.io/players/statistics',
                params={'id': pid, 'season': 2025},
                headers=AS_HEADERS,
                timeout=8,
            )
            games = r.json().get('response', [])
            played = [
                g for g in games
                if int(str(g.get('min', '0') or '0').split(':')[0]) > 0
            ]
            if played:
                return pid
        except Exception:
            pass
    # No ID had 2025 data — return first candidate anyway (might be an
    # inactive player or a season-2024 rookie not yet in 2025 data)
    return candidate_ids[0] if candidate_ids else None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    sys.stdout.reconfigure(encoding='utf-8')

    parser = argparse.ArgumentParser(description='Sync API-Sports IDs into Supabase players table')
    parser.add_argument('--force', action='store_true', help='Re-check all players, even those already filled')
    args = parser.parse_args()

    print('=' * 56)
    print('  API-Sports ID Sync  ->  Supabase players table')
    print('=' * 56)

    print('\n[1/3] Fetching NBA players from Supabase...')
    players = sb_get_players(force=args.force)
    print(f'  {len(players)} players to process'
          + (' (--force: all players)' if args.force else ' (missing api_sports_id only)'))

    if not players:
        print('\n  Nothing to do. All players already have api_sports_id.')
        print('  Run with --force to re-check all players.')
        return

    print(f'\n[2/3] Resolving API-Sports IDs ({len(players)} players)...')
    found = 0
    not_found = []

    for idx, p in enumerate(players, 1):
        name  = p['name']
        db_id = p['id']
        prefix = f'  [{str(idx).zfill(3)}/{len(players)}] {name:<30}'

        candidates = find_api_sports_id(name)
        if not candidates:
            print(prefix + 'NOT FOUND')
            not_found.append(name)
            time.sleep(0.3)
            continue

        best_id = pick_best_candidate(candidates)
        if best_id is None:
            print(prefix + f'candidates={candidates} but no stats data')
            not_found.append(name)
            time.sleep(0.5)
            continue

        ok = sb_update_player(db_id, best_id)
        status = 'OK' if ok else 'DB_FAIL'
        dupe = f' (picked from {candidates})' if len(candidates) > 1 else ''
        print(prefix + f'{status}  api_sports_id={best_id}{dupe}')
        if ok:
            found += 1

        # Respect API-Sports rate limit — 10 req/s on Pro plan
        time.sleep(0.15)

    print(f'\n[3/3] Results')
    print(f'  Matched:   {found}')
    print(f'  Not found: {len(not_found)}')
    if not_found:
        print('  Unmatched players:')
        for name in not_found:
            print(f'    - {name}')
    print('\n' + '=' * 56)
    print('  SYNC COMPLETE')
    print('  The backend will now use stored IDs for stats lookups.')
    print('  Re-run after trades or new signings.')
    print('=' * 56)


if __name__ == '__main__':
    main()
