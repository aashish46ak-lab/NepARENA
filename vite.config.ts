import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

/**
 * Blank white screen was caused by Vercel serving static index.html only
 * (no Nitro server / no JS bundles).
 * Use official TanStack Start + Nitro Vercel preset.
 */
export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({ preset: "vercel" }),
    viteReact(),
  ],
  build: {
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
  },
});
