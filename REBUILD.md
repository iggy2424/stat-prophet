# TrendBet rebuild

The living record of how the new app works and every change made during the rebuild.
Update this file with every change: the logic sections describe how things work now, and
the changelog at the bottom records what changed and why.

---

## 1. Why we are rebuilding

The old app (Oct 2025 to Nov 2026) grew into one 2,959 line backend file and one 2,564 line
frontend file. Most of its bugs came from how it was built, not from single lines:

- **Live fetching on every request.** Each picks request pulled every team's stats and
  schedule from API-Sports on the spot. This caused wrong game ordering, timeouts and
  quota problems.
- **Hardcoded values that drifted.** `season: 2025` appeared about 12 times, so in the new
  season the app kept using last season's games. Playoff settings were never switched back.
- **Patches on patches.** The picks cache, "picks stay all day" and the restore step all
  existed to hide symptoms of live fetching.
- **Silent failures.** When Supabase paused, Pick History showed empty instead of an error.
- **Slow frontend.** The browser downloaded a 3 MB compiler and compiled the app on every load.

## 2. What was kept and where the old app lives

| Kept | Why |
|---|---|
| Whop login: `api/login.js`, `api/callback.js` | Works, took real effort. Sets the `whop_session` cookie. |
| Login page and brand assets (`frontend/public/`) | Unchanged |
| `pick_history` table and its 419 rows | The real track record |

The old app is preserved in two places:

- Git tag **`legacy-v1`** (also on GitHub)
- Folder **`C:\Users\IgnasU\Desktop\statprph\stat-prophet-legacy`**, which also holds a JSON
  backup of every old database table in `db-backup-2026-11-02/`. It contains `.env`
  secrets, so never commit or share it.

All rebuild work happens on the **`rebuild`** branch. `main` still deploys the old app to
app.trendbet.ai until the rebuild is merged.

## 3. Architecture

```
API-Sports ──(sync jobs)──▶ Supabase ──(our API)──▶ React app
                             teams
                             games
                             sync_log
                             pick_history (kept)
```

**The core rule:** pages only read from our own database. API-Sports is called by sync jobs,
never directly by a page. The one controlled exception is the live score refresh (see 5.4).

### Folders

| Path | What it is |
|---|---|
| `api/index.py` | Vercel entry point for `/api?type=...`. Routing and auth only. |
| `backend/config.py` | Environment settings. Loads `.env` locally. |
| `backend/timeutil.py` | US Eastern dates and NBA season logic |
| `backend/db.py` | Supabase client. Raises on every error, never returns fake empty data. |
| `backend/apisports.py` | API-Sports client. Counts every request it makes. |
| `backend/nba_teams.py` | Per team values API-Sports lacks: NBA.com id (logos), Odds API name |
| `backend/sync.py` | Sync jobs that copy API-Sports data into Supabase |
| `backend/handlers.py` | Request handlers behind each `?type=` |
| `backend/auth.py` | Member cookie check and cron secret check |
| `scripts/dev_server.py` | Runs the API locally on port 8000 |
| `scripts/sync.py` | Runs a sync job by hand |
| `frontend/` | React + TypeScript app built with Vite |
| `database/NNN_*.sql` | Database changes, numbered in the order they were run |

### Running it locally

```
npm run dev                 # API on :8000 and app on http://localhost:5173
npm run sync teams          # or schedule, scores, live
```

On localhost the login check is off (`TB_DEV=1`, set only by `scripts/dev_server.py`).
The frontend reloads on save. The local API does not; restart `npm run dev` after backend changes.

## 4. Data providers

| Provider | Plan | Limit | Used for |
|---|---|---|---|
| API-Sports NBA (`v2.nba.api-sports.io`) | Pro, renews 2 Dec 2026 | 7,500 requests/day | Teams, schedule, live scores, team box scores |
| BallDontLie (`api.balldontlie.io/v1`) | GOAT trial until about 16:00 4 Nov 2026, then ALL-STAR | 5/minute on trial, 60/minute on ALL-STAR | Player box scores |
| The Odds API | Free key in `.env.local` only | 500 requests/month | Not used yet. The paid key in `.env` and production is deactivated. A paid plan is needed when picks are built. |
| Supabase | Free | Pauses after inactivity | Database |

**API-Sports facts we rely on** (checked against real responses):

