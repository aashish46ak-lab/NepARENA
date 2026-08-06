// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// NOTE: vite-plugin-pwa temporarily removed.
// It was causing: (1) mobile reload loop / blank blue screen via stale SW
// (2) Vercel build ENOENT on dist/sw.js with selfDestroying + nitro layout.
// Static manifest.webmanifest can stay in public/ for install metadata only.
// Re-add PWA later with a nitro-compatible setup if needed.

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
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
    plugins: [],
  },
});
