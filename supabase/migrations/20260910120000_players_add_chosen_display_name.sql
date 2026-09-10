-- The invite's display_name (set by the GM) stays fixed and is what the GM sees when
-- attributing votes/eliminations/door picks -- chosen_display_name is what the player
-- picks for themselves at redeem time and is what everyone else (roster, narration,
-- their own status) sees instead, once set. Nullable: a player who redeems without
-- entering one just keeps showing the invite name everywhere, same as before this
-- column existed.
alter table battle_royale.players
  add column chosen_display_name text,
  add constraint players_chosen_display_name_length check (chosen_display_name is null or char_length(chosen_display_name) <= 60);
