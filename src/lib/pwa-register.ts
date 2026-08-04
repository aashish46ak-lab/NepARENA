const PREVIEW_HOSTS = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "beta.lovable.dev",
];

/**
 * The service worker must never register in dev, iframes, or Lovable preview
 * contexts — a browser-held SW could keep serving stale HTML after edits.
 * `?sw=off` is the manual kill switch for users with a stuck install.
 */
function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (PREVIEW_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((r) =>
        [r.active, r.waiting, r.installing].some((w) =>
          w?.scriptURL.endsWith("/sw.js"),
        ),
      )
      .map((r) => r.unregister()),
  );
}

export async function registerPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    await unregisterAppWorkers();
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}