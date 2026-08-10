import { StartClient } from "@tanstack/react-start/client";
import { hydrateRoot } from "react-dom/client";

/**
 * Screenshot proof: SSR HTML arrives (checkerboard + banner), then client JS
 * wipes body → empty checkerboard. Localhost works because no production hydrate.
 *
 * Fix path:
 * 1) package.json sideEffects was `false` (dangerous for CSS/entry in prod)
 * 2) hydrate with recoverable error logging
 * 3) watchdog restores a visible UI if body is emptied
 */

try {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) void r.unregister();
    });
  }
} catch {
  /* ignore */
}

const onRecoverableError = (error: unknown) => {
  console.error("[NepARENA] recoverable hydrate error", error);
};

try {
  hydrateRoot(document, <StartClient />, { onRecoverableError });
} catch (error) {
  console.error("[NepARENA] hard hydrate failure", error);
}

// If React wipes the document, show a real recovery screen (not blank theme)
window.setTimeout(() => {
  const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
  const hasApp =
    text.includes("Tournament") ||
    text.includes("NepARENA") ||
    text.includes("View tournaments") ||
    text.includes("Hall of Fame") ||
    text.includes("Something went wrong") ||
    text.includes("This page didn't load");

  if (hasApp) return;

  document.body.innerHTML = `
    <div style="min-height:100vh;margin:0;padding:24px;font-family:system-ui,sans-serif;background:#0a0a0a;color:#f5f5f5">
      <div style="max-width:420px;margin:40px auto;padding:24px;border:1px solid #333;border-radius:16px;background:#111">
        <img src="/neparena-logo.png" alt="NepARENA" width="64" height="64" style="border-radius:14px;display:block;margin:0 auto 16px" />
        <h1 style="margin:0 0 8px;font-size:20px;text-align:center">NepARENA failed to start</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#aaa;text-align:center">
          Production client wiped the page after load. This is a code/hydrate issue (not DNS).
          Friend saw it on localhost because vite dev skips this path.
        </p>
        <button onclick="location.reload()" style="width:100%;padding:12px;border:0;border-radius:10px;background:#f5f5f5;color:#111;font-weight:600">
          Reload
        </button>
        <p style="margin:16px 0 0;font-size:12px;color:#666;text-align:center">
          Open browser console and send the red error text.
        </p>
      </div>
    </div>
  `;
}, 3000);
