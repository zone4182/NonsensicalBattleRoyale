-- GM-settable deadline for the Three Doors endgame, mirroring round_interval_minutes.
-- three_doors_phase_started_at is stamped the moment the game enters the 'three_doors'
-- phase (see resolve-round/index.ts); resolve-doors computes the actual deadline as
-- that timestamp plus this many minutes, and treats an incomplete pick set past that
-- deadline the same as a door-collision -- everyone still standing loses.
alter table battle_royale.games
  add column three_doors_deadline_minutes integer not null default 10,
  add column three_doors_phase_started_at timestamptz;
