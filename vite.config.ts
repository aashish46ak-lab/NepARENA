// Lovable tanstack config defaults nitro → cloudflare (breaks Vercel).
// Force Vercel preset for Preview/Production on Vercel.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Critical for Vercel deployments
  nitro: {
    preset: "vercel",
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
