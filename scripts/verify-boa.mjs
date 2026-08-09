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
    if (statSync(p).isDirectory()) {
      rmIndexHtml(p);
    } else if (name === "index.html") {
      unlinkSync(p);
      console.log("[NepARENA] Removed", p);
    }
  }
}

if (!existsSync(configPath) || !existsSync(serverDir)) {
  console.error("[NepARENA] Missing Build Output API (.vercel/output)");
  console.error("config:", existsSync(configPath), "server:", existsSync(serverDir));
  process.exit(1);
}

// Never let static index.html shadow the SSR server
rmIndexHtml(staticDir);

// Force server-first routing: assets cached, everything else → __server
const cfg = JSON.parse(readFileSync(configPath, "utf8"));
cfg.routes = [
  {
    src: "/assets/(.*)",
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  },
  {
    src: "/(.*\\.(png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest|js|css|woff2?)$)",
    headers: { "cache-control": "public, max-age=86400" },
  },
  { handle: "filesystem" },
  { src: "/(.*)", dest: "/__server" },
];
writeFileSync(configPath, JSON.stringify(cfg, null, 2));
console.log("[NepARENA] BOA routes forced server-first:", JSON.stringify(cfg.routes));
console.log("[NepARENA] Full app deploy ready");
