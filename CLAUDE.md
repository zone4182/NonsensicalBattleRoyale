# NonsensicalBattleRoyale

A party/murder-mystery game. `web/` is a Vue 3 + Vite PWA client; `supabase/` holds the Postgres schema and Deno edge functions that run the game logic (rounds, votes, outcomes).

## Themes

The game is designed to support multiple **themes**: the mechanics, sequence of phases, and outcomes stay identical across every theme, but the story, narration text, and visuals change per theme. Only one theme exists today: **murder-at-the-manor** (a friends' weekend at a mansion where the host is murdered and the survivors must vote each other out).

Theme content specs live in `concept/story/themes/<theme-id>.md` — see [`concept/story/themes/murder-at-the-manor.md`](concept/story/themes/murder-at-the-manor.md) for the current theme's setting, cast, story beats, and visual direction. When adding a new theme, write its spec there first, following the same structure.

In the game setup UI, the theme is meant to be a dropdown selection (currently only one option). This is not yet implemented — see the refactor below.

### Refactor needed before a second theme can be added

**This has not been implemented yet — proposal only, for review.**

Story/narrative content is currently scattered across three places, and is not separated from game mechanics:

- **Backend narration templates**: hardcoded strings in `supabase/functions/_shared/story.ts` (e.g. `PROLOGUE_OUTCOME_NARRATION`) and inline in `supabase/functions/resolve-round/index.ts` (elimination announcement templates), rendered server-side and persisted as plain text in the `narration_log` table.
- **Frontend story copy**: hardcoded as i18n keys in `web/src/locales/en.json` / `nl.json` (e.g. `storyPart1a`, `storyPart2b`), mixed in with regular UI copy.
- **Room/character identifiers conflated with theme flavor**: room slugs like `kitchen`, `master_bedroom` (defined in both `supabase/functions/_shared/mansion.ts` and `web/src/constants/mansion.ts`) are theme-specific *names* baked directly into game logic and narration text, rather than generic mechanic identifiers with a theme-specific display label.

Proposed approach:

1. **Introduce a generic mechanic layer, decoupled from theme naming.** Replace theme-flavored identifiers (`kitchen`, `master_bedroom`, ...) with generic slots (e.g. `room_1`, `room_2`, ...) in game logic and DB rows. Each theme then supplies a display name/description per slot.
2. **Introduce a single theme-content resolution layer** that both backend and frontend read from, e.g. `content/<themeId>/<locale>.json` (or a `theme_content` table if runtime/GM-configurable themes are wanted later), keyed by beat/round/outcome. This replaces the hardcoded strings in `story.ts`, `resolve-round/index.ts`, and the story-related keys in the locale files.
3. **Add a `theme_id` to the `games` table**, selected at game setup, so every narration lookup and room-name lookup for that game resolves through the theme's content.
4. **Wire `PlaceholderVisual.vue` (and any future image references) to resolve images per theme** (`content/<themeId>/images/...`) instead of the single hardcoded placeholder.
5. Keep `narration_log` as-is (it stores rendered text, which is correct for a game's history) — only the *template* lookup becomes theme-aware, not the persisted log.

This is a cross-cutting change (backend, DB, frontend) and should be scoped as its own task, separate from adding theme content docs.
