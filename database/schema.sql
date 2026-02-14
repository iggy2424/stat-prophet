-- Stat Prophet Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- PLAYERS TABLE
-- Cache player info from API-Sports
-- ============================================
CREATE TABLE IF NOT EXISTS players (
    id BIGINT PRIMARY KEY,  -- API-Sports player ID
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    team_id BIGINT,
    team_name VARCHAR(100),
    position VARCHAR(20),
    jersey_number INTEGER,
    height VARCHAR(20),
    weight VARCHAR(20),
    birth_date DATE,
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for searching players
CREATE INDEX IF NOT EXISTS idx_players_name ON players USING gin(to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    id BIGINT PRIMARY KEY,  -- API-Sports team ID
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(100),
    code VARCHAR(10),
    city VARCHAR(100),
    logo_url TEXT,
    conference VARCHAR(20),
    division VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PLAYER_STATS TABLE
-- Store per-game statistics
-- ============================================
CREATE TABLE IF NOT EXISTS player_stats (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id),
    game_id BIGINT NOT NULL,
    game_date DATE NOT NULL,
    opponent_id BIGINT,
    is_home BOOLEAN DEFAULT TRUE,
    
    -- Basic stats
    minutes INTEGER,
    points INTEGER,
    rebounds INTEGER,
    offensive_rebounds INTEGER,
    defensive_rebounds INTEGER,
    assists INTEGER,
    steals INTEGER,
    blocks INTEGER,
    turnovers INTEGER,
    personal_fouls INTEGER,
    
    -- Shooting stats
    fgm INTEGER,  -- Field goals made
    fga INTEGER,  -- Field goals attempted
    fg_pct DECIMAL(5,2),
    tpm INTEGER,  -- Three pointers made
    tpa INTEGER,  -- Three pointers attempted
    tp_pct DECIMAL(5,2),
    ftm INTEGER,  -- Free throws made
    fta INTEGER,  -- Free throws attempted
    ft_pct DECIMAL(5,2),
    
    -- Advanced
    plus_minus INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(player_id, game_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_date ON player_stats(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_date ON player_stats(player_id, game_date DESC);

-- ============================================
-- PREDICTIONS TABLE
-- Store predictions and track accuracy
-- ============================================
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id),
    game_id BIGINT,
    game_date DATE NOT NULL,
    
    -- Prediction details
    stat_type VARCHAR(50) NOT NULL,  -- points, rebounds, assists, etc.
    line DECIMAL(5,1) NOT NULL,
    predicted_direction VARCHAR(10) NOT NULL,  -- OVER, UNDER
    ml_probability DECIMAL(5,2),
    ml_confidence VARCHAR(20),
    claude_verdict VARCHAR(20),
    claude_confidence INTEGER,
    
    -- Actual result (filled in after game)
    actual_value DECIMAL(5,1),
    hit BOOLEAN,  -- Did the prediction hit?
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_predictions_player ON predictions(player_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_hit ON predictions(hit) WHERE hit IS NOT NULL;

-- ============================================
-- SEASON_AVERAGES TABLE
-- Cache calculated season averages
-- ============================================
CREATE TABLE IF NOT EXISTS season_averages (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id),
    season INTEGER NOT NULL,
    
    games_played INTEGER,
    ppg DECIMAL(4,1),
    rpg DECIMAL(4,1),
    apg DECIMAL(4,1),
    spg DECIMAL(4,1),
    bpg DECIMAL(4,1),
    topg DECIMAL(4,1),  -- Turnovers per game
    mpg DECIMAL(4,1),
    
    fg_pct DECIMAL(4,1),
    tp_pct DECIMAL(4,1),
    ft_pct DECIMAL(4,1),
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, season)
);

CREATE INDEX IF NOT EXISTS idx_season_avg_player ON season_averages(player_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_season_averages_updated_at
    BEFORE UPDATE ON season_averages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to calculate player's recent average
CREATE OR REPLACE FUNCTION get_player_recent_avg(
    p_player_id BIGINT,
    p_stat_type VARCHAR,
    p_last_n INTEGER DEFAULT 5
)
RETURNS DECIMAL AS $$
DECLARE
    result DECIMAL;
BEGIN
    EXECUTE format(
        'SELECT AVG(%I) FROM (
            SELECT %I FROM player_stats 
            WHERE player_id = $1 
            ORDER BY game_date DESC 
            LIMIT $2
        ) sub',
        p_stat_type, p_stat_type
    ) INTO result USING p_player_id, p_last_n;
    
    RETURN COALESCE(result, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get hit rate for predictions
CREATE OR REPLACE FUNCTION get_prediction_accuracy(
    p_stat_type VARCHAR DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_predictions BIGINT,
    hits BIGINT,
    hit_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_predictions,
        COUNT(*) FILTER (WHERE hit = true)::BIGINT as hits,
        ROUND(
            COUNT(*) FILTER (WHERE hit = true)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 
            1
        ) as hit_rate
    FROM predictions
    WHERE 
        hit IS NOT NULL
        AND game_date >= CURRENT_DATE - p_days
        AND (p_stat_type IS NULL OR stat_type = p_stat_type);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View for prediction performance by stat type
CREATE OR REPLACE VIEW prediction_performance AS
SELECT 
    stat_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE hit = true) as hits,
    ROUND(
        COUNT(*) FILTER (WHERE hit = true)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 
        1
    ) as hit_rate,
    ROUND(AVG(ml_probability), 1) as avg_ml_confidence
FROM predictions
WHERE hit IS NOT NULL
GROUP BY stat_type
ORDER BY hit_rate DESC;

-- View for recent predictions
CREATE OR REPLACE VIEW recent_predictions AS
SELECT 
    p.id,
    pl.full_name as player_name,
    p.stat_type,
    p.line,
    p.predicted_direction,
    p.ml_probability,
    p.actual_value,
    p.hit,
    p.game_date
FROM predictions p
JOIN players pl ON p.player_id = pl.id
ORDER BY p.game_date DESC, p.created_at DESC
LIMIT 100;

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================
-- Enable if you want to restrict access

-- ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Example policy for authenticated users
-- CREATE POLICY "Allow all for authenticated" ON players
--     FOR ALL TO authenticated USING (true);
