-- 001: teams, games, sync_log
-- Data comes from API-Sports (v2.nba.api-sports.io) via scheduled sync jobs.
-- The app only ever reads these tables; it never calls API-Sports on a user request.

-- ── Teams ─────────────────────────────────────────────────────────────────────
-- One row per NBA franchise. Seeded once from /teams, rarely changes.
CREATE TABLE IF NOT EXISTS teams (
  id             INTEGER PRIMARY KEY,          -- API-Sports team id
  nba_id         BIGINT UNIQUE,                -- NBA.com team id, used for official logos
  name           TEXT NOT NULL,                -- "LA Clippers"
  nickname       TEXT NOT NULL,                -- "Clippers"
  code           TEXT NOT NULL UNIQUE,         -- "LAC"
  city           TEXT,
  conference     TEXT,                         -- "East" | "West"
  division       TEXT,
  logo_url       TEXT,
  odds_api_name  TEXT UNIQUE,                  -- name as The Odds API spells it: "Los Angeles Clippers"
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Games ─────────────────────────────────────────────────────────────────────
-- Full season schedule plus live status and scores.
CREATE TABLE IF NOT EXISTS games (
  id             INTEGER PRIMARY KEY,          -- API-Sports game id
  season         SMALLINT NOT NULL,            -- 2026 = the 2026-27 season
  start_time     TIMESTAMPTZ NOT NULL,         -- tip off, stored in UTC
  game_date_et   DATE NOT NULL,                -- calendar day in US Eastern time, used for "today"
  status         TEXT NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'canceled')),
  status_detail  TEXT,                         -- e.g. "Q3 4:12", "Halftime"
  home_team_id   INTEGER NOT NULL REFERENCES teams(id),
  away_team_id   INTEGER NOT NULL REFERENCES teams(id),
  home_score     SMALLINT,
  away_score     SMALLINT,
  odds_event_id  TEXT,                         -- The Odds API event id, filled in by the odds sync
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_date_et ON games (game_date_et);
CREATE INDEX IF NOT EXISTS idx_games_season  ON games (season);
CREATE INDEX IF NOT EXISTS idx_games_status  ON games (status) WHERE status IN ('scheduled', 'live');

-- ── Sync log ──────────────────────────────────────────────────────────────────
-- Every sync job writes one row, so failures and API quota use are visible.
CREATE TABLE IF NOT EXISTS sync_log (
  id             BIGSERIAL PRIMARY KEY,
  job            TEXT NOT NULL,                -- "teams" | "schedule" | "scores" | ...
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  ok             BOOLEAN,
  api_requests   INTEGER NOT NULL DEFAULT 0,   -- API-Sports requests this run used
  rows_written   INTEGER NOT NULL DEFAULT 0,
  message        TEXT                          -- error text when ok = false
);

CREATE INDEX IF NOT EXISTS idx_sync_log_job_started ON sync_log (job, started_at DESC);

-- ── Access ────────────────────────────────────────────────────────────────────
-- The backend uses the service role key, which bypasses RLS. Enabling RLS with no
-- policies blocks the public anon key from reading or writing these tables directly.
ALTER TABLE teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE games    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
