import { errorResponse, jsonResponse, preflightResponse } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { sql } from "../_shared/db.ts";
import type { Player, Round } from "../_shared/types.ts";

// Read-only. Queries only players/rounds/power_grants/narration_log -- never votes,
// consistent with the anonymity hard rule (ARCHITECTURE.md "Critical architectural
// rule"). No role restriction -- both players and the GM can call this.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  try {
    const ctx = await authenticate(req);
    const db = sql();

    const roster = await db<Player[]>`
      select id, display_name, status, role from battle_royale.players
      where game_id = ${ctx.game.id}
      order by joined_at asc
    `;

    const rounds = await db<Round[]>`
      select round_number, voting_deadline_at from battle_royale.rounds
      where game_id = ${ctx.game.id} and resolved_at is null
      order by round_number desc
      limit 1
    `;

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

    return jsonResponse({
      phase: ctx.game.phase,
      current_round: rounds[0]
        ? { round_number: rounds[0].round_number, voting_deadline_at: rounds[0].voting_deadline_at }
        : null,
      players: roster.map((p) => ({ id: p.id, display_name: p.display_name, status: p.status, role: p.role })),
      your_status: {
        status: ctx.player.status,
        held_powers: grants.map((g) => ({ power_key: g.power_key, category: g.category, count: g.count })),
      },
      narration_entries: narration.reverse().map((n) => ({ id: n.id, text: n.body, created_at: n.created_at })),
    });
  } catch (err) {
    return errorResponse(err);
  }
});