- Season label is the year the season starts: the 2026-27 season is `2026`.
- Timestamps are UTC. A 10pm ET game is dated the next day in UTC.
- `stage`: 1 = preseason, 2 = regular season, 3 = playoffs (2025-26: 65, 1,237 and 85 games).
- `status.short`: 1 scheduled, 2 in play, 3 finished. Postponed and canceled appear in `status.long`.
- The away team is under `teams.visitors`, not `away`.
- `/games?season=2026&league=standard` returns the whole season (1,265 games) in one request.
- `/games?live=all` returns only games in progress, in one request.
- `/teams` logos point at French Wikipedia images, so we use NBA.com logos instead.
- Rate limits on Pro: 7,500/day **and** 300/minute, and short bursts are rejected. The client
  spaces calls 0.25s apart (240/minute) and waits 15s then retries on a rate limit reply.
- `/teams/statistics` mixes preseason into season totals (Lakers: 12 games for a 5-2 record),
  so we calculate team stats ourselves from regular season box scores.
- **Player box scores are incomplete.** Checked by comparing each team's points with the sum of
  its players' points (2 Nov 2026):
  - 2026-27 regular season: 71 of 184 team games (39%) missing players, 2 to 20 points each
  - 2026-27 preseason: 118 of 130 incomplete (irrelevant, preseason is excluded)
  - 2025-26 sample: 1 of 12 team games incomplete
  - Re-fetching a week later returns the same gaps, so they are not filled in over time.
  - Several missing players are rookies with shortened names ("C. Murray-Boyles", "A. Martin").
  This makes API-Sports unsafe as the only source for player stats.

**BallDontLie (`api.balldontlie.io/v1`) tested as the player stats source** (2 Nov 2026, GOAT
trial, only endpoints that ALL-STAR also has). Same check, player points vs final score:

| Season | Games | Team games | Mismatched |
|---|---|---|---|
| 2025-26 regular season | 1,237 | 2,474 | 0 |
| 2025-26 playoffs | 85 | 170 | 0 |
| 2026-27 to 1 Nov | 92 | 184 | 0 (API-Sports: 71) |

- 46,056 player rows, no gaps. Minutes are exact (`"33:15"`). Team abbreviations match ours.
- `/v1/stats` filters: `dates[]`, `game_ids[]`, `seasons[]`, `start_date`, `end_date`,
  `postseason`; 100 rows per page with `meta.next_cursor`. Realtime for live games.
- `/v1/player_injuries` has `status`, `return_date`, `description`.
- Rate limits: trial 5/minute, ALL-STAR 60/minute, GOAT 600/minute.
- Plan needed: **ALL-STAR $9.99/month** (Game Player Stats, Active Players, Player Injuries).
- Commercial use terms not found on their site; confirm with BallDontLie.
- Key is `BALLDONTLIE_API_KEY` in `.env`.
- Requests are spaced 1.05s apart (ALL-STAR). On the trial, set `BALLDONTLIE_MIN_INTERVAL=12.5`
  to stay under 5/minute instead of waiting out 429 replies.

## 5. Logic

### 5.1 Dates and seasons (`backend/timeutil.py`)

- "Today" is always the calendar day in **US Eastern time**, because that is how the NBA schedules.
- Every game stores `start_time` (UTC) and `game_date_et` (its Eastern calendar day).
  Pages ask for games by `game_date_et`.
- The current season is worked out from the date: August onwards is the new season,
  July and earlier belong to the season that started the previous year. Never hardcode a season.

### 5.2 Database tables (`database/001`, `002`)

**`teams`**: one row per franchise. API-Sports id is the primary key. Also stores the
NBA.com id (for `https://cdn.nba.com/logos/nba/{nba_id}/global/L/logo.svg`) and the team's
name as The Odds API spells it, so odds can be matched exactly (for example API-Sports says
"LA Clippers", The Odds API says "Los Angeles Clippers").

**`games`**: the full season schedule plus live state. Status is one of
`scheduled | live | finished | postponed | canceled`. `status_detail` holds text like
"Q3 4:12", "Halftime" or "End of Q2". Scores are only stored once a game is live or finished.
`stage` is kept so preseason games never count toward a player's form.

**`sync_log`**: one row per sync run with start and finish time, success, API requests
used, rows written and the error text on failure.

All three have row level security on with no policies, so only the backend (service role
key) can read or write them.

### 5.3 Sync jobs (`backend/sync.py`)

Every job runs inside `run_job()`, which writes a `sync_log` row whether it succeeds or fails.

