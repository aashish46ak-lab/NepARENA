import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const out = resolve(root, ".vercel/output");
const configPath = resolve(out, "config.json");
const serverDir = resolve(out, "functions/__server.func");
const staticDir = resolve(out, "static");
const rendererPath = resolve(
  out,
  "functions/__server.func/_chunks/renderer-template.mjs",
);

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
  console.error("[NepARENA] Missing .vercel/output — Nitro build failed");
  process.exit(1);
}

rmIndexHtml(staticDir);

// ROOT CAUSE FIX:
// Nitro was routing /** → renderer-template.mjs which returns empty index.html.
// TanStack SSR lives in _ssr/ssr.mjs. Rewrite the template handler to call SSR.
if (existsSync(rendererPath)) {
  writeFileSync(
    rendererPath,
    `// NepARENA post-build: proxy to TanStack Start SSR (not empty HTML template)\n` +
      `export default async function renderWithSsr(event) {\n` +
      `  const ssr = await import("../_ssr/ssr.mjs");\n` +
      `  const handler = ssr.default;\n` +
      `  const request = event?.req ?? event?.request;\n` +
      `  if (!handler?.fetch || !request) {\n` +
      `    throw new Error("SSR handler or request missing");\n` +
      `  }\n` +
      `  return handler.fetch(request);\n` +
      `}\n`,
  );
  console.log("[NepARENA] Patched renderer-template.mjs → TanStack SSR");
} else {
  console.warn("[NepARENA] renderer-template.mjs not found — skip patch");
}

const cfg = JSON.parse(readFileSync(configPath, "utf8"));
cfg.routes = [
  {
    src: "/assets/(.*)",
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  },
  { handle: "filesystem" },
  { src: "/(.*)", dest: "/__server" },
];
writeFileSync(configPath, JSON.stringify(cfg, null, 2));
console.log("[NepARENA] Full app SSR patch applied");
