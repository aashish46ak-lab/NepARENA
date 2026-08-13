// Lovable tanstack config defaults nitro → cloudflare (breaks Vercel).
// Force Vercel preset for Preview/Production on Vercel.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
  vite: {
    build: {
      assetsInlineLimit: 2048,
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
      target: "es2020",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("react-dom") || id.includes("/react/") || id.includes("\\react\\"))
              return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("tesseract")) return "vendor-ocr";
            if (id.includes("embla-carousel")) return "vendor-carousel";
            if (id.includes("date-fns")) return "vendor-dates";
            if (id.includes("@radix-ui") || id.includes("lucide-react")) return "vendor-ui";
            if (id.includes("framer-motion") || id.includes("gsap")) return "vendor-motion";
          },
        },
      },
    },
    plugins: [],
  },
});
