/**
 * PWA is DISABLED for testing.
 * This module only unregisters any existing service workers and clears caches.
 * It never registers a new SW.
 */

async function unregisterAllWorkersAndCaches() {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.warn("[NepARENA] SW unregister failed", e);
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn("[NepARENA] cache clear failed", e);
  }
}

/**
 * Call on app start — uninstall only. Never registers.
 * @deprecated name kept so any leftover imports do not re-enable PWA
 */
export async function registerPWA() {
  await unregisterAllWorkersAndCaches();
}

export async function disablePWA() {
  await unregisterAllWorkersAndCaches();
}
