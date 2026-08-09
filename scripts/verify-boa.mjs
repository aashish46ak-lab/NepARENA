import {
  existsSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const out = resolve(root, ".vercel/output");
const configPath = resolve(out, "config.json");
const serverDir = resolve(out, "functions/__server.func");
const staticDir = resolve(out, "static");

function rmIndexHtml(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    try {
      if (statSync(p).isDirectory()) rmIndexHtml(p);
      else if (name === "index.html") {
        unlinkSync(p);
        console.log("[NepARENA] Removed", p);
      }
    } catch {}
  }
}

if (!existsSync(configPath) || !existsSync(serverDir)) {
  console.error("[NepARENA] Missing Build Output API (.vercel/output)");
  process.exit(1);
}

rmIndexHtml(staticDir);

// NO filesystem — static index.html can no longer win over SSR.
// Nitro __server serves HTML + public assets.
const cfg = JSON.parse(readFileSync(configPath, "utf8"));
cfg.routes = [{ src: "/(.*)", dest: "/__server" }];
writeFileSync(configPath, JSON.stringify(cfg, null, 2));

console.log("[NepARENA] ALL routes → __server");
console.log(JSON.stringify(cfg.routes));
