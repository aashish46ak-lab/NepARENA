/**
 * Configurable competition-format model for eFootball / football tournaments.
 * Existing bracket_type values remain supported via presets.
 */

export type StageType = "league" | "group" | "knockout" | "final" | "third_place";

export type FormatPreset =
  | "league"
  | "round_robin"
  | "knockout"
  | "single_elimination"
  | "double_elimination"
  | "group_only"
  | "groups_knockout"
  | "league_knockout"
  | "swiss"
  | "custom";

export type Legs = 1 | 2;

export type TieBreaker =
  | "points"
  | "goal_diff"
  | "goals_for"
  | "head_to_head"
  | "head_to_head_gd"
  | "playoff";

export type DrawMode = "random" | "seeded" | "manual";

export interface PointsConfig {
  win: number;
  draw: number;
  loss: number;
}

export interface LeagueStageConfig {
  legs: Legs | number;
  homeAway: boolean;
}

export interface GroupStageConfig {
  groupCount: number;
  teamsPerGroup?: number;
  legs: Legs | number;
  qualifyPerGroup: number;
  bestThirds?: number;
}

export interface KnockoutStageConfig {
  legs: Legs;
  extraTime: boolean;
  penalties: boolean;
  awayGoals: boolean;
  drawMode: DrawMode;
  seeded: boolean;
  thirdPlace: boolean;
  bracketSize?: number;
}

export interface StageDefinition {
  id: string;
  name: string;
  type: StageType;
  order: number;
  league?: LeagueStageConfig;
  group?: GroupStageConfig;
  knockout?: KnockoutStageConfig;
}

export interface FormatConfig {
  version: 1;
  preset: FormatPreset;
  stages: StageDefinition[];
  points: PointsConfig;
  tieBreakers: TieBreaker[];
  leagueQualifyCount?: number;
  migratedFrom?: string;
  groupDraw?: { name: string; ids: string[] }[];
}

export const DEFAULT_POINTS: PointsConfig = { win: 3, draw: 1, loss: 0 };

export const DEFAULT_TIE_BREAKERS: TieBreaker[] = [
  "points",
  "goal_diff",
  "goals_for",
  "head_to_head",
];

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

export function stageId(prefix = "s"): string {
  return `${prefix}_${uid()}`;
}

export function presetFromBracketType(bracketType: string | null | undefined): FormatPreset {
  switch (bracketType) {
    case "league": return "league";
    case "round_robin": return "round_robin";
    case "single_elimination": return "knockout";
    case "double_elimination": return "double_elimination";
    case "groups_knockout": return "groups_knockout";
    case "swiss": return "swiss";
    case "group_only": return "group_only";
    case "league_knockout": return "league_knockout";
    case "custom": return "custom";
    default: return "round_robin";
  }
}

export function bracketTypeFromPreset(preset: FormatPreset): string {
  switch (preset) {
    case "league": return "league";
    case "round_robin": return "round_robin";
    case "knockout":
    case "single_elimination": return "single_elimination";
    case "double_elimination": return "double_elimination";
    case "groups_knockout": return "groups_knockout";
    case "group_only": return "group_only";
    case "league_knockout": return "league_knockout";
    case "swiss": return "swiss";
    case "custom": return "custom";
    default: return "round_robin";
  }
}

export function buildPresetStages(preset: FormatPreset): StageDefinition[] {
  switch (preset) {
    case "league":
      return [{ id: stageId("lg"), name: "League", type: "league", order: 0, league: { legs: 2, homeAway: true } }];
    case "round_robin":
      return [{ id: stageId("rr"), name: "League", type: "league", order: 0, league: { legs: 1, homeAway: false } }];
    case "knockout":
    case "single_elimination":
      return [{
        id: stageId("ko"), name: "Knockout", type: "knockout", order: 0,
        knockout: { legs: 1, extraTime: true, penalties: true, awayGoals: false, drawMode: "random", seeded: false, thirdPlace: true },
      }];
    case "double_elimination":
      return [{
        id: stageId("de"), name: "Double Elimination", type: "knockout", order: 0,
        knockout: { legs: 1, extraTime: true, penalties: true, awayGoals: false, drawMode: "random", seeded: false, thirdPlace: false },
      }];
    case "group_only":
      return [{ id: stageId("gs"), name: "Group Stage", type: "group", order: 0, group: { groupCount: 4, legs: 1, qualifyPerGroup: 0 } }];
    case "groups_knockout":
      return [
        { id: stageId("gs"), name: "Group Stage", type: "group", order: 0, group: { groupCount: 4, legs: 1, qualifyPerGroup: 2 } },
        { id: stageId("ko"), name: "Knockout", type: "knockout", order: 1, knockout: { legs: 1, extraTime: true, penalties: true, awayGoals: false, drawMode: "seeded", seeded: true, thirdPlace: true } },
      ];
    case "league_knockout":
      return [
        { id: stageId("lg"), name: "League", type: "league", order: 0, league: { legs: 1, homeAway: true } },
        { id: stageId("ko"), name: "Knockout", type: "knockout", order: 1, knockout: { legs: 1, extraTime: true, penalties: true, awayGoals: false, drawMode: "seeded", seeded: true, thirdPlace: true } },
      ];
    case "swiss":
      return [{ id: stageId("sw"), name: "Swiss", type: "league", order: 0, league: { legs: 1, homeAway: false } }];
    case "custom":
    default:
      return [];
  }
}

