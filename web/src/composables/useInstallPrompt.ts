import { computed, ref } from "vue";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Module-level (not per-component) because the browser fires this event once, early,
// and possibly before any component that wants it has mounted -- the listener has to
// be registered at import time to not miss it.
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const wasInstalled = ref(false);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt.value = event as BeforeInstallPromptEvent;
});

window.addEventListener("appinstalled", () => {
  deferredPrompt.value = null;
  wasInstalled.value = true;
});

// iOS Safari never fires beforeinstallprompt and has no programmatic install API --
// "Add to Home Screen" is a manual Share-sheet action only a human can drive, so the
// best the app can do is detect this case and show instructions instead of a button
// that would otherwise silently do nothing.
const isStandalone =
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIosSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !isStandalone;

export function useInstallPrompt() {
  async function promptInstall() {
    const event = deferredPrompt.value;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt can only ever be used once -- accepted or dismissed, a fresh
    // beforeinstallprompt is needed for another attempt (the browser decides when/if
    // that happens again, so the button hides until then).
    if (outcome === "accepted" || outcome === "dismissed") deferredPrompt.value = null;
  }

  const canInstall = computed(() => deferredPrompt.value !== null);
  const canShowIosInstructions = computed(() => isIosSafari && !wasInstalled.value);

  return { canInstall, canShowIosInstructions, wasInstalled, promptInstall };
}
