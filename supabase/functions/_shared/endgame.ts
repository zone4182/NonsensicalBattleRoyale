// Shared endgame logic (concept/mini-games/russian-roulette-endgame.md) -- the
// endgame-transition gate (shared by both endgame modes) plus the full Russian
// Roulette turn-resolution engine. Three Doors' own resolution logic stays in
// resolve-doors/index.ts unchanged; only *when* its clock starts moved here.
import { sql } from "./db.ts";
import { castBotDoorPicks } from "./bots.ts";
import { publicName } from "./names.ts";
import {
  ENDGAME_TRANSITION_NARRATION,
  RUSSIAN_ROULETTE_INTRO_NARRATION,
  rouletteMissNarration,
  rouletteOtherHitNarration,
  rouletteSelfHitNarration,
  rouletteWinnerNarration,
} from "./story.ts";
import type { Game, Player, RouletteState } from "./types.ts";

type Exec = ReturnType<typeof sql>;

async function narrate(exec: Exec, gameId: string, body: string): Promise<void> {
  await exec`insert into battle_royale.narration_log (game_id, body) values (${gameId}, ${body})`;
}

// Called once, the instant alive count drops to 3 (see resolve-round/index.ts). Bots
// auto-ack immediately (same "acts instantly" convention as every other bot decision),
// and if that happens to mean every alive player has now acked (e.g. all 3 finalists
// are bots), the real endgame begins right away in the same transaction -- no wasted
// round-trip waiting on nobody.
export async function beginEndgameTransition(
  exec: Exec,
  game: Game,
  aliveRosterAfter: { id: string; isBot: boolean }[],
): Promise<Game["phase"]> {
  await exec`
    update battle_royale.games
    set phase = 'endgame_transition', endgame_transition_started_at = now()
    where id = ${game.id}
  `;
  await narrate(exec, game.id, ENDGAME_TRANSITION_NARRATION[game.endgame_mode]);

  const botIds = aliveRosterAfter.filter((p) => p.isBot).map((p) => p.id);
  if (botIds.length > 0) {
    await exec`
      update battle_royale.players set endgame_transition_acked_at = now()
      where id in ${exec(botIds)} and endgame_transition_acked_at is null
    `;
  }

  return await maybeBeginRealEndgame(exec, game);
}

// Called both by ack-endgame-transition (the moment the last player clicks Continue)
// and by resolve-endgame-transition (the deadline fallback sweep). Returns the game's
// resulting phase either way, so callers can tell whether anything actually happened.
export async function maybeBeginRealEndgame(exec: Exec, game: Game): Promise<Game["phase"]> {
  const [{ phase }] = await exec<{ phase: Game["phase"] }[]>`
    select phase from battle_royale.games where id = ${game.id}
  `;
  if (phase !== "endgame_transition") return phase;

  const alivePlayers = await exec<{ id: string; endgame_transition_acked_at: string | null }[]>`
    select id, endgame_transition_acked_at from battle_royale.players
    where game_id = ${game.id} and status = 'alive' and role = 'player'
  `;
  const allAcked = alivePlayers.length > 0 && alivePlayers.every((p) => p.endgame_transition_acked_at !== null);

  const deadlinePassed =
    game.endgame_transition_started_at !== null &&
    Date.now() >= new Date(game.endgame_transition_started_at).getTime() + game.endgame_transition_deadline_minutes * 60_000;

  if (!allAcked && !deadlinePassed) return "endgame_transition";

  return await beginRealEndgame(exec, game);
}

