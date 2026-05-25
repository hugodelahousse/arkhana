import { clientsClaim } from "workbox-core";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
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

// Serve offline fallback for any navigation that fails both network and cache
setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    const cached = await caches.match("/offline.html");
    return cached ?? Response.error();
  }
  return Response.error();
});
