// Fixture generators for every supported bracket / competition format.
// Each fixture is assigned a matchday name; the manager persists
// matchdays first and maps names to ids before inserting matches.

import {
  type FormatConfig,
  type StageDefinition,
  knockoutRoundLabel,
  nextPowerOfTwo,
  parseFormatConfig,
} from "@/lib/tournament-format";

export interface FixtureSpec {
  matchday: string;
  round: number;
  position: number;
  home_id: string | null;
  away_id: string | null;
  stage_id?: string;
  stage_type?: string;
  group_key?: string | null;
  leg?: number;
  series_key?: string | null;
}

export const BRACKET_TYPES = [
  { value: "round_robin", label: "Round Robin" },
  { value: "league", label: "League (Home & Away)" },
  { value: "single_elimination", label: "Single Elimination" },
  { value: "double_elimination", label: "Double Elimination" },
  { value: "swiss", label: "Swiss" },
  { value: "groups_knockout", label: "Groups + Knockout" },
  { value: "group_only", label: "Group Stage Only" },
  { value: "league_knockout", label: "League + Knockout" },
  { value: "custom", label: "Custom" },
] as const;

export function bracketLabel(value: string): string {
  return BRACKET_TYPES.find((b) => b.value === value)?.label ?? "Round Robin";
}

export function isElimination(type: string): boolean {
  return (
    type === "single_elimination" ||
    type === "double_elimination" ||
    type === "groups_knockout" ||
    type === "league_knockout" ||
    type === "knockout"
  );
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roundRobin(
  idsIn: (string | null)[],
  startRound: number,
  prefix: (n: number) => string,
  flip = false,
  meta?: Partial<FixtureSpec>,
): FixtureSpec[] {
  const ids = [...idsIn];
  if (ids.length % 2 === 1) ids.push(null);
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
        out.push({
          matchday: prefix(r + 1),
          round: startRound + r,
          position: pos++,
          home_id: home,
          away_id: away,
          leg: 1,
          ...meta,
        });
      }
    }
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return out;
}

function roundName(round: number, totalRounds: number): string {
  return knockoutRoundLabel(round, totalRounds);
}

function singleElim(
  idsIn: string[],
  matchdayOf: (round: number, total: number, leg: number) => string,
  roundOffset = 0,
  legs = 1,
  meta?: Partial<FixtureSpec>,
): FixtureSpec[] {
  const size = nextPowerOfTwo(Math.max(idsIn.length, 2));
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
      const seriesKey = `r${roundOffset + r}-p${i / 2 + 1}`;
      for (let leg = 1; leg <= legs; leg++) {
        const homeLeg = legs === 2 && leg === 2 ? away : home;
        const awayLeg = legs === 2 && leg === 2 ? home : away;
        out.push({
          matchday: matchdayOf(r, totalRounds, leg),
          round: roundOffset + r,
          position: i / 2 + 1,
          home_id: homeLeg,
          away_id: awayLeg,
          leg,
          series_key: legs > 1 ? seriesKey : null,
          ...meta,
        });
      }
      winners.push(home && !away ? home : !home && away ? away : null);
    }
    slots = winners;
  }
  return out;
}

export function makeGroups<T>(ids: T[], groupCount: number): T[][] {
  const shuffled = shuffle(ids);
  const groups: T[][] = Array.from({ length: groupCount }, () => []);
  shuffled.forEach((id, i) => groups[i % groupCount].push(id));
  return groups;
}

export function generateGroupFixtures(groups: string[][]): FixtureSpec[] {
  const groupCount = groups.length;
  const groupNames = "ABCDEFGH".slice(0, groupCount).split("");
  const out: FixtureSpec[] = [];
  groups.forEach((g, gi) => {
    const specs = roundRobin(g, 1, (n) => `Group ${groupNames[gi]} · Matchday ${n}`, false, {
      stage_type: "group",
      group_key: groupNames[gi],
    });
    specs.forEach((s) => out.push({ ...s, round: gi * 10 + s.round }));
  });
  const koSize = nextPowerOfTwo(Math.max(groupCount * 2, 2));
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
        stage_type: "knockout",
        leg: 1,
      });
    }
  }
  out.push({
    matchday: "Third Place",
    round: 100 + koRounds + 1,
    position: 1,
    home_id: null,
    away_id: null,
    stage_type: "third_place",
    leg: 1,
  });
  return out;
}

function groupsKnockout(idsIn: string[]): FixtureSpec[] {
  const groupCount = Math.max(2, Math.ceil(idsIn.length / 4));
  return generateGroupFixtures(makeGroups(idsIn, groupCount));
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
      stage_type: "league",
      leg: 1,
    });
  }
  return out;
}

