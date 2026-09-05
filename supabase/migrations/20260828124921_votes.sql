-- Anonymity-critical table (ARCHITECTURE.md "Critical architectural rule", tech-spec
-- section 5): must never be joined to voter/target identity in any query path except
-- the single end-of-game reveal function. Vote-count-per-entitlement (1, or 2 for the
-- round's double-vote holder) is dynamic and therefore enforced in submit-vote, not a
-- DB constraint here.
create table battle_royale.votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references battle_royale.rounds (id) on delete cascade,
  voter_player_id uuid not null references battle_royale.players (id),
  target_player_id uuid not null references battle_royale.players (id),
  is_double_vote boolean not null default false,
  cast_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index votes_round_id_idx on battle_royale.votes (round_id);

-- RLS default-deny: no policies are granted to anon/authenticated. Only the
-- service-role key (used exclusively by Edge Functions) bypasses RLS and can read
-- this table. This is a DB-level backstop, not the primary access control — the
-- primary guarantee is that no Edge Function code path exposes raw vote rows except
-- the end-of-game reveal function. No policies are ever expected to be added here.
alter table battle_royale.votes enable row level security;
