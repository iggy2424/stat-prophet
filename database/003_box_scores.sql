-- 003: players, box scores and team rankings
-- Filled by the "boxscores" sync job: 2 API-Sports requests per finished game
-- (/games/statistics for both teams, /players/statistics for every player).

-- ── Players ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id             INTEGER PRIMARY KEY,           -- API-Sports player id
  first_name     TEXT,
  last_name      TEXT,
  full_name      TEXT NOT NULL,
  search_name    TEXT NOT NULL,                 -- lowercase, no accents or Jr./III, for matching odds names
  team_id        INTEGER REFERENCES teams(id),  -- team in their most recent game
  position       TEXT,                          -- G | F | C, from their most recent game
  last_game_at   TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_players_team   ON players (team_id);
CREATE INDEX IF NOT EXISTS idx_players_search ON players (search_name);

-- ── Team box scores ───────────────────────────────────────────────────────────
-- One row per team per finished game. Season, stage and date are copied from games
-- so stats queries never need a join to filter out preseason.
CREATE TABLE IF NOT EXISTS team_game_stats (
  game_id        INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id        INTEGER NOT NULL REFERENCES teams(id),
  opponent_id    INTEGER NOT NULL REFERENCES teams(id),
  is_home        BOOLEAN NOT NULL,
  season         SMALLINT NOT NULL,
  stage          SMALLINT,
  game_date_et   DATE NOT NULL,
  points         SMALLINT, fgm SMALLINT, fga SMALLINT, ftm SMALLINT, fta SMALLINT,
  tpm            SMALLINT, tpa SMALLINT,
  off_reb        SMALLINT, def_reb SMALLINT, tot_reb SMALLINT,
  assists        SMALLINT, steals SMALLINT, blocks SMALLINT, turnovers SMALLINT, fouls SMALLINT,
  possessions    NUMERIC(5,1),                  -- fga + 0.44*fta - off_reb + turnovers
  PRIMARY KEY (game_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_tgs_team_season ON team_game_stats (team_id, season, stage, game_date_et DESC);

-- ── Player box scores ─────────────────────────────────────────────────────────
-- One row per player per finished game they appeared in.
CREATE TABLE IF NOT EXISTS player_game_stats (
  game_id        INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id      INTEGER NOT NULL REFERENCES players(id),
  team_id        INTEGER NOT NULL REFERENCES teams(id),
  opponent_id    INTEGER NOT NULL REFERENCES teams(id),
  is_home        BOOLEAN NOT NULL,
  season         SMALLINT NOT NULL,
  stage          SMALLINT,
  game_date_et   DATE NOT NULL,
  position       TEXT,
  minutes        NUMERIC(4,1) NOT NULL DEFAULT 0,
  points         SMALLINT, fgm SMALLINT, fga SMALLINT, ftm SMALLINT, fta SMALLINT,
  tpm            SMALLINT, tpa SMALLINT,
  off_reb        SMALLINT, def_reb SMALLINT, tot_reb SMALLINT,
  assists        SMALLINT, steals SMALLINT, blocks SMALLINT, turnovers SMALLINT, fouls SMALLINT,
  plus_minus     SMALLINT,
  PRIMARY KEY (game_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_pgs_player_date ON player_game_stats (player_id, game_date_et DESC);
CREATE INDEX IF NOT EXISTS idx_pgs_season      ON player_game_stats (season, stage);
CREATE INDEX IF NOT EXISTS idx_pgs_opponent    ON player_game_stats (opponent_id, season);

-- ── Which games have box scores ───────────────────────────────────────────────
ALTER TABLE games ADD COLUMN IF NOT EXISTS box_synced_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_games_box_pending ON games (season) WHERE status = 'finished' AND box_synced_at IS NULL;

-- ── Team rankings ─────────────────────────────────────────────────────────────
-- Calculated live from team_game_stats, regular season games only (stage 2).
-- window = 'season' uses every regular season game, 'last10' each team's 10 most recent.
-- Offence ranks: 1 = scores the most. Defence ranks: 1 = allows the fewest.
-- Ratings are points per 100 possessions; pace is possessions per game.
CREATE OR REPLACE VIEW team_rankings AS
WITH paired AS (
  SELECT t.*,
         o.points AS opp_points, o.tpm AS opp_tpm, o.tpa AS opp_tpa,
         o.tot_reb AS opp_reb, o.off_reb AS opp_off_reb, o.assists AS opp_assists,
         o.possessions AS opp_possessions,
         ROW_NUMBER() OVER (PARTITION BY t.team_id, t.season ORDER BY t.game_date_et DESC) AS recency
  FROM team_game_stats t
  JOIN team_game_stats o ON o.game_id = t.game_id AND o.team_id = t.opponent_id
  WHERE t.stage = 2
),
windows AS (
  SELECT 'season' AS window_name, * FROM paired
  UNION ALL
  SELECT 'last10', * FROM paired WHERE recency <= 10
),
agg AS (
  SELECT window_name, season, team_id,
         COUNT(*)                                        AS games,
         AVG(points)                                     AS pts,
         AVG(tpm)                                        AS tpm,
         SUM(tpm)::numeric / NULLIF(SUM(tpa), 0) * 100   AS tp_pct,
         AVG(tot_reb)                                    AS reb,
         AVG(off_reb)                                    AS oreb,
         AVG(assists)                                    AS ast,
         AVG(opp_points)                                 AS opp_pts,
         AVG(opp_tpm)                                    AS opp_tpm,
         SUM(opp_tpm)::numeric / NULLIF(SUM(opp_tpa), 0) * 100 AS opp_tp_pct,
         AVG(opp_reb)                                    AS opp_reb,
         AVG(opp_assists)                                AS opp_ast,
         AVG((possessions + opp_possessions) / 2)        AS pace,
         SUM(points)::numeric     / NULLIF(SUM(possessions), 0) * 100     AS off_rating,
         SUM(opp_points)::numeric / NULLIF(SUM(opp_possessions), 0) * 100 AS def_rating
  FROM windows
  GROUP BY window_name, season, team_id
)
SELECT a.window_name, a.season, a.team_id, tm.code, tm.name, a.games,
       ROUND(a.pts, 1) AS pts, ROUND(a.tpm, 1) AS tpm, ROUND(a.tp_pct, 1) AS tp_pct,
       ROUND(a.reb, 1) AS reb, ROUND(a.oreb, 1) AS oreb, ROUND(a.ast, 1) AS ast,
       ROUND(a.opp_pts, 1) AS opp_pts, ROUND(a.opp_tpm, 1) AS opp_tpm, ROUND(a.opp_tp_pct, 1) AS opp_tp_pct,
       ROUND(a.opp_reb, 1) AS opp_reb, ROUND(a.opp_ast, 1) AS opp_ast,
       ROUND(a.pace, 1) AS pace, ROUND(a.off_rating, 1) AS off_rating, ROUND(a.def_rating, 1) AS def_rating,
       RANK() OVER w_off_pts  AS pts_rank,
       RANK() OVER w_off_tpm  AS tpm_rank,
       RANK() OVER w_off_reb  AS reb_rank,
       RANK() OVER w_off_ast  AS ast_rank,
       RANK() OVER w_off_rtg  AS off_rating_rank,
       RANK() OVER w_def_pts  AS opp_pts_rank,
       RANK() OVER w_def_tpm  AS opp_tpm_rank,
       RANK() OVER w_def_reb  AS opp_reb_rank,
       RANK() OVER w_def_ast  AS opp_ast_rank,
       RANK() OVER w_def_rtg  AS def_rating_rank,
       RANK() OVER w_pace     AS pace_rank
FROM agg a JOIN teams tm ON tm.id = a.team_id
WINDOW
  w_off_pts AS (PARTITION BY a.window_name, a.season ORDER BY a.pts DESC),
  w_off_tpm AS (PARTITION BY a.window_name, a.season ORDER BY a.tpm DESC),
  w_off_reb AS (PARTITION BY a.window_name, a.season ORDER BY a.reb DESC),
  w_off_ast AS (PARTITION BY a.window_name, a.season ORDER BY a.ast DESC),
  w_off_rtg AS (PARTITION BY a.window_name, a.season ORDER BY a.off_rating DESC),
  w_def_pts AS (PARTITION BY a.window_name, a.season ORDER BY a.opp_pts ASC),
  w_def_tpm AS (PARTITION BY a.window_name, a.season ORDER BY a.opp_tpm ASC),
  w_def_reb AS (PARTITION BY a.window_name, a.season ORDER BY a.opp_reb ASC),
  w_def_ast AS (PARTITION BY a.window_name, a.season ORDER BY a.opp_ast ASC),
  w_def_rtg AS (PARTITION BY a.window_name, a.season ORDER BY a.def_rating ASC),
  w_pace    AS (PARTITION BY a.window_name, a.season ORDER BY a.pace DESC);

-- Views run with the caller's rights so RLS on the tables still applies
ALTER VIEW team_rankings SET (security_invoker = true);

-- ── Access ────────────────────────────────────────────────────────────────────
ALTER TABLE players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_game_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;
