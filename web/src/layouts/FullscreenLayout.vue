<script setup lang="ts">
import LocaleSwitcher from "../components/LocaleSwitcher.vue";

// Shared by the screens that are each a standalone, full-screen experience (per the
// design doc's screen inventory) -- deliberately not used by MainRoundView, which
// needs its own grid layout, or by GmLayout, which needs its own sub-nav chrome.
</script>

<template>
  <section class="screen fullscreen-layout">
    <div class="locale-bar">
      <LocaleSwitcher />
    </div>
    <slot />
  </section>
</template>

<style scoped>
.fullscreen-layout {
  max-width: 640px;
  margin: 0 auto;
}

.locale-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--nbr-space-2);
}
</style>