export function defaultFormatConfig(preset: FormatPreset = "round_robin"): FormatConfig {
  return {
    version: 1,
    preset,
    stages: buildPresetStages(preset),
    points: { ...DEFAULT_POINTS },
    tieBreakers: [...DEFAULT_TIE_BREAKERS],
    leagueQualifyCount: preset === "league_knockout" ? 8 : undefined,
  };
}

export function parseFormatConfig(raw: unknown, bracketType?: string | null): FormatConfig {
  const fallback = defaultFormatConfig(presetFromBracketType(bracketType));
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.stages) || o.stages.length === 0) {
    if (typeof o.preset === "string") return defaultFormatConfig(presetFromBracketType(o.preset));
    return fallback;
  }
  const stages = (o.stages as StageDefinition[])
    .map((s, i) => ({ ...s, id: s.id || stageId("s"), order: typeof s.order === "number" ? s.order : i }))
    .sort((a, b) => a.order - b.order);
  return {
    version: 1,
    preset: (o.preset as FormatPreset) || fallback.preset,
    stages,
    points: {
      win: Number((o.points as PointsConfig)?.win ?? 3),
      draw: Number((o.points as PointsConfig)?.draw ?? 1),
      loss: Number((o.points as PointsConfig)?.loss ?? 0),
    },
    tieBreakers: Array.isArray(o.tieBreakers) ? (o.tieBreakers as TieBreaker[]) : [...DEFAULT_TIE_BREAKERS],
    leagueQualifyCount: typeof o.leagueQualifyCount === "number" ? o.leagueQualifyCount : undefined,
    migratedFrom: typeof o.migratedFrom === "string" ? o.migratedFrom : undefined,
    groupDraw: Array.isArray(o.groupDraw)
      ? (o.groupDraw as { name: string; ids: string[] }[])
          .filter((g) => g && typeof g.name === "string" && Array.isArray(g.ids))
          .map((g) => ({ name: g.name, ids: g.ids.map(String) }))
      : undefined,
  };
}

export function hasStandingsStage(cfg: FormatConfig): boolean {
  return cfg.stages.some((s) => s.type === "league" || s.type === "group");
}

export function hasKnockoutStage(cfg: FormatConfig): boolean {
  return cfg.stages.some((s) => s.type === "knockout" || s.type === "final" || s.type === "third_place");
}

export function hasGroupStage(cfg: FormatConfig): boolean {
  return cfg.stages.some((s) => s.type === "group");
}

export interface FormatValidationIssue {
  level: "error" | "warning";
  message: string;
}

export function validateFormatConfig(cfg: FormatConfig, participantCount = 0): FormatValidationIssue[] {
  const issues: FormatValidationIssue[] = [];
  if (!cfg.stages.length) {
    issues.push({ level: "error", message: "Add at least one stage (League, Groups, or Knockout)." });
    return issues;
  }
  return issues;
}

export const PRESET_OPTIONS: {
  value: FormatPreset;
  label: string;
  description: string;
  primary?: boolean;
}[] = [
  { value: "league", label: "League", description: "Everyone plays everyone. Choose single or home & away. Final table decides the winner.", primary: true },
  { value: "group_only", label: "Group Stage", description: "Split players into groups. Each group has its own table. Ends after the group stage.", primary: true },
  { value: "knockout", label: "Knockout", description: "Single-elimination bracket (Round of 16 → Final). Optional third-place match.", primary: true },
  { value: "groups_knockout", label: "Group Stage + Knockout", description: "Groups first, then top teams advance into a knockout bracket.", primary: true },
  { value: "round_robin", label: "League (single round-robin)", description: "Everyone plays everyone once only." },
  { value: "league_knockout", label: "League → Knockout", description: "Full league, then top N into a knockout bracket." },
  { value: "swiss", label: "Swiss system", description: "Paired rounds by record." },
  { value: "custom", label: "Custom multi-stage", description: "Add and order stages yourself." },
];

export function nextPowerOfTwo(n: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(n, 2)));
}

export function knockoutRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  if (fromEnd === 3) return "Round of 16";
  return `Round of ${2 ** (fromEnd + 1)}`;
}
