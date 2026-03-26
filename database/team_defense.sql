-- Team defensive cache: opponent stats allowed per game (rolling last 20 games)
-- Run once in Supabase SQL editor
CREATE TABLE IF NOT EXISTS team_defense (
  id           BIGSERIAL PRIMARY KEY,
  team_id      INTEGER     NOT NULL,
  team_name    TEXT        NOT NULL,
  team_code    TEXT,
  stat         TEXT        NOT NULL,   -- 'points' | 'rebounds' | 'assists'
  avg_allowed  NUMERIC     NOT NULL,   -- avg stat allowed per game to opponents
  league_avg   NUMERIC,                -- league-wide avg for context
  def_rank     NUMERIC,                -- 0.0 = best defense, 1.0 = worst
  games_used   INTEGER,                -- number of games in sample
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, stat)
);
