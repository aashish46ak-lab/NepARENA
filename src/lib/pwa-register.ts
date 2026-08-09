/** PWA fully disabled — unregister only, never register. */
export async function disablePWA() {
  if (typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {}
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
}

export async function registerPWA() {
  await disablePWA();
}