| Job | What it does | API requests | When |
|---|---|---|---|
| `teams` | Loads the 30 franchises. Fails loudly if a team code is missing from `nba_teams.py` or the count is not 30. | 1 | Once, then rarely |
| `schedule` | Loads the whole season. Skips exhibition games against non NBA teams. | 1 | Daily (not scheduled yet) |
| `scores` | Refreshes every game dated yesterday, today and tomorrow (UTC). Backup sweep. | 3 | Not scheduled yet |
| `live` | Refreshes live games, then fetches any game we still show as live (or that should have started) but that is missing from the live list, so its final score is saved. | 1, plus 1 per game that just ended | Every 15s while games are on |
| `boxscores` | Team totals for finished games (section 5.5). | 1 per game | Nightly (not scheduled yet) |
| `players` | Player box scores from BallDontLie, checked against the final score (section 5.5). | About 3 per game day | Nightly (not scheduled yet) |
| `injuries` | BallDontLie injury list: updates `player_injuries` and logs every change to `injury_reports` (section 5.11). | 2 (BallDontLie) | Nightly, and from the games endpoint at most every 30 minutes |
| `predictions` | Predicted score and win chance for today's and tomorrow's games that have not started (section 5.10). | 0 (our tables only) | Nightly, after `players` |

Each job names the API client it uses in `sync.JOBS`. A job that saves some games but leaves
others pending raises `PartialSync`: the run is logged as failed, with the rows it did save.
`scripts/sync.py <job> --all` repeats the job while each run still saves rows.

### 5.4 Live scores

- When someone opens the Games page for today, the backend checks whether any game is live
  or should have tipped off. If so, and the last `live` run **started** more than 15 seconds
  ago, it runs `live` before answering. Using the start time (not success) means a failing
  API is not retried in a tight loop.
- All viewers share that one refresh, so cost does not grow with the number of viewers.
  A full night of games costs roughly 1,000 to 1,500 of the 7,500 daily requests.
- The page polls every 15 seconds while any game on screen is live or due, pauses while the
  browser tab is hidden, and flashes a score when it changes.
- Limitation: scores only update while someone has the page open. Results needed for pick
  history will come from a nightly job instead.

### 5.5 Box scores and team rankings (`backend/boxscores.py`, `backend/player_stats.py`, `database/003`, `004`, `005`)

- **Tables:** `players` (BallDontLie id, current team and position, jersey, height, plus
  `search_name` for matching sportsbook names: lowercase, no accents, no Jr./III, hyphens as
  spaces), `team_game_stats`, `player_game_stats`. Season, stage and Eastern date are copied
  onto every stats row so queries can exclude preseason without a join.
- **Two sources, two markers on `games`:** team totals come from API-Sports and set
  `box_synced_at`; player stats come from BallDontLie and set `players_synced_at` plus `bdl_id`.
  Either can be re-run without touching the other.
- **`boxscores` job (API-Sports):** 1 request per finished game (`/games/statistics`), 4 threads,
  paced by the client. A game is marked done only if both teams came back.
- **`players` job (BallDontLie):** takes pending finished games (regular season and playoffs;
  BallDontLie has no preseason), fetches `/stats` for their dates, 7 dates per request and 100
  rows per page. BallDontLie games are matched to ours by Eastern date plus home and away team
  codes. A game is saved only when BallDontLie shows it as Final **and each team's player
  points add up to that team's final score in our `games` table**. Failing games are not saved,
  stay pending, and are listed (date, teams, reason) in the job's `sync_log` message.
- **Both jobs:** games finished in the last 2 days are synced once more at least 5 hours after
  tip off to catch late stat corrections. Players with 0 minutes are not stored. A player's
  team and position only update from a newer game, so backfilling old games never overwrites a trade.
