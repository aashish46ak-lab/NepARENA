/** Lightweight PWA register — static /sw.js (no vite-plugin-pwa build break). */
export async function registerPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.info("[NepARENA] PWA registered", reg.scope);
  } catch (e) {
    console.warn("[NepARENA] PWA register failed", e);
  }
}

export async function disablePWA() {
  if (typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
}
