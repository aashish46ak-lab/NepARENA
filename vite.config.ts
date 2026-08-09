import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Lovable TanStack config + force Nitro Vercel preset.
 * Do NOT set vercel.json "framework": null — that caused static-only blank page.
 */
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
  vite: {
    build: {
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1000,
    },
    plugins: [],
  },
});
