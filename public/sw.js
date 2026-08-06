/* eFootball Nepal — emergency service worker.
 * Purpose: replace any broken/old SW, clear caches, then uninstall itself.
 * Do not add caching logic here.
 */
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      try {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (k) { return caches.delete(k); }));
      } catch (e) {}
      try {
        await self.registration.unregister();
      } catch (e) {}
      try {
        var clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (var i = 0; i < clients.length; i++) {
          try { clients[i].navigate(clients[i].url); } catch (e) {}
        }
      } catch (e) {}
    })()
  );
});

self.addEventListener("fetch", function (event) {
  // Always network — never respond from cache
  event.respondWith(fetch(event.request));
});