- **Possessions** per team game: `fga + 0.44 × fta − off_reb + turnovers`.
- **`team_rankings` view** (`database/005_team_rankings_v2.sql`): calculated live from
  regular season games only, one row per team per `window_name` and `season`.
  - Windows: `season` (every game this season), `last10` (each team's 10 most recent),
    `blended` (the default, for the early season, below).
  - Offence: points, FG%, 3s made, 3P%, rebounds, offensive rebounds, rebound % (share of all
    available rebounds, so pace does not inflate it), assists, offensive rating.
  - Defence, as what opponents do: points, FG%, 3s, 3P%, rebounds, assists allowed, defensive rating.
  - Also pace, net rating, record (`wins`, `losses`, this season only).
  - Every stat has `<stat>_rank`, 1 to 30, ties share a rank. Offence rank 1 = the most;
    defence rank 1 = allows the fewest.
- **Blended window (early season):** this season's games at full weight plus last season
  counted as **10 games** in total (each of last season's games weighs 10 / that team's games
  last season). Opening night is 100% last season, 10 games in is 50/50, 40 games in is
  80/20. Percentages and ratings blend totals (made and attempted, points and possessions),
  never averages of averages. `current_share` is the % that comes from this season. The 10
  lives in the view (`params.prior_games`) and in `handlers.PRIOR_GAMES` for display.
- **Checked** against a Python calculation from the raw rows for all 30 teams in all three
  windows: largest difference 0.05, which is the 1 decimal rounding.

### 5.6 API endpoints (`backend/handlers.py`)

| `?type=` | Who | Returns |
|---|---|---|
| `games&date=YYYY-MM-DD` | Members | Games for that Eastern date (default today) with both teams' name, code and logo, and the model's prediction if there is one. For today and later, also `injuries` for both teams (refreshed if the list is over 30 minutes old) |
| `model_record&model=ratings-v1` | Members | The game model's record on finished games: winners right and wrong, average margin and total miss, total bias (+ = real totals higher). All time and last 7 days |
| `team_rankings&season=2026&window=blended` | Members | All 30 teams with stats and ranks, sorted by net rating. `window` is `blended` (default), `season` or `last10`; `season` defaults to the current one |
| `sync_status` | Members | Latest run of each sync job |
| `sync&job=...` | Cron secret only | Runs one sync job |

Any handler error returns HTTP 500 with the error message. Errors are never turned into empty data.

### 5.7 Authentication (`backend/auth.py`)

- Members: the `whop_session` cookie, an HS256 JWT signed by `api/callback.js` with `JWT_SECRET`.
- Cron and sync calls: `Authorization: Bearer <CRON_SECRET>`.
- Local development skips the member check.
- **Vercel previews** skip the member check only when `VERCEL_ENV=preview` **and**
  `PREVIEW_SKIP_LOGIN=1` (set for the Preview environment only). Needed because Whop always
  redirects back to app.trendbet.ai. Vercel Deployment Protection keeps preview links
  private to the Vercel account. Never applies in production.

### 5.9 Deployment (`vercel.json`)

- Push to any branch other than `main` = preview deployment with its own link. Push to
  `main` = production (app.trendbet.ai).
- Build: `npm ci` at the root (for the Node login functions), then the frontend is built
  into `frontend/dist`, which Vercel serves. `/login` serves `login.html`.
- Functions: `api/index.py` (Python, bundles `backend/**`, up to 60s), `api/login.js` and
  `api/callback.js` (Node, Whop OAuth). Only `/api` reaches `index.py`; routes use `?type=`.
- **Nightly cron, 09:00 UTC** (4 or 5am ET, after every game has ended):
  `/api?type=sync&job=nightly` runs `schedule`, `scores`, `boxscores`, `players`, `injuries`, `predictions` in order.
  Each job logs its own `sync_log` row, and one failing never stops the rest. Crons only
  run on production. Live scores stay on demand (Hobby cron runs at most once a day).
- Environment variables needed in Vercel (Production and Preview): `SUPABASE_URL`,
  `SUPABASE_KEY`, `API_SPORTS_KEY`, `BALLDONTLIE_API_KEY`, `JWT_SECRET`, `CRON_SECRET`,
  `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `WHOP_COMPANY_KEY`. Preview only: `PREVIEW_SKIP_LOGIN=1`.

### 5.8 Frontend (`frontend/`)

- React 18 + TypeScript, built with Vite. The production bundle is about 48 KB gzipped.
- `src/api.ts` is the only place that calls the backend. A 401 sends the user to `/login`.
- Pages built: **Games** (each card shows the model's prediction, with ✓ or ✗ once final, and
  the model's record sits above the list; games not yet final list injured players who play
  10+ minutes, with their status (Out and Doubtful in red; Available not shown), their
  minutes and the news note on hover), **Team Rankings**. Listed but not built yet: Picks, Prop Analyzer,
  DataLab, Bet Slip, Pick History.
- The page is kept in the URL hash (`/#rankings`), so refreshing or sharing a link keeps it.
- **Team Rankings page:** Overview (net, offensive and defensive rating, pace, rebound %),
  Offence and Defence tabs; season switch (this and last season; blended is only offered
  for the current season); window switch; click a column to sort by its rank. Ranks 1 to 10
  are green, 21 to 30 red. A note explains what the window contains, including how much of
  the blended numbers come from this season.
- Layout columns use `minmax(0, 1fr)` so wide tables scroll inside their box on phones
  instead of widening the page.
- Styles are working styles only. The visual design gets its own pass later.

### 5.10 Game predictions (`backend/game_model.py`, `database/006`)

Model `ratings-v1`, built from the blended team ratings (section 5.5):

- Possessions: home pace x away pace / league pace.
- Each team's score: possessions x (its offensive rating x the opponent's defensive rating /
  league rating) / 100, plus half of home court (1.8 points) for the home team, minus half
  for the away team.
