export type QuizQuestion = {
  id: string;
  topic: string;
  q: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
};

/** Curated expandable pool — IDs stable for analytics */
export const QUIZ_POOL: QuizQuestion[] = [
  { id: "q1", topic: "World Cup", q: "Which country won the 2018 FIFA World Cup?", choices: ["Brazil", "France", "Germany", "Croatia"], answer: 1 },
  { id: "q2", topic: "World Cup", q: "Who won the 2022 FIFA World Cup Golden Ball?", choices: ["Lionel Messi", "Kylian Mbappé", "Luka Modrić", "Harry Kane"], answer: 0 },
  { id: "q3", topic: "Champions League", q: "Which club has won the most UEFA Champions League titles?", choices: ["AC Milan", "Liverpool", "Real Madrid", "Bayern Munich"], answer: 2 },
  { id: "q4", topic: "Premier League", q: "Who is the Premier League's all-time top scorer?", choices: ["Wayne Rooney", "Alan Shearer", "Harry Kane", "Thierry Henry"], answer: 1 },
  { id: "q5", topic: "La Liga", q: "Which player has scored the most goals in La Liga history?", choices: ["Cristiano Ronaldo", "Telmo Zarra", "Lionel Messi", "Hugo Sánchez"], answer: 2 },
  { id: "q6", topic: "Serie A", q: "Which club is known as the Nerazzurri?", choices: ["Juventus", "AC Milan", "Inter Milan", "Napoli"], answer: 2 },
  { id: "q7", topic: "Bundesliga", q: "Which club has won the most Bundesliga titles?", choices: ["Borussia Dortmund", "Bayern Munich", "Werder Bremen", "Schalke 04"], answer: 1 },
  { id: "q8", topic: "Ballon d'Or", q: "Who won the Ballon d'Or in 2023?", choices: ["Erling Haaland", "Lionel Messi", "Kylian Mbappé", "Karim Benzema"], answer: 1 },
  { id: "q9", topic: "Legends", q: "Which goalkeeper is nicknamed the Black Spider?", choices: ["Oliver Kahn", "Lev Yashin", "Gianluigi Buffon", "Dino Zoff"], answer: 1 },
  { id: "q10", topic: "Legends", q: "Diego Maradona is most famously associated with which World Cup year?", choices: ["1978", "1982", "1986", "1990"], answer: 2 },
  { id: "q11", topic: "eFootball", q: "eFootball is developed by which company?", choices: ["EA Sports", "Konami", "Ubisoft", "SEGA"], answer: 1 },
  { id: "q12", topic: "EA FC", q: "What did FIFA Ultimate Team become under EA Sports FC branding?", choices: ["FC Clubs", "Ultimate Squad", "Ultimate Team", "Club Mode"], answer: 2 },
  { id: "q13", topic: "Nepal", q: "What is the nickname of Nepal's national football team?", choices: ["The Lions", "The Gorkhalis", "Himalayan Tigers", "Red Dragons"], answer: 1 },
  { id: "q14", topic: "AFC", q: "The AFC Asian Cup is contested by teams from which confederation?", choices: ["CAF", "CONMEBOL", "AFC", "UEFA"], answer: 2 },
  { id: "q15", topic: "Stadiums", q: "Which stadium is home to FC Barcelona?", choices: ["Santiago Bernabéu", "San Siro", "Camp Nou", "Allianz Arena"], answer: 2 },
  { id: "q16", topic: "Managers", q: "Who managed Manchester City to multiple Premier League titles in the 2010s–2020s?", choices: ["José Mourinho", "Pep Guardiola", "Jürgen Klopp", "Carlo Ancelotti"], answer: 1 },
  { id: "q17", topic: "Records", q: "Which nation has won the most FIFA World Cups?", choices: ["Germany", "Italy", "Argentina", "Brazil"], answer: 3 },
  { id: "q18", topic: "Tactics", q: "A formation with three central defenders is often written as?", choices: ["4-4-2", "3-5-2", "4-3-3", "4-2-3-1"], answer: 1 },
  { id: "q19", topic: "Transfers", q: "Which Brazilian forward moved to PSG from Barcelona in 2017?", choices: ["Ronaldinho", "Neymar", "Rivaldo", "Kaká"], answer: 1 },
  { id: "q20", topic: "Clubs", q: "Which club plays at Anfield?", choices: ["Manchester United", "Chelsea", "Liverpool", "Arsenal"], answer: 2 },
  { id: "q21", topic: "World Cup", q: "Where was the 2014 FIFA World Cup held?", choices: ["South Africa", "Brazil", "Russia", "Germany"], answer: 1 },
  { id: "q22", topic: "Champions League", q: "Who scored a famous bicycle kick final goal for Real Madrid in 2018?", choices: ["Karim Benzema", "Gareth Bale", "Cristiano Ronaldo", "Sergio Ramos"], answer: 1 },
  { id: "q23", topic: "Premier League", q: "Which club is nicknamed the Gunners?", choices: ["Tottenham", "Arsenal", "West Ham", "Newcastle"], answer: 1 },
  { id: "q24", topic: "Legends", q: "Which Dutch star pioneered Total Football as a player and coach figure?", choices: ["Marco van Basten", "Johan Cruyff", "Ruud Gullit", "Dennis Bergkamp"], answer: 1 },
  { id: "q25", topic: "International", q: "How many players start on the pitch for one team in a standard match?", choices: ["9", "10", "11", "12"], answer: 2 },
  { id: "q26", topic: "Ballon d'Or", q: "Who was the first African player to win the Ballon d'Or?", choices: ["Didier Drogba", "George Weah", "Samuel Eto'o", "Yaya Touré"], answer: 1 },
  { id: "q27", topic: "Serie A", q: "Juventus traditionally wear which primary kit colours?", choices: ["Blue and black", "Red and black", "Black and white", "Green and white"], answer: 2 },
  { id: "q28", topic: "Stadiums", q: "Wembley Stadium is located in which city?", choices: ["Manchester", "London", "Birmingham", "Liverpool"], answer: 1 },
  { id: "q29", topic: "History", q: "In which year was the first FIFA World Cup held?", choices: ["1926", "1930", "1934", "1950"], answer: 1 },
  { id: "q30", topic: "eFootball", q: "In eFootball / PES heritage, which mode focuses on online ranked matches?", choices: ["Training", "Dream Team / Divisions", "Replay", "Edit"], answer: 1 },
  { id: "q31", topic: "Current", q: "Erling Haaland is primarily known as which type of player?", choices: ["Goalkeeper", "Full-back", "Striker", "Winger only"], answer: 2 },
  { id: "q32", topic: "Clubs", q: "Which club is nicknamed Los Blancos?", choices: ["Atlético Madrid", "Real Madrid", "Sevilla", "Valencia"], answer: 1 },
  { id: "q33", topic: "Managers", q: "Which manager is famous for the gegenpressing style at Liverpool?", choices: ["Pep Guardiola", "Jürgen Klopp", "Antonio Conte", "Thomas Tuchel"], answer: 1 },
  { id: "q34", topic: "Records", q: "A hat-trick means a player scored how many goals in one match?", choices: ["2", "3", "4", "5"], answer: 1 },
  { id: "q35", topic: "Nepal", q: "Dasharath Rangasala is a stadium in which city?", choices: ["Pokhara", "Kathmandu", "Biratnagar", "Lalitpur"], answer: 1 },
  { id: "q36", topic: "UEFA", q: "The UEFA Europa League trophy is competed for by clubs from which region primarily?", choices: ["South America", "Europe", "Asia", "Africa"], answer: 1 },
  { id: "q37", topic: "Legends", q: "Ronaldo Nazário is from which country?", choices: ["Portugal", "Spain", "Brazil", "Argentina"], answer: 2 },
  { id: "q38", topic: "Tactics", q: "A false nine is typically which position role?", choices: ["Deep-lying forward", "Wing-back", "Sweeper keeper", "Target midfielder"], answer: 0 },
  { id: "q39", topic: "World Cup", q: "Who hosted the 2002 FIFA World Cup jointly?", choices: ["Japan and South Korea", "China and Japan", "Australia and NZ", "USA and Mexico"], answer: 0 },
  { id: "q40", topic: "Premier League", q: "Which club plays at Old Trafford?", choices: ["Manchester City", "Manchester United", "Everton", "Leeds United"], answer: 1 },
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export type PlayQuestion = {
  id: string;
  topic: string;
  q: string;
  choices: string[];
  correctIndex: number;
};

/** Daily unique set per user (or anonymous seed) */
export function buildDailyQuiz(opts: {
  dateKey: string; // YYYY-MM-DD UTC
  userSalt?: string;
  count?: number;
}): PlayQuestion[] {
  const count = opts.count ?? 10;
  let seed = 0;
  const s = `${opts.dateKey}|${opts.userSalt ?? "guest"}|neparena-quiz`;
  for (let i = 0; i < s.length; i++) seed = (seed * 33 + s.charCodeAt(i)) >>> 0;
  const rng = mulberry32(seed || 1);
  const picked = shuffle(QUIZ_POOL, rng).slice(0, Math.min(count, QUIZ_POOL.length));
  return picked.map((item) => {
    const order = shuffle([0, 1, 2, 3], rng) as (0 | 1 | 2 | 3)[];
    const choices = order.map((i) => item.choices[i]!);
    const correctIndex = order.indexOf(item.answer);
    return {
      id: item.id,
      topic: item.topic,
      q: item.q,
      choices,
      correctIndex,
    };
  });
}

export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
