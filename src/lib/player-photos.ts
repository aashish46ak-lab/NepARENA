/**
 * Real football player portraits.
 * Primary: Wikimedia Commons (via wsrv.nl image proxy — reliable hotlink).
 * Fallback: eFootball-style SVG only if remote fails at render time (onError).
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

/** Proxy for CORS / hotlink safety */
function proxied(fileOrUrl: string, w = 400, h = 520): string {
  const isFull = /^https?:\/\//i.test(fileOrUrl);
  const raw = isFull
    ? fileOrUrl
    : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileOrUrl)}`;
  const clean = raw.replace(/^https?:\/\//, "");
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=${w}&h=${h}&fit=cover&output=jpg&q=85`;
}

/** Wikimedia file names (Special:FilePath) for legends */
const WIKI_FILES: Record<string, string> = {
  "Lionel Messi": "Lionel-Messi-Argentina-2022-FIFA-World-Cup_(cropped).jpg",
  "Cristiano Ronaldo": "Cristiano_Ronaldo_2018.jpg",
  "Pelé": "Pele_(athlete).jpg",
  "Diego Maradona": "Diego_Maradona_2012_2.jpg",
  "Zinedine Zidane": "Zinedine_Zidane_by_Tasnim_03.jpg",
  Ronaldinho: "Ronaldinho_2019.jpg",
  "Ronaldo Nazário": "Ronaldo_Nazario.jpg",
  "Johan Cruyff": "Johan_Cruijff_(1974).jpg",
  "Franz Beckenbauer": "Franz_Beckenbauer_1975.jpg",
  "Paolo Maldini": "Paolo_Maldini_2018.jpg",
  "Franco Baresi": "Franco_Baresi.jpg",
  Cafu: "Cafu.jpg",
  "Roberto Carlos": "Roberto_Carlos.jpg",
  "Andrea Pirlo": "Andrea_Pirlo_2014.jpg",
  "Xavi Hernández": "Xavi_Hernández_2012.jpg",
  "Andrés Iniesta": "Andrés_Iniesta_2018.jpg",
  "Luka Modrić": "Luka_Modrić_2018.jpg",
  "Kevin De Bruyne": "Kevin_De_Bruyne_201807081.jpg",
  "Thierry Henry": "Thierry_Henry_2012.jpg",
  "Kylian Mbappé": "Kylian_Mbappé_2019.jpg",
  "Neymar Jr": "Neymar_Jr._2018.jpg",
  Neymar: "Neymar_Jr._2018.jpg",
  "Mohamed Salah": "Mohamed_Salah_2018.jpg",
  "Robert Lewandowski": "Robert_Lewandowski_2020.jpg",
  "Manuel Neuer": "Manuel_Neuer_2018.jpg",
  "Gianluigi Buffon": "Gianluigi_Buffon_2018.jpg",
  "Iker Casillas": "Iker_Casillas_2015.jpg",
  "Sergio Ramos": "Sergio_Ramos_2018.jpg",
  "Virgil van Dijk": "Virgil_van_Dijk_2019.jpg",
  "Kaká": "Kaká_2007.jpg",
  "Steven Gerrard": "Steven_Gerrard_2014.jpg",
  "Frank Lampard": "Frank_Lampard_2014.jpg",
  "Patrick Vieira": "Patrick_Vieira.jpg",
  "Claude Makélélé": "Claude_Makélélé.jpg",
  "Gareth Bale": "Gareth_Bale_2015.jpg",
  "Luis Suárez": "Luis_Suárez_2018.jpg",
  "Karim Benzema": "Karim_Benzema_2018.jpg",
  "Didier Drogba": "Didier_Drogba_2015.jpg",
  "Samuel Eto'o": "Samuel_Eto'o.jpg",
  "George Best": "George_Best.jpg",
  "Michel Platini": "Michel_Platini.jpg",
  "Lev Yashin": "Lev_Yashin.jpg",
  "Alessandro Nesta": "Alessandro_Nesta.jpg",
  "Fabio Cannavaro": "Fabio_Cannavaro_2009.jpg",
  "Philipp Lahm": "Philipp_Lahm_2014.jpg",
  Marcelo: "Marcelo_Vieira.jpg",
  "Dani Alves": "Dani_Alves_2018.jpg",
  "Sergio Busquets": "Sergio_Busquets_2018.jpg",
  "Toni Kroos": "Toni_Kroos_2018.jpg",
  "Zlatan Ibrahimović": "Zlatan_Ibrahimović_2018.jpg",
  "Wayne Rooney": "Wayne_Rooney_2018.jpg",
  "Erling Haaland": "Erling_Haaland_2023_(cropped).jpg",
  "Vinícius Jr": "Vinícius_Júnior_2021.jpg",
  "Jude Bellingham": "Jude_Bellingham_2023.jpg",
};

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

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveFile(name: string): string | null {
  if (WIKI_FILES[name]) return WIKI_FILES[name]!;
  const n = normalize(name);
  for (const [key, file] of Object.entries(WIKI_FILES)) {
    if (normalize(key) === n) return file;
    if (n.includes(normalize(key)) || normalize(key).includes(n)) return file;
  }
  return null;
}

/** SVG card fallback (used by onError handlers) */
export function efootballCardSvg(
  name: string,
  opts?: { overall?: number; position?: string; width?: number; height?: number },
): string {
  const w = opts?.width ?? 240;
  const h = opts?.height ?? 320;
  const meta = META[name];
  const ovr = opts?.overall ?? meta?.overall ?? 90 + (hash(name) % 9);
  const pos = (opts?.position ?? meta?.position ?? "CF").slice(0, 3).toUpperCase();
  const palettes: [string, string, string][] = [
    ["#0ea5e9", "#1e3a8a", "#082f49"],
    ["#f43f5e", "#9f1239", "#4c0519"],
    ["#fbbf24", "#b45309", "#422006"],
    ["#34d399", "#047857", "#022c22"],
    ["#a78bfa", "#5b21b6", "#2e1065"],
  ];
  const [c1, c2, c3] = palettes[hash(name) % palettes.length]!;
  const ini = initials(name);
  const short =
    name.length > 16 ? name.split(" ").slice(-1)[0]!.slice(0, 12) : name;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="16" fill="url(#bg)"/>
  <circle cx="${w / 2}" cy="${h * 0.4}" r="${Math.min(w, h) * 0.2}" fill="rgba(0,0,0,0.35)" stroke="#fff" stroke-opacity="0.4"/>
  <text x="${w / 2}" y="${h * 0.4 + 12}" text-anchor="middle" font-family="system-ui" font-weight="800" font-size="28" fill="#fff">${ini}</text>
  <text x="24" y="36" font-family="system-ui" font-weight="800" font-size="18" fill="#fbbf24">${ovr}</text>
  <text x="24" y="52" font-family="system-ui" font-weight="700" font-size="11" fill="#e2e8f0">${pos}</text>
  <text x="${w / 2}" y="${h - 20}" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="13" fill="#fff">${short.replace(/&/g, "&")}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Prefer real portrait; SVG only as explicit fallback helper */
export function playerPhotoUrl(name: string): string {
  const file = resolveFile(name);
  if (file) return proxied(file);
  // Last resort: SVG so UI never breaks
  return efootballCardSvg(name);
}

/** onError handler helper for <img> */
export function playerPhotoFallback(name: string): string {
  return efootballCardSvg(name);
}

export const MESSI_PHOTO = playerPhotoUrl("Lionel Messi");
export const RONALDO_PHOTO = playerPhotoUrl("Cristiano Ronaldo");
