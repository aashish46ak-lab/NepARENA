import { StartClient } from "@tanstack/react-start/client";
import { hydrateRoot } from "react-dom/client";

/**
 * Boot splash is injected with pure DOM AFTER hydration starts.
 * Never put it in the React shell tree and never el.remove() React nodes —
 * that was blanking production (SSR+hydrate) while localhost (vite dev) looked fine.
 */
function showBootSplash() {
  if (typeof document === "undefined") return;
  if (document.getElementById("neparena-boot-splash")) return;

  const el = document.createElement("div");
  el.id = "neparena-boot-splash";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <div class="na-orb a"></div>
    <div class="na-orb b"></div>
    <div class="na-orb c"></div>
    <div class="na-core">
      <div class="na-logo-wrap">
        <div class="na-glow"></div>
        <div class="na-ring"></div>
        <img class="na-logo" src="/neparena-logo.png" alt="NepARENA" width="96" height="96" />
      </div>
      <div class="na-brand">NepARENA</div>
      <div class="na-title">Tournament Platform</div>
      <div class="na-sub">Host · Compete · Follow</div>
      <div class="na-track"><div class="na-bar"></div></div>
    </div>`;
  document.body.appendChild(el);

  window.setTimeout(() => {
    el.classList.add("out");
    window.setTimeout(() => {
      try {
        el.remove();
      } catch {
        /* ignore */
      }
    }, 550);
  }, 1600);
}

// Kill leftover service workers (prod domains often keep old SW)
try {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister());
    });
  }
  if ("caches" in window) {
    void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
  }
} catch {
  /* ignore */
}

hydrateRoot(document, <StartClient />);
showBootSplash();
