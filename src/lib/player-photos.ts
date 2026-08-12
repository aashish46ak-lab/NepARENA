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

/** Wikimedia Commons file names — aliases for common spelling variants */
const WIKI_FILES: Record<string, string> = {
  "Lionel Messi": "Lionel-Messi-Argentina-2022-FIFA-World-Cup_(cropped).jpg",
  "Cristiano Ronaldo": "Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis,_September_2023_(cropped).jpg",
  "Pelé": "Pelé_1960.jpg",
  Pele: "Pelé_1960.jpg",
  "Diego Maradona": "Maradona-Mondiali_1986_-_retocado.jpg",
  "Zinedine Zidane": "Zinedine_Zidane_by_Tasnim_03.jpg",
  Ronaldinho: "Ronaldinho_Willy_Chara_2006.jpg",
  "Ronaldo Nazário": "Ronaldo_061115_1.jpg",
  Ronaldo: "Ronaldo_061115_1.jpg",
  "Johan Cruyff": "Johan_Cruijff_(1974).jpg",
  "Franz Beckenbauer": "Franz_Beckenbauer_1975.jpg",
  "Michel Platini": "Michel_Platini_2010.jpg",
  "George Best": "George_Best.jpg",
  "Ferenc Puskás": "PuskasFerenc1954.jpg",
  "Ferenc Puskas": "PuskasFerenc1954.jpg",
  "Alfredo Di Stéfano": "Alfredo_Di_Stefano_1958.jpg",
  "Alfredo Di Stefano": "Alfredo_Di_Stefano_1958.jpg",
  "Eusébio": "Eusebio_1966.jpg",
  Eusebio: "Eusebio_1966.jpg",
  "Gerd Müller": "Gerd_Mueller.jpg",
  "Gerd Muller": "Gerd_Mueller.jpg",
  "Bobby Charlton": "Bobby_Charlton_1966.jpg",
  "Bobby Moore": "Bobby_Moore_1969.jpg",
  "Marco van Basten": "Marco_van_Basten_1988.jpg",
  "Ruud Gullit": "Ruud_Gullit_1988.jpg",
  "Frank Rijkaard": "Frank_Rijkaard.jpg",
  "Lev Yashin": "Lev_Yashin_USSR.jpg",
  "Gianluigi Buffon": "Gianluigi_Buffon_(cropped).jpg",
  Buffon: "Gianluigi_Buffon_(cropped).jpg",
  "Iker Casillas": "Iker_Casillas_2015.jpg",
  Casillas: "Iker_Casillas_2015.jpg",
  "Manuel Neuer": "Manuel_Neuer_2018.jpg",
  "Oliver Kahn": "Oliver_Kahn.jpg",
  "Petr Čech": "Petr_Cech_2015.jpg",
  "Petr Cech": "Petr_Cech_2015.jpg",
  "Thibaut Courtois": "Thibaut_Courtois.jpg",
  Courtois: "Thibaut_Courtois.jpg",
  "Alisson Becker": "Alisson_Becker_2018.jpg",
  Alisson: "Alisson_Becker_2018.jpg",
  "Keylor Navas": "Keylor_Navas_2018.jpg",
  "Dino Zoff": "Dino_Zoff_1974.jpg",
  "Peter Schmeichel": "Peter_Schmeichel.jpg",
  "Edwin van der Sar": "Edwin_van_der_Sar.jpg",
  "Hugo Lloris": "Hugo_Lloris_2018.jpg",
  "Jan Oblak": "Jan_Oblak_2019.jpg",
  "Marc-André ter Stegen": "Marc-André_ter_Stegen.jpg",
  "Ter Stegen": "Marc-André_ter_Stegen.jpg",
  "Paolo Maldini": "Paolo_Maldini_2018.jpg",
  "Franco Baresi": "Franco_Baresi_2012.jpg",
  "Alessandro Nesta": "Alessandro_Nesta.jpg",
  "Fabio Cannavaro": "Fabio_Cannavaro_2009.jpg",
  "Sergio Ramos": "Sergio_Ramos_2018.jpg",
  Ramos: "Sergio_Ramos_2018.jpg",
  "Virgil van Dijk": "Virgil_van_Dijk_2019.jpg",
  "Carles Puyol": "Carles_Puyol.jpg",
  "Gerard Piqué": "Gerard_Pique_2018.jpg",
  "Gerard Pique": "Gerard_Pique_2018.jpg",
  "Thiago Silva": "Thiago_Silva_2018.jpg",
  "John Terry": "John_Terry_2015.jpg",
  "Rio Ferdinand": "Rio_Ferdinand.jpg",
  "Nemanja Vidić": "Nemanja_Vidic.jpg",
  "Nemanja Vidic": "Nemanja_Vidic.jpg",
  "Marcel Desailly": "Marcel_Desailly.jpg",
  "Lilian Thuram": "Lilian_Thuram.jpg",
  "Javier Zanetti": "Javier_Zanetti.jpg",
  "Philipp Lahm": "Philipp_Lahm_2014.jpg",
  Cafu: "Cafu_2006.jpg",
  "Roberto Carlos": "Roberto_Carlos.jpg",
  "Dani Alves": "Dani_Alves_2018.jpg",
  Marcelo: "Marcelo_Vieira_2019.jpg",
  "Ashley Cole": "Ashley_Cole.jpg",
  "Patrice Evra": "Patrice_Evra.jpg",
  "Trent Alexander-Arnold": "Trent_Alexander-Arnold_2018.jpg",
  "Andrew Robertson": "Andrew_Robertson_2018.jpg",
  "Ruben Dias": "Rúben_Dias_2021.jpg",
  "Rúben Dias": "Rúben_Dias_2021.jpg",
  "Mats Hummels": "Mats_Hummels_2018.jpg",
  "Jérôme Boateng": "Jerome_Boateng.jpg",
  "Jerome Boateng": "Jerome_Boateng.jpg",
  "Raphaël Varane": "Raphael_Varane_2018.jpg",
  "Raphael Varane": "Raphael_Varane_2018.jpg",
  "Leonardo Bonucci": "Leonardo_Bonucci_2018.jpg",
  "Giorgio Chiellini": "Giorgio_Chiellini_2018.jpg",
  "Vincent Kompany": "Vincent_Kompany.jpg",
  "Andrea Pirlo": "Andrea_Pirlo_Juventus_2012.jpg",
  "Xavi Hernández": "Xavi_Hernández_2012.jpg",
  Xavi: "Xavi_Hernández_2012.jpg",
  "Andrés Iniesta": "Andrés_Iniesta_2015.jpg",
  Iniesta: "Andrés_Iniesta_2015.jpg",
  "Luka Modrić": "Luka_Modric_2018.jpg",
  "Luka Modric": "Luka_Modric_2018.jpg",
  "Kevin De Bruyne": "Kevin_De_Bruyne_2019.jpg",
  "Toni Kroos": "Toni_Kroos_2018.jpg",
  Kroos: "Toni_Kroos_2018.jpg",
  "Sergio Busquets": "Sergio_Busquets_2018.jpg",
  Busquets: "Sergio_Busquets_2018.jpg",
  "Steven Gerrard": "Steven_Gerrard_2014.jpg",
  "Frank Lampard": "Frank_Lampard_2014.jpg",
  "Paul Scholes": "Paul_Scholes.jpg",
  "Ryan Giggs": "Ryan_Giggs.jpg",
  "Patrick Vieira": "Patrick_Vieira.jpg",
  "Claude Makélélé": "Claude_Makelele.jpg",
  "Claude Makelele": "Claude_Makelele.jpg",
  "Kaká": "Kaká_Inter_Milan.jpg",
  Kaka: "Kaká_Inter_Milan.jpg",
  "Zico": "Zico_1982.jpg",
  "Lothar Matthäus": "Lothar_Matthaus.jpg",
  "Lothar Matthaus": "Lothar_Matthaus.jpg",
  "Michael Ballack": "Michael_Ballack.jpg",
  "Bastian Schweinsteiger": "Bastian_Schweinsteiger_2015.jpg",
  "Xabi Alonso": "Xabi_Alonso_2015.jpg",
  "Cesc Fàbregas": "Cesc_Fabregas_2015.jpg",
  "Cesc Fabregas": "Cesc_Fabregas_2015.jpg",
  "David Silva": "David_Silva_2015.jpg",
  "Yaya Touré": "Yaya_Toure.jpg",
  "Yaya Toure": "Yaya_Toure.jpg",
  "N'Golo Kanté": "N'Golo_Kante_2018.jpg",
  "N'Golo Kante": "N'Golo_Kante_2018.jpg",
  "NGolo Kante": "N'Golo_Kante_2018.jpg",
  "Paul Pogba": "Paul_Pogba_2018.jpg",
  "Eden Hazard": "Eden_Hazard.jpg",
  Hazard: "Eden_Hazard.jpg",
  "Mesut Özil": "Mesut_Ozil_2015.jpg",
  "Mesut Ozil": "Mesut_Ozil_2015.jpg",
  "James Rodríguez": "James_Rodriguez_2014.jpg",
  "James Rodriguez": "James_Rodriguez_2014.jpg",
  "Bruno Fernandes": "Bruno_Fernandes_2021.jpg",
  "Rodri": "Rodri_2023.jpg",
  "Pedri": "Pedri_2021.jpg",
  "Gavi": "Gavi_2021.jpg",
  "Jude Bellingham": "Jude_Bellingham_2023.jpg",
  Bellingham: "Jude_Bellingham_2023.jpg",
  "Frenkie de Jong": "Frenkie_de_Jong_2019.jpg",
  "Joshua Kimmich": "Joshua_Kimmich_2018.jpg",
  "Bernardo Silva": "Bernardo_Silva_2019.jpg",
  "Marco Verratti": "Marco_Verratti_2018.jpg",
  "Casemiro": "Casemiro_2018.jpg",
  "Declan Rice": "Declan_Rice_2021.jpg",
  "Martin Ødegaard": "Martin_Odegaard_2021.jpg",
  "Martin Odegaard": "Martin_Odegaard_2021.jpg",
  "Thierry Henry": "Thierry_Henry_2012.jpg",
  "Kylian Mbappé": "Kylian_Mbappé_France.jpg",
  "Kylian Mbappe": "Kylian_Mbappé_France.jpg",
  "Neymar Jr": "Neymar_Jr._2018.jpg",
  Neymar: "Neymar_Jr._2018.jpg",
  "Mohamed Salah": "Mohamed_Salah_2018.jpg",
  Salah: "Mohamed_Salah_2018.jpg",
  "Robert Lewandowski": "Robert_Lewandowski_2021.jpg",
  "Karim Benzema": "Karim_Benzema_2018.jpg",
  Benzema: "Karim_Benzema_2018.jpg",
  "Luis Suárez": "Luis_Suárez_2018.jpg",
  "Luis Suarez": "Luis_Suárez_2018.jpg",
  "Zlatan Ibrahimović": "Zlatan_Ibrahimović_2018.jpg",
  "Zlatan Ibrahimovic": "Zlatan_Ibrahimović_2018.jpg",
  Zlatan: "Zlatan_Ibrahimović_2018.jpg",
  "Wayne Rooney": "Wayne_Rooney_2015.jpg",
  Rooney: "Wayne_Rooney_2015.jpg",
  "Didier Drogba": "Didier_Drogba_2015.jpg",
  "Samuel Eto'o": "Samuel_Eto'o_2011.jpg",
  "Gareth Bale": "Gareth_Bale_RM.jpg",
  "David Beckham": "David_Beckham_2015.jpg",
  Beckham: "David_Beckham_2015.jpg",
  "Francesco Totti": "Francesco_Totti.jpg",
  Totti: "Francesco_Totti.jpg",
  "Alessandro Del Piero": "Alessandro_Del_Piero.jpg",
  "Fernando Torres": "Fernando_Torres_2017.jpg",
  "David Villa": "David_Villa.jpg",
  "Dennis Bergkamp": "Dennis_Bergkamp.jpg",
  "Ruud van Nistelrooy": "Ruud_van_Nistelrooy.jpg",
  "Andriy Shevchenko": "Andriy_Shevchenko.jpg",
  "Gabriel Batistuta": "Gabriel_Batistuta.jpg",
  "Romário": "Romario.jpg",
  Romario: "Romario.jpg",
  "Rivaldo": "Rivaldo.jpg",
  "Roberto Baggio": "Roberto_Baggio.jpg",
  "Hristo Stoichkov": "Hristo_Stoichkov.jpg",
  "Raúl": "Raul_Gonzalez.jpg",
  Raul: "Raul_Gonzalez.jpg",
  "Raúl González": "Raul_Gonzalez.jpg",
  "Michael Owen": "Michael_Owen.jpg",
  "Alan Shearer": "Alan_Shearer.jpg",
  "Eric Cantona": "Eric_Cantona.jpg",
  "Marco Reus": "Marco_Reus_2018.jpg",
  "Thomas Müller": "Thomas_Muller_2018.jpg",
  "Thomas Muller": "Thomas_Muller_2018.jpg",
  "Arjen Robben": "Arjen_Robben.jpg",
  "Franck Ribéry": "Franck_Ribery.jpg",
  "Franck Ribery": "Franck_Ribery.jpg",
  "Ángel Di María": "Angel_Di_Maria_2018.jpg",
  "Angel Di Maria": "Angel_Di_Maria_2018.jpg",
  "Antoine Griezmann": "Antoine_Griezmann.jpg",
  Griezmann: "Antoine_Griezmann.jpg",
  "Harry Kane": "Harry_Kane_2023.jpg",
  "Erling Haaland": "Erling_Haaland_2023_(cropped).jpg",
  Haaland: "Erling_Haaland_2023_(cropped).jpg",
  "Vinícius Jr": "Vinicius_Junior_2021.jpg",
  "Vinicius Jr": "Vinicius_Junior_2021.jpg",
  Vinicius: "Vinicius_Junior_2021.jpg",
  "Rodrygo": "Rodrygo_2021.jpg",
  "Phil Foden": "Phil_Foden_2021.jpg",
  "Bukayo Saka": "Bukayo_Saka_2021.jpg",
  "Son Heung-min": "Son_Heung-min_2019.jpg",
  "Heung-min Son": "Son_Heung-min_2019.jpg",
  "Sadio Mané": "Sadio_Mane_2019.jpg",
  "Sadio Mane": "Sadio_Mane_2019.jpg",
  "Roberto Firmino": "Roberto_Firmino_2018.jpg",
  "Sergio Agüero": "Sergio_Aguero.jpg",
  "Sergio Aguero": "Sergio_Aguero.jpg",
  "Edinson Cavani": "Edinson_Cavani_2018.jpg",
  "Gonzalo Higuaín": "Gonzalo_Higuain.jpg",
  "Gonzalo Higuain": "Gonzalo_Higuain.jpg",
  "Paulo Dybala": "Paulo_Dybala_2018.jpg",
  "Lautaro Martínez": "Lautaro_Martinez_2021.jpg",
  "Lautaro Martinez": "Lautaro_Martinez_2021.jpg",
  "Romelu Lukaku": "Romelu_Lukaku_2018.jpg",
  "Pierre-Emerick Aubameyang": "Pierre-Emerick_Aubameyang.jpg",
  "Ousmane Dembélé": "Ousmane_Dembele_2018.jpg",
  "Ousmane Dembele": "Ousmane_Dembele_2018.jpg",
  "Lamine Yamal": "Lamine_Yamal_2023.jpg",
  "Jamal Musiala": "Jamal_Musiala_2021.jpg",
  "Victor Osimhen": "Victor_Osimhen_2022.jpg",
  "Rafael Leão": "Rafael_Leao_2021.jpg",
  "Rafael Leao": "Rafael_Leao_2021.jpg",
  "Marcus Rashford": "Marcus_Rashford_2019.jpg",
  "Jadon Sancho": "Jadon_Sancho_2019.jpg",
  "Jack Grealish": "Jack_Grealish_2021.jpg",
  "Raheem Sterling": "Raheem_Sterling_2018.jpg",
  "Leroy Sané": "Leroy_Sane_2018.jpg",
  "Leroy Sane": "Leroy_Sane_2018.jpg",
  "Kingsley Coman": "Kingsley_Coman_2018.jpg",
  "Serge Gnabry": "Serge_Gnabry_2018.jpg",
  "Kai Havertz": "Kai_Havertz_2019.jpg",
  "Riyad Mahrez": "Riyad_Mahrez_2018.jpg",
  "Achraf Hakimi": "Achraf_Hakimi_2019.jpg",
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