async function beginRealEndgame(exec: Exec, game: Game): Promise<Game["phase"]> {
  const aliveRoster = await exec<Player[]>`
    select * from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
  `;

  if (game.endgame_mode === "russian_roulette") {
    const order = shuffle(aliveRoster.map((p) => p.id));
    await exec`
      update battle_royale.games set phase = 'russian_roulette' where id = ${game.id}
    `;
    await exec`
      insert into battle_royale.roulette_state
        (game_id, bullets_remaining, turn_order, current_turn_index, pass_number, forced_self_only_player_ids, current_turn_deadline_at)
      values (
        ${game.id}, 2, ${exec.json(order)}, 0, 1, ${exec.json([])},
        now() + (${game.roulette_turn_deadline_minutes} || ' minutes')::interval
      )
    `;
    await narrate(exec, game.id, RUSSIAN_ROULETTE_INTRO_NARRATION);
    await advanceRouletteBotTurns(exec, game, aliveRoster);
    const [{ phase }] = await exec<{ phase: Game["phase"] }[]>`select phase from battle_royale.games where id = ${game.id}`;
    return phase;
  }

  // three_doors -- the one real mechanic: a single door is secretly correct, chosen
  // now and never exposed anywhere before resolve-doors uses it. All three doors are
  // labeled "Exit" in the UI specifically so this stays hidden.
  const winningDoor = 1 + Math.floor(Math.random() * 3);
  await exec`
    update battle_royale.games
    set phase = 'three_doors', three_doors_winning_door = ${winningDoor}, three_doors_phase_started_at = now()
    where id = ${game.id}
  `;
  const aliveBotIds = aliveRoster.filter((p) => p.is_bot).map((p) => p.id);
  await castBotDoorPicks(exec, game.id, aliveBotIds);
  return "three_doors";
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Resolves one shot -- shared by submit-roulette-shot (human choice), the bot
// auto-player below, and resolve-roulette-timeouts' AFK fallback (self-shot). Handles
// elimination, bullet count, the win check, and reshuffling/narration for whatever
// happens next. Returns true if the game ended (exactly one player left).
export async function applyRouletteShot(
  exec: Exec,
  game: Game,
  nameById: Map<string, string>,
  shooterId: string,
  targetId: string,
): Promise<{ hit: boolean; gameEnded: boolean }> {
  const isSelf = shooterId === targetId;
  const [state] = await exec<RouletteState[]>`select * from battle_royale.roulette_state where game_id = ${game.id} for update`;

  const hit = Math.random() < state.bullets_remaining / 6;

  await exec`
    insert into battle_royale.roulette_shots (game_id, round_number, shooter_player_id, target_player_id, is_self, hit)
    values (${game.id}, ${state.pass_number}, ${shooterId}, ${targetId}, ${isSelf}, ${hit})
  `;

  const shooterName = nameById.get(shooterId) ?? "someone";
  const targetName = nameById.get(targetId) ?? "someone";

  if (!hit) {
    await narrate(exec, game.id, rouletteMissNarration(shooterName, isSelf, targetName));

    // Other-shot miss: the shooter is forced to self-target on their very next
    // individual turn, whenever that actually comes around (possibly after a
    // reshuffle) -- an array because more than one player can be carrying this flag
    // at once, see the migration's own comment.
    let forcedIds = state.forced_self_only_player_ids;
    if (!isSelf) forcedIds = [...new Set([...forcedIds, shooterId])];

    const atEndOfPass = state.current_turn_index + 1 >= state.turn_order.length;
    if (atEndOfPass) {
      const alive = await exec<{ id: string }[]>`
        select id from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
      `;
      await exec`
        update battle_royale.roulette_state
        set turn_order = ${exec.json(shuffle(alive.map((p) => p.id)))}, current_turn_index = 0,
          pass_number = pass_number + 1, forced_self_only_player_ids = ${exec.json(forcedIds)},
          current_turn_deadline_at = now() + (${game.roulette_turn_deadline_minutes} || ' minutes')::interval,
          updated_at = now()
        where game_id = ${game.id}
      `;
    } else {
      await exec`
        update battle_royale.roulette_state
        set current_turn_index = current_turn_index + 1, forced_self_only_player_ids = ${exec.json(forcedIds)},
          current_turn_deadline_at = now() + (${game.roulette_turn_deadline_minutes} || ' minutes')::interval,
          updated_at = now()
        where game_id = ${game.id}
      `;
    }
    return { hit: false, gameEnded: false };
  }

  // Hit -- always fatal, no wounding mechanic.
  await exec`
    update battle_royale.players set status = 'ghost' where id = ${targetId}
  `;
  await narrate(exec, game.id, isSelf ? rouletteSelfHitNarration(shooterName) : rouletteOtherHitNarration(shooterName, targetName));

  const aliveAfter = await exec<{ id: string }[]>`
    select id from battle_royale.players where game_id = ${game.id} and status = 'alive' and role = 'player'
  `;

  if (aliveAfter.length <= 1) {
    await exec`update battle_royale.games set phase = 'ended' where id = ${game.id}`;
    if (aliveAfter.length === 1) {
      await narrate(exec, game.id, rouletteWinnerNarration(nameById.get(aliveAfter[0].id) ?? "someone"));
    }
    return { hit: true, gameEnded: true };
  }

  // Other-kill penalty: the shooter can never go first in the reshuffled order that
  // follows their own kill.
  let newOrder = shuffle(aliveAfter.map((p) => p.id));
  if (!isSelf && newOrder[0] === shooterId) {
    const swapWith = 1 + Math.floor(Math.random() * (newOrder.length - 1));
    [newOrder[0], newOrder[swapWith]] = [newOrder[swapWith], newOrder[0]];
  }

  // forced_self_only flags survive a kill-triggered reshuffle the same as a
  // pass-boundary one -- only ever cleared when that specific player's turn consumes
  // it (see submit-roulette-shot / advanceRouletteBotTurns), or if that player just died.
  const forcedIds = state.forced_self_only_player_ids.filter((id) => id !== targetId);

  await exec`
    update battle_royale.roulette_state
    set bullets_remaining = bullets_remaining - 1, turn_order = ${exec.json(newOrder)}, current_turn_index = 0,
      pass_number = pass_number + 1, forced_self_only_player_ids = ${exec.json(forcedIds)},
      current_turn_deadline_at = now() + (${game.roulette_turn_deadline_minutes} || ' minutes')::interval,
      updated_at = now()
    where game_id = ${game.id}
  `;
  return { hit: true, gameEnded: false };
}

// Auto-resolves consecutive bot turns (uniform random target: self or a random living
// other, same "no strategy" convention as every other bot decision) until either a
// human's turn comes up or the game ends -- exactly like bots casting votes/door picks
// instantly today. Safe to call after any human action too, to chain-resolve whatever
// bot turns immediately follow it.
export async function advanceRouletteBotTurns(exec: Exec, game: Game, roster: Player[]): Promise<void> {
  const nameById = new Map(roster.map((p) => [p.id, publicName(p.display_name, p.chosen_display_name)]));
  const isBotById = new Map(roster.map((p) => [p.id, p.is_bot]));

  for (let guard = 0; guard < 200; guard++) {
    const [game_] = await exec<Game[]>`select * from battle_royale.games where id = ${game.id}`;
    if (game_.phase !== "russian_roulette") return;

    const [state] = await exec<RouletteState[]>`select * from battle_royale.roulette_state where game_id = ${game.id}`;
    const currentId = state.turn_order[state.current_turn_index];
    if (!currentId || !isBotById.get(currentId)) return;

    const forcedSelf = state.forced_self_only_player_ids.includes(currentId);
    let targetId = currentId;
    if (!forcedSelf) {
      const others = state.turn_order.filter((id) => id !== currentId);
      const candidates = [currentId, ...others];
      targetId = candidates[Math.floor(Math.random() * candidates.length)];
    }

    await applyRouletteShot(exec, game_, nameById, currentId, targetId);
  }
}
