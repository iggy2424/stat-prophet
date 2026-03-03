-- ============================================================
-- Migration: Add api_sports_id to players table
-- Run this in Supabase SQL Editor before running
-- scripts/sync_api_sports_ids.py
--
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Add api_sports_id column (nullable integer)
ALTER TABLE players ADD COLUMN IF NOT EXISTS api_sports_id INTEGER;

-- 2. Index for fast lookups (partial — only rows where id is set)
CREATE INDEX IF NOT EXISTS idx_players_api_sports_id
    ON players(api_sports_id)
    WHERE api_sports_id IS NOT NULL;

-- Done. Now run:  python scripts/sync_api_sports_ids.py
