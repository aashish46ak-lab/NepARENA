// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * vite-plugin-pwa emits sw.js/workbox into dist/ (the nitro root), but only
 * dist/client is served publicly. Copy the service worker files across so
 * /sw.js resolves with root scope after deployment.
 */
function copyServiceWorkerToClient(): Plugin {
  return {
    name: "efn-copy-service-worker",
    apply: "build",
    closeBundle() {
      const dist = path.resolve("dist");
      const client = path.join(dist, "client");
      if (!fs.existsSync(dist) || !fs.existsSync(client)) return;
      for (const file of fs.readdirSync(dist)) {
        if (file === "sw.js" || /^workbox-.*\.js$/.test(file)) {
          fs.copyFileSync(path.join(dist, file), path.join(client, file));
        }
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react")) return "vendor-react";
              if (id.includes("@supabase")) return "vendor-supabase";
              if (id.includes("@radix-ui") || id.includes("lucide-react"))
                return "vendor-ui";
              if (id.includes("@tanstack")) return "vendor-tanstack";
            }
          },
        },
      },
    },
    plugins: [
      VitePWA({
        // Emergency: uninstall any existing SW to stop reload loops (flash ↔ blank)
        selfDestroying: true,
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        includeAssets: ["favicon.ico", "apple-touch-icon.png"],
        manifest: {
          id: "/",
          name: "eFootball Nepal",
          short_name: "eFootball Nepal",
          description:
            "The official home of competitive eFootball in Nepal — tournaments, players, hall of fame, and community.",
          theme_color: "#0b1220",
          background_color: "#0b1220",
          display: "standalone",
          display_override: ["standalone", "browser"],
          orientation: "portrait",
          categories: ["sports", "games", "entertainment"],
          scope: "/",
          start_url: "/",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/pwa-192x192-maskable.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/pwa-512x512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,woff,woff2,png,svg,ico,webmanifest}"],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "efn-pages",
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                ["style", "script", "font", "image"].includes(
                  request.destination,
                ),
              handler: "CacheFirst",
              options: {
                cacheName: "efn-assets",
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
      copyServiceWorkerToClient(),
    ],
  },
});
