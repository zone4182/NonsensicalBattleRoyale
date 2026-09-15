<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useGameStore } from "../../stores/game";

const { t } = useI18n();
const game = useGameStore();
</script>

<template>
  <div class="narration-log">
    <h2 class="narration-log-title">
      {{ t("narrationLog.title") }}
    </h2>
    <div class="narration-log-entries">
      <p v-if="!game.narrationEntries.length">
        {{ t("narrationLog.empty") }}
      </p>
      <p
        v-for="entry in game.narrationEntries"
        :key="entry.id"
      >
        {{ entry.text }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* No overflow/height rules on .narration-log itself -- the scrollable bounds live on
   the parent .area-narration panel (MainRoundView.vue) that wraps this component, so
   there's exactly one scroll container, not two nested ones. The title below is
   sticky *within* that ancestor's scroll port instead. */
.narration-log-title {
  position: sticky;
  top: 0;
  /* Matches .pixel-frame's own background (area-narration's border style) so entries
     scrolling underneath don't show through the sticky title. */
  background: var(--nbr-bg-raised);
  padding-bottom: var(--nbr-space-1);
  margin-bottom: var(--nbr-space-1);
}

.narration-log-entries p {
  margin-bottom: var(--nbr-space-1);
}
</style>
