<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore, type PrologueOption } from "../../stores/game";
import { useSessionStore } from "../../stores/session";
import { callFunction, ApiCallError } from "../../lib/api";
import PlaceholderVisual from "../PlaceholderVisual.vue";

// Round 1's group decision -- not the normal Vote button/modal (submit-vote), a
// completely separate mechanic (submit-prologue-vote) with its own fixed 3-option
// choice instead of a player target. Single click submits immediately (no
// select-then-confirm step, unlike the real elimination vote) -- re-clicking a
// different option still changes it right up until the round resolves, same
// upsert-until-resolved shape as every other vote in this app.
const { t } = useI18n();
const game = useGameStore();
const session = useSessionStore();

const OPTIONS: PrologueOption[] = ["call_police", "get_help", "drink_whisky"];

const pending = ref(false);
const errorMessage = ref<string | null>(null);

const isGhost = computed(() => game.yourStatus?.status === "ghost");
const selected = computed(() => game.yourStatus?.prologueVote ?? null);

const ERROR_MESSAGES: Record<string, string> = {
  no_open_round: t("prologueDecision.errors.noOpenRound"),
  not_prologue_round: t("prologueDecision.errors.notPrologueRound"),
};

async function choose(option: PrologueOption) {
  if (!session.token || pending.value || option === selected.value) return;
  pending.value = true;
  errorMessage.value = null;
  try {
    await callFunction("submit-prologue-vote", { option }, { token: session.token });
    await game.refresh(session.token);
  } catch (err) {
    errorMessage.value = err instanceof ApiCallError ? (ERROR_MESSAGES[err.code] ?? err.message) : t("common.somethingWentWrong");
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="prologue-decision">
    <template v-if="isGhost">
      <p class="status-text">
        {{ t("voteAction.ghostNotice") }}
      </p>
    </template>
    <template v-else>
      <PlaceholderVisual :caption="t('prologueDecision.imageCaption')" />
      <p class="prompt">
        {{ t("prologueDecision.prompt") }}
      </p>
      <div class="options">
        <button
          v-for="option in OPTIONS"
          :key="option"
          type="button"
          :class="{ selected: selected === option }"
          :disabled="pending"
          @click="choose(option)"
        >
          {{ t(`prologueDecision.options.${option}`) }}
        </button>
      </div>
      <p
        v-if="selected"
        class="status-text"
      >
        {{ t("prologueDecision.chosen", { option: t(`prologueDecision.options.${selected}`) }) }}
      </p>
      <p
        v-if="errorMessage"
        class="error"
      >
        {{ errorMessage }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.prologue-decision {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.prompt {
  margin: 0;
  font-style: italic;
  color: var(--nbr-muted);
}

.options {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
}

.options button.selected {
  border-color: var(--nbr-accent);
  color: var(--nbr-accent);
  box-shadow: 0 0 0 1px var(--nbr-accent);
}

.status-text {
  color: var(--nbr-muted);
  font-size: 0.85em;
  margin: 0;
}

.error {
  color: var(--nbr-danger);
  margin: 0;
}
</style>
