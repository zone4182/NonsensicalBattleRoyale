# Battle Royale — Technical Specification
**Version:** 0.1 (Draft — first architecture pass, based on Game Design v0.9)
**Status:** Foundational decisions locked; implementation-level detail intentionally left open to figure out during build.

---

## 1. Guiding Principles

- **Thin stack.** Prefer no infrastructure to maintain over infrastructure to maintain. Every component below was chosen to minimize moving parts and ongoing ops.
- **Free-tier first.** The whole stack should run at zero cost at the intended scale (a handful of concurrent friend-group games), using services already available: Azure (static hosting) and an existing Supabase Postgres project.
- **PWA now, native later without a rewrite.** The same Vue 3 codebase should extend to iOS/Android via a native wrapper rather than a parallel native build.
- **Rendering stays light.** The game design (Section: Visual & Interaction Inspiration) is text/CSS-driven — no canvas, no game engine, no WebGL is needed anywhere in this stack.
- **The client never directly performs privileged game logic.** Anything touching vote anonymity, power effects, GM overrides, or round resolution goes through a server-side function — never computed or trusted client-side.

---

## 2. Architecture Overview

```
┌────────────────────────────┐        ┌───────────────────────────────────────┐
│ Vue 3 + TypeScript PWA     │  HTTPS │ Supabase Edge Functions (TypeScript)   │
│ Hosted on Azure Static     │ ─────► │ - validate/redeem invite                │
│ Web Apps (free tier),      │        │ - submit vote                          │
│ custom domain              │ ◄───── │ - use power                             │
│                            │        │ - GM actions (twist/grant/tie-break/    │
│ Service worker: PWA +      │        │   edit narration)                      │
│ Web Push receiver          │        │ - seance vote                          │
└────────────────────────────┘        │ - scheduled: resolve round, send       │
                                       │   notifications                        │
                                       └───────────────┬─────────────────────────┘
                                                        │
                                                        ▼
                                       ┌───────────────────────────────────────┐
                                       │ Supabase Postgres (existing project)   │
                                       │ Dedicated schema: battle_royale        │
                                       │ (fully isolated from the other app's   │
                                       │ tables, which stay in their own        │
                                       │ schema(s))                             │
                                       └───────────────────────────────────────┘
```

The Vue app never queries Postgres directly. All reads and writes go through Edge Functions, which hold the service-role key and enforce every game rule (anonymity, permissions, logging) in one place. This keeps Row Level Security as a secondary safety net rather than the primary access control layer — simpler to reason about for a game with this many interlocking privacy rules (private votes, private powers, a GM with full override authority, progressive roster reveal).

---

## 3. Frontend

- **Framework:** Vue 3 + TypeScript, built with Vite.
- **State management:** Pinia.
- **Routing:** Vue Router.
- **PWA tooling:** `vite-plugin-pwa` for the manifest and service worker (installability + Web Push receiving).
- **Styling:** plain CSS with CSS custom properties (no heavy framework needed given the light rendering requirements) — informed by the terminal/chat-hybrid visual direction already documented separately.
- **Hosting:** Azure Static Web Apps, free tier, custom DNS attached.

No server-side rendering is needed — this is a fully static, client-rendered PWA that talks to Edge Functions over HTTPS.

---

## 4. Backend Logic — Supabase Edge Functions

All privileged operations live here as TypeScript (Deno runtime) functions. Indicative list (exact structure/naming to be finalized during implementation):

| Function | Purpose |
|---|---|
| `redeem-invite` | Validates a unique invite token, marks a player as arrived, triggers their personal arrival prologue content. |
| `submit-vote` | Accepts a private vote for the current round; never returns vote contents to any client. |
| `use-power` | Validates and applies a power (random/earned/GM-granted) against current round state. |
| `gm-action` | Single entry point for all GM authority: tie-breaks, anonymous power grants, twists (votes/powers/timing/outcomes), narration edits. Every call writes to the GM action log. |
| `seance-vote` | Records a ghost's vote for the round's narration flavor; resolves majority/tie server-side. |
| `helpline-message` | Private player-to-GM question/answer channel. |
| `resolve-round` *(scheduled)* | Runs at each round's deadline: tallies votes, applies pending power effects, determines elimination, advances state. |
| `send-notifications` *(scheduled)* | Fires Web Push (and later native push) for deadlines, arrivals, and narration events. |

