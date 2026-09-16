-- GM-configurable choice of endgame (see concept/mini-games/russian-roulette-endgame.md)
-- plus the two new deadlines it needs: how long the shared endgame-transition screen
-- waits for all 3 finalists to click Continue before starting the real endgame anyway,
-- and (Russian Roulette only) how long each individual turn stays open before an
-- automatic self-shot fallback. endgame_transition_started_at is stamped the moment
-- alive count drops to 3 (see resolve-round/index.ts); the real endgame's own
-- started-at/deadline fields (three_doors_phase_started_at, roulette_state) are only
-- stamped once the transition actually completes.
alter table battle_royale.games
  add column endgame_mode text not null default 'three_doors'
    check (endgame_mode in ('three_doors', 'russian_roulette')),
  add column endgame_transition_deadline_minutes integer not null default 5,
  add column endgame_transition_started_at timestamptz,
  add column roulette_turn_deadline_minutes integer not null default 5;
