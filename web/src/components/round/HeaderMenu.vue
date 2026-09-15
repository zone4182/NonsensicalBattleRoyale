<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import LocaleSwitcher from "../LocaleSwitcher.vue";

// Right-aligned hamburger menu for the round header -- Settings, Need help?, and the
// language switcher used to be scattered across the hub and vote panel; consolidated
// here so they're always reachable from one place regardless of round state (prologue
// decision, prologue outcome gate, voting, ghost, etc.).
const emit = defineEmits<{ openSettings: [] }>();

const { t } = useI18n();
const open = ref(false);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function openSettings() {
  emit("openSettings");
  close();
}

// Closes on any click outside the menu -- the standard "tap away to dismiss" pattern
// for a dropdown/overflow menu, not just a dedicated close button.
function onDocumentClick(event: MouseEvent) {
  if (!open.value) return;
  const target = event.target as HTMLElement | null;
  if (target && !target.closest("#round-header-menu")) close();
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <div
    id="round-header-menu"
    class="header-menu"
  >
    <button
      type="button"
      class="hamburger-button"
      :aria-expanded="open"
      :aria-label="t('roundHeader.menu.toggle')"
      @click.stop="toggle"
    >
      <span aria-hidden="true">☰</span>
    </button>
    <div
      v-if="open"
      id="round-header-menu-panel"
      class="menu-panel pixel-frame"
    >
      <button
        type="button"
        class="menu-item"
        @click="openSettings"
      >
        {{ t("playerSettings.button") }}
      </button>
      <RouterLink
        :to="{ name: 'helpline' }"
        class="menu-item"
        @click="close"
      >
        {{ t("voteAction.help") }}
      </RouterLink>
      <div class="menu-item locale-item">
        <LocaleSwitcher />
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-menu {
  position: relative;
}

.hamburger-button {
  background: none;
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-1) var(--nbr-space-2);
  font-size: 1.1em;
  line-height: 1;
}

.hamburger-button:hover {
  border-color: var(--nbr-accent);
  color: var(--nbr-accent);
}

.menu-panel {
  position: absolute;
  top: calc(100% + var(--nbr-space-1));
  right: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  padding: var(--nbr-space-2);
  min-width: 10rem;
  background: var(--nbr-bg);
}

.menu-item {
  display: block;
  text-align: left;
  text-decoration: none;
  background: none;
  color: var(--nbr-fg);
  border: 1px solid var(--nbr-border);
  padding: var(--nbr-space-2);
  font-family: inherit;
  font-size: 0.9em;
}

.menu-item:hover {
  border-color: var(--nbr-accent);
  color: var(--nbr-accent);
}

.locale-item {
  border: none;
  padding: 0;
}

.locale-item :deep(.locale-switcher) {
  width: 100%;
}
</style>