Scheduling is handled via Supabase's scheduled/cron function support, colocated with the same database — no separate job runner needed.

---

## 5. Data Model (schema: `battle_royale`)

Indicative table shape — exact columns/types to be finalized during implementation, but the entity boundaries below reflect decisions already locked in the game design:

- **games** — one row per game instance; holds setup config (round interval, missed-deadline mode, Round 1 start-trigger mode, power-pool toggles, player count).
- **invites** — unique token per invited person, linked to a game; tracks accepted/arrived state; a token that never redeems before start is excluded per the No-show resolution rule.
- **players** — one row per accepted invite; role (`player` or `gm` — same token-identity model for both, per the design decision); alive/ghost status.
- **rounds** — one row per round in a game; deadline, resolution timestamp, resolved outcome.
- **votes** — voter, target, round; never joined to player identity in any query except the end-of-game reveal function.
- **powers_catalogue** — the fixed set of possible powers (from the design doc), each with its enabled/disabled toggle per game.
- **power_grants** — every power granted/used, by acquisition method (random/earned/GM), fully logged regardless of source, per the design's logging requirement.
- **gm_actions** — every tie-break, grant, twist, and narration edit, always logged for the end-of-game reveal.
- **seance_votes** — ghost votes on narration flavor per round.
- **narration_log** — the text stream shown in the main panel; supports GM edits before/at delivery.
- **helpline_messages** — private player-to-GM question/answer threads.

**Anonymity enforcement:** the `votes` table is never exposed to any client-facing query path except the single, explicit end-of-game reveal function — this is a function-level guarantee, not just a UI-level one, consistent with the "always private and anonymous" rule in the game design.

---

## 6. Identity & Auth Model

- No Supabase Auth (no passwords, no email/password signup).
- A player's **unique invite token is their identity** for that game — sent as a bearer credential from the client on every Edge Function call.
- The **Human GM uses the same token-identity model as players**, per the design decision — a GM running multiple games simply holds a separate token per game, not a persistent cross-game account.
- Row Level Security policies act as a defense-in-depth backstop; the actual access control logic lives in the Edge Functions, since the client never queries Postgres directly.

---

## 7. Notifications

- **Now (PWA):** Web Push via VAPID keys, received through the service worker registered by `vite-plugin-pwa`. Covers: invite delivery follow-ups, round-deadline reminders, narration/arrival events.
- **Later (native):** the same trigger logic in `send-notifications` extends to APNs/FCM once wrapped natively (Section 8) — the Edge Function layer doesn't need to change, only the delivery channel.

---

## 8. Native App Path

- **Capacitor** wraps the existing Vue/PWA build to produce iOS and Android app-store builds without a separate codebase or rewrite.
- Native push (APNs/FCM) is added at that point via Capacitor's push notification plugin, sitting alongside the existing Web Push path rather than replacing it.

---

## 9. Isolation from the Existing App

- All tables for this project live in a **dedicated Postgres schema** (`battle_royale`), fully separate from whatever schema(s) the existing app uses.
- Since the Vue client never talks to Postgres directly, there's no dependency on Supabase's "exposed schemas" API setting — Edge Functions can query any schema regardless of that configuration.
- This isolation costs nothing extra on Supabase's free tier — schemas are a Postgres organizational feature, not a billing dimension.

---

## 10. Open Technical Questions (to resolve during implementation, not blocking a start)

1. Exact Edge Function file/folder structure and shared TypeScript types between frontend and functions.
2. Whether to add Supabase Realtime later for optional, non-identifying live indicators (e.g. "a vote was just cast") — not needed for v1 given the async, low-concurrency usage pattern already established.
3. Whether the GM panel is a different route/permission level within the same Vue app, or a separate small app — leaning toward same app, gated by the GM token's role, but not yet finalized.
4. Asset hosting for cinematic images/gifs (Supabase Storage vs. bundled static assets in the Vue build) — likely Supabase Storage for anything GM-uploadable per game, bundled assets for anything fixed/shared across all games.
5. CI/CD setup for deploying the static frontend to Azure and Edge Functions to Supabase.
6. Testing strategy for the privileged Edge Functions, given how much game-integrity logic (anonymity, logging, GM override auditability) lives there.

---

*End of v0.1. This is a foundational architecture pass — expect implementation to surface adjustments, which should be reflected back into this document as they're settled.*
