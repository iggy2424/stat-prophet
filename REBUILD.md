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
| `games&date=YYYY-MM-DD` | Members | Games for that Eastern date (default today) with both teams' name, code and logo |
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
  `/api?type=sync&job=nightly` runs `schedule`, `scores`, `boxscores`, `players` in order.
  Each job logs its own `sync_log` row, and one failing never stops the rest. Crons only
  run on production. Live scores stay on demand (Hobby cron runs at most once a day).
- Environment variables needed in Vercel (Production and Preview): `SUPABASE_URL`,
  `SUPABASE_KEY`, `API_SPORTS_KEY`, `BALLDONTLIE_API_KEY`, `JWT_SECRET`, `CRON_SECRET`,
  `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `WHOP_COMPANY_KEY`. Preview only: `PREVIEW_SKIP_LOGIN=1`.

### 5.8 Frontend (`frontend/`)

- React 18 + TypeScript, built with Vite. The production bundle is about 48 KB gzipped.
- `src/api.ts` is the only place that calls the backend. A 401 sends the user to `/login`.
- Pages built: **Games**, **Team Rankings**. Listed but not built yet: Picks, Prop Analyzer,
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

## 6. Open items

- [x] Team and player box score tables, sync job and team rankings view
- [x] 2026-27 box scores loaded (157 games)
- [x] Decide the player stats source: BallDontLie passed every check (section 4)
- [ ] Subscribe to BallDontLie ALL-STAR before the trial ends; confirm commercial use
- [x] Switch `player_game_stats` sync to BallDontLie, with a points check on every game
- [x] Run `database/004_balldontlie_players.sql`, then test the `players` job on a few games
- [x] Load 2025-26 schedule
- [x] Load 2025-26 team box scores
- [ ] Load player stats for 2025-26 and 2026-27 (after ALL-STAR: about 900 requests, 15 minutes)
- [ ] Injury sync from `/v1/player_injuries`
- [x] Team rankings: blended early season window, ranks on every stat, Team Rankings page
- [ ] Defence vs position (points, rebounds, assists allowed to guards, forwards, centres), after the player stats backfill
- [x] Schedule the sync jobs: one nightly cron (live scores stay on demand)
- [x] `vercel.json` for the new structure
- [x] Preview deployment works (Games, Team Rankings, logos, Vercel login wall on previews)
- [ ] Check live scores on the preview during a game, then merge `rebuild` into `main`
- [ ] Rebuild Pick History on the new foundation
- [ ] Picks engine, including early season handling (few current season games)
- [ ] Prop Analyzer, DataLab, Bet Slip
- [ ] Paid Odds API plan before picks go live
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
