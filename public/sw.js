/* Emergency SW: clear caches + uninstall. No client.navigate (that caused loops). */
self.addEventListener("install", function () {
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
    })()
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request));
});
