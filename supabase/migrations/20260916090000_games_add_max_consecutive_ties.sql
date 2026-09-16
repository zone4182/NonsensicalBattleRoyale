-- Refinement of tie_break_mode = 'no_elimination': lets a GM cap how many
-- consecutive top-vote ties are allowed before the game forces a resolution instead
-- of letting the stalemate continue indefinitely. -1 (default) disables this entirely,
-- same sentinel convention as games.double_vote_floor_rounds. Only meaningful when
-- tie_break_mode = 'no_elimination' -- a 'random' game never has a no-elimination
-- streak to count in the first place.
alter table battle_royale.games
  add column max_consecutive_ties integer not null default -1,
  add column max_ties_behavior text not null default 'coin_flip'
    check (max_ties_behavior in ('coin_flip', 'least_votes_dies'));
