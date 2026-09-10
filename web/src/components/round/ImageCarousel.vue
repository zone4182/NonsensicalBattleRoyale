<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

// "A text adventure with shifting graphic images" -- auto-advances through a sequence
// on a fixed interval, loops back to the first image after the last. Deliberately just
// the playback mechanism: what images to show and when to trigger them (syncing the
// advance to specific narration beats) is a separate concern, not built here yet.
const props = withDefaults(
  defineProps<{
    images: string[];
    intervalMs?: number;
  }>(),
  {
    intervalMs: 4000,
  },
);

const activeIndex = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

function stop() {
  clearInterval(timer);
  timer = undefined;
}

function start() {
  stop();
  if (props.images.length <= 1) return;
  timer = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % props.images.length;
  }, props.intervalMs);
}

// A new image sequence (a different narrative moment) should always restart from the
// first frame rather than carry over whatever index/timing the previous one was at.
watch(
  () => props.images,
  () => {
    activeIndex.value = 0;
    start();
  },
  { immediate: true },
);

onBeforeUnmount(stop);
</script>

<template>
  <div
    v-if="images.length"
    class="image-carousel"
  >
    <img
      :key="images[activeIndex]"
      :src="images[activeIndex]"
      class="carousel-image"
      alt=""
    >
    <div
      v-if="images.length > 1"
      class="carousel-dots"
    >
      <span
        v-for="(image, i) in images"
        :key="image"
        class="carousel-dot"
        :class="{ 'carousel-dot-active': i === activeIndex }"
      />
    </div>
  </div>
</template>

<style scoped>
.image-carousel {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  background: var(--nbr-bg);
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  image-rendering: pixelated;
}

.carousel-dots {
  position: absolute;
  bottom: var(--nbr-space-2);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--nbr-space-1);
}

.carousel-dot {
  width: 8px;
  height: 8px;
  background: var(--nbr-bg-raised);
  border: 1px solid var(--nbr-border);
}

.carousel-dot-active {
  background: var(--nbr-accent);
  border-color: var(--nbr-accent);
}
</style>