- Home win chance: normal distribution around the predicted margin, spread 14.9 points.
- Home court and the spread come from a walk-forward test on 2025-26 (1,074 regular season
  games after each team had 10, using only earlier games): winner right 69% (always picking
  the home team: 55%), margin off by 11.7 points on average, total off by 15.3. Favourites
  given 60-70% won 69% of the time, 70-80% won 76%, 90%+ won 84% (a bit overconfident).
- Knows nothing about injuries, rest or travel yet.

`game_predictions` holds one row per game: model name, time made, predicted points for each
team, home win chance, and the ratings used (`inputs`). The `predictions` job only writes
games that have not started, so a saved prediction is always the pre-game one. Results
are not stored: the record is graded from the final scores in `games`.

### 5.11 Injuries (`backend/injuries.py`, `database/007`)

- Source: BallDontLie `/v1/player_injuries`, status (`Out`, `Doubtful`, `Questionable`,
  `Probable`, `Day-To-Day`, `Available`; the last four appeared on 6 Nov 2026), an expected
  return date and a news note. Its team ids are mapped to ours by team code.
- BallDontLie only has the list as it is now. `player_injuries` holds that list;
  `injury_reports` gets a row for every new player or change in team, status, return date
  or note, and a `Cleared` row when a player drops off. Anything that needs to know what
  was known before a game (tests, the model) must read `injury_reports` by `seen_at`.
- An empty feed while more than 10 players are listed is treated as a feed failure:
  the job fails and nothing is cleared.
- No foreign key to `players`: some injured players have not played in our data yet.
- `player_recent_form` view: each player's games, minutes and points over his last 10
  games, used to show which injuries matter.
- Past seasons have no injury list. For tests on 2025-26, missing players are worked out
  from the box scores instead (a regular who did not play).

### 5.12 Player projection test (`research/projections/`, local only)

Not deployed. `research/requirements.txt` (LightGBM, pandas, scipy) is separate from the
Vercel `requirements.txt`. `data.py` caches box scores in `research/.cache/` (not in git),
`features.py` builds pre-game features, `evaluate.py` runs the test. Full output:
`research/projections/results_2026-11-03.txt`.

- **Rules:** every feature uses only earlier games. Only games the player played are scored
  (a prop on a player who sits is void). A player needs 5 earlier games. Splits are by
  date, never shuffled: **A** trains on 2025-26 before February and tests February to the
  end of the playoffs (12,515 player games); **B** trains on all of 2025-26 and tests
  2026-27 so far (2,170, the early season case).
- **Models:** season average, last 10, exponential average (half-life 10 games), minutes x
  per minute rate, and LightGBM on everything (form, rest, home, position, pace, opponent,
  missing teammates). LightGBM uses Poisson loss for rebounds, assists and 3s.
- **Accuracy, split A** (average miss, points / rebounds / assists / 3s):
  season average 4.85 / 1.94 / 1.40 / 0.90, exponential 4.70 / 1.91 / 1.37 / 0.89,
  minutes x rate 4.63 / 1.89 / 1.36 / 0.88, **LightGBM 4.56 / 1.87 / 1.34 / 0.89**.
  Points gain the most; 3s gain nothing over the simple models.
- **What helps:** missing teammates (without them, points miss rises 4.56 to 4.66, and in
  the early season 4.72 to 4.87). Opponent features (defence, pace, what it allows) add
  nothing measurable (4.56 vs 4.57). The model leans on recent averages and shot attempts.
  `missing_min` uses the real box score, so it knows about late scratches a pre-game
  injury report would miss: slightly optimistic.
- **Early season (split B):** the simple averages run high (points +1.1 a game: players'
  last season numbers overstate this season). LightGBM cuts that to +0.4.
- **Probabilities:** each projection becomes a negative binomial distribution (points
  included: a normal curve put "over" about 5 points too high, because scoring is skewed),
  with the spread fitted on the last 20% of the training period. Stand-in line: the
  exponential average rounded to x.5. In split A every band is within about 5 points of
  what happened, most within 2-3 (e.g. points "60-70% over" happened 68%). In split B the
  model is overconfident on overs (points "60-70%" happened 48%, 42 props).
- **Not an edge yet.** Against the stand-in line, 60%+ leans beat "always under" by
  5 points on points, 2-3 on rebounds and assists, under 1 on 3s, and by nothing in the
  early season. Sportsbook lines are sharper than an average, so the real test is
  January 2026 Odds API lines.

