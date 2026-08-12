/**
 * eFootball-style player face cards as SVG data-URLs.
 * Always loads offline — no external CDN / Wikimedia dependency.
 */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const PALETTES: [string, string, string][] = [
  ["#0ea5e9", "#1e3a8a", "#082f49"], // sky
  ["#f43f5e", "#9f1239", "#4c0519"], // rose
  ["#fbbf24", "#b45309", "#422006"], // gold
  ["#34d399", "#047857", "#022c22"], // emerald
  ["#a78bfa", "#5b21b6", "#2e1065"], // violet
  ["#f97316", "#c2410c", "#431407"], // orange
  ["#e2e8f0", "#475569", "#0f172a"], // silver
  ["#38bdf8", "#0369a1", "#0c4a6e"], // cyan
];

/** Build an eFootball-like portrait card SVG for any player name */
export function efootballCardSvg(
  name: string,
  opts?: { overall?: number; position?: string; width?: number; height?: number },
): string {
  const w = opts?.width ?? 240;
  const h = opts?.height ?? 320;
  const ovr = opts?.overall ?? 90 + (hash(name) % 9);
  const pos = (opts?.position ?? "CF").slice(0, 3).toUpperCase();
  const [c1, c2, c3] = PALETTES[hash(name) % PALETTES.length]!;
  const ini = initials(name);
  const short =
    name.length > 16 ? name.split(" ").slice(-1)[0]!.slice(0, 12) : name;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="40%" stop-color="#fff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.25"/>
    </linearGradient>
    <clipPath id="card"><rect x="0" y="0" width="${w}" height="${h}" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <rect width="${w}" height="${h}" fill="url(#shine)"/>
    <!-- diamond frame -->
    <rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="12" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
    <rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    <!-- OVR badge -->
    <circle cx="48" cy="52" r="26" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
    <text x="48" y="48" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="18" fill="#fbbf24">${ovr}</text>
    <text x="48" y="64" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="11" fill="#e2e8f0">${pos}</text>
    <!-- face circle with initials -->
    <circle cx="${w / 2}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.22}" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
    <text x="${w / 2}" y="${h * 0.42 + 14}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${Math.min(w, h) * 0.14}" fill="#fff">${ini}</text>
    <!-- name plate -->
    <rect x="24" y="${h - 64}" width="${w - 48}" height="36" rx="8" fill="rgba(0,0,0,0.5)"/>
    <text x="${w / 2}" y="${h - 40}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="14" fill="#f8fafc">${short.replace(/&/g, "&").replace(/</g, "<")}</text>
  </g>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Map of optional overall/position overrides from legend pool */
const META: Record<string, { overall: number; position: string }> = {
  "Lionel Messi": { overall: 98, position: "RWF" },
  "Cristiano Ronaldo": { overall: 97, position: "CF" },
  "Pelé": { overall: 98, position: "CF" },
  "Diego Maradona": { overall: 97, position: "AMF" },
  "Zinedine Zidane": { overall: 96, position: "AMF" },
  Ronaldinho: { overall: 95, position: "AMF" },
  "Ronaldo Nazário": { overall: 96, position: "CF" },
  "Johan Cruyff": { overall: 96, position: "CF" },
  "Franz Beckenbauer": { overall: 95, position: "CB" },
  "Paolo Maldini": { overall: 95, position: "CB" },
  "Franco Baresi": { overall: 94, position: "CB" },
  Cafu: { overall: 93, position: "RB" },
  "Roberto Carlos": { overall: 93, position: "LB" },
  "Andrea Pirlo": { overall: 94, position: "DMF" },
  "Xavi Hernández": { overall: 94, position: "CMF" },
  "Andrés Iniesta": { overall: 94, position: "CMF" },
  "Luka Modrić": { overall: 93, position: "CMF" },
  "Kevin De Bruyne": { overall: 93, position: "AMF" },
  "Thierry Henry": { overall: 94, position: "CF" },
  "Kylian Mbappé": { overall: 94, position: "CF" },
  "Neymar Jr": { overall: 93, position: "LWF" },
  Neymar: { overall: 93, position: "LWF" },
  "Mohamed Salah": { overall: 92, position: "RWF" },
  "Robert Lewandowski": { overall: 93, position: "CF" },
  "Manuel Neuer": { overall: 93, position: "GK" },
  "Gianluigi Buffon": { overall: 93, position: "GK" },
  "Iker Casillas": { overall: 92, position: "GK" },
  "Sergio Ramos": { overall: 92, position: "CB" },
  "Virgil van Dijk": { overall: 92, position: "CB" },
  "Karim Benzema": { overall: 92, position: "CF" },
  "Zlatan Ibrahimović": { overall: 92, position: "CF" },
  "Wayne Rooney": { overall: 91, position: "CF" },
  "Erling Haaland": { overall: 93, position: "CF" },
  "Vinícius Jr": { overall: 91, position: "LWF" },
  "Jude Bellingham": { overall: 91, position: "CMF" },
  "Kaká": { overall: 93, position: "AMF" },
  "Luis Suárez": { overall: 91, position: "CF" },
  "Gareth Bale": { overall: 91, position: "RWF" },
  "Steven Gerrard": { overall: 91, position: "CMF" },
  "Frank Lampard": { overall: 90, position: "CMF" },
  "Toni Kroos": { overall: 91, position: "CMF" },
  "Sergio Busquets": { overall: 90, position: "DMF" },
  "Philipp Lahm": { overall: 91, position: "RB" },
  "Dani Alves": { overall: 90, position: "RB" },
  Marcelo: { overall: 90, position: "LB" },
  "Didier Drogba": { overall: 91, position: "CF" },
  "Samuel Eto'o": { overall: 91, position: "CF" },
  "Patrick Vieira": { overall: 91, position: "DMF" },
  "Claude Makélélé": { overall: 90, position: "DMF" },
  "George Best": { overall: 93, position: "RWF" },
  "Michel Platini": { overall: 94, position: "AMF" },
  "Lev Yashin": { overall: 94, position: "GK" },
  "Alessandro Nesta": { overall: 92, position: "CB" },
  "Fabio Cannavaro": { overall: 92, position: "CB" },
};

export function playerPhotoUrl(name: string): string {
  const meta = META[name];
  return efootballCardSvg(name, {
    overall: meta?.overall,
    position: meta?.position,
  });
}

export const MESSI_PHOTO = playerPhotoUrl("Lionel Messi");
export const RONALDO_PHOTO = playerPhotoUrl("Cristiano Ronaldo");
