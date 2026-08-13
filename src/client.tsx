/**
 * Client boot — hydrate SSR shell without hydrateStart().
 */
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { hydrate } from "@tanstack/router-core/ssr/client";
import { getRouter } from "./router";

function showFatal(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[NepARENA] boot failed", error);
  document.body.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#f5f5f5;font-family:system-ui,sans-serif;padding:24px">
      <div style="max-width:420px;border:1px solid #333;border-radius:16px;padding:24px;background:#111;text-align:center">
        <img src="/pwa-192x192.png" alt="NepARENA" width="64" height="64" style="border-radius:14px;margin-bottom:16px" loading="eager" decoding="async" />
        <h1 style="margin:0 0 8px;font-size:18px">Could not start</h1>
        <p style="margin:0 0 16px;color:#f87171;font-size:13px;word-break:break-word">${message.replace(/</g, "<")}</p>
        <button onclick="location.reload()" style="width:100%;padding:12px;border:0;border-radius:10px;background:#f5f5f5;color:#111;font-weight:600">Reload</button>
      </div>
    </div>
  `;
}

async function boot() {
  const router = getRouter();

  const stores = (
    router as unknown as {
      stores?: { ids: { get: () => unknown[] } };
    }
  ).stores;

  if (!stores) {
    throw new Error(
      "Router stores failed to initialize. History may be unavailable in this browser.",
    );
  }

  if (!stores.ids.get().length) {
    await hydrate(router);
  }

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  });
}

void boot().catch(showFatal);
