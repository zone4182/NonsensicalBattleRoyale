# Bot simulations

## How to run one

1. Copy `settings.template.json` to a new file in this folder (e.g. `my-game.json`).
2. Edit the values to whatever you want to test.
3. Ask Claude to "run a simulation with the settings in `simulation/my-game.json`".

Claude creates the game with these exact settings (all-bots except the GM), starts
Round 1, and resolves each round the instant every bot has voted -- repeating until
the game ends (elimination down to 1, or Three Doors). The full session export lands
in `simulation/sessions/` when it's done.

## Fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | Game name, your own reference only. |
| `gm_display_name` | string | How the GM appears in narration/reveal. |
| `round_interval_minutes` | integer, min 10 | Doesn't really matter for a simulation -- every round resolves immediately once all bots have voted, regardless of this value. Still required by the game itself. |
| `missed_deadline_mode` | `"forfeit_fatal"` \| `"no_consequence"` \| `"one_round_penalty"` | Has no observable effect in a bot simulation -- bots always vote, so a missed deadline never actually happens. |
| `tie_break_mode` | `"random"` \| `"no_elimination"` | `"random"`: a genuine coin flip among tied players (the original behavior). `"no_elimination"`: a tie means no one dies that round. |
| `round1_start_mode` | `"wait_for_all"` \| `"gm_manual"` \| `"scheduled"` | Use `"gm_manual"` for simulations -- the other two modes don't make sense without real invited players on a clock. |
| `allow_vote_change` | boolean | Doesn't affect bots (they only ever cast once), included for completeness. |
| `double_vote_enabled` | boolean | Whether one random alive player gets a second vote each round. |
| `double_vote_floor_rounds` | integer, 1-20, or `-1` | How many recent rounds' holders are excluded from getting it again. `-1` is a stricter sentinel: each player gets it **at most once for the entire game**, no fallback once everyone's had a turn (see the "double vote silently stops" finding from the AutoSimulation16Bots run in `sessions/`). |
| `round_resolution_mode` | `"manual"` \| `"automatic"` | Doesn't matter for a simulation -- rounds are always resolved manually (immediately) regardless. |
| `bot_count` | integer, 1-19 | How many bots to fill the game with. **Must be at least 5** (the game's minimum player floor) for Round 1 to be able to start. |

## Past runs

`sessions/` holds full JSON exports (settings + every round's complete vote
breakdown + Three Doors picks) from simulations that have already been run, for
comparison across settings changes.
