-- Enable RLS on internal cache tables flagged by Supabase Security Advisor
-- (RLS Disabled in Public, CRITICAL). Both tables are only ever read/written
-- by the backend via the service_role key, which bypasses RLS regardless —
-- no policies are needed, this just blocks anon/authenticated access.
-- Run once in Supabase SQL editor.
ALTER TABLE public.team_defense ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats_cache ENABLE ROW LEVEL SECURITY;
