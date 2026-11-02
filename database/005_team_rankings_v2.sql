-- 005: team rankings v2
-- Replaces the 003 view. Adds a 'blended' window for the early season, record, net rating,
-- FG%, rebound % and a rank on every stat.
--
-- Windows (regular season games only, stage 2):
--   season   every game this season
--   last10   each team's 10 most recent games this season
--   blended  this season plus last season, with last season counted as PRIOR_GAMES games.
--            Opening night = 100% last season, 10 games in = 50/50, 40 games in = 80/20.
--            Each of last season's games is weighted PRIOR_GAMES / (last season's games),
--            and every stat, including percentages, is a weighted total of the games.
--
-- Offence ranks: 1 = the most. Defence ranks: 1 = allows the fewest.
-- Ratings are points per 100 possessions; pace is possessions per game.
-- games / wins / losses always count this season only.

DROP VIEW IF EXISTS team_rankings;

CREATE VIEW team_rankings AS
WITH params AS (
  SELECT 10.0 AS prior_games
),
paired AS (
  SELECT t.season, t.team_id, t.game_date_et,
         t.points, t.fgm, t.fga, t.tpm, t.tpa, t.tot_reb, t.off_reb, t.assists, t.possessions,
         o.points AS opp_points, o.fgm AS opp_fgm, o.fga AS opp_fga, o.tpm AS opp_tpm, o.tpa AS opp_tpa,
         o.tot_reb AS opp_reb, o.off_reb AS opp_off_reb, o.assists AS opp_assists,
         o.possessions AS opp_possessions,
         (t.points > o.points)::int AS win,
         ROW_NUMBER() OVER (PARTITION BY t.team_id, t.season ORDER BY t.game_date_et DESC) AS recency,
         COUNT(*)     OVER (PARTITION BY t.team_id, t.season) AS season_games
  FROM team_game_stats t
  JOIN team_game_stats o ON o.game_id = t.game_id AND o.team_id = t.opponent_id
  WHERE t.stage = 2
),
seasons AS (
  SELECT DISTINCT season FROM games
),
windows AS (
  SELECT 'season' AS window_name, season AS target, 1.0 AS w, true AS is_current, p.* FROM paired p
  UNION ALL
  SELECT 'last10', season, 1.0, true, p.* FROM paired p WHERE recency <= 10
  UNION ALL
  SELECT 'blended', season, 1.0, true, p.* FROM paired p
  UNION ALL
  SELECT 'blended', s.season, (SELECT prior_games FROM params) / p.season_games, false, p.*
  FROM paired p JOIN seasons s ON p.season = s.season - 1
),
agg AS (
  SELECT window_name, target AS season, team_id,
         COUNT(*) FILTER (WHERE is_current)                         AS games,
         COALESCE(SUM(win) FILTER (WHERE is_current), 0)            AS wins,
         SUM(w)                                                  AS weight,
         SUM(w * points) / SUM(w)                                AS pts,
         SUM(w * fgm) / NULLIF(SUM(w * fga), 0) * 100            AS fg_pct,
         SUM(w * tpm) / SUM(w)                                   AS tpm,
         SUM(w * tpm) / NULLIF(SUM(w * tpa), 0) * 100            AS tp_pct,
         SUM(w * tot_reb) / SUM(w)                               AS reb,
         SUM(w * off_reb) / SUM(w)                               AS oreb,
         SUM(w * tot_reb) / NULLIF(SUM(w * (tot_reb + opp_reb)), 0) * 100 AS reb_pct,
         SUM(w * assists) / SUM(w)                               AS ast,
         SUM(w * opp_points) / SUM(w)                            AS opp_pts,
         SUM(w * opp_fgm) / NULLIF(SUM(w * opp_fga), 0) * 100    AS opp_fg_pct,
         SUM(w * opp_tpm) / SUM(w)                               AS opp_tpm,
         SUM(w * opp_tpm) / NULLIF(SUM(w * opp_tpa), 0) * 100    AS opp_tp_pct,
         SUM(w * opp_reb) / SUM(w)                               AS opp_reb,
         SUM(w * opp_assists) / SUM(w)                           AS opp_ast,
         SUM(w * (possessions + opp_possessions) / 2) / SUM(w)   AS pace,
         SUM(w * points)     / NULLIF(SUM(w * possessions), 0) * 100     AS off_rating,
         SUM(w * opp_points) / NULLIF(SUM(w * opp_possessions), 0) * 100 AS def_rating
  FROM windows
  GROUP BY window_name, target, team_id
),
rated AS (
  SELECT *, off_rating - def_rating AS net_rating FROM agg
)
SELECT a.window_name, a.season, a.team_id, tm.code, tm.name, tm.logo_url,
       a.games, a.wins, a.games - a.wins AS losses,
       ROUND(a.games / a.weight * 100) AS current_share,  -- % of the numbers that come from this season
       ROUND(a.pts, 1) AS pts, ROUND(a.fg_pct, 1) AS fg_pct, ROUND(a.tpm, 1) AS tpm, ROUND(a.tp_pct, 1) AS tp_pct,
       ROUND(a.reb, 1) AS reb, ROUND(a.oreb, 1) AS oreb, ROUND(a.reb_pct, 1) AS reb_pct, ROUND(a.ast, 1) AS ast,
       ROUND(a.opp_pts, 1) AS opp_pts, ROUND(a.opp_fg_pct, 1) AS opp_fg_pct,
       ROUND(a.opp_tpm, 1) AS opp_tpm, ROUND(a.opp_tp_pct, 1) AS opp_tp_pct,
       ROUND(a.opp_reb, 1) AS opp_reb, ROUND(a.opp_ast, 1) AS opp_ast,
       ROUND(a.pace, 1) AS pace, ROUND(a.off_rating, 1) AS off_rating,
       ROUND(a.def_rating, 1) AS def_rating, ROUND(a.net_rating, 1) AS net_rating,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.pts DESC)         AS pts_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.fg_pct DESC)      AS fg_pct_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.tpm DESC)         AS tpm_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.tp_pct DESC)      AS tp_pct_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.reb DESC)         AS reb_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.oreb DESC)        AS oreb_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.reb_pct DESC)     AS reb_pct_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.ast DESC)         AS ast_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.opp_pts ASC)      AS opp_pts_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.opp_fg_pct ASC)   AS opp_fg_pct_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.opp_tpm ASC)      AS opp_tpm_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.opp_tp_pct ASC)   AS opp_tp_pct_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.opp_reb ASC)      AS opp_reb_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.opp_ast ASC)      AS opp_ast_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.pace DESC)        AS pace_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.off_rating DESC)  AS off_rating_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.def_rating ASC)   AS def_rating_rank,
       RANK() OVER (PARTITION BY a.window_name, a.season ORDER BY a.net_rating DESC)  AS net_rating_rank
FROM rated a JOIN teams tm ON tm.id = a.team_id;

-- Views run with the caller's rights so RLS on the tables still applies
ALTER VIEW team_rankings SET (security_invoker = true);
