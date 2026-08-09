import { existsSync } from "node:fs";
import { resolve } from "node:path";

const config = resolve(process.cwd(), ".vercel/output/config.json");
const server = resolve(process.cwd(), ".vercel/output/functions/__server.func");

if (!existsSync(config) || !existsSync(server)) {
  console.error(
    "[NepARENA] Build Output API missing. Expected .vercel/output from Nitro (preset: vercel).",
  );
  console.error("config:", existsSync(config), "server:", existsSync(server));
  process.exit(1);
}

console.log("[NepARENA] Vercel Build Output API OK (.vercel/output present)");
