<script setup lang="ts">
// Every screen that's meant to eventually show real story artwork but doesn't have one
// yet uses this -- placeholder.jpeg plus whatever text belongs to that specific beat,
// bound together as one figure/caption pair so it's obvious during testing which visual
// slot goes with which piece of narration (not just a stray image floating on the
// page). Swapping in the real image later is a one-line change per call site.
defineProps<{
  caption?: string;
}>();
</script>

<template>
  <figure class="placeholder-visual">
    <img
      src="/img/placeholder.jpeg"
      alt=""
      class="placeholder-image"
    >
    <figcaption
      v-if="caption"
      class="placeholder-caption"
    >
      {{ caption }}
    </figcaption>
  </figure>
</template>

<style scoped>
.placeholder-visual {
  margin: 0 0 var(--nbr-space-3) 0;
}

.placeholder-image {
  display: block;
  width: 100%;
  max-height: 280px;
  object-fit: cover;
}

.placeholder-caption {
  margin-top: var(--nbr-space-1);
  color: var(--nbr-muted);
  font-size: 0.8em;
  font-style: italic;
  text-align: center;
}
</style>
