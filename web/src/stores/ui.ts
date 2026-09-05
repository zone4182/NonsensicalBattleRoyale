import { defineStore } from "pinia";
import { ref } from "vue";

export interface Toast {
  message: string;
  kind: "info" | "error";
}

export const useUiStore = defineStore("ui", () => {
  const isVoteModalOpen = ref(false);
  const cinematicActive = ref(false);
  const toast = ref<Toast | null>(null);

  return { isVoteModalOpen, cinematicActive, toast };
});
