// MATCHDAY_V6: unified Matchday N only (no Group prefix)
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

function resolveGroups(
  ids: string[],
  count: number,
  groupDraw?: { name: string; ids: string[] }[],
): { names: string[]; groups: string[][] } {
  if (groupDraw && groupDraw.length > 0) {
    const groups = groupDraw.map((g) => g.ids.filter((id) => ids.includes(id)));
    if (groups.some((g) => g.length > 0)) {
      const names = groupDraw.map((g, i) => {
        const n = g.name?.trim();
        if (n) {
          const m = n.match(/Group\s*([A-Z])/i);
          if (m) return m[1].toUpperCase();
          if (n.length === 1) return n.toUpperCase();
          return String.fromCharCode(65 + (i % 26));
        }
        return String.fromCharCode(65 + (i % 26));
      });
      return { names, groups };
    }
  }
  const groups = makeGroups(ids, Math.max(1, Math.min(count, ids.length)));
  const names = "ABCDEFGH".slice(0, groups.length).split("");
  return { names, groups };
}

export function generateGroupFixtures(groups: string[][]): FixtureSpec[] {
  const groupCount = groups.length;
  const groupNames = "ABCDEFGH".slice(0, groupCount).split("");
  const out: FixtureSpec[] = [];
  groups.forEach((g, gi) => {
    const specs = roundRobin(
      g, 1, (n) => `Matchday ${n}`, false,
      { stage_type: "group", group_key: groupNames[gi] },
    );
    specs.forEach((s) => out.push({ ...s, round: gi * 10 + s.round }));
  });
  const koSize = nextPowerOfTwo(Math.max(groupCount * 2, 2));
  const koRounds = Math.log2(koSize);
  for (let r = 1; r <= koRounds; r++) {
    const matches = koSize / 2 ** r;
    for (let p = 1; p <= matches; p++) {
      out.push({
        matchday: roundName(r, koRounds),
        round: 100 + r, position: p, home_id: null, away_id: null,
        stage_type: "knockout", leg: 1,
      });
    }
  }
  out.push({
    matchday: "Third Place", round: 100 + koRounds + 1, position: 1,
    home_id: null, away_id: null, stage_type: "third_place", leg: 1,
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
      matchday: `Swiss Round ${roundNumber}`, round: roundNumber,
      position: i / 2 + 1, home_id: ids[i], away_id: ids[i + 1],
      stage_type: "league", leg: 1,
    });
  }
  return out;
}

