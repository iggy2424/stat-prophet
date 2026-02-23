-- ============================================
-- NFL + MLB Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add sport column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport VARCHAR(10) DEFAULT 'NBA';

-- Mark all existing teams as NBA
UPDATE teams SET sport = 'NBA' WHERE sport IS NULL OR sport = 'NBA';

-- Step 2: Insert NFL Teams (with division)
INSERT INTO teams (id, name, city, abbreviation, conference, division, sport) VALUES
-- AFC East
(1001, 'Bills',      'Buffalo',       'BUF', 'AFC', 'AFC East',  'NFL'),
(1002, 'Dolphins',   'Miami',         'MIA', 'AFC', 'AFC East',  'NFL'),
(1003, 'Patriots',   'New England',   'NE',  'AFC', 'AFC East',  'NFL'),
(1004, 'Jets',       'New York',      'NYJ', 'AFC', 'AFC East',  'NFL'),
-- AFC North
(1005, 'Ravens',     'Baltimore',     'BAL', 'AFC', 'AFC North', 'NFL'),
(1006, 'Bengals',    'Cincinnati',    'CIN', 'AFC', 'AFC North', 'NFL'),
(1007, 'Browns',     'Cleveland',     'CLE', 'AFC', 'AFC North', 'NFL'),
(1008, 'Steelers',   'Pittsburgh',    'PIT', 'AFC', 'AFC North', 'NFL'),
-- AFC South
(1009, 'Texans',     'Houston',       'HOU', 'AFC', 'AFC South', 'NFL'),
(1010, 'Colts',      'Indianapolis',  'IND', 'AFC', 'AFC South', 'NFL'),
(1011, 'Jaguars',    'Jacksonville',  'JAX', 'AFC', 'AFC South', 'NFL'),
(1012, 'Titans',     'Tennessee',     'TEN', 'AFC', 'AFC South', 'NFL'),
-- AFC West
(1013, 'Broncos',    'Denver',        'DEN', 'AFC', 'AFC West',  'NFL'),
(1014, 'Chiefs',     'Kansas City',   'KC',  'AFC', 'AFC West',  'NFL'),
(1015, 'Raiders',    'Las Vegas',     'LV',  'AFC', 'AFC West',  'NFL'),
(1016, 'Chargers',   'Los Angeles',   'LAC', 'AFC', 'AFC West',  'NFL'),
-- NFC East
(1017, 'Cowboys',    'Dallas',        'DAL', 'NFC', 'NFC East',  'NFL'),
(1018, 'Giants',     'New York',      'NYG', 'NFC', 'NFC East',  'NFL'),
(1019, 'Eagles',     'Philadelphia',  'PHI', 'NFC', 'NFC East',  'NFL'),
(1020, 'Commanders', 'Washington',    'WAS', 'NFC', 'NFC East',  'NFL'),
-- NFC North
(1021, 'Bears',      'Chicago',       'CHI', 'NFC', 'NFC North', 'NFL'),
(1022, 'Lions',      'Detroit',       'DET', 'NFC', 'NFC North', 'NFL'),
(1023, 'Packers',    'Green Bay',     'GB',  'NFC', 'NFC North', 'NFL'),
(1024, 'Vikings',    'Minnesota',     'MIN', 'NFC', 'NFC North', 'NFL'),
-- NFC South
(1025, 'Falcons',    'Atlanta',       'ATL', 'NFC', 'NFC South', 'NFL'),
(1026, 'Panthers',   'Carolina',      'CAR', 'NFC', 'NFC South', 'NFL'),
(1027, 'Saints',     'New Orleans',   'NO',  'NFC', 'NFC South', 'NFL'),
(1028, 'Buccaneers', 'Tampa Bay',     'TB',  'NFC', 'NFC South', 'NFL'),
-- NFC West
(1029, 'Cardinals',  'Arizona',       'ARI', 'NFC', 'NFC West',  'NFL'),
(1030, 'Rams',       'Los Angeles',   'LAR', 'NFC', 'NFC West',  'NFL'),
(1031, '49ers',      'San Francisco', 'SF',  'NFC', 'NFC West',  'NFL'),
(1032, 'Seahawks',   'Seattle',       'SEA', 'NFC', 'NFC West',  'NFL')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Insert MLB Teams (with division)
INSERT INTO teams (id, name, city, abbreviation, conference, division, sport) VALUES
-- AL East
(2001, 'Orioles',      'Baltimore',    'BAL', 'AL', 'AL East',    'MLB'),
(2002, 'Red Sox',      'Boston',       'BOS', 'AL', 'AL East',    'MLB'),
(2003, 'Yankees',      'New York',     'NYY', 'AL', 'AL East',    'MLB'),
(2004, 'Rays',         'Tampa Bay',    'TB',  'AL', 'AL East',    'MLB'),
(2005, 'Blue Jays',    'Toronto',      'TOR', 'AL', 'AL East',    'MLB'),
-- AL Central
(2006, 'White Sox',    'Chicago',      'CWS', 'AL', 'AL Central', 'MLB'),
(2007, 'Guardians',    'Cleveland',    'CLE', 'AL', 'AL Central', 'MLB'),
(2008, 'Tigers',       'Detroit',      'DET', 'AL', 'AL Central', 'MLB'),
(2009, 'Royals',       'Kansas City',  'KC',  'AL', 'AL Central', 'MLB'),
(2010, 'Twins',        'Minnesota',    'MIN', 'AL', 'AL Central', 'MLB'),
-- AL West
(2011, 'Astros',       'Houston',      'HOU', 'AL', 'AL West',    'MLB'),
(2012, 'Angels',       'Los Angeles',  'LAA', 'AL', 'AL West',    'MLB'),
(2013, 'Athletics',    'Oakland',      'OAK', 'AL', 'AL West',    'MLB'),
(2014, 'Mariners',     'Seattle',      'SEA', 'AL', 'AL West',    'MLB'),
(2015, 'Rangers',      'Texas',        'TEX', 'AL', 'AL West',    'MLB'),
-- NL East
(2016, 'Braves',       'Atlanta',      'ATL', 'NL', 'NL East',    'MLB'),
(2017, 'Marlins',      'Miami',        'MIA', 'NL', 'NL East',    'MLB'),
(2018, 'Mets',         'New York',     'NYM', 'NL', 'NL East',    'MLB'),
(2019, 'Phillies',     'Philadelphia', 'PHI', 'NL', 'NL East',    'MLB'),
(2020, 'Nationals',    'Washington',   'WAS', 'NL', 'NL East',    'MLB'),
-- NL Central
(2021, 'Cubs',         'Chicago',      'CHC', 'NL', 'NL Central', 'MLB'),
(2022, 'Reds',         'Cincinnati',   'CIN', 'NL', 'NL Central', 'MLB'),
(2023, 'Brewers',      'Milwaukee',    'MIL', 'NL', 'NL Central', 'MLB'),
(2024, 'Pirates',      'Pittsburgh',   'PIT', 'NL', 'NL Central', 'MLB'),
(2025, 'Cardinals',    'St. Louis',    'STL', 'NL', 'NL Central', 'MLB'),
-- NL West
(2026, 'Diamondbacks', 'Arizona',      'ARI', 'NL', 'NL West',    'MLB'),
(2027, 'Rockies',      'Colorado',     'COL', 'NL', 'NL West',    'MLB'),
(2028, 'Dodgers',      'Los Angeles',  'LAD', 'NL', 'NL West',    'MLB'),
(2029, 'Padres',       'San Diego',    'SD',  'NL', 'NL West',    'MLB'),
(2030, 'Giants',       'San Francisco','SF',  'NL', 'NL West',    'MLB')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Insert NFL Players
-- (id, name, team_id, position, sport)
-- QBs
INSERT INTO players (id, name, team_id, position, sport) VALUES
(10001, 'Patrick Mahomes',    1014, 'QB', 'NFL'),
(10002, 'Josh Allen',          1001, 'QB', 'NFL'),
(10003, 'Lamar Jackson',       1005, 'QB', 'NFL'),
(10004, 'Joe Burrow',          1006, 'QB', 'NFL'),
(10005, 'Jalen Hurts',         1019, 'QB', 'NFL'),
(10006, 'C.J. Stroud',         1009, 'QB', 'NFL'),
(10007, 'Jordan Love',         1023, 'QB', 'NFL'),
(10008, 'Tua Tagovailoa',      1002, 'QB', 'NFL'),
(10009, 'Dak Prescott',        1017, 'QB', 'NFL'),
(10010, 'Sam Darnold',         1024, 'QB', 'NFL'),
(10011, 'Brock Purdy',         1031, 'QB', 'NFL'),
(10012, 'Kyler Murray',        1029, 'QB', 'NFL'),
-- RBs
(10013, 'Saquon Barkley',     1019, 'RB', 'NFL'),
(10014, 'Derrick Henry',       1005, 'RB', 'NFL'),
(10015, 'Christian McCaffrey', 1031, 'RB', 'NFL'),
(10016, 'Josh Jacobs',         1023, 'RB', 'NFL'),
(10017, 'De''Von Achane',      1002, 'RB', 'NFL'),
(10018, 'Bijan Robinson',      1025, 'RB', 'NFL'),
(10019, 'Jonathan Taylor',     1010, 'RB', 'NFL'),
(10020, 'Isiah Pacheco',       1014, 'RB', 'NFL'),
(10021, 'James Cook',          1001, 'RB', 'NFL'),
-- WRs
(10022, 'Tyreek Hill',         1002, 'WR', 'NFL'),
(10023, 'Justin Jefferson',    1024, 'WR', 'NFL'),
(10024, 'CeeDee Lamb',         1017, 'WR', 'NFL'),
(10025, 'Ja''Marr Chase',      1006, 'WR', 'NFL'),
(10026, 'Amon-Ra St. Brown',   1022, 'WR', 'NFL'),
(10027, 'Puka Nacua',          1030, 'WR', 'NFL'),
(10028, 'Malik Nabers',        1018, 'WR', 'NFL'),
(10029, 'Davante Adams',       1015, 'WR', 'NFL'),
(10030, 'Stefon Diggs',        1009, 'WR', 'NFL'),
(10031, 'Garrett Wilson',      1004, 'WR', 'NFL'),
(10032, 'DJ Moore',            1021, 'WR', 'NFL'),
(10033, 'Jaylen Waddle',       1002, 'WR', 'NFL'),
(10034, 'Deebo Samuel',        1031, 'WR', 'NFL'),
(10035, 'Chris Olave',         1027, 'WR', 'NFL'),
-- TEs
(10036, 'Travis Kelce',        1014, 'TE', 'NFL'),
(10037, 'Sam LaPorta',         1022, 'TE', 'NFL'),
(10038, 'Trey McBride',        1029, 'TE', 'NFL'),
(10039, 'Mark Andrews',        1005, 'TE', 'NFL'),
(10040, 'Dallas Goedert',      1019, 'TE', 'NFL')
ON CONFLICT (id) DO NOTHING;

