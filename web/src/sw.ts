import { precacheAndRoute, cleanupOutdatedCaches, type PrecacheEntry } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

// injectManifest strategy (see vite.config.ts) -- vite-plugin-pwa replaces
// self.__WB_MANIFEST with the actual precache list at build time. Everything below
// this line is ours; nothing here is generated.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.addEventListener("activate", () => self.clients.claim());

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

// Focuses an already-open tab on the target URL rather than always opening a new one --
// most players will already have the app open in a background tab most of the time.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        if (client.url.endsWith(url) && "focus" in client) {
          await (client as WindowClient).focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
