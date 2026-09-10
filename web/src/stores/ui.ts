import { defineStore } from "pinia";
import { ref } from "vue";

export interface Toast {
  message: string;
  kind: "info" | "error";
}

export const useUiStore = defineStore("ui", () => {
  const isVoteModalOpen = ref(false);
  const cinematicActive = ref(false);
  // The image set for the current cinematic moment (ImageCarousel.vue), and how long
  // each image holds before auto-advancing. Nothing sets these yet -- no narrative
  // moment triggers a cinematic today, and syncing the carousel's advance to specific
  // narration beats is explicitly deferred. This is just the data shape so that wiring
  // slots in later without reshaping the store again.
  const cinematicImages = ref<string[]>([]);
  const cinematicIntervalMs = ref(4000);
  const toast = ref<Toast | null>(null);

  return { isVoteModalOpen, cinematicActive, cinematicImages, cinematicIntervalMs, toast };
});
