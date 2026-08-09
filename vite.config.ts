import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      client: { entry: "./src/client.tsx" },
      server: { entry: "./src/server.ts" },
    }),
    nitro({ preset: "vercel" }),
    viteReact(),
  ],
  build: {
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
  },
});