function fixturesForStage(stage: StageDefinition, ids: string[], roundOffset: number): FixtureSpec[] {
  const meta: Partial<FixtureSpec> = {
    stage_id: stage.id,
    stage_type: stage.type,
  };
  if (stage.type === "league" && stage.league) {
    const legs = Number(stage.league.legs) || 1;
    const out: FixtureSpec[] = [];
    let offset = roundOffset;
    for (let leg = 1; leg <= Math.min(legs, 4); leg++) {
      const flip = stage.league.homeAway && leg % 2 === 0;
      const specs = roundRobin(
        ids,
        offset,
        (n) => (legs > 1 ? `${stage.name} · Matchday ${n} (Leg ${leg})` : `${stage.name} · Matchday ${n}`),
        flip,
        { ...meta, leg },
      );
      out.push(...specs);
      offset += ids.length % 2 === 0 ? ids.length - 1 : ids.length;
    }
    return out;
  }
  if (stage.type === "group" && stage.group) {
    const count = Math.max(1, stage.group.groupCount);
    const groups = makeGroups(ids, count);
    const names = "ABCDEFGH".slice(0, count).split("");
    const out: FixtureSpec[] = [];
    const legs = Number(stage.group.legs) || 1;
    groups.forEach((g, gi) => {
      for (let leg = 1; leg <= legs; leg++) {
        const flip = legs > 1 && leg % 2 === 0;
        const specs = roundRobin(
          g,
          roundOffset + gi * 20 + (leg - 1) * 10,
          (n) => `Group ${names[gi]} · MD ${n}${legs > 1 ? ` · L${leg}` : ""}`,
          flip,
          { ...meta, group_key: names[gi], leg },
        );
        out.push(...specs);
      }
    });
    return out;
  }
  if (stage.type === "knockout" || stage.type === "final" || stage.type === "third_place") {
    const legs = stage.knockout?.legs === 2 ? 2 : 1;
    if (stage.type === "third_place") {
      return [
        {
          matchday: stage.name || "Third Place",
          round: roundOffset + 1,
          position: 1,
          home_id: null,
          away_id: null,
          leg: 1,
          ...meta,
        },
      ];
    }
    const entrants = ids.length >= 2 ? ids : [];
    if (entrants.length < 2) {
      // TBD bracket slots
      const size = stage.knockout?.bracketSize ?? 4;
      const totalRounds = Math.log2(nextPowerOfTwo(size));
      const out: FixtureSpec[] = [];
      for (let r = 1; r <= totalRounds; r++) {
        const matches = nextPowerOfTwo(size) / 2 ** r;
        for (let p = 1; p <= matches; p++) {
          const seriesKey = `ko-r${r}-p${p}`;
          for (let leg = 1; leg <= legs; leg++) {
            out.push({
              matchday:
                legs > 1
                  ? `${roundName(r, totalRounds)} — Leg ${leg}`
                  : roundName(r, totalRounds),
              round: roundOffset + r,
              position: p,
              home_id: null,
              away_id: null,
              leg,
              series_key: legs > 1 ? seriesKey : null,
              ...meta,
            });
          }
        }
      }
      if (stage.knockout?.thirdPlace) {
        out.push({
          matchday: "Third Place",
          round: roundOffset + totalRounds + 1,
          position: 1,
          home_id: null,
          away_id: null,
          leg: 1,
          stage_id: stage.id,
          stage_type: "third_place",
        });
      }
      return out;
    }
    const out = singleElim(
      entrants,
      (r, t, leg) =>
        legs > 1 ? `${roundName(r, t)} — Leg ${leg}` : roundName(r, t),
      roundOffset,
      legs,
      meta,
    );
    if (stage.knockout?.thirdPlace) {
      const totalRounds = Math.log2(nextPowerOfTwo(entrants.length));
      out.push({
        matchday: "Third Place",
        round: roundOffset + totalRounds + 1,
        position: 1,
        home_id: null,
        away_id: null,
        leg: 1,
        stage_id: stage.id,
        stage_type: "third_place",
      });
    }
    return out;
  }
  return [];
}

export function generateFromFormat(cfg: FormatConfig, ids: string[]): FixtureSpec[] {
  ids = shuffle(ids);
  const sorted = [...cfg.stages].sort((a, b) => a.order - b.order);
  const out: FixtureSpec[] = [];
  let roundOffset = 0;
  for (const stage of sorted) {
    // Knockout after groups/league: leave TBD slots (admin fills after qualification)
    const stageIds =
      stage.type === "knockout" || stage.type === "final"
        ? stage.order > 0
          ? []
          : ids
        : ids;
    const specs = fixturesForStage(stage, stageIds, roundOffset);
    out.push(...specs);
    const maxR = specs.reduce((m, s) => Math.max(m, s.round), roundOffset);
    roundOffset = maxR + 1;
  }
  return out;
}

