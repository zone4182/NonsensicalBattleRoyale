<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useGameStore, type RoomId } from "../stores/game";
import { useSessionStore } from "../stores/session";
import { callFunction, ApiCallError } from "../lib/api";
import { ALL_ROOM_IDS, FLOORS_TOP_TO_BOTTOM, ROOMS, validDestinations, type Floor } from "../constants/mansion";

// Own route (not a v-if inside MainRoundView), same reasoning as PrivateVoteModal:
// moving/guessing is a distinct action with its own select-then-confirm flow, not
// something that belongs inline in the public hub.
const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const session = useSessionStore();

const showStaircaseHelp = ref(false);
const selectedMoveTarget = ref<RoomId | null>(null);
const movePending = ref(false);
const moveError = ref<string | null>(null);

const selectedGuessTarget = ref<RoomId | null>(null);
const guessPending = ref(false);
const guessError = ref<string | null>(null);

const MOVE_ERROR_MESSAGES: Record<string, string> = {
  mini_game_disabled: t("moveToRoom.errors.miniGameDisabled"),
  no_open_round: t("moveToRoom.errors.noOpenRound"),
  no_room_assigned: t("moveToRoom.errors.noRoomAssigned"),
  invalid_destination: t("moveToRoom.errors.invalidDestination"),
};

const GUESS_ERROR_MESSAGES: Record<string, string> = {
  mini_game_disabled: t("moveToRoom.errors.miniGameDisabled"),
  no_open_round: t("moveToRoom.errors.noOpenRound"),
  no_guess_assigned: t("moveToRoom.errors.noGuessAssigned"),
};

onMounted(() => {
  if (game.players.length === 0 && session.token) game.refresh(session.token);
});

// Defense in depth, same reasoning as PrivateVoteModal's own guard: the "Move" button
// only shows when the mini-game is enabled, but a bookmarked/back-button visit could
// still land here after the fact. `game.gameId === null` means the store's initial
// refresh (kicked off by onMounted above) hasn't resolved yet -- treated as "not yet
// known" rather than "disabled" so a direct navigation here doesn't get bounced before
// its own data has even loaded, same null-is-not-yet-known reasoning PrivateVoteModal
// applies to votesRemaining.
watch(
  () => (game.gameId === null ? null : (game.moveToRoom?.enabled ?? false)),
  (enabled) => {
    if (enabled === false) router.push({ name: "main-round" });
  },
  { immediate: true },
);

const yourRoomId = computed(() => game.moveToRoom?.yourRoomId ?? null);
const occupancyByRoom = computed(() => {
  const map = new Map<RoomId, number>();
  for (const o of game.moveToRoom?.occupancy ?? []) map.set(o.roomId, o.heat);
  return map;
});
const legalDestinations = computed(() => (yourRoomId.value ? new Set(validDestinations(yourRoomId.value)) : new Set<RoomId>()));

const alreadyMoved = computed(() => game.moveToRoom?.currentRound?.yourMoveSubmitted ?? null);
const guessTarget = computed(() => game.moveToRoom?.currentRound?.guessTarget ?? null);
const alreadyGuessed = computed(() => game.moveToRoom?.currentRound?.yourGuessSubmitted ?? null);
const points = computed(() => game.moveToRoom?.points ?? 0);

function roomsOnFloor(floor: Floor) {
  return ALL_ROOM_IDS.filter((id) => ROOMS[id].floor === floor);
}

function heatClass(roomId: RoomId) {
  return `heat-${occupancyByRoom.value.get(roomId) ?? 0}`;
}

function selectMoveTarget(roomId: RoomId) {
  if (!legalDestinations.value.has(roomId)) return;
  selectedMoveTarget.value = roomId;
}

function selectGuessTarget(roomId: RoomId) {
  selectedGuessTarget.value = roomId;
}

