<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { usePoll } from "../composables/usePoll";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

// Story text: concept/story/the-story-2.0.md, Phase 3 (Arrival) + Phase 4 (The
// Awakening and a Dark Discovery), English version. <Game Master> is swapped for the
// real GM's display name where we have it; "one of you" stands in for the fictional
// "randomly chosen player" rather than naming a real player for something that didn't
// actually happen to them.
const POLL_INTERVAL_MS = 15_000;

const router = useRouter();
const game = useGameStore();
const session = useSessionStore();

const gmName = computed(() => game.players.find((p) => p.role === "gm")?.displayName ?? "the Game Master");

// Round 1's start trigger is configurable per game (GAME-DESIGN.md) -- a player can
// land here well before there's anything to continue on to.
const canContinue = computed(() => game.phase !== null && game.phase !== "setup");

onMounted(() => {
  if (session.token) game.refresh(session.token);
});

usePoll(() => {
  if (session.token) game.refresh(session.token);
}, POLL_INTERVAL_MS);

function proceed() {
  router.push({ name: "main-round" });
}
</script>

<template>
  <FullscreenLayout>
    <h1>Arrival</h1>
    <section class="story-block pixel-frame">
      <p>
        Having accepted the invitation, you travel to the mansion mentioned in the
        letter. On arrival you find your old friends, each one happier to see you than
        the last. There's laughter, drinks, old stories being retold, and no shortage
        of arguing over who sleeps where. The catching-up runs deep into the night,
        until everyone finally goes to bed.
      </p>
      <p>
        None of you suspect that this will be the last night anything still feels
        normal.
      </p>
    </section>

    <h2>The Next Morning</h2>
    <section class="story-block pixel-frame">
      <p>
        Slowly, everyone wakes up. One by one, the guests drift into the kitchen --
        coffee, hangovers, the usual morning-after murmur. But {{ gmName }} is missing.
        Their seat at the table stays empty while the rest wonder where they've gotten
        to.
      </p>
      <p>
        One of you walks to the toilet -- and finds them there. Dead. Still half on
        the seat, pants around their ankles. A deep stab wound gapes in their neck; the
        blood has spread into a wide, dark pool across the tiles, reaching the walls
        and the sink. Their eyes are wide open, frozen in terror. The smell of blood
        hangs thick and sweet in the small, airless room. No doubt about it: this was
        no accident -- and whoever did it is still somewhere in this house.
      </p>
    </section>

    <div class="continue-block">
      <button
        v-if="canContinue"
        type="button"
        @click="proceed"
      >
        Continue
      </button>
      <p
        v-else
        class="field-hint"
      >
        Waiting for the rest of the house to arrive before the game can begin...
      </p>
    </div>
  </FullscreenLayout>
</template>

<style scoped>
.story-block {
  padding: var(--nbr-space-3);
  margin-bottom: var(--nbr-space-3);
}

.story-block p {
  margin: 0 0 var(--nbr-space-2) 0;
}

.story-block p:last-child {
  margin-bottom: 0;
}

.continue-block {
  margin-top: var(--nbr-space-3);
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
}
</style>
