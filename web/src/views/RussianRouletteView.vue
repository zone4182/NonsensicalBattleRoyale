<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { useApiCall } from "../composables/useApiCall";
import { usePoll } from "../composables/usePoll";
import { useGameFinishedRedirect } from "../composables/useGameFinishedRedirect";
import { callFunction } from "../lib/api";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

const POLL_INTERVAL_MS = 5_000;

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();
const { pending, run } = useApiCall();

useGameFinishedRedirect();

async function refresh() {
  if (!session.token) return;
  await game.refresh(session.token);
  if (game.phase === "ended") router.push({ name: "end-game-reveal" });
}

onMounted(refresh);
usePoll(refresh, POLL_INTERVAL_MS);

// Same countdown-tick pattern as RoundHeader/ThreeDoorsView, just against this turn's
// own deadline instead of a round's voting_deadline_at.
const now = ref(Date.now());
let tickHandle: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  tickHandle = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(tickHandle);
});

const countdown = computed(() => {
  const deadline = game.roulette?.turnDeadlineAt;
  if (!deadline) return null;
  const remainingMs = new Date(deadline).getTime() - now.value;
  if (remainingMs <= 0) return t("russianRoulette.deadlinePassed");
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return t("russianRoulette.countdown", { minutes: String(minutes).padStart(2, "0"), seconds: String(seconds).padStart(2, "0") });
});

const otherAlivePlayers = computed(() => {
  if (!game.roulette) return [];
  return game.roulette.turnOrder.filter((p) => p.playerId !== session.playerId);
});

const currentPlayerName = computed(() => {
  const id = game.roulette?.currentPlayerId;
  if (!id) return null;
  return game.roulette?.turnOrder.find((p) => p.playerId === id)?.displayName ?? null;
});

const shootingTarget = ref<string | null>(null);

async function shoot(targetPlayerId: string) {
  shootingTarget.value = targetPlayerId;
  const result = await run(() => callFunction("submit-roulette-shot", { target_player_id: targetPlayerId }, { token: session.token as string }));
  shootingTarget.value = null;
  if (result) await refresh();
}
</script>

<template>
  <FullscreenLayout id="russian-roulette-screen">
    <h1>{{ t("russianRoulette.title") }}</h1>
    <p class="bullets">
      {{ t("russianRoulette.bulletsRemaining", { count: game.roulette?.bulletsRemaining ?? 0 }) }}
    </p>

    <section
      id="russian-roulette-turn-panel"
      class="panel pixel-frame"
    >
      <template v-if="game.roulette?.isYourTurn">
        <p class="prompt">
          {{ t("russianRoulette.yourTurn") }}
        </p>
        <p
          v-if="game.roulette.forcedSelfOnly"
          class="forced-notice"
        >
          {{ t("russianRoulette.forcedSelfOnly") }}
        </p>
        <div class="targets">
          <button
            type="button"
            :class="{ 'is-loading': shootingTarget === session.playerId }"
            :disabled="pending"
            @click="shoot(session.playerId as string)"
          >
            {{ t("russianRoulette.shootSelf") }}
          </button>
          <button
            v-for="p in otherAlivePlayers"
            :key="p.playerId"
            type="button"
            :class="{ 'is-loading': shootingTarget === p.playerId }"
            :disabled="pending || game.roulette.forcedSelfOnly"
            @click="shoot(p.playerId)"
          >
            {{ t("russianRoulette.shootOther", { name: p.displayName }) }}
          </button>
        </div>
      </template>
      <p
        v-else
        class="prompt"
      >
        {{ t("russianRoulette.waitingForTurn", { name: currentPlayerName ?? "?" }) }}
      </p>
      <p
        v-if="countdown"
        class="countdown"
      >
        {{ countdown }}
      </p>
    </section>

    <section
      id="russian-roulette-order-panel"
      class="panel pixel-frame"
    >
      <h2>{{ t("russianRoulette.turnOrder") }}</h2>
      <ol>
        <li
          v-for="p in game.roulette?.turnOrder ?? []"
          :key="p.playerId"
          :class="{ current: p.playerId === game.roulette?.currentPlayerId }"
        >
          {{ p.displayName }}
        </li>
      </ol>
    </section>

    <section
      v-if="(game.roulette?.shotHistory.length ?? 0) > 0"
      id="russian-roulette-history-panel"
      class="panel pixel-frame"
    >
      <h2>{{ t("russianRoulette.history") }}</h2>
      <ul>
        <li
          v-for="(shot, i) in [...(game.roulette?.shotHistory ?? [])].reverse()"
          :key="i"
        >
          {{
            shot.isSelf
              ? t(shot.hit ? "russianRoulette.historySelfHit" : "russianRoulette.historySelfMiss", { name: shot.shooterDisplayName })
              : t(shot.hit ? "russianRoulette.historyOtherHit" : "russianRoulette.historyOtherMiss", {
                shooter: shot.shooterDisplayName,
                target: shot.targetDisplayName,
              })
          }}
        </li>
      </ul>
    </section>
  </FullscreenLayout>
</template>

<style scoped>
.bullets {
  color: var(--nbr-danger);
  font-weight: bold;
  text-align: center;
}

.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
}

.prompt {
  margin: 0;
  font-style: italic;
  color: var(--nbr-muted);
}

.forced-notice {
  margin-top: var(--nbr-space-2);
  color: var(--nbr-danger);
  font-size: 0.9em;
}

.targets {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  margin-top: var(--nbr-space-3);
}

.countdown {
  margin-top: var(--nbr-space-2);
  color: var(--nbr-accent);
  text-align: right;
}

ol,
ul {
  margin: var(--nbr-space-2) 0 0 0;
  padding-left: var(--nbr-space-4);
}

li.current {
  color: var(--nbr-accent);
  font-weight: bold;
}
</style>