-- Step 5: Insert MLB Players
INSERT INTO players (id, name, team_id, position, sport) VALUES
-- Starting Pitchers
(20001, 'Gerrit Cole',          2003, 'SP', 'MLB'),
(20002, 'Zack Wheeler',         2019, 'SP', 'MLB'),
(20003, 'Dylan Cease',          2029, 'SP', 'MLB'),
(20004, 'Logan Webb',           2030, 'SP', 'MLB'),
(20005, 'Paul Skenes',          2024, 'SP', 'MLB'),
(20006, 'Spencer Strider',      2016, 'SP', 'MLB'),
(20007, 'Tarik Skubal',         2008, 'SP', 'MLB'),
(20008, 'Hunter Brown',         2011, 'SP', 'MLB'),
(20009, 'Cole Ragans',          2009, 'SP', 'MLB'),
(20010, 'Framber Valdez',       2011, 'SP', 'MLB'),
(20011, 'Chris Sale',           2016, 'SP', 'MLB'),
(20012, 'Corbin Burnes',        2001, 'SP', 'MLB'),
-- Batters
(20013, 'Shohei Ohtani',        2028, 'DH', 'MLB'),
(20014, 'Aaron Judge',          2003, 'OF', 'MLB'),
(20015, 'Freddie Freeman',      2028, '1B', 'MLB'),
(20016, 'Yordan Alvarez',       2011, 'DH', 'MLB'),
(20017, 'Ronald Acuna Jr.',     2016, 'OF', 'MLB'),
(20018, 'Manny Machado',        2029, '3B', 'MLB'),
(20019, 'Rafael Devers',        2002, '3B', 'MLB'),
(20020, 'Vladimir Guerrero Jr.',2005, '1B', 'MLB'),
(20021, 'Juan Soto',            2003, 'OF', 'MLB'),
(20022, 'Corey Seager',         2015, 'SS', 'MLB'),
(20023, 'Gunnar Henderson',     2001, 'SS', 'MLB'),
(20024, 'Bobby Witt Jr.',       2009, 'SS', 'MLB'),
(20025, 'Jose Ramirez',         2007, '3B', 'MLB'),
(20026, 'Bryce Harper',         2019, '1B', 'MLB'),
(20027, 'Pete Alonso',          2018, '1B', 'MLB'),
(20028, 'Kyle Tucker',          2011, 'OF', 'MLB'),
(20029, 'Julio Rodriguez',      2014, 'OF', 'MLB'),
(20030, 'Mookie Betts',         2028, 'OF', 'MLB'),
(20031, 'Fernando Tatis Jr.',   2029, 'OF', 'MLB'),
(20032, 'Adley Rutschman',      2001, 'C',  'MLB'),
(20033, 'Trea Turner',          2019, 'SS', 'MLB'),
(20034, 'Elly De La Cruz',      2022, 'SS', 'MLB'),
(20035, 'Jackson Merrill',      2029, 'OF', 'MLB'),
(20036, 'Michael Harris II',    2016, 'OF', 'MLB'),
(20037, 'Jarren Duran',         2002, 'OF', 'MLB'),
(20038, 'Luis Robert Jr.',      2006, 'OF', 'MLB'),
(20039, 'William Contreras',    2023, 'C',  'MLB'),
(20040, 'Matt McLain',          2022, 'SS', 'MLB')
ON CONFLICT (id) DO NOTHING;