function fixturesForStage(
  stage: StageDefinition,
  ids: string[],
  roundOffset: number,
  cfg?: FormatConfig,
): FixtureSpec[] {
  const meta: Partial<FixtureSpec> = { stage_id: stage.id, stage_type: stage.type };
  if (stage.type === "league" && stage.league) {
    const legs = Number(stage.league.legs) || 1;
    const out: FixtureSpec[] = [];
    let offset = roundOffset;
    for (let leg = 1; leg <= Math.min(legs, 4); leg++) {
      const flip = stage.league.homeAway && leg % 2 === 0;
      const specs = roundRobin(
        ids, offset,
        (n) => legs > 1 ? `Matchday ${n} · Leg ${leg}` : `Matchday ${n}`,
        flip, { ...meta, leg },
      );
      out.push(...specs);
      offset += ids.length % 2 === 0 ? ids.length - 1 : ids.length;
    }
    return out;
  }
  if (stage.type === "group" && stage.group) {
    const count = Math.max(1, stage.group.groupCount);
    const { names, groups } = resolveGroups(ids, count, cfg?.groupDraw);
    const out: FixtureSpec[] = [];
    const legs = Number(stage.group.legs) || 1;
    groups.forEach((g, gi) => {
      for (let leg = 1; leg <= legs; leg++) {
        const flip = legs > 1 && leg % 2 === 0;
        const gName = names[gi] ?? String.fromCharCode(65 + gi);
        const specs = roundRobin(
          g, roundOffset + gi * 20 + (leg - 1) * 10,
          (n) => `Matchday ${n}${legs > 1 ? ` · Leg ${leg}` : ""}`,
          flip, { ...meta, group_key: gName, leg },
        );
        out.push(...specs);
      }
    });
    return out;
  }
  if (stage.type === "knockout" || stage.type === "final" || stage.type === "third_place") {
    const legs = stage.knockout?.legs === 2 ? 2 : 1;
    if (stage.type === "third_place") {
      return [{
        matchday: stage.name || "Third Place", round: roundOffset + 1, position: 1,
        home_id: null, away_id: null, leg: 1, ...meta,
      }];
    }
    const entrants = ids.length >= 2 ? ids : [];
    const priorGroup = cfg?.stages.find((s) => s.type === "group" && s.order < stage.order);
    const groupCount = priorGroup?.group?.groupCount ?? cfg?.groupDraw?.length ?? 4;
    const qualify =
      (priorGroup?.group?.groupCount ?? groupCount) * (priorGroup?.group?.qualifyPerGroup ?? 2) +
      (priorGroup?.group?.bestThirds ?? 0);

    if (entrants.length < 2) {
      let size = stage.knockout?.bracketSize;
      if (!size) {
        if (qualify >= 2) size = nextPowerOfTwo(qualify);
        else if (cfg?.leagueQualifyCount) size = nextPowerOfTwo(cfg.leagueQualifyCount);
        else size = 4;
      }
      size = nextPowerOfTwo(Math.max(2, size));
      const totalRounds = Math.log2(size);
      const out: FixtureSpec[] = [];
      for (let r = 1; r <= totalRounds; r++) {
        const matches = size / 2 ** r;
        for (let p = 1; p <= matches; p++) {
          const seriesKey = `ko-r${r}-p${p}`;
          for (let leg = 1; leg <= legs; leg++) {
            const base = legs > 1
              ? `${roundName(r, totalRounds)} — Leg ${leg}`
              : roundName(r, totalRounds);
            out.push({
              matchday: base,
              round: roundOffset + r, position: p,
              home_id: null, away_id: null, leg,
              series_key: legs > 1 ? seriesKey : null, ...meta,
            });
          }
        }
      }
      if (stage.knockout?.thirdPlace) {
        out.push({
          matchday: "Third Place", round: roundOffset + totalRounds + 1, position: 1,
          home_id: null, away_id: null, leg: 1,
          stage_id: stage.id, stage_type: "third_place",
        });
      }
      return out;
    }
    const out = singleElim(
      entrants,
      (r, t, leg) => legs > 1 ? `${roundName(r, t)} — Leg ${leg}` : roundName(r, t),
      roundOffset, legs, meta,
    );
    if (stage.knockout?.thirdPlace) {
      const totalRounds = Math.log2(nextPowerOfTwo(entrants.length));
      out.push({
        matchday: "Third Place", round: roundOffset + totalRounds + 1, position: 1,
        home_id: null, away_id: null, leg: 1,
        stage_id: stage.id, stage_type: "third_place",
      });
    }
    return out;
  }
  return [];
}

export function generateFromFormat(cfg: FormatConfig, ids: string[]): FixtureSpec[] {
  const hasDraw = !!(cfg.groupDraw && cfg.groupDraw.length > 0);
  ids = hasDraw ? [...ids] : shuffle(ids);
  const sorted = [...cfg.stages].sort((a, b) => a.order - b.order);
  const out: FixtureSpec[] = [];
  let roundOffset = 0;
  for (const stage of sorted) {
    const stageIds =
      stage.type === "knockout" || stage.type === "final"
        ? stage.order > 0 ? [] : ids
        : ids;
    const specs = fixturesForStage(stage, stageIds, roundOffset, cfg);
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
      const secondLeg = roundRobin(ids, roundsPerLeg + 1, (n) => `Matchday ${roundsPerLeg + n}`, true);
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
        const matches = Math.max(1, 2 ** Math.max(0, totalRounds - Math.ceil(r / 2) - 1));
        for (let p = 1; p <= matches; p++) {
          out.push({ matchday: `Losers Round ${r}`, round: 100 + r, position: p, home_id: null, away_id: null, leg: 1 });
        }
      }
      out.push({ matchday: "Grand Final", round: 200, position: 1, home_id: null, away_id: null, leg: 1 });
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
        out.push(...roundRobin(g, 1, (n) => `Matchday ${n}`, false, { stage_type: "group", group_key: names[gi] }));
      });
      return out;
    }
    case "league_knockout": {
      const league = roundRobin(ids, 1, (n) => `Matchday ${n}`, false, { stage_type: "league" });
      const koTbd = singleElim(
        Array.from({ length: 8 }, (_, i) => `tbd_${i}`),
        (r, t) => roundName(r, t), 100, 1, { stage_type: "knockout" },
      ).map((s) => ({ ...s, home_id: null, away_id: null }));
      return [...league, ...koTbd];
    }
    case "round_robin":
    default:
      return roundRobin(ids, 1, (n) => `Matchday ${n}`);
  }
}

