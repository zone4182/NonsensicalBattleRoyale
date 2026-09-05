-- Dedicated schema, fully isolated from other apps sharing this Supabase project.
create schema if not exists battle_royale;

create type battle_royale.game_phase as enum ('setup', 'active', 'three_doors', 'ended');

create type battle_royale.missed_deadline_mode as enum (
  'forfeit_fatal',
  'no_consequence',
  'one_round_penalty'
);

create type battle_royale.round1_start_mode as enum (
  'wait_for_all',
  'gm_manual',
  'scheduled'
);

create type battle_royale.player_role as enum ('player', 'gm');

create type battle_royale.player_status as enum ('alive', 'ghost');

create type battle_royale.power_acquisition_method as enum ('random', 'earned', 'gm_grant');

create type battle_royale.power_category as enum ('informational', 'defensive', 'offensive', 'chaos');
