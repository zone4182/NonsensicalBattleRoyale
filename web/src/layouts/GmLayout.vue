<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../stores/session";
import LocaleSwitcher from "../components/LocaleSwitcher.vue";

// Creating a game and managing one are deliberately detached: no session yet means
// still in the setup wizard (the only thing reachable), and once a game exists the
// wizard itself is behind it -- these two tab sets never show together. Invites has no
// standalone tab of its own anymore; drafting and sending them is a step inside the
// wizard now, not an ongoing management screen.
const { t } = useI18n();
const session = useSessionStore();
const tabs = computed(() =>
  session.token && session.role === "gm"
    ? [
        { to: { name: "gm-in-play" }, key: "inPlay" },
        { to: { name: "gm-helpline-inbox" }, key: "helplineInbox" },
      ]
    : [{ to: { name: "gm-setup" }, key: "setup" }],
);
</script>

<template>
  <section class="screen gm-layout">
    <nav class="gm-nav">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        class="gm-nav-link"
      >
        {{ t(`gmNav.${tab.key}`) }}
      </RouterLink>
      <LocaleSwitcher class="gm-locale-switcher" />
    </nav>
    <div class="gm-content">
      <RouterView />
    </div>
  </section>
</template>

<style scoped>
.gm-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nbr-space-1) var(--nbr-space-3);
  border-bottom: 1px solid var(--nbr-border);
  padding-bottom: var(--nbr-space-2);
  margin-bottom: var(--nbr-space-3);
}

.gm-nav-link {
  color: var(--nbr-muted);
  text-decoration: none;
}

.gm-nav-link.router-link-active {
  color: var(--nbr-accent);
}

.gm-locale-switcher {
  margin-left: auto;
}
</style>
