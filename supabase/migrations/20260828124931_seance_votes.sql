-- Unlike battle_royale.votes, this table is fine to join to ghost identity: the
-- Seance mechanic is entirely cosmetic and non-anonymous by design (game-design v0.9
-- section 10) — it carries zero real game information.
create table battle_royale.seance_votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references battle_royale.rounds (id) on delete cascade,
  ghost_player_id uuid not null references battle_royale.players (id),
  narration_option text not null,
  cast_at timestamptz not null default now(),
  unique (round_id, ghost_player_id)
);
