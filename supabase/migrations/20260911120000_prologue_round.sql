-- Round 1 is now always a "prologue round" -- a single group decision (not a player
-- elimination vote) that plays out the "locked in, what do we do" story beat before the
-- real voting game (now round 2 onward) begins. See resolve-round/index.ts and
-- submit-prologue-vote/index.ts.
alter table battle_royale.rounds
  add column is_prologue boolean not null default false,
  add column prologue_outcome text check (prologue_outcome in ('call_police', 'get_help', 'drink_whisky')),
  -- GM-only visibility (gm-game-overview) -- players are never told a tie/coin-flip
  -- decided the outcome, same "don't reveal the mechanism" principle as the elimination
  -- vote's own random tie-break.
  add column prologue_tie_break boolean not null default false;

create table battle_royale.prologue_votes (
  round_id uuid not null references battle_royale.rounds (id) on delete cascade,
  voter_player_id uuid not null references battle_royale.players (id) on delete cascade,
  option text not null check (option in ('call_police', 'get_help', 'drink_whisky')),
  cast_at timestamptz not null default now(),
  primary key (round_id, voter_player_id)
);

-- RLS default-deny, same as every other gameplay table -- only the service-role key
-- (used exclusively by Edge Functions) can read this. Not anonymity-sensitive the way
-- votes is (this is a group decision, not "who voted to eliminate whom"), so unlike
-- votes.ts there's no dedicated locked-down helper module for it.
alter table battle_royale.prologue_votes enable row level security;
