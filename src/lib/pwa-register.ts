/** Lightweight PWA register + shared deferred install prompt. */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(e: BeforeInstallPromptEvent | null) => void>();

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function onInstallPromptChange(
  cb: (e: BeforeInstallPromptEvent | null) => void,
) {
  listeners.add(cb);
  cb(deferredPrompt);
  return () => listeners.delete(cb);
}

function setDeferred(e: BeforeInstallPromptEvent | null) {
  deferredPrompt = e;
  listeners.forEach((cb) => cb(e));
}

function attachEarlyListener() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setDeferred(e as BeforeInstallPromptEvent);
    console.info("[NepARENA] beforeinstallprompt captured");
  });
  window.addEventListener("appinstalled", () => {
    setDeferred(null);
    console.info("[NepARENA] appinstalled");
  });
}

attachEarlyListener();

export async function registerPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    console.info("[NepARENA] PWA registered", reg.scope);
    void reg.update();
  } catch (e) {
    console.warn("[NepARENA] PWA register failed", e);
  }
}

export async function triggerInstall(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const e = deferredPrompt;
  if (!e) return "unavailable";
  await e.prompt();
  const { outcome } = await e.userChoice;
  setDeferred(null);
  return outcome;
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
