import { StartClient } from "@tanstack/react-start/client";
import { hydrateRoot } from "react-dom/client";

/**
 * Production blank = theme body bg only after client crash.
 * Localhost (vite dev) skips the same SSR hydrate path — that is why the zip worked there.
 * Keep hydration minimal: no DOM surgery before React attaches.
 */
try {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) void r.unregister();
    });
  }
  if ("caches" in window) {
    void caches.keys().then((keys) => {
      for (const k of keys) void caches.delete(k);
    });
  }
} catch {
  /* ignore */
}

hydrateRoot(document, <StartClient />);