export function generateFixtures(type: string, ids: string[]): FixtureSpec[] {
  ids = shuffle(ids);
  switch (type) {
    case "league": {
      const roundsPerLeg = ids.length % 2 === 0 ? ids.length - 1 : ids.length;
      const firstLeg = roundRobin(ids, 1, (n) => `Matchday ${n}`);
      const secondLeg = roundRobin(
        ids,
        roundsPerLeg + 1,
        (n) => `Matchday ${roundsPerLeg + n}`,
        true,
      );
      return [...firstLeg, ...secondLeg];
    }
    case "single_elimination":
      return singleElim(ids, (r, t) => roundName(r, t));
    case "double_elimination": {
      const upper = singleElim(ids, (r, t) => `Winners · ${roundName(r, t)}`);
      const totalRounds = Math.log2(nextPowerOfTwo(Math.max(ids.length, 2)));
      const out = [...upper];
      const losersRounds = Math.max(1, (totalRounds - 1) * 2);
      for (let r = 1; r <= losersRounds; r++) {
        const matches = Math.max(
          1,
          2 ** Math.max(0, totalRounds - Math.ceil(r / 2) - 1),
        );
        for (let p = 1; p <= matches; p++) {
          out.push({
            matchday: `Losers Round ${r}`,
            round: 100 + r,
            position: p,
            home_id: null,
            away_id: null,
            leg: 1,
          });
        }
      }
      out.push({
        matchday: "Grand Final",
        round: 200,
        position: 1,
        home_id: null,
        away_id: null,
        leg: 1,
      });
      return out;
    }
    case "swiss":
      return swissRound(shuffle(ids), 1);
    case "groups_knockout":
      return groupsKnockout(ids);
    case "group_only": {
      const groupCount = Math.max(2, Math.ceil(ids.length / 4));
      const groups = makeGroups(ids, groupCount);
      const names = "ABCDEFGH".slice(0, groupCount).split("");
      const out: FixtureSpec[] = [];
      groups.forEach((g, gi) => {
        out.push(
          ...roundRobin(g, 1, (n) => `Group ${names[gi]} · Matchday ${n}`, false, {
            stage_type: "group",
            group_key: names[gi],
          }),
        );
      });
      return out;
    }
    case "league_knockout": {
      const league = roundRobin(ids, 1, (n) => `Matchday ${n}`, false, {
        stage_type: "league",
      });
      const ko = singleElim([], (r, t) => roundName(r, t), 100, 1, {
        stage_type: "knockout",
      });
      // empty entrants → TBD KO slots based on 8
      const koTbd = singleElim(
        Array.from({ length: 8 }, (_, i) => `tbd_${i}`),
        (r, t) => roundName(r, t),
        100,
        1,
        { stage_type: "knockout" },
      ).map((s) => ({ ...s, home_id: null, away_id: null }));
      return [...league, ...koTbd];
    }
    case "round_robin":
    default:
      return roundRobin(ids, 1, (n) => `Matchday ${n}`);
  }
}

export function generateFixturesForTournament(
  tournament: {
    bracket_type?: string | null;
    format_config?: unknown;
  },
  ids: string[],
): FixtureSpec[] {
  const cfg = parseFormatConfig(tournament.format_config, tournament.bracket_type);
  if (cfg.stages.length > 0 && cfg.preset !== "swiss") {
    try {
      const fromFormat = generateFromFormat(cfg, ids);
      if (fromFormat.length > 0) return fromFormat;
    } catch {
      /* fall through */
    }
  }
  return generateFixtures(tournament.bracket_type ?? "round_robin", ids);
}

export function generateSwissNext(sortedIds: string[], roundNumber: number): FixtureSpec[] {
  return swissRound(sortedIds, roundNumber);
}

/** Aggregate score for a two-leg series (same series_key). */
export function computeAggregate(
  matches: {
    series_key?: string | null;
    home_id: string | null;
    away_id: string | null;
    home_score: number | null;
    away_score: number | null;
    played?: boolean;
  }[],
  seriesKey: string,
): { a: number; b: number; complete: boolean } {
  const legs = matches.filter((m) => m.series_key === seriesKey && m.played);
  if (!legs.length) return { a: 0, b: 0, complete: false };
  // Normalize to first leg's home as team A
  const first = legs[0];
  const teamA = first.home_id;
  const teamB = first.away_id;
  let a = 0;
  let b = 0;
  for (const m of legs) {
    if (m.home_score == null || m.away_score == null) continue;
    if (m.home_id === teamA && m.away_id === teamB) {
      a += m.home_score;
      b += m.away_score;
    } else if (m.home_id === teamB && m.away_id === teamA) {
      a += m.away_score;
      b += m.home_score;
    } else {
      a += m.home_score;
      b += m.away_score;
    }
  }
  return { a, b, complete: legs.length >= 2 };
}
