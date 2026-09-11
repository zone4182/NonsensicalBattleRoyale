<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";

// Reached only via useGameFinishedRedirect, once the GM's administrative "Finish game"
// flips games.finished_at -- there is nothing left to do in this game, so this screen's
// only job is to say so and clear the way back to a fresh invite. The session is only
// cleared here, on the way out, not on arrival -- this route still needs a valid
// session to pass the router's own auth guard.
const AUTO_REDIRECT_MS = 6000;

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

function leave() {
  session.clearSession();
  router.push({ name: "home" });
}

let redirectHandle: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  redirectHandle = setTimeout(leave, AUTO_REDIRECT_MS);
});

onBeforeUnmount(() => {
  clearTimeout(redirectHandle);
});
</script>

<template>
  <FullscreenLayout>
    <h1>{{ t("gameFinished.title") }}</h1>
    <section class="panel pixel-frame">
      <p>{{ t("gameFinished.body") }}</p>
      <button
        type="button"
        @click="leave"
      >
        {{ t("gameFinished.continue") }}
      </button>
    </section>
  </FullscreenLayout>
</template>

<style scoped>
.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-3);
}
</style>
