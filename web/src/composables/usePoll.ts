import { onBeforeUnmount, onMounted } from "vue";

// No realtime/websocket channel exists (ARCHITECTURE.md "Not needed for v1") -- this is
// what stands in for a round/phase actually changing while a screen is open, short of
// the player manually reloading.
export function usePoll(callback: () => void, intervalMs: number): void {
  let handle: ReturnType<typeof setInterval> | undefined;

  onMounted(() => {
    handle = setInterval(callback, intervalMs);
  });

  onBeforeUnmount(() => {
    clearInterval(handle);
  });
}
