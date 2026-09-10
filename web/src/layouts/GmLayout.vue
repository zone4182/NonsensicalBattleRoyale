<script setup lang="ts">
// GM setup / in-play / helpline inbox are three distinct concerns that share this
// nav, without forcing the same chrome onto the 8 non-GM screens.
const tabs = [
  { to: { name: "gm-setup" }, label: "Setup" },
  { to: { name: "gm-in-play" }, label: "In Play" },
  { to: { name: "gm-invites" }, label: "Invites" },
  { to: { name: "gm-helpline-inbox" }, label: "Helpline Inbox" },
];
</script>

<template>
  <section class="screen gm-layout">
    <nav class="gm-nav">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.label"
        :to="tab.to"
        class="gm-nav-link"
      >
        {{ tab.label }}
      </RouterLink>
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
</style>
