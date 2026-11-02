-- 004: player stats move from API-Sports to BallDontLie
-- API-Sports player box scores were missing players in 59% of games (see REBUILD.md).
-- Team totals stay on API-Sports. Player rows are now filled by the "players" sync job.

-- The old rows use API-Sports player ids, so they are cleared and reloaded with BallDontLie ids
TRUNCATE player_game_stats, players;

COMMENT ON COLUMN players.id IS 'BallDontLie player id';
ALTER TABLE players ADD COLUMN IF NOT EXISTS jersey_number TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS height        TEXT;

-- games.box_synced_at now means team totals only; player stats have their own marker
COMMENT ON COLUMN games.box_synced_at IS 'team_game_stats saved (API-Sports)';
ALTER TABLE games ADD COLUMN IF NOT EXISTS bdl_id            INTEGER UNIQUE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS players_synced_at TIMESTAMPTZ;  -- player_game_stats saved and verified (BallDontLie)
CREATE INDEX IF NOT EXISTS idx_games_players_pending ON games (season)
  WHERE status = 'finished' AND players_synced_at IS NULL;
