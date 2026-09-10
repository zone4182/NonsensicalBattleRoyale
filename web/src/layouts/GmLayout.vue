<script setup lang="ts">
import { useI18n } from "vue-i18n";
import LocaleSwitcher from "../components/LocaleSwitcher.vue";

// GM setup / in-play / helpline inbox are three distinct concerns that share this
// nav, without forcing the same chrome onto the 8 non-GM screens.
const { t } = useI18n();
const tabs = [
  { to: { name: "gm-setup" }, key: "setup" },
  { to: { name: "gm-in-play" }, key: "inPlay" },
  { to: { name: "gm-invites" }, key: "invites" },
  { to: { name: "gm-helpline-inbox" }, key: "helplineInbox" },
];
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
