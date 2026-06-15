import { clientsClaim } from "workbox-core";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  matchPrecache,
} from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import {
  NetworkFirst,
  CacheFirst,
  NetworkOnly,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// HTML navigations: network first, 5s timeout, fall back to cached page
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  })
);

// Card artwork from CDN: cache first, persist across visits
registerRoute(
  ({ url }) => url.hostname === "cdn.jsdelivr.net",
  new CacheFirst({
    cacheName: "card-images",
    plugins: [new ExpirationPlugin({ maxEntries: 100 })],
  })
);

// Auth and API routes: never cache
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkOnly()
);

// React Router v7 single-fetch data requests (client-side navigation)
// These have a .data suffix, e.g. /collection.data — not navigate-mode so
// they bypass the pages route above and fail silently offline without this.
registerRoute(
  ({ url }) => url.pathname.endsWith(".data"),
  new NetworkFirst({
    cacheName: "rr-data",
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100 })],
  })
);

// Serve offline fallback for any navigation that fails both network and cache
setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    const cached = await matchPrecache("/offline.html");
    return cached ?? Response.error();
  }
  return Response.error();
});

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Arkhana", {
      body: payload.body,
      tag: payload.tag,
      renotify: !!payload.tag,
      data: { url: payload.url ?? "/" },
    } as NotificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const match = clients.find((c) => new URL(c.url).pathname === url);
      if (match) return match.focus();
      return self.clients.openWindow(url);
    })
  );
});
