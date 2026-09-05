-- Private player-to-GM channel only (game-design v0.9 section 11) — never
-- player-to-player. sender_role records who wrote this particular message.
create table battle_royale.helpline_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references battle_royale.games (id) on delete cascade,
  player_id uuid not null references battle_royale.players (id),
  sender_role battle_royale.player_role not null,
  body text not null,
  in_reply_to uuid references battle_royale.helpline_messages (id),
  created_at timestamptz not null default now()
);

create index helpline_messages_game_id_idx on battle_royale.helpline_messages (game_id);
create index helpline_messages_player_id_idx on battle_royale.helpline_messages (player_id);
