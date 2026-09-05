<!--
  CONTEXT FILE FOR AI CODING ASSISTANTS (e.g. Claude Code)

  This file defines the TECHNICAL ARCHITECTURE for this project.
  Pair it with GAME-DESIGN.md, which defines the rules/mechanics this
  architecture must support. Treat both as source of truth.

  Status: v0.1 — foundational stack decisions are locked; implementation-level
  detail (exact function structure, testing strategy, CI/CD) is intentionally
  open and should be figured out during build, not assumed from this file.
-->

# Battle Royale — Architecture (v0.1)

Thin, free-tier-first stack. No custom server to host or maintain — the frontend is fully static, and all backend logic runs as Supabase Edge Functions colocated with the database.

## Stack at a glance

- **Frontend:** Vue 3 + TypeScript + Vite, built as a PWA (`vite-plugin-pwa`), state via Pinia, routing via Vue Router.
- **Hosting (frontend):** Azure Static Web Apps, free tier, custom domain.
- **Backend logic:** Supabase Edge Functions (TypeScript/Deno) — this is where every privileged operation lives. No separate Node server.
- **Database:** existing Supabase Postgres project, isolated in a dedicated schema: `battle_royale`. Fully separate from the other app's tables sharing this Supabase project — this costs nothing extra (schemas aren't a billing dimension).
- **Scheduling:** Supabase's scheduled/cron functions, for round resolution and notification firing.
- **Auth/identity:** no Supabase Auth, no passwords. A unique per-person invite token *is* the identity, sent as a bearer credential on every Edge Function call. The Human GM uses the same token-identity model as players (one token per game they run, not a persistent cross-game account).
- **Notifications:** Web Push (VAPID) now via the PWA service worker; native push (APNs/FCM) added later without changing the trigger logic.
- **Native path:** Capacitor wraps this same Vue build for iOS/Android later — no rewrite, no separate codebase.

## Critical architectural rule

**The Vue client never queries Postgres directly.** Every read and write goes through an Edge Function. This is deliberate, not incidental — it's what makes vote anonymity, power validation, and GM-override logging actually enforceable, rather than relying on Row Level Security alone. RLS is a defense-in-depth backstop, not the primary access control.

Do not add direct Supabase client table queries from the Vue app for anything touching votes, powers, GM actions, or player identity — route it through an Edge Function, even if it feels like unnecessary overhead for a simple read.

## Edge Functions (indicative — exact structure TBD)

| Function | Purpose |
|---|---|
| `redeem-invite` | Validates invite token, marks player arrived, triggers arrival prologue |
| `submit-vote` | Private vote submission; never returns vote contents to any client |
| `use-power` | Validates and applies a power effect |
| `gm-action` | Single entry point for all GM authority (tie-breaks, grants, twists across votes/powers/timing/outcomes, narration edits) — always logged |
| `seance-vote` | Ghost narration-flavor vote, resolves majority/tie server-side |
| `helpline-message` | Private player-to-GM question channel |
| `resolve-round` (scheduled) | Tallies votes, applies powers, determines elimination at deadline |
| `send-notifications` (scheduled) | Fires push notifications for deadlines/events |

## Data model (schema: `battle_royale`)

Core entities: `games`, `invites` (unique token per person), `players` (role: player or gm, same identity model), `rounds`, `votes`, `powers_catalogue`, `power_grants` (fully logged regardless of source), `gm_actions` (fully logged), `seance_votes`, `narration_log`, `helpline_messages`.

**Hard rule:** `votes` is never joined to player identity in any query path except the single end-of-game reveal function. This mirrors the "always private and anonymous" rule in GAME-DESIGN.md and must hold at the function level, not just in the UI.

## Isolation from the existing app

- Dedicated Postgres schema (`battle_royale`), not table prefixes in `public`.
- Since the client never talks to Postgres directly, this isolation doesn't depend on Supabase's "exposed schemas" API setting — Edge Functions can query any schema.
- Zero cost impact on the free tier.

## Not needed for v1 (don't build unless asked)

- No websockets/Supabase Realtime — the async, low-concurrency usage pattern (per design discussion) doesn't need live sync. Can be added later for optional non-identifying indicators if desired.
- No custom Node/Express server.
- No canvas/WebGL/game engine — rendering is text/CSS-driven throughout.
- No traditional password/email auth system.

## Open technical questions (do not assume answers)

1. Exact Edge Function folder structure and shared types between frontend/functions.
2. Whether the GM panel is a separate route in the same Vue app (leaning yes) or a separate app.
3. Asset hosting for cinematic images/gifs — likely Supabase Storage for per-game uploads, bundled static assets for fixed/shared content.
4. CI/CD pipeline for deploying frontend (Azure) and functions (Supabase).
5. Testing strategy for Edge Functions, given how much game-integrity logic lives there.
