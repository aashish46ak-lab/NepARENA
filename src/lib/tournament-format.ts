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
    case "league":
      return "league";
    case "round_robin":
      return "round_robin";
    case "single_elimination":
      return "knockout";
    case "double_elimination":
      return "double_elimination";
    case "groups_knockout":
      return "groups_knockout";
    case "swiss":
      return "swiss";
    case "group_only":
      return "group_only";
    case "league_knockout":
      return "league_knockout";
    case "custom":
      return "custom";
    default:
      return "round_robin";
  }
}

export function bracketTypeFromPreset(preset: FormatPreset): string {
  switch (preset) {
    case "league":
      return "league";
    case "round_robin":
      return "round_robin";
    case "knockout":
    case "single_elimination":
      return "single_elimination";
    case "double_elimination":
      return "double_elimination";
    case "groups_knockout":
      return "groups_knockout";
    case "group_only":
      return "group_only";
    case "league_knockout":
      return "league_knockout";
    case "swiss":
      return "swiss";
    case "custom":
      return "custom";
    default:
      return "round_robin";
  }
}

export function buildPresetStages(preset: FormatPreset): StageDefinition[] {
  switch (preset) {
    case "league":
      return [
        {
          id: stageId("lg"),
          name: "League",
          type: "league",
          order: 0,
          league: { legs: 2, homeAway: true },
        },
      ];
    case "round_robin":
      return [
        {
          id: stageId("rr"),
          name: "League",
          type: "league",
          order: 0,
          league: { legs: 1, homeAway: false },
        },
      ];
    case "knockout":
    case "single_elimination":
      return [
        {
          id: stageId("ko"),
          name: "Knockout",
          type: "knockout",
          order: 0,
          knockout: {
            legs: 1,
            extraTime: true,
            penalties: true,
            awayGoals: false,
            drawMode: "random",
            seeded: false,
            thirdPlace: true,
          },
        },
      ];
    case "double_elimination":
      return [
        {
          id: stageId("de"),
          name: "Double Elimination",
          type: "knockout",
          order: 0,
          knockout: {
            legs: 1,
            extraTime: true,
            penalties: true,
            awayGoals: false,
            drawMode: "random",
            seeded: false,
            thirdPlace: false,
          },
        },
      ];
    case "group_only":
      return [
        {
          id: stageId("gs"),
          name: "Group Stage",
          type: "group",
          order: 0,
          group: {
            groupCount: 4,
            legs: 1,
            qualifyPerGroup: 0,
          },
        },
      ];
    case "groups_knockout":
      return [
        {
          id: stageId("gs"),
          name: "Group Stage",
          type: "group",
          order: 0,
          group: {
            groupCount: 4,
            legs: 1,
            qualifyPerGroup: 2,
          },
        },
        {
          id: stageId("ko"),
          name: "Knockout",
          type: "knockout",
          order: 1,
          knockout: {
            legs: 1,
            extraTime: true,
            penalties: true,
            awayGoals: false,
            drawMode: "seeded",
            seeded: true,
            thirdPlace: true,
          },
        },
      ];
    case "league_knockout":
      return [
        {
          id: stageId("lg"),
          name: "League",
          type: "league",
          order: 0,
          league: { legs: 1, homeAway: true },
        },
        {
          id: stageId("ko"),
          name: "Knockout",
          type: "knockout",
          order: 1,
          knockout: {
            legs: 1,
            extraTime: true,
            penalties: true,
            awayGoals: false,
            drawMode: "seeded",
            seeded: true,
            thirdPlace: true,
          },
        },
      ];
    case "swiss":
      return [
        {
          id: stageId("sw"),
          name: "Swiss",
          type: "league",
          order: 0,
          league: { legs: 1, homeAway: false },
        },
      ];
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

export function parseFormatConfig(
  raw: unknown,
  bracketType?: string | null,
): FormatConfig {
  const fallback = defaultFormatConfig(presetFromBracketType(bracketType));
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.stages) || o.stages.length === 0) {
    if (typeof o.preset === "string") {
      return defaultFormatConfig(presetFromBracketType(o.preset));
    }
    return fallback;
  }
  const stages = (o.stages as StageDefinition[])
    .map((s, i) => ({
      ...s,
      id: s.id || stageId("s"),
      order: typeof s.order === "number" ? s.order : i,
    }))
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
    tieBreakers: Array.isArray(o.tieBreakers)
      ? (o.tieBreakers as TieBreaker[])
      : [...DEFAULT_TIE_BREAKERS],
    leagueQualifyCount:
      typeof o.leagueQualifyCount === "number" ? o.leagueQualifyCount : undefined,
    migratedFrom: typeof o.migratedFrom === "string" ? o.migratedFrom : undefined,
  };
}

export function hasStandingsStage(cfg: FormatConfig): boolean {
  return cfg.stages.some((s) => s.type === "league" || s.type === "group");
}

