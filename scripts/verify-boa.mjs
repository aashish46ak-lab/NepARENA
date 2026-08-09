import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const config = resolve(root, ".vercel/output/config.json");
const server = resolve(root, ".vercel/output/functions/__server.func");
const staticIndex = resolve(root, ".vercel/output/static/index.html");

// Critical: if index.html is in static/, Vercel filesystem route serves it
// instead of the TanStack SSR server → blank / Coming Soon page.
if (existsSync(staticIndex)) {
  unlinkSync(staticIndex);
  console.log("[NepARENA] Removed .vercel/output/static/index.html (SSR will handle /)");
}

if (!existsSync(config) || !existsSync(server)) {
  console.error(
    "[NepARENA] Build Output API missing. Expected .vercel/output from Nitro.",
  );
  console.error("config:", existsSync(config), "server:", existsSync(server));
  process.exit(1);
}

try {
  const cfg = JSON.parse(readFileSync(config, "utf8"));
  console.log("[NepARENA] BOA routes:", JSON.stringify(cfg.routes ?? []));
} catch {}

console.log("[NepARENA] Vercel Build Output API OK");
