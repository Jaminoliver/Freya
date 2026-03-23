// Minimal service worker for PWA installability.
// A fetch handler is required for the browser to treat this as an installable PWA.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass through all requests to the network.
  // No caching — Freya is a real-time app, stale data would cause issues.
  event.respondWith(fetch(event.request));
});