**v2 (3 Nov 2026,** `results_2026-11-03_v2.txt`**).** Trains on 2024-25 as well, so it
sees a season change; adds last season's averages and missing minutes at the player's
position; team totals now summed from the player rows (all three seasons); probability
spread fitted from forward predictions, separately for a player's first 10 games of a
season. New split **C**: train 2024-25, test 21 Oct to 30 Nov 2025 (6,219 games).

- **Accuracy** (average miss, points / rebounds / assists / 3s), v1 vs v2 on the same games:
  A 4.59 / 1.87 / 1.34 / 0.90 vs **4.52 / 1.85 / 1.32 / 0.88**; B 4.68 / 1.84 / 1.34 / 0.90
  vs **4.65 / 1.82 / 1.34 / 0.90**; C equal (4.62 / 1.91 / 1.34 / 0.89). Brier score better
  for every stat in every split.
- **What helped:** the extra season of training data. Last season's averages add nothing
  (points 4.51 without them vs 4.52 with). Missing teammates still matter most after form.
- **Early season probabilities:** better but not solved. Split A, first 10 games, points
  calibration gap 8.3% to 5.9% and rebounds 8.4% to 6.6%; "60%+ overs" there said 72% and
  happened 64% (86 props; v1 61%). In B and C the overs are within about 1-6 points, on small
  samples (26 to 250 props).
- **Open: 2026-27 runs about 0.5 points high.** League scoring is down this season (113.4
  points a team game in the first two weeks vs 115.6 across 2025-26), but per player game
  the league average barely moved, so that explains little. Two fixes tested and not used:
  scaling by league scoring (no change) and subtracting the model's own average miss so far
  this season (helped A and B slightly, hurt C).

## 6. Open items

- [x] Team and player box score tables, sync job and team rankings view
- [x] 2026-27 box scores loaded (157 games)
- [x] Decide the player stats source: BallDontLie passed every check (section 4)
- [x] Subscribe to BallDontLie ALL-STAR (3 Nov 2026; 60 requests a minute confirmed)
- [ ] Confirm commercial use with BallDontLie
- [x] Switch `player_game_stats` sync to BallDontLie, with a points check on every game
- [x] Run `database/004_balldontlie_players.sql`, then test the `players` job on a few games
- [x] Load 2025-26 schedule
- [x] Load 2025-26 team box scores
- [x] Load player stats for 2025-26 and 2026-27 (done on the trial, 2 Nov 2026)
- [x] Run `database/006_game_predictions.sql`
- [x] Game prediction model and nightly tracking (section 5.10)
- [ ] Game model v2: injuries and rest; check whether predicted totals run high early in the season
- [x] Run `database/007_player_injuries.sql`
- [x] Injury sync from `/v1/player_injuries` (section 5.11)
- [x] Team rankings: blended early season window, ranks on every stat, Team Rankings page
- [ ] Defence vs position (points, rebounds, assists allowed to guards, forwards, centres), after the player stats backfill
- [x] Schedule the sync jobs: one nightly cron (live scores stay on demand)
- [x] `vercel.json` for the new structure
- [x] Preview deployment works (Games, Team Rankings, logos, Vercel login wall on previews)
- [ ] Check live scores on the preview during a game, then merge `rebuild` into `main`
- [x] Projection test on 2025-26 (section 5.12)
- [x] Projection model v2 (section 5.12): two seasons of training, early season spread
- [ ] Projection model v3: a minutes model that uses the injury list; keep watching the
  2026-27 points bias as games come in
- [ ] Rebuild Pick History on the new foundation
- [ ] Picks engine, including early season handling (few current season games)
- [ ] Prop Analyzer, DataLab, Bet Slip
- [ ] Paid Odds API plan before picks go live: **$30 / 20K credits** (decided 2 Nov 2026)
- [ ] Backtest plan (decided 2 Nov 2026):
  1. Projection test on all of 2025-26 player stats (free): only data from before each game,
     check accuracy against simple averages, which factors help, and whether probabilities are honest
  2. Historical prop lines for **January 2026** (one snapshot about 1 hour before tip, points,
     rebounds, assists, 3s, US region): 10 credits per market per game = ~40 per game, ~9,000 credits
  3. Test against every line in those games, not only engine picks (~10,000 lines vs ~200 picks)
  4. If good, February 2026 the following billing month. Live picks use ~4,000-5,000 credits a month
- [ ] Decide what to do with the landing page redesign sitting uncommitted in `statprph\landing\index.html`

