/**
 * Player photos — proxied for hotlink reliability.
 * Primary: Wikimedia via wsrv.nl  ·  Fallback: ui-avatars
 */

const WIKI_FILE = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;

/** Proxy so mobile browsers / CSP still load remote portraits */
export function proxiedPhoto(rawUrl: string, w = 400, h = 500): string {
  const clean = rawUrl.replace(/^https?:\/\//, "");
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=${w}&h=${h}&fit=cover&output=jpg&q=85`;
}

const RAW: Record<string, string> = {
  "Lionel Messi": WIKI_FILE("Lionel-Messi-Argentina-2022-FIFA-World-Cup (cropped).jpg"),
  "Cristiano Ronaldo": WIKI_FILE("Cristiano Ronaldo 2018.jpg"),
  "Pelé": WIKI_FILE("Pele (cropped).jpg"),
  "Diego Maradona": WIKI_FILE("Diego Maradona 2012 2.jpg"),
  "Zinedine Zidane": WIKI_FILE("Zinedine Zidane by Tasnim 03.jpg"),
  "Ronaldinho": WIKI_FILE("Ronaldinho 2019.jpg"),
  "Ronaldo Nazário": WIKI_FILE("Ronaldo Brazil.jpg"),
  "Johan Cruyff": WIKI_FILE("Johan Cruijff (1974).jpg"),
  "Franz Beckenbauer": WIKI_FILE("Franz Beckenbauer 1975.jpg"),
  "Paolo Maldini": WIKI_FILE("Paolo Maldini 2014.jpg"),
  "Andrea Pirlo": WIKI_FILE("Andrea Pirlo 2014.jpg"),
  "Xavi Hernández": WIKI_FILE("Xavi Hernández 2012.jpg"),
  "Andrés Iniesta": WIKI_FILE("Andrés Iniesta 2018.jpg"),
  "Luka Modrić": WIKI_FILE("Luka Modrić 2018.jpg"),
  "Kevin De Bruyne": WIKI_FILE("Kevin De Bruyne 201807081.jpg"),
  "Thierry Henry": WIKI_FILE("Thierry Henry 2012.jpg"),
  "Kylian Mbappé": WIKI_FILE("Kylian Mbappé 2019.jpg"),
  "Neymar Jr": WIKI_FILE("Neymar Jr. 2018.jpg"),
  Neymar: WIKI_FILE("Neymar Jr. 2018.jpg"),
  "Mohamed Salah": WIKI_FILE("Mohamed Salah 2018.jpg"),
  "Robert Lewandowski": WIKI_FILE("Robert Lewandowski 2020.jpg"),
  "Manuel Neuer": WIKI_FILE("Manuel Neuer 2018.jpg"),
  "Gianluigi Buffon": WIKI_FILE("Gianluigi Buffon 2018.jpg"),
  "Iker Casillas": WIKI_FILE("Iker Casillas 2015.jpg"),
  "Sergio Ramos": WIKI_FILE("Sergio Ramos 2018.jpg"),
  "Virgil van Dijk": WIKI_FILE("Virgil van Dijk 2019.jpg"),
  "Karim Benzema": WIKI_FILE("Karim Benzema 2018.jpg"),
  "Zlatan Ibrahimović": WIKI_FILE("Zlatan Ibrahimović 2018.jpg"),
  "Wayne Rooney": WIKI_FILE("Wayne Rooney 2018.jpg"),
  "Erling Haaland": WIKI_FILE("Erling Haaland 2023 (cropped).jpg"),
  "Vinícius Jr": WIKI_FILE("Vinícius Júnior 2021.jpg"),
  "Jude Bellingham": WIKI_FILE("Jude Bellingham 2023.jpg"),
  "Kaká": WIKI_FILE("Kaká 2007.jpg"),
  "Luis Suárez": WIKI_FILE("Luis Suárez 2018.jpg"),
  "Gareth Bale": WIKI_FILE("Gareth Bale 2015.jpg"),
  "Steven Gerrard": WIKI_FILE("Steven Gerrard 2014.jpg"),
  "Frank Lampard": WIKI_FILE("Frank Lampard 2014.jpg"),
  "Toni Kroos": WIKI_FILE("Toni Kroos 2018.jpg"),
  "Sergio Busquets": WIKI_FILE("Sergio Busquets 2018.jpg"),
  "Philipp Lahm": WIKI_FILE("Philipp Lahm 2014.jpg"),
  "Dani Alves": WIKI_FILE("Dani Alves 2018.jpg"),
  Marcelo: WIKI_FILE("Marcelo Vieira.jpg"),
  "Cafu": WIKI_FILE("Cafu.jpg"),
  "Roberto Carlos": WIKI_FILE("Roberto Carlos.jpg"),
  "Franco Baresi": WIKI_FILE("Franco Baresi.jpg"),
  "Fabio Cannavaro": WIKI_FILE("Fabio Cannavaro 2009.jpg"),
  "Alessandro Nesta": WIKI_FILE("Alessandro Nesta.jpg"),
  "Didier Drogba": WIKI_FILE("Didier Drogba 2015.jpg"),
  "Samuel Eto'o": WIKI_FILE("Samuel Eto'o.jpg"),
  "Patrick Vieira": WIKI_FILE("Patrick Vieira.jpg"),
  "Claude Makélélé": WIKI_FILE("Claude Makélélé.jpg"),
  "George Best": WIKI_FILE("George Best.jpg"),
  "Michel Platini": WIKI_FILE("Michel Platini.jpg"),
  "Lev Yashin": WIKI_FILE("Lev Yashin.jpg"),
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function avatarFallback(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&background=0f172a&color=38bdf8&bold=true&format=png`;
}

export function playerPhotoUrl(name: string): string {
  if (RAW[name]) return proxiedPhoto(RAW[name]);
  const n = normalize(name);
  for (const [key, url] of Object.entries(RAW)) {
    if (normalize(key) === n) return proxiedPhoto(url);
    if (n.includes(normalize(key)) || normalize(key).includes(n)) return proxiedPhoto(url);
  }
  const last = n.split(" ").pop() ?? n;
  for (const [key, url] of Object.entries(RAW)) {
    if (normalize(key).split(" ").pop() === last) return proxiedPhoto(url);
  }
  return avatarFallback(name);
}

export const MESSI_PHOTO = playerPhotoUrl("Lionel Messi");
export const RONALDO_PHOTO = playerPhotoUrl("Cristiano Ronaldo");
