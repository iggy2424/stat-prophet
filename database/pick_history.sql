-- Pick History table
-- Stores every AI pick shown to users, with win/loss result resolved after game finishes.
-- Run once in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS pick_history (
  id           BIGSERIAL PRIMARY KEY,
  pick_date    DATE        NOT NULL,
  game_id      INTEGER,
  player_name  TEXT        NOT NULL,
  team_abbrev  TEXT,
  opponent     TEXT,
  stat         TEXT        NOT NULL,   -- 'points' | 'rebounds' | 'assists'
  line         NUMERIC     NOT NULL,
  over_odds    INTEGER,
  bookmaker    TEXT,
  tier         TEXT,                   -- 'ELITE LOCK' | 'STRONG PICK' | 'SOLID VALUE'
  score        INTEGER,
  result       TEXT        DEFAULT NULL,  -- NULL=pending | 'win' | 'loss'
  actual_value NUMERIC,                   -- actual stat value after game
  scheduled    TEXT,                      -- ISO timestamp of game start
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pick_date, player_name, stat)
);

CREATE INDEX IF NOT EXISTS idx_pick_history_date    ON pick_history(pick_date DESC);
CREATE INDEX IF NOT EXISTS idx_pick_history_result  ON pick_history(result) WHERE result IS NULL;