export function generateFixturesForTournament(
  tournament: { bracket_type?: string | null; format_config?: unknown },
  ids: string[],
): FixtureSpec[] {
  const cfg = parseFormatConfig(tournament.format_config, tournament.bracket_type);
  if (cfg.stages.length > 0 && cfg.preset !== "swiss") {
    try {
      const fromFormat = generateFromFormat(cfg, ids);
      if (fromFormat.length > 0) return fromFormat;
    } catch { /* fall through */ }
  }
  return generateFixtures(tournament.bracket_type ?? "round_robin", ids);
}

export function generateSwissNext(sortedIds: string[], roundNumber: number): FixtureSpec[] {
  return swissRound(sortedIds, roundNumber);
}

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
  const first = legs[0];
  const teamA = first.home_id;
  const teamB = first.away_id;
  let a = 0, b = 0;
  for (const m of legs) {
    if (m.home_score == null || m.away_score == null) continue;
    if (m.home_id === teamA && m.away_id === teamB) { a += m.home_score; b += m.away_score; }
    else if (m.home_id === teamB && m.away_id === teamA) { a += m.away_score; b += m.home_score; }
    else { a += m.home_score; b += m.away_score; }
  }
  return { a, b, complete: legs.length >= 2 };
}

export function standingsByGroup(
  matches: {
    home_id: string | null;
    away_id: string | null;
    home_score: number | null;
    away_score: number | null;
    played?: boolean;
    group_key?: string | null;
    stage_type?: string | null;
  }[],
): Map<string, { id: string; pts: number; gd: number; gf: number; played: number }[]> {
  type Acc = { id: string; pts: number; gd: number; gf: number; ga: number; played: number };
  const byGroup = new Map<string, Map<string, Acc>>();
  const ensure = (gk: string, id: string) => {
    if (!byGroup.has(gk)) byGroup.set(gk, new Map());
    const m = byGroup.get(gk)!;
    if (!m.has(id)) m.set(id, { id, pts: 0, gd: 0, gf: 0, ga: 0, played: 0 });
    return m.get(id)!;
  };
  for (const m of matches) {
    if (!m.played || m.home_score == null || m.away_score == null) continue;
    if (!m.home_id || !m.away_id) continue;
    const gk = m.group_key;
    if (!gk) continue;
    const h = ensure(gk, m.home_id);
    const a = ensure(gk, m.away_id);
    h.played++; a.played++;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) h.pts += 3;
    else if (m.home_score < m.away_score) a.pts += 3;
    else { h.pts += 1; a.pts += 1; }
  }
  const out = new Map<string, { id: string; pts: number; gd: number; gf: number; played: number }[]>();
  for (const [gk, map] of byGroup) {
    const rows = [...map.values()].map((r) => ({
      id: r.id, pts: r.pts, gd: r.gf - r.ga, gf: r.gf, played: r.played,
    }));
    rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    out.set(gk, rows);
  }
  return out;
}

export function seedFirstKnockoutRound(
  groupTables: Map<string, { id: string }[]>,
  qualifyPerGroup: number,
  firstRoundMatchCount: number,
): Map<number, { home_id: string | null; away_id: string | null }> {
  const letters = [...groupTables.keys()].sort((a, b) => a.localeCompare(b));
  const q = Math.max(1, qualifyPerGroup);
  const result = new Map<number, { home_id: string | null; away_id: string | null }>();
  const pick = (letter: string, place: number): string | null => {
    const rows = groupTables.get(letter) ?? groupTables.get(`Group ${letter}`);
    if (!rows || place < 1 || place > rows.length) return null;
    return rows[place - 1]?.id ?? null;
  };
  for (let p = 1; p <= firstRoundMatchCount; p++) {
    const pairIdx = p - 1;
    if (letters.length < 2) {
      result.set(p, { home_id: null, away_id: null });
      continue;
    }
    const a = letters[(pairIdx * 2) % letters.length]!;
    const b = letters[(pairIdx * 2 + 1) % letters.length]!;
    if (pairIdx % 2 === 0) {
      result.set(p, { home_id: pick(a, 1), away_id: q >= 2 ? pick(b, 2) : pick(b, 1) });
    } else {
      result.set(p, { home_id: pick(b, 1), away_id: q >= 2 ? pick(a, 2) : pick(a, 1) });
    }
  }
  return result;
}