---

## Changelog

### 2026-11-02

- **Archived the old app.** Tag `legacy-v1` pushed to GitHub; plain copy in `stat-prophet-legacy`.
- **Removed the old app code** on the `rebuild` branch (commit `1df2313`). Kept Whop login,
  login page, brand assets and the `pick_history` schema.
- **Cleaned the database.** Backed up every table to JSON, then dropped all old tables
  (`teams`, `players`, `game_stats_cache`, `team_defense`, `ai_picks_cache`, `player_stats`,
  `predictions`, `season_averages`, the broken `prediction_performance`) and two old
  functions. Kept `pick_history`.
- **Upgraded API-Sports** from Free (100/day) to Pro (7,500/day).
- **Created `teams`, `games`, `sync_log`** (`database/001_teams_games.sql`) and added
  `games.stage` (`database/002_games_stage.sql`).
- **Built the backend foundation**: config, Eastern time and season logic, Supabase client
  that raises on errors, counted API-Sports client, auth, sync jobs, handlers.
- **Loaded data**: 30 teams, 1,265 games for the 2026-27 season (65 preseason, 1,200 regular season).
- **Built the frontend foundation** with the Games page: date navigation, logos, Eastern
  tip off times, final scores, loading, empty and error states.
- **Added live scores**: `live` job using `/games?live=all`, 15 second shared refresh,
  final score capture tested by faking a live game and confirming it was corrected
  (Raptors 125, Lakers 131). Commit `18ae0be`.
- **Added `REBUILD.md`** (this file). Commit `8fd3ce7`.
- **Added box scores and team rankings** (`database/003_box_scores.sql`, `backend/boxscores.py`,
  `backend/names.py`): `players`, `team_game_stats`, `player_game_stats`,
  `games.box_synced_at`, and the `team_rankings` view.
- **Added request pacing to the API-Sports client** after the first box score run hit the
  per minute limit at about 30 burst requests. Now 0.25s spacing and rate limit retries.
- **Loaded 2026-27 box scores:** 157 games, 314 requests, 84 seconds, 498 players.
- **Found incomplete player data in API-Sports** (39% of this season's regular season team
  games missing players). Paused the 2025-26 backfill until the data source is decided.
  The old Sportradar key in `.env` has expired.
- **Compared providers** (BallDontLie, MySportsFeeds, SportsDataIO, Sportradar) and tested
  BallDontLie on its trial: 0 gaps across 2,828 team games (all of 2025-26 and 2026-27 so far).
  Chosen as the player stats source; API-Sports stays for schedule, live scores and team totals.
- **Moved player stats to BallDontLie** (`backend/balldontlie.py`, `backend/player_stats.py`,
  `database/004_balldontlie_players.sql`). New `players` job with the final score check on
  every game. 004 clears the API-Sports player rows (they used API-Sports player ids) and adds
  `games.bdl_id`, `games.players_synced_at`, `players.jersey_number`, `players.height`.
- **`boxscores` job is now team totals only**, 1 request per game instead of 2.
- **`run_job` takes the job name only**; `sync.JOBS` maps each job to its function and API
  client. Added `PartialSync` so a part-saved run logs the rows it saved, and `--all` keeps going.
- **Loaded the 2025-26 schedule:** 1,387 games, 1 request.
- **Loaded 2025-26 team box scores:** 1,387 games, 2,774 team rows, 1,387 requests, no
  incomplete games. Every team's points match the final score.
- **Ran 004 and tested the `players` job** on the 5 latest games: 112 player rows, 3 requests,
  points match the final score and each team totals 240 minutes. Tested the check by
  raising one game's score by 1: the game was rejected, nothing saved, reason logged.
- **Team rankings v2** (`database/005_team_rankings_v2.sql`): blended window for the early
  season (last season counted as 10 games), record, net rating, FG%, rebound %, and a rank
  on every stat. Checked against a Python calculation for all 30 teams.
- **`team_rankings` endpoint and Team Rankings page.** Pages now live in the URL hash.
- **Fixed phone layout:** wide content no longer widens the page, and the nav row no longer
  stretches when a page is short.
- **Started the player stats backfill on the trial** (12.5s between requests, about 3 hours)
  instead of waiting for ALL-STAR. `BALLDONTLIE_MIN_INTERVAL` sets the spacing.
- **Deployment setup:** new `vercel.json` (Vite build, Python function bundling `backend/`,
  nightly cron replacing the old `refresh_defense` one), `nightly` sync job, and the
  preview-only login skip. Pushed `rebuild` to GitHub for a preview deployment.
