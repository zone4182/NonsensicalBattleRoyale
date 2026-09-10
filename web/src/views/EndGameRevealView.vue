<script setup lang="ts">
import FullscreenLayout from "../layouts/FullscreenLayout.vue";
</script>

<template>
  <FullscreenLayout>
    <h1>End-of-Game Reveal</h1>
    <section class="panel pixel-frame">
      <p>
        Unlocks the Vote Tree, Power Log, and GM Action Log for everyone once the game
        ends. The Vote Tree (a branching diagram that must stay legible at 3-20+ players)
        is a hard problem deferred to a later milestone -- this is a placeholder only.
        See GAME-DESIGN.md §End-of-Game Reveal.
      </p>
    </section>
  </FullscreenLayout>
</template>

<style scoped>
.panel {
  margin-top: var(--nbr-space-3);
  padding: var(--nbr-space-3);
}
</style>
