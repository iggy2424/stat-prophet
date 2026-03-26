-- Permanent per-game box score cache for team defensive calculations
-- Run once in Supabase SQL editor
CREATE TABLE IF NOT EXISTS game_stats_cache (
  game_id   INTEGER  NOT NULL,
  team_id   INTEGER  NOT NULL,
  points    INTEGER  DEFAULT 0,
  rebounds  INTEGER  DEFAULT 0,
  assists   INTEGER  DEFAULT 0,
  game_date DATE,
  PRIMARY KEY (game_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_gsc_team_date ON game_stats_cache (team_id, game_date DESC);
