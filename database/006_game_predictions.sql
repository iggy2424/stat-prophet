-- 006: game predictions
-- One prediction per game, written by the predictions job (backend/game_model.py) only
-- while the game has not started. Results are not stored here: the record is graded
-- from games.home_score / away_score once the game is finished.

CREATE TABLE IF NOT EXISTS game_predictions (
  game_id       INTEGER PRIMARY KEY REFERENCES games (id) ON DELETE CASCADE,
  model         TEXT NOT NULL,           -- e.g. 'ratings-v1'
  predicted_at  TIMESTAMPTZ NOT NULL,
  home_points   NUMERIC(5, 1) NOT NULL,
  away_points   NUMERIC(5, 1) NOT NULL,
  home_win_prob NUMERIC(4, 3) NOT NULL,  -- 0 to 1
  inputs        JSONB                    -- the ratings used, for checking a prediction later
);

CREATE INDEX IF NOT EXISTS idx_game_predictions_model ON game_predictions (model);

ALTER TABLE game_predictions ENABLE ROW LEVEL SECURITY;