- **Preview deployment tested:** set `SUPABASE_KEY` for Preview, added `PREVIEW_SKIP_LOGIN`
  (Preview only) and `BALLDONTLIE_API_KEY` (Production and Preview). Games and Team
  Rankings load on the preview; logged out visitors are sent to Vercel's login.
- **Player stats backfill finished** (about 2 hours, no rejected games):
  2025-26 has all 1,322 finished games (regular season, play-in, playoffs), 28,670 player
  rows, 582 players. 2026-27 has all 92 finished games, 2,078 rows, 442 players. Checked
  against the database: in every game each team's player points add up to its final
  score, and each team's minutes total 240 (more with overtime). No games pending.

### 2026-11-03

- **Game prediction model** (`backend/game_model.py`, section 5.10): predicted score, total
  and win chance from the blended team ratings. Tested on 2025-26 first (69% winners right).
- **First night, 2 Nov:** 11 of 15 winners right (expected about 10.4 from its own win
  chances), margin off by 9.3 points on average, total off by 16.1. Totals came in about
  6.6 points lower than predicted. These predictions were made at about 00:35 UTC, after
  the first game had tipped off, but used no data from that night's games. They are saved
  with that time.
- **Prediction tracking:** `database/006_game_predictions.sql`, a `predictions` sync job
  in the nightly run, a `model_record` endpoint, and the prediction plus the record on
  the Games page.
- Synced 2 Nov box scores by hand (the nightly cron only runs once `rebuild` is in
  production): 15 games, 30 team rows, 334 player rows, all matching the final scores.
- **Injury sync** (`backend/injuries.py`, `database/007_player_injuries.sql`): current list
  plus a history of every change, an `injuries` job in the nightly run and on demand from
  the games endpoint (at most every 30 minutes), a `player_recent_form` view, and injured
  players listed on the Games page cards. Added `db.insert_many` and `db.delete_in`.
- Subscribed to **BallDontLie ALL-STAR**. Checked: 12 requests in 16 seconds with no rate limit
  errors (the trial allowed 5 a minute). Default spacing (1.05s) applies everywhere now.
- **Player projection test** (`research/projections/`, section 5.12): baselines and LightGBM
  on 2025-26 and early 2026-27. LightGBM is best (points miss 4.56 vs 4.70 for an
  exponential average); missing teammates is the factor that helps, opponent factors add
  nothing. Probabilities switched to negative binomial after the first run showed points
  "over" about 5 points too high; mid-season bands are now within about 5 points.
  Early-season overs are still overconfident.
- **2024-25 backfill** for model training: schedule from API-Sports (1 request, 1,321
  finished regular season and playoff games) and player stats from BallDontLie (484
  requests, 28,157 rows, 569 players). No team box scores for 2024-25 (1,320 API-Sports
  requests, not needed: team totals can be summed from the player rows). Every game in
  2024-25, 2025-26 and 2026-27 checked: player points add up to the final score.
- **Fix: players with "0" minutes but a stat are now saved.** A few seconds of garbage time
  shows as 0 minutes, and three 2024-25 games were missing a free throw or basket because
  those rows were skipped. A row now counts as played if it has minutes or any stat. The
  three games were re-synced. 2025-26 and 2026-27 points all matched already.
- **Projection model v2** (section 5.12): trains on 2024-25 too, last season's averages,
  missing minutes by position, team totals from player rows, early season spread. Small
  gains everywhere (points miss 4.59 to 4.52 on Feb-Jun 2026), better early season
  calibration. Last season's averages add nothing; the extra training season does the work.
  2026-27 points still run about 0.5 high; two corrections tested and not adopted.

### 2026-11-06

- Ran the nightly jobs by hand (`rebuild` not merged yet, so the cron has not run since
  3 Nov): 4 and 5 Nov finals, box scores and player stats (16 games, 368 player rows),
  injuries, predictions for 6 and 7 Nov. The 2 games on 5 Nov have **no prediction**: the
  job did not run before they tipped off, and predictions are never made after the fact.
- The `boxscores` job fills any finished game without team totals, so it also took 240
  2024-25 games (240 API-Sports requests). Left as is: about 5 more nightly runs finish
  2024-25 within the daily quota.
- Game model record so far: 20 of 29 winners right (69%), margin off 9.6, total off 13.3
  (real totals 4.5 lower than predicted on average).
- BallDontLie's injury feed now also sends `Doubtful`, `Questionable`, `Probable` and
  `Available`. The Games page showed all of them as DTD; it now shows each status, red for
  Out and Doubtful, and hides Available players.
