import { onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { callFunction } from "../lib/api";

export type PushState = "unsupported" | "default" | "denied" | "subscribed" | "unsubscribed";

// Web Push's applicationServerKey wants raw bytes, not the base64url string the VAPID
// public key is generated/stored as.
function urlBase64ToUint8Array(base64Url: string): BufferSource {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function usePushNotifications() {
  const session = useSessionStore();
  const state = ref<PushState>("default");
  const pending = ref(false);

  async function refreshState() {
    if (!isSupported()) {
      state.value = "unsupported";
      return;
    }
    if (Notification.permission === "denied") {
      state.value = "denied";
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    state.value = existing ? "subscribed" : "unsubscribed";
  }

  onMounted(refreshState);

  async function subscribe() {
    if (!isSupported() || !session.token) return;
    pending.value = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        state.value = permission === "denied" ? "denied" : "unsubscribed";
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
        }));

      const json = subscription.toJSON();
      await callFunction(
        "register-push-subscription",
        { endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } },
        { token: session.token },
      );
      state.value = "subscribed";
    } finally {
      pending.value = false;
    }
  }

  async function unsubscribe() {
    if (!isSupported() || !session.token) return;
    pending.value = true;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await callFunction("unregister-push-subscription", { endpoint }, { token: session.token });
      }
      state.value = "unsubscribed";
    } finally {
      pending.value = false;
    }
  }

  return { state, pending, subscribe, unsubscribe };
}
