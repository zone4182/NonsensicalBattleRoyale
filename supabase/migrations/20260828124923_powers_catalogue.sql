-- Fixed catalogue of all named powers (game-design v0.9 section 8.3). All powers are
-- on by default per-game except false_flag, which the design doc flags for tone
-- review and may not ship in v1 — seeded disabled by default here.
create table battle_royale.powers_catalogue (
  key text primary key,
  category battle_royale.power_category not null,
  description text not null,
  default_enabled boolean not null default true
);

insert into battle_royale.powers_catalogue (key, category, description, default_enabled) values
  ('rewind', 'informational', 'Privately view the full vote breakdown of one already-completed past round.', true),
  ('whisper', 'informational', 'Learn (yes/no only) whether you were the top vote target last round.', true),
  ('watcher', 'informational', 'Learn who currently holds the double vote, without revealing it to anyone else.', true),
  ('ward', 'defensive', 'Immune to elimination for one round.', true),
  ('deflect', 'defensive', 'One vote cast against you this round is redirected back onto whoever cast it.', true),
  ('null', 'defensive', 'One vote cast against you this round is discarded.', true),
  ('second_voice', 'offensive', 'Grants a standalone double-vote effect outside its normal rotation.', true),
  ('compel', 'offensive', 'Force one player to privately reveal one vote they cast this round.', true),
  ('silence', 'offensive', 'Block one other player from using a power this round, anonymously.', true),
  ('swap', 'chaos', 'Exchange two players'' cast votes with each other before tallying.', true),
  ('false_flag', 'chaos', 'Send a private "tip" appearing to come from a third party of your choosing.', false);

-- Per-game on/off toggles, seeded from the catalogue defaults at game creation
-- (game-design v0.9 section 8.5 / 12.1).
create table battle_royale.game_power_settings (
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  power_key text not null references battle_royale.powers_catalogue (key),
  enabled boolean not null,
  primary key (game_id, power_key)
);
