// Fixture generators for every supported bracket type.
// Each fixture is assigned a matchday name; the manager persists
// matchdays first and maps names to ids before inserting matches.

export interface FixtureSpec {
  matchday: string;
  round: number;
  position: number;
  home_id: string | null;
  away_id: string | null;
}

export const BRACKET_TYPES = [
  { value: "round_robin", label: "Round Robin" },
  { value: "league", label: "League (Home & Away)" },
  { value: "single_elimination", label: "Single Elimination" },
  { value: "double_elimination", label: "Double Elimination" },
  { value: "swiss", label: "Swiss" },
  { value: "groups_knockout", label: "Groups + Knockout" },
] as const;

export function bracketLabel(value: string): string {
  return BRACKET_TYPES.find((b) => b.value === value)?.label ?? "Round Robin";
}

export function isElimination(type: string): boolean {
  return type === "single_elimination" || type === "double_elimination" || type === "groups_knockout";
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Circle-method round robin. `prefix` names each round's matchday. */
function roundRobin(idsIn: (string | null)[], startRound: number, prefix: (n: number) => string, flip = false): FixtureSpec[] {
  const ids = [...idsIn];
  if (ids.length % 2 === 1) ids.push(null); // bye
  const n = ids.length;
  const out: FixtureSpec[] = [];
  let arr = [...ids];
  for (let r = 0; r < n - 1; r++) {
    let pos = 1;
    for (let i = 0; i < n / 2; i++) {
      let home = arr[i];
      let away = arr[n - 1 - i];
      if (r % 2 === 1) [home, away] = [away, home];
      if (flip) [home, away] = [away, home];
      if (home && away) {
        out.push({ matchday: prefix(r + 1), round: startRound + r, position: pos++, home_id: home, away_id: away });
      }
    }
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return out;
}

function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi Finals";
  if (fromEnd === 2) return "Quarter Finals";
  return `Round of ${2 ** (fromEnd + 1)}`;
}

/** Seeded single-elimination bracket; byes advance automatically. */
function singleElim(idsIn: string[], matchdayOf: (round: number, total: number) => string, roundOffset = 0): FixtureSpec[] {
  const size = 2 ** Math.ceil(Math.log2(Math.max(idsIn.length, 2)));
  const totalRounds = Math.log2(size);
  const seeds: (string | null)[] = shuffle(idsIn);
  while (seeds.length < size) seeds.push(null);
  const out: FixtureSpec[] = [];
  let slots: (string | null)[] = seeds;
  for (let r = 1; r <= totalRounds; r++) {
    const winners: (string | null)[] = [];
    for (let i = 0; i < slots.length; i += 2) {
      const home = slots[i];
      const away = slots[i + 1];
      out.push({
        matchday: matchdayOf(r, totalRounds),
        round: roundOffset + r,
        position: i / 2 + 1,
        home_id: home,
        away_id: away,
      });
      winners.push(home && !away ? home : !home && away ? away : null);
    }
    slots = winners;
  }
  return out;
}

function groupsKnockout(idsIn: string[]): FixtureSpec[] {
  const ids = shuffle(idsIn);
  const groupCount = Math.max(2, Math.ceil(ids.length / 4));
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  ids.forEach((id, i) => groups[i % groupCount].push(id));
  const groupNames = "ABCDEFGH".slice(0, groupCount).split("");
  const out: FixtureSpec[] = [];
  groups.forEach((g, gi) => {
    const specs = roundRobin(g, 1, (n) => `Group ${groupNames[gi]} · Matchday ${n}`);
    specs.forEach((s) => out.push({ ...s, round: gi * 10 + s.round }));
  });
  // Knockout stage with TBD slots (admin assigns or edits fixtures manually)
  const koSize = 2 ** Math.ceil(Math.log2(groupCount * 2));
  const koRounds = Math.log2(koSize);
  for (let r = 1; r <= koRounds; r++) {
    const matches = koSize / 2 ** r;
    for (let p = 1; p <= matches; p++) {
      out.push({
        matchday: `Knockout · ${roundName(r, koRounds)}`,
        round: 100 + r,
        position: p,
        home_id: null,
        away_id: null,
      });
    }
  }
  out.push({ matchday: "Third Place", round: 100 + koRounds + 1, position: 1, home_id: null, away_id: null });
  return out;
}

function swissRound(ids: string[], roundNumber: number): FixtureSpec[] {
  const out: FixtureSpec[] = [];
  for (let i = 0; i + 1 < ids.length; i += 2) {
    out.push({
      matchday: `Swiss Round ${roundNumber}`,
      round: roundNumber,
      position: i / 2 + 1,
      home_id: ids[i],
      away_id: ids[i + 1],
    });
  }
  return out;
}

export function generateFixtures(type: string, ids: string[]): FixtureSpec[] {
  switch (type) {
    case "league": {
      const roundsPerLeg = ids.length % 2 === 0 ? ids.length - 1 : ids.length;
      const firstLeg = roundRobin(ids, 1, (n) => `Matchday ${n}`);
      const secondLeg = roundRobin(ids, roundsPerLeg + 1, (n) => `Matchday ${roundsPerLeg + n}`, true);
      return [...firstLeg, ...secondLeg];
    }
    case "single_elimination":
      return singleElim(ids, (r, t) => roundName(r, t));
    case "double_elimination": {
      const upper = singleElim(ids, (r, t) => `Winners · ${roundName(r, t)}`);
      const totalRounds = Math.log2(2 ** Math.ceil(Math.log2(Math.max(ids.length, 2))));
      const out = [...upper];
      const losersRounds = Math.max(1, (totalRounds - 1) * 2);
      for (let r = 1; r <= losersRounds; r++) {
        const matches = Math.max(1, 2 ** Math.max(0, totalRounds - Math.ceil(r / 2) - 1));
        for (let p = 1; p <= matches; p++) {
          out.push({ matchday: `Losers Round ${r}`, round: 100 + r, position: p, home_id: null, away_id: null });
        }
      }
      out.push({ matchday: "Grand Final", round: 200, position: 1, home_id: null, away_id: null });
      return out;
    }
    case "swiss":
      return swissRound(shuffle(ids), 1);
    case "groups_knockout":
      return groupsKnockout(ids);
    case "round_robin":
    default:
      return roundRobin(ids, 1, (n) => `Matchday ${n}`);
  }
}

/** Generate the next Swiss round, pairing players by current standings order. */
export function generateSwissNext(sortedIds: string[], roundNumber: number): FixtureSpec[] {
  return swissRound(sortedIds, roundNumber);
}