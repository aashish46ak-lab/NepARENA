/**
 * Public Wikimedia Commons paths — reliable hotlinks for legend photos.
 * Falls back to generated avatar when missing.
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
  "Andrea Pirlo": WIKI("Andrea Pirlo 2014.jpg"),
  "Xavi Hernández": WIKI("Xavi Hernández 2012.jpg"),
  "Andrés Iniesta": WIKI("Andrés Iniesta 2018.jpg"),
  "Luka Modrić": WIKI("Luka Modrić 2018.jpg"),
  "Robert Lewandowski": WIKI("Robert Lewandowski 2020.jpg"),
  "Kylian Mbappé": WIKI("Kylian Mbappé 2019.jpg"),
  "Erling Haaland": WIKI("Erling Haaland 2023 (cropped).jpg"),
  "Neymar": WIKI("Neymar Jr. 2018.jpg"),
  "Mohamed Salah": WIKI("Mohamed Salah 2018.jpg"),
  "Kevin De Bruyne": WIKI("Kevin De Bruyne 201807081.jpg"),
  "Vinícius Jr": WIKI("Vinícius Júnior 2021.jpg"),
  "Jude Bellingham": WIKI("Jude Bellingham 2023.jpg"),
  "Thierry Henry": WIKI("Thierry Henry 2012.jpg"),
  "David Beckham": WIKI("David Beckham 2012.jpg"),
  "Sergio Ramos": WIKI("Sergio Ramos 2018.jpg"),
  "Virgil van Dijk": WIKI("Virgil van Dijk 2019.jpg"),
  "Karim Benzema": WIKI("Karim Benzema 2018.jpg"),
  "Zlatan Ibrahimović": WIKI("Zlatan Ibrahimović 2018.jpg"),
  "Wayne Rooney": WIKI("Wayne Rooney 2018.jpg"),
  "Manuel Neuer": WIKI("Manuel Neuer 2018.jpg"),
  "Gianluigi Buffon": WIKI("Gianluigi Buffon 2018.jpg"),
  "Iker Casillas": WIKI("Iker Casillas 2015.jpg"),
};

export function playerPhotoUrl(name: string): string {
  const direct = PLAYER_PHOTOS[name];
  if (direct) return direct;
  // Stable generated portrait placeholder
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&background=0f172a&color=38bdf8&bold=true&format=png`;
}

export const MESSI_PHOTO = PLAYER_PHOTOS["Lionel Messi"];
export const RONALDO_PHOTO = PLAYER_PHOTOS["Cristiano Ronaldo"];
