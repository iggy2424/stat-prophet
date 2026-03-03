-- ============================================================
-- Sportradar Roster Sync Migration
-- Run this in Supabase SQL Editor BEFORE running
-- scripts/sync_roster.py
--
-- Safe to run multiple times (all statements are idempotent).
-- NFL and MLB data is NOT touched.
-- ============================================================


-- 1. Add sportradar_id to teams
--    This is the unique key used to upsert Sportradar data.
ALTER TABLE teams ADD COLUMN IF NOT EXISTS sportradar_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_sportradar_id_key'
  ) THEN
    ALTER TABLE teams ADD CONSTRAINT teams_sportradar_id_key UNIQUE (sportradar_id);
  END IF;
END $$;


-- 2. Add sportradar_id to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS sportradar_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_sportradar_id_key'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_sportradar_id_key UNIQUE (sportradar_id);
  END IF;
END $$;


-- 3. Make players.id auto-generate for new rows from Sportradar
--    (Existing NFL/MLB IDs are preserved; new NBA IDs continue from MAX+1)
CREATE SEQUENCE IF NOT EXISTS players_id_seq;

DO $$
DECLARE max_id BIGINT;
BEGIN
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM players;
  PERFORM setval('players_id_seq', max_id + 1, false);
END $$;

ALTER TABLE players ALTER COLUMN id SET DEFAULT nextval('players_id_seq');


-- 4. Make teams.id auto-generate for new rows from Sportradar
CREATE SEQUENCE IF NOT EXISTS teams_id_seq;

DO $$
DECLARE max_id BIGINT;
BEGIN
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM teams;
  PERFORM setval('teams_id_seq', max_id + 1, false);
END $$;

ALTER TABLE teams ALTER COLUMN id SET DEFAULT nextval('teams_id_seq');


-- 5. Clear any existing NBA teams and players so the sync starts clean.
--    NFL (ids 1001-1032) and MLB (ids 2001-2030) are unaffected.
DELETE FROM players WHERE sport = 'NBA' OR sport IS NULL;
DELETE FROM teams   WHERE sport = 'NBA' OR sport IS NULL;


-- Done. Now run:  python scripts/sync_roster.py
