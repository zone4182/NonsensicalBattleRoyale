import { errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { countActiveVotesForVoter, getActiveVoteTargetsForVoter, sql } from "../_shared/db.ts";
import { publicName } from "../_shared/names.ts";
import { ALL_ROOM_IDS, type RoomId } from "../_shared/mansion.ts";
import type { Player, Round } from "../_shared/types.ts";

// Read-only. Queries players/rounds/power_grants/narration_log freely, plus -- via the
// sanctioned getActiveVoteTargetsForVoter -- a player's own vote target(s), never
// another player's (ARCHITECTURE.md "Critical architectural rule" is about *who voted
// for whom* being hidden from OTHER players, not a player knowing their own choice). No
// role restriction -- both players and the GM can call this.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    const db = sql();

    const roster = await db<Player[]>`
      select id, display_name, chosen_display_name, status, role, is_bot from battle_royale.players
      where game_id = ${ctx.game.id}
      order by joined_at asc
    `;

    const rounds = await db<Round[]>`
      select id, round_number, voting_deadline_at, double_vote_player_id from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is null
      order by round_number desc
      limit 1
    `;
    const openRound = rounds[0];

    // Never queries votes.target_player_id or joins to another player's identity --
    // just this voter's own cast count against their own entitlement (ARCHITECTURE.md
    // "Critical architectural rule" is about *who voted for whom*, not a player knowing
    // their own remaining vote count).
    let votesRemainingThisRound: number | null = null;
    let voteLockedThisRound = false;
    let isDoubleVoteHolder = false;
    let yourActiveVotes: { targetPlayerId: string; reason: string | null }[] = [];
    if (openRound && ctx.role === "player" && ctx.player.status === "alive") {
      isDoubleVoteHolder = openRound.double_vote_player_id === ctx.player.id;
      const entitlement = isDoubleVoteHolder ? 2 : 1;
      const alreadyCast = await countActiveVotesForVoter(openRound.id, ctx.player.id);
      votesRemainingThisRound = Math.max(0, entitlement - alreadyCast);
      voteLockedThisRound = ctx.player.vote_locked_for_round_number === openRound.round_number;
      yourActiveVotes = await getActiveVoteTargetsForVoter(openRound.id, ctx.player.id);
    }

    const grants = await db<{ power_key: string; category: string; count: number }[]>`
      select pg.power_key, pc.category, count(*)::int as count
      from battle_royale.power_grants pg
      join battle_royale.powers_catalogue pc on pc.key = pg.power_key
      where pg.granted_to_player_id = ${ctx.player.id} and pg.used_at is null
      group by pg.power_key, pc.category
    `;

    const narration = await db<{ id: string; body: string; created_at: string }[]>`
      select id, body, created_at from battle_royale.narration_log
      where game_id = ${ctx.game.id}
      order by created_at desc
      limit 20
    `;

    // Move-to-Room mini-game. Tiered occupancy only (never an exact per-player
    // breakdown) -- capped at 3 ("crowded") so a handful of brightness steps is all a
    // room ever needs, and only alive role='player' rows count (a ghost's last room
    // shouldn't still show as occupied; the GM never has a meaningful position here).
    let moveToRoom: Record<string, unknown> | null = null;
    if (ctx.game.move_to_room_enabled) {
      const occupancyRows = await db<{ current_room_id: RoomId; count: number }[]>`
        select pr.current_room_id, count(*)::int as count
        from battle_royale.player_rooms pr
        join battle_royale.players p on p.id = pr.player_id
        where pr.game_id = ${ctx.game.id} and p.status = 'alive' and p.role = 'player'
        group by pr.current_room_id
      `;
      const countByRoom = new Map(occupancyRows.map((r) => [r.current_room_id, r.count]));
      const occupancy = ALL_ROOM_IDS.map((roomId) => ({
        room_id: roomId,
        heat: Math.min(countByRoom.get(roomId) ?? 0, 3),
      }));

      let yourRoomId: RoomId | null = null;
      let currentRoundState: Record<string, unknown> | null = null;

      if (ctx.role === "player") {
        const [yourRoom] = await db<{ current_room_id: RoomId }[]>`
          select current_room_id from battle_royale.player_rooms
          where game_id = ${ctx.game.id} and player_id = ${ctx.player.id}
        `;
        yourRoomId = yourRoom?.current_room_id ?? null;

        if (openRound && ctx.player.status === "alive") {
          const [move] = await db<{ target_room_id: RoomId }[]>`
            select target_room_id from battle_royale.round_room_moves
            where round_id = ${openRound.id} and player_id = ${ctx.player.id}
          `;
          const [assignment] = await db<{ target_player_id: string; display_name: string; chosen_display_name: string | null }[]>`
            select p.id as target_player_id, p.display_name, p.chosen_display_name
            from battle_royale.round_guess_assignments a
            join battle_royale.players p on p.id = a.target_player_id
            where a.round_id = ${openRound.id} and a.guesser_player_id = ${ctx.player.id}
          `;
          const [guess] = await db<{ guessed_room_id: RoomId }[]>`
            select guessed_room_id from battle_royale.round_room_guesses
            where round_id = ${openRound.id} and guesser_player_id = ${ctx.player.id}
          `;

          currentRoundState = {
            your_move_submitted: move?.target_room_id ?? null,
            guess_target: assignment
              ? { player_id: assignment.target_player_id, display_name: publicName(assignment.display_name, assignment.chosen_display_name) }
              : null,
            your_guess_submitted: guess?.guessed_room_id ?? null,
          };
        }
      }

      moveToRoom = {
        enabled: true,
        your_room_id: yourRoomId,
        points: ctx.role === "player" ? ctx.player.room_guess_points : 0,
        occupancy,
        current_round: currentRoundState,
      };
    }

    // Three Doors' own deadline, mirroring current_round.voting_deadline_at -- and,
    // for a player, their own already-made pick, same "tell a returning visitor what
    // they already chose" reasoning as your_active_votes above (never another
    // player's pick; door_picks are only ever revealed for OTHERS via the end-of-game
    // reveal or the GM's own overview).
    let threeDoors: { deadline_at: string | null; your_pick: number | null } | null = null;
    if (ctx.game.phase === "three_doors") {
      const deadlineAt = ctx.game.three_doors_phase_started_at
        ? new Date(
            new Date(ctx.game.three_doors_phase_started_at).getTime() + ctx.game.three_doors_deadline_minutes * 60_000,
          ).toISOString()
        : null;
      let yourPick: number | null = null;
      if (ctx.role === "player") {
        const [pick] = await db<{ door_number: number }[]>`
          select door_number from battle_royale.door_picks where game_id = ${ctx.game.id} and player_id = ${ctx.player.id}
        `;
        yourPick = pick?.door_number ?? null;
      }
      threeDoors = { deadline_at: deadlineAt, your_pick: yourPick };
    }

    // Drives the epilogue placeholder's win/lose branch once the game has ended. A
    // Three Doors pick's own resolved_outcome is authoritative when one exists
    // (resolve-doors never flips players.status the way resolve-round's vote-off does);
    // otherwise this is a normal vote-off ending, where surviving to the end IS the win
    // condition. GM has no personal win/lose outcome -- stays null.
    let yourOutcome: "win" | "lose" | null = null;
    if (ctx.game.phase === "ended" && ctx.role === "player") {
      const [doorPick] = await db<{ resolved_outcome: string | null }[]>`
        select resolved_outcome from battle_royale.door_picks where game_id = ${ctx.game.id} and player_id = ${ctx.player.id}
      `;
      yourOutcome = doorPick ? (doorPick.resolved_outcome === "win" ? "win" : "lose") : ctx.player.status === "alive" ? "win" : "lose";
    }

    return jsonResponse({
      game_id: ctx.game.id,
      game_name: ctx.game.name,
      phase: ctx.game.phase,
      three_doors: threeDoors,
      round_resolution_mode: ctx.game.round_resolution_mode,
      allow_vote_change: ctx.game.allow_vote_change,
      current_round: openRound
        ? { round_number: openRound.round_number, voting_deadline_at: openRound.voting_deadline_at }
        : null,
      players: roster.map((p) => ({
        id: p.id,
        display_name: publicName(p.display_name, p.chosen_display_name),
        status: p.status,
        role: p.role,
        is_bot: p.is_bot,
      })),
      your_status: {
        status: ctx.player.status,
        held_powers: grants.map((g) => ({ power_key: g.power_key, category: g.category, count: g.count })),
        votes_remaining_this_round: votesRemainingThisRound,
        vote_locked_this_round: voteLockedThisRound,
        is_double_vote_holder: isDoubleVoteHolder,
        your_active_votes: yourActiveVotes.map((v) => ({ target_player_id: v.targetPlayerId, reason: v.reason })),
        your_outcome: yourOutcome,
      },
      narration_entries: narration.reverse().map((n) => ({ id: n.id, text: n.body, created_at: n.created_at })),
      move_to_room: moveToRoom,
    });
  } catch (err) {
    return errorResponse(err);
  }
});
