-- Optional, voter-supplied reason shown to the GM alongside who voted for whom
-- (gm-game-overview) -- never shown to other players, same access boundary as the vote
-- itself (see the table's own header comment: only the sanctioned reveal paths ever
-- read this table).
alter table battle_royale.votes
  add column reason text,
  add constraint votes_reason_length check (reason is null or char_length(reason) <= 100);
