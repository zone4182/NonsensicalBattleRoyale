-- Generic sliding-window rate limiter, shared across whichever endpoints need one
-- (currently create-game's setup-secret check and redeem-invite's token check --
-- security-review finding: neither had any brute-force throttling). One row per
-- attempt; enforceRateLimit (_shared/rateLimit.ts) counts rows within the window and
-- prunes old ones for the same scope+identifier as it goes, so this never needs its
-- own cron cleanup job.
create table battle_royale.rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_attempts_scope_identifier_idx on battle_royale.rate_limit_attempts (scope, identifier, created_at);
