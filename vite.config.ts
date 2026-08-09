// @lovable.dev/vite-tanstack-config already includes plugins — do NOT add duplicates.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Deploy target: Vercel (NOT cloudflare default from the Lovable preset).
// White screen was caused by static index.html with no SSR server output.

export default defineConfig({
  // Nitro / TanStack Start server preset for Vercel
  server: {
    preset: "vercel",
  },
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
