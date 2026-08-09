/* Always uninstall — never cache app shell */
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
    })(),
  );
});
self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});
