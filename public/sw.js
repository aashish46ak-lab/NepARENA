/* NepARENA minimal service worker — cache shell assets only */
const CACHE = "neparena-static-v1";
const PRECACHE = [
  "/",
  "/neparena-logo.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API / auth
  if (url.pathname.startsWith("/api") || url.hostname.includes("supabase")) return;

  // Network-first for navigations (SSR/HTML)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/")),
    );
    return;
  }

  // Cache-first for static icons / logo
  if (/\.(png|ico|webmanifest|woff2)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        void caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
  }
});
