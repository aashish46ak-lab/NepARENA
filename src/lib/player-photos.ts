/**
 * Real football player portraits.
 * Primary: Wikimedia Commons via wsrv.nl (CORS-safe, face-top crop).
 * Fallback: eFootball-style SVG card.
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

function proxied(fileOrUrl: string, w = 480, h = 600): string {
  const isFull = /^https?:\/\//i.test(fileOrUrl);
  const raw = isFull
    ? fileOrUrl
    : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileOrUrl)}`;
  const clean = raw.replace(/^https?:\/\//, "");
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=${w}&h=${h}&fit=cover&a=top&output=jpg&q=88`;
}

/** Wikimedia Commons file names — prefer widely-used portrait files */
const WIKI_FILES: Record<string, string> = {
  "Lionel Messi": "Lionel_Messi_20180626.jpg",
  "Cristiano Ronaldo": "Cristiano_Ronaldo_2018.jpg",
  "Pelé": "Pelé_nacional.jpg",
  Pele: "Pelé_nacional.jpg",
  "Diego Maradona": "Maradona-Mondiali_1986_-_retocado.jpg",
  "Zinedine Zidane": "Zinedine_Zidane_by_Tasnim_03.jpg",
  Ronaldinho: "Ronaldinho_2006_World_Cup.jpg",
  "Ronaldo Nazário": "Ronaldo_061115_1.jpg",
  Ronaldo: "Ronaldo_061115_1.jpg",
  "Johan Cruyff": "Johan_Cruijff_(1974).jpg",
  "Franz Beckenbauer": "Franz_Beckenbauer_1975.jpg",
  "Michel Platini": "Michel_Platini_2010.jpg",
  "George Best": "George_Best.jpg",
  "Ferenc Puskás": "PuskasFerenc1954.jpg",
  "Ferenc Puskas": "PuskasFerenc1954.jpg",
  "Alfredo Di Stéfano": "Alfredo_Di_Stefano_Real_Madrid.jpg",
  "Alfredo Di Stefano": "Alfredo_Di_Stefano_Real_Madrid.jpg",
  "Eusébio": "Eusebio.jpg",
  Eusebio: "Eusebio.jpg",
  "Gerd Müller": "Gerd_Müller.jpg",
  "Gerd Muller": "Gerd_Müller.jpg",
  "Bobby Charlton": "Bobby_Charlton_(cropped).jpg",
  "Bobby Moore": "Bobby_Moore.jpg",
  "Marco van Basten": "Marco_van_Basten_1988.jpg",
  "Ruud Gullit": "Ruud_Gullit.jpg",
  "Frank Rijkaard": "Frank_Rijkaard.jpg",
  "Lev Yashin": "Lev_Yashin.jpg",
  "Garrincha": "Garrincha.jpg",
  "Sócrates": "Socrates_1986.jpg",
  Socrates: "Socrates_1986.jpg",
  "Zico": "Zico_Flamengo.jpg",
  "Romário": "Romario_2007.jpg",
  Romario: "Romario_2007.jpg",
  "Rivaldo": "Rivaldo.jpg",
  "Roberto Baggio": "Roberto_Baggio.jpg",
  "Hristo Stoichkov": "Hristo_Stoichkov.jpg",
  "Gabriel Batistuta": "Gabriel_Batistuta.jpg",
  "Andriy Shevchenko": "Andriy_Shevchenko.jpg",
  "Eric Cantona": "Eric_Cantona.jpg",
  "Alan Shearer": "Alan_Shearer.jpg",
  "Dennis Bergkamp": "Dennis_Bergkamp.jpg",
  "Ruud van Nistelrooy": "Ruud_van_Nistelrooy.jpg",
  "Raúl": "Raul_Gonzalez.jpg",
  Raul: "Raul_Gonzalez.jpg",
  "Francesco Totti": "Francesco_Totti.jpg",
  Totti: "Francesco_Totti.jpg",
  "Alessandro Del Piero": "Alessandro_Del_Piero.jpg",
  "Paolo Maldini": "Paolo_Maldini.jpg",
  "Franco Baresi": "Franco_Baresi.jpg",
  "Alessandro Nesta": "Alessandro_Nesta.jpg",
  "Fabio Cannavaro": "Fabio_Cannavaro.jpg",
  Cafu: "Cafu.jpg",
  "Roberto Carlos": "Roberto_Carlos.jpg",
  "Lothar Matthäus": "Lothar_Matthaus.jpg",
  "Lothar Matthaus": "Lothar_Matthaus.jpg",
  "Michael Ballack": "Michael_Ballack.jpg",
  "Patrick Vieira": "Patrick_Vieira.jpg",
  "Claude Makélélé": "Claude_Makelele.jpg",
  "Claude Makelele": "Claude_Makelele.jpg",
  "Kaká": "Kaka.jpg",
  Kaka: "Kaka.jpg",
  "Thierry Henry": "Thierry_Henry.jpg",
  "David Beckham": "David_Beckham.jpg",
  Beckham: "David_Beckham.jpg",
  "Steven Gerrard": "Steven_Gerrard.jpg",
  "Frank Lampard": "Frank_Lampard.jpg",
  "Paul Scholes": "Paul_Scholes.jpg",
  "Ryan Giggs": "Ryan_Giggs.jpg",
  "Andrea Pirlo": "Andrea_Pirlo.jpg",
  "Xavi Hernández": "Xavi.jpg",
  Xavi: "Xavi.jpg",
  "Andrés Iniesta": "Andres_Iniesta.jpg",
  Iniesta: "Andres_Iniesta.jpg",
  "Carles Puyol": "Carles_Puyol.jpg",
  "Gerard Piqué": "Gerard_Pique.jpg",
  "Gerard Pique": "Gerard_Pique.jpg",
  "Sergio Ramos": "Sergio_Ramos.jpg",
  Ramos: "Sergio_Ramos.jpg",
  "Iker Casillas": "Iker_Casillas.jpg",
  Casillas: "Iker_Casillas.jpg",
  "Gianluigi Buffon": "Gianluigi_Buffon.jpg",
  Buffon: "Gianluigi_Buffon.jpg",
  "Oliver Kahn": "Oliver_Kahn.jpg",
  "Manuel Neuer": "Manuel_Neuer.jpg",
  "Petr Čech": "Petr_Cech.jpg",
  "Petr Cech": "Petr_Cech.jpg",
  "Peter Schmeichel": "Peter_Schmeichel.jpg",
  "Edwin van der Sar": "Edwin_van_der_Sar.jpg",
  "Dino Zoff": "Dino_Zoff.jpg",
  "Philipp Lahm": "Philipp_Lahm.jpg",
  "Bastian Schweinsteiger": "Bastian_Schweinsteiger.jpg",
  "Toni Kroos": "Toni_Kroos.jpg",
  Kroos: "Toni_Kroos.jpg",
  "Thomas Müller": "Thomas_Muller.jpg",
  "Thomas Muller": "Thomas_Muller.jpg",
  "Arjen Robben": "Arjen_Robben.jpg",
  "Franck Ribéry": "Franck_Ribery.jpg",
  "Franck Ribery": "Franck_Ribery.jpg",
  "Luka Modrić": "Luka_Modric.jpg",
  "Luka Modric": "Luka_Modric.jpg",
  "Xabi Alonso": "Xabi_Alonso.jpg",
  "Sergio Busquets": "Sergio_Busquets.jpg",
  Busquets: "Sergio_Busquets.jpg",
  "Cesc Fàbregas": "Cesc_Fabregas.jpg",
  "Cesc Fabregas": "Cesc_Fabregas.jpg",
  "David Silva": "David_Silva.jpg",
  "Yaya Touré": "Yaya_Toure.jpg",
  "Yaya Toure": "Yaya_Toure.jpg",
  "N'Golo Kanté": "NGolo_Kante.jpg",
  "N'Golo Kante": "NGolo_Kante.jpg",
  "Kevin De Bruyne": "Kevin_De_Bruyne.jpg",
  "Eden Hazard": "Eden_Hazard.jpg",
  Hazard: "Eden_Hazard.jpg",
  "Mesut Özil": "Mesut_Ozil.jpg",
  "Mesut Ozil": "Mesut_Ozil.jpg",
  "James Rodríguez": "James_Rodriguez.jpg",
  "James Rodriguez": "James_Rodriguez.jpg",
  "Ángel Di María": "Angel_Di_Maria.jpg",
  "Angel Di Maria": "Angel_Di_Maria.jpg",
  "Karim Benzema": "Karim_Benzema.jpg",
  Benzema: "Karim_Benzema.jpg",
  "Luis Suárez": "Luis_Suarez.jpg",
  "Luis Suarez": "Luis_Suarez.jpg",
  "Zlatan Ibrahimović": "Zlatan_Ibrahimovic.jpg",
  "Zlatan Ibrahimovic": "Zlatan_Ibrahimovic.jpg",
  Zlatan: "Zlatan_Ibrahimovic.jpg",
  "Wayne Rooney": "Wayne_Rooney.jpg",
  Rooney: "Wayne_Rooney.jpg",
  "Didier Drogba": "Didier_Drogba.jpg",
  "Samuel Eto'o": "Samuel_Etoo.jpg",
  "Gareth Bale": "Gareth_Bale.jpg",
  "Fernando Torres": "Fernando_Torres.jpg",
  "David Villa": "David_Villa.jpg",
  "Sergio Agüero": "Sergio_Aguero.jpg",
  "Sergio Aguero": "Sergio_Aguero.jpg",
  "Robert Lewandowski": "Robert_Lewandowski.jpg",
  "Mohamed Salah": "Mohamed_Salah.jpg",
  Salah: "Mohamed_Salah.jpg",
  "Sadio Mané": "Sadio_Mane.jpg",
  "Sadio Mane": "Sadio_Mane.jpg",
  "Son Heung-min": "Son_Heung-min.jpg",
  "Heung-min Son": "Son_Heung-min.jpg",
  "Neymar Jr": "Neymar.jpg",
  Neymar: "Neymar.jpg",
  "Kylian Mbappé": "Kylian_Mbappe.jpg",
  "Kylian Mbappe": "Kylian_Mbappe.jpg",
  "Erling Haaland": "Erling_Haaland.jpg",
  Haaland: "Erling_Haaland.jpg",
  "Harry Kane": "Harry_Kane.jpg",
  "Vinícius Jr": "Vinicius_Junior.jpg",
  "Vinicius Jr": "Vinicius_Junior.jpg",
  Vinicius: "Vinicius_Junior.jpg",
  "Jude Bellingham": "Jude_Bellingham.jpg",
  Bellingham: "Jude_Bellingham.jpg",
  "Virgil van Dijk": "Virgil_van_Dijk.jpg",
  "Thiago Silva": "Thiago_Silva.jpg",
  "John Terry": "John_Terry.jpg",
  "Rio Ferdinand": "Rio_Ferdinand.jpg",
  "Nemanja Vidić": "Nemanja_Vidic.jpg",
  "Nemanja Vidic": "Nemanja_Vidic.jpg",
  "Marcel Desailly": "Marcel_Desailly.jpg",
  "Lilian Thuram": "Lilian_Thuram.jpg",
  "Javier Zanetti": "Javier_Zanetti.jpg",
  "Dani Alves": "Dani_Alves.jpg",
  Marcelo: "Marcelo_Vieira.jpg",
  "Ashley Cole": "Ashley_Cole.jpg",
  "Patrice Evra": "Patrice_Evra.jpg",
  "Trent Alexander-Arnold": "Trent_Alexander-Arnold.jpg",
  "Andrew Robertson": "Andrew_Robertson.jpg",
  "Rúben Dias": "Ruben_Dias.jpg",
  "Ruben Dias": "Ruben_Dias.jpg",
  "Mats Hummels": "Mats_Hummels.jpg",
  "Raphaël Varane": "Raphael_Varane.jpg",
  "Raphael Varane": "Raphael_Varane.jpg",
  "Leonardo Bonucci": "Leonardo_Bonucci.jpg",
  "Giorgio Chiellini": "Giorgio_Chiellini.jpg",
  "Vincent Kompany": "Vincent_Kompany.jpg",
  "Thibaut Courtois": "Thibaut_Courtois.jpg",
  Courtois: "Thibaut_Courtois.jpg",
  "Alisson Becker": "Alisson_Becker.jpg",
  Alisson: "Alisson_Becker.jpg",
  "Keylor Navas": "Keylor_Navas.jpg",
  "Hugo Lloris": "Hugo_Lloris.jpg",
  "Jan Oblak": "Jan_Oblak.jpg",
  "Marc-André ter Stegen": "Marc-Andre_ter_Stegen.jpg",
  "Ter Stegen": "Marc-Andre_ter_Stegen.jpg",
  "Bruno Fernandes": "Bruno_Fernandes.jpg",
  Rodri: "Rodri.jpg",
  Pedri: "Pedri.jpg",
  Gavi: "Gavi.jpg",
  "Frenkie de Jong": "Frenkie_de_Jong.jpg",
  "Joshua Kimmich": "Joshua_Kimmich.jpg",
  "Bernardo Silva": "Bernardo_Silva.jpg",
  "Marco Verratti": "Marco_Verratti.jpg",
  Casemiro: "Casemiro.jpg",
  "Declan Rice": "Declan_Rice.jpg",
  "Martin Ødegaard": "Martin_Odegaard.jpg",
  "Martin Odegaard": "Martin_Odegaard.jpg",
  "Paul Pogba": "Paul_Pogba.jpg",
  "Antoine Griezmann": "Antoine_Griezmann.jpg",
  Griezmann: "Antoine_Griezmann.jpg",
  "Marco Reus": "Marco_Reus.jpg",
  "Phil Foden": "Phil_Foden.jpg",
  "Bukayo Saka": "Bukayo_Saka.jpg",
  Rodrygo: "Rodrygo.jpg",
  "Roberto Firmino": "Roberto_Firmino.jpg",
  "Edinson Cavani": "Edinson_Cavani.jpg",
  "Paulo Dybala": "Paulo_Dybala.jpg",
  "Lautaro Martínez": "Lautaro_Martinez.jpg",
  "Lautaro Martinez": "Lautaro_Martinez.jpg",
  "Romelu Lukaku": "Romelu_Lukaku.jpg",
  "Pierre-Emerick Aubameyang": "Pierre-Emerick_Aubameyang.jpg",
  "Ousmane Dembélé": "Ousmane_Dembele.jpg",
  "Ousmane Dembele": "Ousmane_Dembele.jpg",
  "Lamine Yamal": "Lamine_Yamal.jpg",
  "Jamal Musiala": "Jamal_Musiala.jpg",
  "Victor Osimhen": "Victor_Osimhen.jpg",
  "Rafael Leão": "Rafael_Leao.jpg",
  "Rafael Leao": "Rafael_Leao.jpg",
  "Marcus Rashford": "Marcus_Rashford.jpg",
  "Raheem Sterling": "Raheem_Sterling.jpg",
  "Leroy Sané": "Leroy_Sane.jpg",
  "Leroy Sane": "Leroy_Sane.jpg",
  "Kingsley Coman": "Kingsley_Coman.jpg",
  "Serge Gnabry": "Serge_Gnabry.jpg",
  "Kai Havertz": "Kai_Havertz.jpg",
  "Riyad Mahrez": "Riyad_Mahrez.jpg",
  "Achraf Hakimi": "Achraf_Hakimi.jpg",
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
  "N'Golo Kanté": { overall: 90, position: "DMF" },
  "Harry Kane": { overall: 91, position: "CF" },
  "Sadio Mané": { overall: 90, position: "LWF" },
  "Son Heung-min": { overall: 90, position: "LWF" },
  "Roberto Baggio": { overall: 93, position: "SS" },
  "Romário": { overall: 94, position: "CF" },
  "Marco van Basten": { overall: 95, position: "CF" },
  "Ruud Gullit": { overall: 93, position: "AMF" },
  "Oliver Kahn": { overall: 92, position: "GK" },
  "Carles Puyol": { overall: 91, position: "CB" },
  "Xabi Alonso": { overall: 90, position: "DMF" },
  "Arjen Robben": { overall: 91, position: "RWF" },
  "Franck Ribéry": { overall: 90, position: "LWF" },
  "Sergio Agüero": { overall: 91, position: "CF" },
  "David Beckham": { overall: 90, position: "RMF" },
  "Andriy Shevchenko": { overall: 91, position: "CF" },
  "Gabriel Batistuta": { overall: 91, position: "CF" },
  "Eusébio": { overall: 95, position: "CF" },
  "Gerd Müller": { overall: 95, position: "CF" },
  "Bobby Charlton": { overall: 94, position: "AMF" },
  "Alfredo Di Stéfano": { overall: 96, position: "CF" },
  "Ferenc Puskás": { overall: 95, position: "CF" },
  "Garrincha": { overall: 94, position: "RWF" },
  "Sócrates": { overall: 92, position: "AMF" },
  "Zico": { overall: 94, position: "AMF" },
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
    const keyParts = normalize(key).split(" ");
    const last = keyParts[keyParts.length - 1]!;
    if (last.length > 3 && (n === last || n.endsWith(" " + last))) return file;
  }
  for (const [key, file] of Object.entries(WIKI_FILES)) {
    if (n.includes(normalize(key)) || normalize(key).includes(n)) return file;
  }
  return null;
}

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
  const [c1, , c3] = palettes[hash(name) % palettes.length]!;
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
  <circle cx="${w / 2}" cy="${h * 0.38}" r="${Math.min(w, h) * 0.2}" fill="rgba(0,0,0,0.35)" stroke="#fff" stroke-opacity="0.4"/>
  <text x="${w / 2}" y="${h * 0.38 + 12}" text-anchor="middle" font-family="system-ui" font-weight="800" font-size="28" fill="#fff">${ini}</text>
  <text x="24" y="36" font-family="system-ui" font-weight="800" font-size="18" fill="#fbbf24">${ovr}</text>
  <text x="24" y="52" font-family="system-ui" font-weight="700" font-size="11" fill="#e2e8f0">${pos}</text>
  <text x="${w / 2}" y="${h - 20}" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="13" fill="#fff">${short.replace(/&/g, "&")}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function playerPhotoUrl(name: string): string {
  const file = resolveFile(name);
  if (file) return proxied(file);
  return efootballCardSvg(name);
}

export function playerPhotoFallback(name: string): string {
  return efootballCardSvg(name);
}

export const MESSI_PHOTO = playerPhotoUrl("Lionel Messi");
export const RONALDO_PHOTO = playerPhotoUrl("Cristiano Ronaldo");
