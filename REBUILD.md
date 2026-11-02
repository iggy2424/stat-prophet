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
| API-Sports NBA (`v2.nba.api-sports.io`) | Pro, renews 2 Dec 2026 | 7,500 requests/day | Teams, schedule, scores, box scores |
| The Odds API | Free key in `.env.local` only | 500 requests/month | Not used yet. The paid key in `.env` and production is deactivated. A paid plan is needed when picks are built. |
| Supabase | Free | Pauses after inactivity | Database |

**API-Sports facts we rely on** (checked against real responses):

- Season label is the year the season starts: the 2026-27 season is `2026`.
- Timestamps are UTC. A 10pm ET game is dated the next day in UTC.
- `stage`: 1 = preseason, 2 = regular season. Playoff values to be confirmed when seen.
- `status.short`: 1 scheduled, 2 in play, 3 finished. Postponed and canceled appear in `status.long`.
- The away team is under `teams.visitors`, not `away`.
- `/games?season=2026&league=standard` returns the whole season (1,265 games) in one request.
- `/games?live=all` returns only games in progress, in one request.
- `/teams` logos point at French Wikipedia images, so we use NBA.com logos instead.

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

### 5.5 API endpoints (`backend/handlers.py`)

| `?type=` | Who | Returns |
|---|---|---|
| `games&date=YYYY-MM-DD` | Members | Games for that Eastern date (default today) with both teams' name, code and logo |
| `sync_status` | Members | Latest run of each sync job |
| `sync&job=...` | Cron secret only | Runs one sync job |

Any handler error returns HTTP 500 with the error message. Errors are never turned into empty data.

### 5.6 Authentication (`backend/auth.py`)

- Members: the `whop_session` cookie, an HS256 JWT signed by `api/callback.js` with `JWT_SECRET`.
- Cron and sync calls: `Authorization: Bearer <CRON_SECRET>`.
- Local development skips the member check.

### 5.7 Frontend (`frontend/`)

- React 18 + TypeScript, built with Vite. The production bundle is about 48 KB gzipped.
- `src/api.ts` is the only place that calls the backend. A 401 sends the user to `/login`.
- Pages built: **Games**. Listed but not built yet: Picks, Prop Analyzer, DataLab, Bet Slip, Pick History.
- Styles are working styles only. The visual design gets its own pass later.

## 6. Open items

- [ ] Player box scores for every finished game, this season and last (next step)
- [ ] Schedule the sync jobs (Vercel Hobby cron runs at most once a day, so live work stays on demand)
- [ ] `vercel.json` for the new structure, tested on a preview deployment before merging
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