export function hasKnockoutStage(cfg: FormatConfig): boolean {
  return cfg.stages.some(
    (s) => s.type === "knockout" || s.type === "final" || s.type === "third_place",
  );
}

export function hasGroupStage(cfg: FormatConfig): boolean {
  return cfg.stages.some((s) => s.type === "group");
}

export interface FormatValidationIssue {
  level: "error" | "warning";
  message: string;
}

export function validateFormatConfig(
  cfg: FormatConfig,
  participantCount = 0,
): FormatValidationIssue[] {
  const issues: FormatValidationIssue[] = [];

  if (!cfg.stages.length) {
    issues.push({ level: "error", message: "Add at least one stage (League, Groups, or Knockout)." });
    return issues;
  }

  const sorted = [...cfg.stages].sort((a, b) => a.order - b.order);
  sorted.forEach((s) => {
    if (s.type === "group") {
      const g = s.group;
      if (!g || g.groupCount < 1) {
        issues.push({ level: "error", message: `${s.name}: need at least 1 group.` });
      } else if (participantCount > 0 && g.groupCount > participantCount) {
        issues.push({
          level: "error",
          message: `${s.name}: more groups (${g.groupCount}) than teams (${participantCount}).`,
        });
      }
      if (g && g.qualifyPerGroup < 0) {
        issues.push({ level: "error", message: `${s.name}: qualify per group cannot be negative.` });
      }
      if (g && participantCount > 0 && g.groupCount > 0) {
        const per = Math.floor(participantCount / g.groupCount);
        if (per < 2) {
          issues.push({
            level: "warning",
            message: `${s.name}: some groups may have fewer than 2 teams with ${participantCount} players.`,
          });
        }
        if (g.qualifyPerGroup > 0 && g.qualifyPerGroup > per) {
          issues.push({
            level: "error",
            message: `${s.name}: cannot qualify ${g.qualifyPerGroup} per group when groups have ~${per} teams.`,
          });
        }
      }
    }
    if (s.type === "knockout" || s.type === "final") {
      const k = s.knockout;
      if (k && k.legs !== 1 && k.legs !== 2) {
        issues.push({ level: "error", message: `${s.name}: legs must be 1 or 2.` });
      }
    }
    if (s.type === "league") {
      const l = s.league;
      if (l && (Number(l.legs) < 1 || Number(l.legs) > 4)) {
        issues.push({
          level: "warning",
          message: `${s.name}: unusual number of rounds (${l.legs}).`,
        });
      }
    }
  });

  const group = sorted.find((s) => s.type === "group");
  const ko = sorted.find((s) => s.type === "knockout");
  if (group?.group && ko && group.group.qualifyPerGroup > 0 && participantCount > 0) {
    const q =
      group.group.groupCount * group.group.qualifyPerGroup +
      (group.group.bestThirds ?? 0);
    if (q < 2) {
      issues.push({ level: "error", message: "Knockout needs at least 2 qualifiers from groups." });
    }
    const size = 2 ** Math.ceil(Math.log2(q));
    if (size !== q) {
      issues.push({
        level: "warning",
        message: `${q} qualifiers → bracket of ${size} (byes will be used for empty slots).`,
      });
    }
  }

  if (cfg.preset === "league_knockout" && cfg.leagueQualifyCount != null) {
    if (cfg.leagueQualifyCount < 2) {
      issues.push({ level: "error", message: "League → Knockout needs at least 2 qualifiers." });
    }
    if (participantCount > 0 && cfg.leagueQualifyCount > participantCount) {
      issues.push({
        level: "error",
        message: `Cannot qualify ${cfg.leagueQualifyCount} from ${participantCount} teams.`,
      });
    }
  }

  if (participantCount > 0 && participantCount < 2) {
    issues.push({ level: "warning", message: "Need at least 2 approved participants to generate fixtures." });
  }

  return issues;
}

export const PRESET_OPTIONS: {
  value: FormatPreset;
  label: string;
  description: string;
}[] = [
  {
    value: "round_robin",
    label: "League (single round-robin)",
    description: "Everyone plays everyone once. Final table decides the winner.",
  },
  {
    value: "league",
    label: "League (home & away)",
    description: "Double round-robin. Points table only — no knockout.",
  },
  {
    value: "knockout",
    label: "Knockout only",
    description: "Single-elimination bracket. No league or groups.",
  },
  {
    value: "group_only",
    label: "Group stage only",
    description: "Split into groups, play group matches, end on group standings.",
  },
  {
    value: "groups_knockout",
    label: "Groups → Knockout",
    description: "Group stage then knockout for qualifiers.",
  },
  {
    value: "league_knockout",
    label: "League → Knockout",
    description: "Full league, then top N into a knockout bracket.",
  },
  {
    value: "swiss",
    label: "Swiss system",
    description: "Paired rounds by record (simple Swiss).",
  },
  {
    value: "custom",
    label: "Custom multi-stage",
    description: "Add and order stages yourself.",
  },
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
