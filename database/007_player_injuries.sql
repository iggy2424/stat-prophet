-- 007: player injuries (BallDontLie /v1/player_injuries)
-- BallDontLie only gives the injury list as it is now, so we keep two tables:
--   player_injuries  the current list, one row per player, replaced on every sync
--   injury_reports   every change we saw, with the time we saw it. A player dropping off
--                    the list is recorded as status 'Cleared'. Tests that need to know what
--                    was known before a game read this table, never the current list.
-- player_id is the BallDontLie player id (same as players.id) with no foreign key: some
-- injured players have not played a game in our data yet.

CREATE TABLE IF NOT EXISTS player_injuries (
  player_id     INTEGER PRIMARY KEY,
  player_name   TEXT NOT NULL,
  team_id       INTEGER REFERENCES teams (id),
  status        TEXT NOT NULL,          -- as BallDontLie sends it: Out, Doubtful, Questionable, Probable, Day-To-Day, Available
  return_date   DATE,
  description   TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL,   -- when this status first appeared
  updated_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_player_injuries_team ON player_injuries (team_id);

CREATE TABLE IF NOT EXISTS injury_reports (
  id           BIGSERIAL PRIMARY KEY,
  player_id    INTEGER NOT NULL,
  player_name  TEXT NOT NULL,
  team_id      INTEGER REFERENCES teams (id),
  status       TEXT NOT NULL,           -- 'Out', 'Day-To-Day' or 'Cleared'
  return_date  DATE,
  description  TEXT,
  seen_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_injury_reports_player ON injury_reports (player_id, seen_at);

ALTER TABLE player_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE injury_reports  ENABLE ROW LEVEL SECURITY;

-- Each player's last 10 games (regular season and playoffs), to show how much an
-- injured player usually plays
CREATE OR REPLACE VIEW player_recent_form AS
SELECT player_id,
       COUNT(*)                 AS games,
       ROUND(AVG(minutes), 1)   AS minutes,
       ROUND(AVG(points), 1)    AS points,
       MAX(game_date_et)        AS last_game
FROM (
  SELECT player_id, minutes, points, game_date_et,
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY game_date_et DESC) AS recency
  FROM player_game_stats
  WHERE stage > 1
) recent
WHERE recency <= 10
GROUP BY player_id;

ALTER VIEW player_recent_form SET (security_invoker = true);
