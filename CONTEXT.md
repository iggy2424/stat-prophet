# TrendBet — Dev Context (last updated Apr 9 2026)

## Where We Are
MVP is live and working. Both domains are connected. Analytics installed. Security hardened.

## Live URLs
- **Landing**: https://trendbet.ai (landing/index.html → stat-prophet-landing Vercel project)
- **App**: https://app.trendbet.ai (stat-prophet Vercel project)
- **GitHub**: https://github.com/iggy2424/stat-prophet

## What's Working
- Whop OAuth login (PKCE flow via api/login.js + api/callback.js)
- AI picks page: scoring engine, gate filters, pick cards, tier labels
- Pick History tab: daily navigator, lifetime stats, P&L, calendar view
- PostHog analytics on both sites (session replay + heatmaps enabled)
- Daily defense refresh cron (10am UTC, secured via Authorization header)

## Key Files
| File | Purpose |
|------|---------|
| `api/index.py` | Main Python API — all pick logic, history, defense cache |
| `api/login.js` | Whop OAuth PKCE login redirect |
| `api/callback.js` | Whop OAuth token exchange + membership check |
| `frontend/app.js` | Entire React frontend (single file) |
| `frontend/index.html` | HTML shell — PostHog snippet lives here |
| `frontend/login.html` | Login page |
| `vercel.json` | Routing + cron config |
| `database/pick_history.sql` | Supabase migration (run once) |

## Current Gate Settings (api/index.py ~line 1930)
- **Odds gate**: -250 (picks with over_odds < -250 are rejected)
- **Hit rate**: ≥80% of last 10 games (kill if <80%)
- **Min games**: 6 of last 10 must have data
- **Min avg minutes**: 20
- **Score threshold**: ≥75 to appear (SOLID VALUE / STRONG PICK / ELITE LOCK)
- **Downside CV**: pts 0.40, reb 0.45, ast 0.50
- **All passing stats shown** per player (not just highest scoring one)

## Vercel Env Vars (stat-prophet project)
All secrets in Vercel dashboard — never hardcoded. Key ones:
- `SUPABASE_URL`, `SUPABASE_KEY` (service role)
- `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `WHOP_COMPANY_KEY`
- `WHOP_PRODUCT_IDS`
- `API_SPORTS_KEY`, `ODDS_API_KEY`, `ANTHROPIC_API_KEY`
- `JWT_SECRET`, `CRON_SECRET`

## Whop Product IDs (allowed memberships)
`prod_sjZuDJVjBjx67`, `prod_M1dvuYwoKXS3p`, `prod_XQt15k4DIescc`, `prod_AGqdHQTNUD8Ep`

## Recent Changes (Apr 2026)
- `fe53d05` — Odds gate tightened from -300 → -250
- `e60d3e5` — PostHog analytics, TB logo (TB_logo_transparent.png), cron secret secured
- `6a09807` — Stable MVP checkpoint (tag: checkpoint-stable-apr2)

## Backlog
- Smart cache TTL (expire when first game tips off)
- Player headshots (needs NBA.com ID → api_sports_id mapping)
- Back-to-back detection (skip players on 2nd night)
- Assists MIN_LINE may need raising to 5.5