async function confirmMove() {
  const token = session.token;
  if (!token || !selectedMoveTarget.value || movePending.value) return;
  movePending.value = true;
  moveError.value = null;
  try {
    await callFunction("submit-room-move", { target_room_id: selectedMoveTarget.value }, { token });
    await game.refresh(token);
    selectedMoveTarget.value = null;
  } catch (err) {
    moveError.value = err instanceof ApiCallError ? (MOVE_ERROR_MESSAGES[err.code] ?? err.message) : t("common.somethingWentWrong");
  } finally {
    movePending.value = false;
  }
}

async function confirmGuess() {
  const token = session.token;
  if (!token || !selectedGuessTarget.value || guessPending.value) return;
  guessPending.value = true;
  guessError.value = null;
  try {
    await callFunction("submit-room-guess", { guessed_room_id: selectedGuessTarget.value }, { token });
    await game.refresh(token);
    selectedGuessTarget.value = null;
  } catch (err) {
    guessError.value = err instanceof ApiCallError ? (GUESS_ERROR_MESSAGES[err.code] ?? err.message) : t("common.somethingWentWrong");
  } finally {
    guessPending.value = false;
  }
}

function close() {
  router.push({ name: "main-round" });
}
</script>

<template>
  <section class="screen move-to-room">
    <h1>{{ t("moveToRoom.title") }}</h1>
    <p>{{ t("moveToRoom.description") }}</p>
    <p class="points">
      {{ t("moveToRoom.pointsLabel", { points }) }}
    </p>

    <button
      type="button"
      class="staircase-toggle"
      @click="showStaircaseHelp = !showStaircaseHelp"
    >
      {{ showStaircaseHelp ? t("moveToRoom.hideStaircaseHelp") : t("moveToRoom.showStaircaseHelp") }}
    </button>
    <p
      v-if="showStaircaseHelp"
      class="field-hint"
    >
      {{ t("moveToRoom.staircaseHelp") }}
    </p>

    <div class="floors">
      <div
        v-for="floor in FLOORS_TOP_TO_BOTTOM"
        :key="floor"
        class="floor pixel-frame"
      >
        <h2>{{ t(`moveToRoom.floors.${floor}`) }}</h2>
        <div class="grid">
          <button
            v-for="roomId in roomsOnFloor(floor)"
            :key="roomId"
            type="button"
            class="room-cell"
            :class="[heatClass(roomId), { 'is-you': roomId === yourRoomId, 'is-legal': legalDestinations.has(roomId), 'is-selected': roomId === selectedMoveTarget }]"
            :disabled="!legalDestinations.has(roomId) || alreadyMoved !== null"
            @click="selectMoveTarget(roomId)"
          >
            <span class="room-name">{{ t(`moveToRoom.rooms.${roomId}`) }}</span>
            <span
              v-if="roomId === yourRoomId"
              class="you-marker"
            >{{ t("moveToRoom.youMarker") }}</span>
          </button>
        </div>
      </div>
    </div>

    <p
      v-if="alreadyMoved"
      class="field-hint"
    >
      {{ t("moveToRoom.moveSubmitted", { room: t(`moveToRoom.rooms.${alreadyMoved}`) }) }}
    </p>
    <p
      v-else
      class="field-hint"
    >
      {{ t("moveToRoom.moveOptionalHint") }}
    </p>
    <p
      v-if="moveError"
      class="error"
    >
      {{ moveError }}
    </p>
    <div class="actions">
      <button
        type="button"
        :disabled="!selectedMoveTarget || movePending"
        @click="confirmMove"
      >
        {{ movePending ? t("moveToRoom.moving") : t("moveToRoom.confirmMove") }}
      </button>
    </div>

    <section
      v-if="guessTarget"
      class="guess-block pixel-frame"
    >
      <h2>{{ t("moveToRoom.guess.heading") }}</h2>
      <p>{{ t("moveToRoom.guess.description", { name: guessTarget.displayName }) }}</p>
      <div class="guess-options">
        <button
          v-for="roomId in ALL_ROOM_IDS"
          :key="roomId"
          type="button"
          class="guess-option"
          :class="{ 'is-selected': roomId === selectedGuessTarget }"
          :disabled="alreadyGuessed !== null"
          @click="selectGuessTarget(roomId)"
        >
          {{ t(`moveToRoom.rooms.${roomId}`) }}
        </button>
      </div>
      <p
        v-if="alreadyGuessed"
        class="field-hint"
      >
        {{ t("moveToRoom.guess.submitted", { room: t(`moveToRoom.rooms.${alreadyGuessed}`) }) }}
      </p>
      <p
        v-else
        class="field-hint"
      >
        {{ t("moveToRoom.guess.optionalHint") }}
      </p>
      <p
        v-if="guessError"
        class="error"
      >
        {{ guessError }}
      </p>
      <div class="actions">
        <button
          type="button"
          :disabled="!selectedGuessTarget || guessPending"
          @click="confirmGuess"
        >
          {{ guessPending ? t("moveToRoom.guess.guessing") : t("moveToRoom.guess.confirmGuess") }}
        </button>
      </div>
    </section>

    <button
      type="button"
      class="close-button"
      @click="close"
    >
      {{ t("common.close") }}
    </button>
  </section>
