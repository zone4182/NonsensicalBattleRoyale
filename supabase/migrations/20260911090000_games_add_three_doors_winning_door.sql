-- The actual Three Doors mechanic: one door number is secretly, randomly chosen the
-- moment the game enters the 'three_doors' phase (see resolve-round/index.ts), and
-- resolve-doors compares each unique pick against it. Never exposed to players (or in
-- any API response at all) before resolution -- purely an internal value used to
-- compute door_picks.resolved_outcome.
alter table battle_royale.games
  add column three_doors_winning_door smallint check (three_doors_winning_door between 1 and 3);
