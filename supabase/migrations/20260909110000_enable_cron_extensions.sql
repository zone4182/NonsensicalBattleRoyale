-- Needed to schedule resolve-round automatically (GAME-DESIGN.md-adjacent: the
-- round_resolution_mode GM setting, see the games alter migration alongside this one).
-- Both are standard Postgres/Supabase extensions, safe alongside the other app sharing
-- this project -- neither is schema-scoped to battle_royale specifically, but pg_cron
-- jobs and pg_net requests are namespaced by job name/call site, not by schema.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
