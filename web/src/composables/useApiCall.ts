import { ref } from "vue";
import { useUiStore } from "../stores/ui";
import { ApiCallError } from "../lib/api";

// Generic wrapper for screens that only need a loading flag + a toast on failure.
// Screens that need to branch on specific ApiCallError codes (e.g. PrivateVoteModal,
// JoinGameView) should call `callFunction` directly in their own try/catch instead of
// going through `run`, so they can map codes to specific messages.
export function useApiCall() {
  const ui = useUiStore();
  const pending = ref(false);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    pending.value = true;
    try {
      return await fn();
    } catch (err) {
      ui.toast = {
        message: err instanceof ApiCallError ? err.message : "Something went wrong.",
        kind: "error",
      };
      return null;
    } finally {
      pending.value = false;
    }
  }

  return { pending, run };
}