</template>

<style scoped>
.points {
  color: var(--nbr-accent);
  font-weight: bold;
}

.staircase-toggle {
  align-self: flex-start;
  background: none;
  color: var(--nbr-muted);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1) var(--nbr-space-2);
  font-size: 0.85em;
}

.field-hint {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin: var(--nbr-space-1) 0;
}

.floors {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
  margin-top: var(--nbr-space-3);
}

.floor {
  padding: var(--nbr-space-3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--nbr-space-2);
  margin-top: var(--nbr-space-2);
}

.room-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--nbr-space-1);
  padding: var(--nbr-space-3) var(--nbr-space-1);
  min-height: 4.5rem;
  background: var(--nbr-bg-raised);
  border: 1px solid var(--nbr-border);
  color: var(--nbr-muted);
  text-align: center;
  font-size: 0.8em;
}

.room-cell:disabled {
  cursor: default;
  opacity: 0.5;
}

.room-cell.is-legal {
  color: var(--nbr-fg);
  border-color: var(--nbr-border);
  cursor: pointer;
}

.room-cell.is-legal:not(:disabled):hover {
  border-color: var(--nbr-accent);
}

.room-cell.is-selected {
  border-color: var(--nbr-accent);
  box-shadow: 0 0 0 1px var(--nbr-accent);
}

.room-cell.is-you {
  color: var(--nbr-accent);
}

.you-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 1px solid var(--nbr-accent);
  font-size: 0.7em;
}

/* Tiered occupancy heat -- brightness steps, never an exact headcount. */
.heat-0 {
  background: var(--nbr-bg-raised);
}
.heat-1 {
  background: color-mix(in srgb, var(--nbr-accent) 12%, var(--nbr-bg-raised));
}
.heat-2 {
  background: color-mix(in srgb, var(--nbr-accent) 24%, var(--nbr-bg-raised));
}
.heat-3 {
  background: color-mix(in srgb, var(--nbr-accent) 40%, var(--nbr-bg-raised));
}

.actions {
  display: flex;
  gap: var(--nbr-space-2);
  margin-top: var(--nbr-space-2);
}

.error {
  color: var(--nbr-danger);
}

.guess-block {
  margin-top: var(--nbr-space-4);
  padding: var(--nbr-space-3);
}

.guess-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nbr-space-2);
  margin-top: var(--nbr-space-2);
}

.guess-option {
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2) var(--nbr-space-3);
  font-size: 0.85em;
}

.guess-option:disabled {
  opacity: 0.5;
}

.guess-option.is-selected {
  border-color: var(--nbr-accent);
  box-shadow: 0 0 0 1px var(--nbr-accent);
}

.close-button {
  margin-top: var(--nbr-space-4);
  width: 100%;
}
</style>
