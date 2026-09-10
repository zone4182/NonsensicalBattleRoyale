<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import FullscreenLayout from "../layouts/FullscreenLayout.vue";
import IosInstallModal from "../components/IosInstallModal.vue";
import { useInstallPrompt } from "../composables/useInstallPrompt";

const { t } = useI18n();
const { canInstall, canShowIosInstructions, promptInstall } = useInstallPrompt();
const showIosModal = ref(false);

// Hiding "Host a new game" from the landing page for now, per explicit request --
// gm-setup itself isn't disabled, just this entry point to it.
const HOST_GAME_VISIBLE = false;
</script>

<template>
  <FullscreenLayout>
    <div
      class="hero-bg"
      aria-hidden="true"
    />
    <div class="home-content">
      <h1>{{ t("home.title") }}</h1>
      <p class="subtitle">
        {{ t("home.subtitle") }}
      </p>
      <p class="tagline">
        {{ t("home.tagline") }}
      </p>
      <div class="actions">
        <!-- Temporarily hidden per explicit request -- gm-setup is still fully
             reachable directly at /gm/setup, this just removes the landing-page
             entry point. Flip HOST_GAME_VISIBLE back to true to restore. -->
        <RouterLink
          v-if="HOST_GAME_VISIBLE"
          :to="{ name: 'gm-setup' }"
          class="action action-primary"
        >
          {{ t("home.hostGame") }}
        </RouterLink>
        <RouterLink
          :to="{ name: 'join' }"
          class="action"
        >
          {{ t("home.joinGame") }}
        </RouterLink>
      </div>
    </div>
    <footer class="home-footer">
      <button
        v-if="canInstall"
        type="button"
        class="install-button"
        @click="promptInstall"
      >
        {{ t("home.installApp") }}
      </button>
      <button
        v-else-if="canShowIosInstructions"
        type="button"
        class="install-button"
        @click="showIosModal = true"
      >
        {{ t("home.installApp") }}
      </button>
      <p class="credit">
        {{ t("home.credit") }}
      </p>
    </footer>
    <IosInstallModal
      :open="showIosModal"
      @close="showIosModal = false"
    />
  </FullscreenLayout>
</template>

<style scoped>
/* Fixed to the viewport (not the 640px content column) so it fills the whole screen
   behind the centered content, independent of FullscreenLayout's max-width. The
   gradient fades it to the page's own background color near the bottom so it always
   blends into ordinary black regardless of scroll position or viewport height. */
.hero-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image: linear-gradient(to bottom, rgba(13, 13, 13, 0.25) 0%, rgba(13, 13, 13, 0.55) 55%, var(--nbr-bg) 95%),
    url("/img/mansion_at_night.png");
  background-size: cover;
  background-position: center 35%;
  background-repeat: no-repeat;
}

.home-content {
  text-align: center;
  /* The hero image's brightness varies a lot by viewport aspect ratio (the "cover"
     crop can put a lit window band right behind this text on a narrow/tall phone
     screen) -- a shadow keeps every line readable regardless of what's behind it,
     rather than relying solely on the gradient overlay to darken the right spot. */
  text-shadow:
    0 2px 6px rgba(0, 0, 0, 0.9),
    0 0 3px rgba(0, 0, 0, 0.9);
}

.subtitle {
  color: var(--nbr-accent);
  font-family: var(--nbr-font-display);
  font-size: 1em;
  margin-top: var(--nbr-space-2);
}

.tagline {
  color: var(--nbr-muted);
  max-width: 46ch;
  margin-top: var(--nbr-space-3);
  margin-left: auto;
  margin-right: auto;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  max-width: 320px;
  margin: var(--nbr-space-4) auto 0;
}

.action {
  display: block;
  text-align: center;
  text-decoration: none;
  background: var(--nbr-bg-raised);
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2) var(--nbr-space-3);
}

.action:hover {
  border-color: var(--nbr-accent);
}

.action-primary {
  color: var(--nbr-accent);
  border-color: var(--nbr-accent);
}

.home-footer {
  margin-top: var(--nbr-space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nbr-space-2);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}

.install-button {
  background: none;
  color: var(--nbr-muted);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1) var(--nbr-space-3);
  font-family: inherit;
  font-size: 0.85em;
}

.install-button:hover {
  color: var(--nbr-fg);
  border-color: var(--nbr-accent);
}

.credit {
  color: var(--nbr-muted);
  font-size: 0.75em;
  margin: 0;
}
</style>
