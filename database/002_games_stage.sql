-- 002: game stage
-- API-Sports stage: 1 = preseason, 2 = regular season (playoff values added when seen).
-- Preseason games must never count toward a player's form, so we keep the stage.
ALTER TABLE games ADD COLUMN IF NOT EXISTS stage SMALLINT;
CREATE INDEX IF NOT EXISTS idx_games_season_stage ON games (season, stage);
