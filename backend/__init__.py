"""TrendBet backend: data sync jobs and API handlers.

Layout:
  config.py     environment settings
  timeutil.py   US Eastern dates and NBA season logic
  db.py         Supabase REST client
  apisports.py  API-Sports client (counts requests for sync_log)
  nba_teams.py  static per-team ids that API-Sports does not provide
  sync.py       jobs that copy API-Sports data into Supabase
  handlers.py   request handlers behind /api?type=...
"""
