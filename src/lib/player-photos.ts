/**
 * Public Wikimedia Commons paths for legend photos.
 * Fuzzy match handles name variants (Neymar Jr / Neymar, etc.).
 */

const WIKI = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;

export const PLAYER_PHOTOS: Record<string, string> = {
  "Lionel Messi": WIKI("Lionel-Messi-Argentina-2022-FIFA-World-Cup (cropped).jpg"),
  "Cristiano Ronaldo": WIKI("Cristiano Ronaldo 2018.jpg"),
  "Pelé": WIKI("Pele (cropped).jpg"),
  "Diego Maradona": WIKI("Diego Maradona 2012 2.jpg"),
  "Zinedine Zidane": WIKI("Zinedine Zidane by Tasnim 03.jpg"),
  "Ronaldinho": WIKI("Ronaldinho 2019.jpg"),
  "Ronaldo Nazário": WIKI("Ronaldo Brazil.jpg"),
  "Johan Cruyff": WIKI("Johan Cruijff (1974).jpg"),
  "Franz Beckenbauer": WIKI("Franz Beckenbauer 1975.jpg"),
  "Paolo Maldini": WIKI("Paolo Maldini 2014.jpg"),
  "Franco Baresi": WIKI("Franco Baresi.jpg"),
  "Cafu": WIKI("Cafu.jpg"),
  "Roberto Carlos": WIKI("Roberto Carlos.jpg"),
  "Andrea Pirlo": WIKI("Andrea Pirlo 2014.jpg"),
  "Xavi Hernández": WIKI("Xavi Hernández 2012.jpg"),
  "Andrés Iniesta": WIKI("Andrés Iniesta 2018.jpg"),
  "Luka Modrić": WIKI("Luka Modrić 2018.jpg"),
  "Kevin De Bruyne": WIKI("Kevin De Bruyne 201807081.jpg"),
  "Thierry Henry": WIKI("Thierry Henry 2012.jpg"),
  "Kylian Mbappé": WIKI("Kylian Mbappé 2019.jpg"),
  "Neymar Jr": WIKI("Neymar Jr. 2018.jpg"),
  Neymar: WIKI("Neymar Jr. 2018.jpg"),
  "Mohamed Salah": WIKI("Mohamed Salah 2018.jpg"),
  "Robert Lewandowski": WIKI("Robert Lewandowski 2020.jpg"),
  "Manuel Neuer": WIKI("Manuel Neuer 2018.jpg"),
  "Gianluigi Buffon": WIKI("Gianluigi Buffon 2018.jpg"),
  "Iker Casillas": WIKI("Iker Casillas 2015.jpg"),
  "Sergio Ramos": WIKI("Sergio Ramos 2018.jpg"),
  "Virgil van Dijk": WIKI("Virgil van Dijk 2019.jpg"),
  "Kaká": WIKI("Kaká 2007.jpg"),
  "Steven Gerrard": WIKI("Steven Gerrard 2014.jpg"),
  "Frank Lampard": WIKI("Frank Lampard 2014.jpg"),
  "Patrick Vieira": WIKI("Patrick Vieira.jpg"),
  "Claude Makélélé": WIKI("Claude Makélélé.jpg"),
  "Gareth Bale": WIKI("Gareth Bale 2015.jpg"),
  "Luis Suárez": WIKI("Luis Suárez 2018.jpg"),
  "Karim Benzema": WIKI("Karim Benzema 2018.jpg"),
  "Didier Drogba": WIKI("Didier Drogba 2015.jpg"),
  "Samuel Eto'o": WIKI("Samuel Eto'o.jpg"),
  "George Best": WIKI("George Best.jpg"),
  "Michel Platini": WIKI("Michel Platini.jpg"),
  "Lev Yashin": WIKI("Lev Yashin.jpg"),
  "Alessandro Nesta": WIKI("Alessandro Nesta.jpg"),
  "Fabio Cannavaro": WIKI("Fabio Cannavaro 2009.jpg"),
  "Philipp Lahm": WIKI("Philipp Lahm 2014.jpg"),
  Marcelo: WIKI("Marcelo Vieira.jpg"),
  "Dani Alves": WIKI("Dani Alves 2018.jpg"),
  "Sergio Busquets": WIKI("Sergio Busquets 2018.jpg"),
  "Toni Kroos": WIKI("Toni Kroos 2018.jpg"),
  "Zlatan Ibrahimović": WIKI("Zlatan Ibrahimović 2018.jpg"),
  "Wayne Rooney": WIKI("Wayne Rooney 2018.jpg"),
  "Erling Haaland": WIKI("Erling Haaland 2023 (cropped).jpg"),
  "Vinícius Jr": WIKI("Vinícius Júnior 2021.jpg"),
  "Jude Bellingham": WIKI("Jude Bellingham 2023.jpg"),
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function playerPhotoUrl(name: string): string {
  if (PLAYER_PHOTOS[name]) return PLAYER_PHOTOS[name];
  const n = normalize(name);
  for (const [key, url] of Object.entries(PLAYER_PHOTOS)) {
    if (normalize(key) === n) return url;
    if (n.includes(normalize(key)) || normalize(key).includes(n)) return url;
  }
  // last token match ("Messi")
  const last = n.split(" ").pop() ?? n;
  for (const [key, url] of Object.entries(PLAYER_PHOTOS)) {
    if (normalize(key).split(" ").pop() === last) return url;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&background=0f172a&color=38bdf8&bold=true&format=png`;
}

export const MESSI_PHOTO = PLAYER_PHOTOS["Lionel Messi"];
export const RONALDO_PHOTO = PLAYER_PHOTOS["Cristiano Ronaldo"];
