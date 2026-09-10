<script setup lang="ts">
import FullscreenLayout from "../layouts/FullscreenLayout.vue";
</script>

<template>
  <FullscreenLayout>
    <h1>Nonsensical Battle Royale</h1>
    <p class="tagline">
      Where Clue, Diplomacy, Werewolf, Among Us, and Machiavelli meet.
      An asynchronous social deduction game, played with real friends over real days.
      Accept your invite, and something starts. Every round, everyone votes in secret
      on who doesn't make it to the next one.
    </p>
    <div class="actions">
      <RouterLink
        :to="{ name: 'gm-setup' }"
        class="action action-primary"
      >
        Host a new game
      </RouterLink>
      <RouterLink
        :to="{ name: 'join' }"
        class="action"
      >
        Join a game
      </RouterLink>
    </div>
  </FullscreenLayout>
</template>

<style scoped>
.tagline {
  color: var(--nbr-muted);
  max-width: 46ch;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--nbr-space-2);
  max-width: 320px;
  margin-top: var(--nbr-space-4);
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
</style>
