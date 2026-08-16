import type {
  BrScoringConfig,
  GameDefinition,
  GameId,
} from "./types";

export const DEFAULT_BR_PLACEMENT: Record<string, number> = {
  "1": 12,
  "2": 9,
  "3": 8,
  "4": 7,
  "5": 6,
  "6": 5,
  "7": 4,
  "8": 3,
  "9": 2,
  "10": 1,
  "11": 0,
  "12": 0,
};

export const DEFAULT_BR_SCORING: BrScoringConfig = {
  placement_points: DEFAULT_BR_PLACEMENT,
  kill_points: 1,
  label: "Placement + Kills",
};

const GAMES: Record<GameId, GameDefinition> = {
  efootball: {
    id: "efootball",
    name: "eFootball",
    shortName: "eFootball",
    description: "Competitive eFootball — fixtures, standings, verifications.",
    usesLegacyEngine: true,
    participantModes: ["1v1"],
    defaultMode: "1v1",
    formats: ["round_robin", "single_elimination", "group_knockout"],
    defaultFormat: "round_robin",
    registrationFields: [
      { key: "player_name", label: "Player name", type: "text", required: true },
      { key: "club", label: "Club / team name", type: "text" },
      { key: "efootball_id", label: "eFootball ID", type: "text", required: true },
      { key: "contact", label: "Contact (phone / Discord)", type: "text" },
    ],
    theme: {
      accent: "#0A84FF",
      accentSecondary: "#30D158",
      gradient: "from-sky-600/30 to-emerald-600/20",
      badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      iconHint: "⚽",
    },
    terminology: {
      participant: "Player",
      participants: "Players",
      match: "Match",
      matches: "Fixtures",
      score: "Score",
    },
    dashboardTabs: ["overview", "players", "fixtures", "results", "standings", "verifications", "settings"],
    publicSections: ["hero", "register", "standings", "fixtures", "players", "rules", "prizes", "announcements"],
  },
  free_fire: {
    id: "free_fire",
    name: "Free Fire",
    shortName: "Free Fire",
    description: "Battle royale — solo, duo, squad with placement + kill points.",
    usesLegacyEngine: false,
    participantModes: ["solo", "duo", "squad"],
    defaultMode: "squad",
    formats: ["battle_royale_rounds"],
    defaultFormat: "battle_royale_rounds",
    registrationFields: [
      { key: "team_name", label: "Team / player name", type: "text", required: true },
      { key: "captain_name", label: "Captain name", type: "text", required: true, modes: ["duo", "squad"] },
      { key: "ign", label: "In-game name (IGN)", type: "text", required: true },
      { key: "uid", label: "Free Fire UID", type: "text", required: true },
      { key: "roster", label: "Team members (name + UID)", type: "roster", modes: ["duo", "squad"] },
      { key: "contact", label: "Contact", type: "text", required: true },
      { key: "region", label: "Region / server", type: "text" },
    ],
    theme: {
      accent: "#F59E0B",
      accentSecondary: "#EF4444",
      gradient: "from-amber-600/30 to-rose-600/20",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      iconHint: "🔥",
    },
    terminology: { participant: "Squad", participants: "Squads", match: "Round", matches: "Rounds" },
    dashboardTabs: ["overview", "participants", "rounds", "results", "leaderboard", "lobby", "settings"],
    publicSections: ["hero", "register", "leaderboard", "rounds", "teams", "rules", "prizes", "announcements"],
    defaultBrScoring: DEFAULT_BR_SCORING,
  },
  pubg: {
    id: "pubg",
    name: "PUBG",
    shortName: "PUBG",
    description: "PUBG Mobile / BGMI style battle royale tournaments.",
    usesLegacyEngine: false,
    participantModes: ["solo", "duo", "squad"],
    defaultMode: "squad",
    formats: ["battle_royale_rounds"],
    defaultFormat: "battle_royale_rounds",
    registrationFields: [
      { key: "team_name", label: "Team name", type: "text", required: true },
      { key: "captain_name", label: "Captain", type: "text", required: true },
      { key: "ign", label: "Captain IGN", type: "text", required: true },
      { key: "uid", label: "Character ID / UID", type: "text", required: true },
      { key: "roster", label: "Roster (IGN + ID)", type: "roster", modes: ["duo", "squad"] },
      { key: "contact", label: "Contact", type: "text", required: true },
      { key: "region", label: "Server / region", type: "text" },
    ],
    theme: {
      accent: "#F97316",
      accentSecondary: "#A3E635",
      gradient: "from-orange-600/30 to-lime-600/15",
      badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/30",
      iconHint: "🎯",
    },
    terminology: { participant: "Team", participants: "Teams", match: "Match", matches: "Matches" },
    dashboardTabs: ["overview", "participants", "rounds", "results", "leaderboard", "lobby", "settings"],
    publicSections: ["hero", "register", "leaderboard", "rounds", "teams", "rules", "prizes", "announcements"],
    defaultBrScoring: DEFAULT_BR_SCORING,
  },
  mlbb: {
    id: "mlbb",
    name: "Mobile Legends: Bang Bang",
    shortName: "MLBB",
    description: "5v5 team competition — brackets, series, BO1/BO3/BO5.",
    usesLegacyEngine: false,
    participantModes: ["team_5v5"],
    defaultMode: "team_5v5",
    formats: ["single_elimination", "double_elimination", "round_robin", "group_knockout"],
    defaultFormat: "single_elimination",
    seriesFormats: ["bo1", "bo3", "bo5"],
    registrationFields: [
      { key: "team_name", label: "Team name", type: "text", required: true },
      { key: "captain_name", label: "Captain", type: "text", required: true },
      { key: "captain_id", label: "Captain MLBB ID", type: "text", required: true },
      { key: "roster", label: "Starting roster (5)", type: "roster", required: true },
      { key: "substitutes", label: "Substitutes (optional)", type: "roster" },
      { key: "contact", label: "Contact", type: "text", required: true },
    ],
    theme: {
      accent: "#6366F1",
      accentSecondary: "#EC4899",
      gradient: "from-indigo-600/30 to-pink-600/20",
      badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
      iconHint: "⚔️",
    },
    terminology: { participant: "Team", participants: "Teams", match: "Series", matches: "Series", score: "Games" },
    dashboardTabs: ["overview", "participants", "bracket", "series", "results", "standings", "settings"],
    publicSections: ["hero", "register", "bracket", "standings", "teams", "schedule", "rules", "prizes", "announcements"],
  },
  ea_fc: {
    id: "ea_fc",
    name: "EA SPORTS FC",
    shortName: "EA FC",
    description: "Football competition — fixtures, groups, knockout, GD standings.",
    usesLegacyEngine: false,
    participantModes: ["1v1"],
    defaultMode: "1v1",
    formats: ["round_robin", "single_elimination", "group_knockout", "double_elimination"],
    defaultFormat: "group_knockout",
    registrationFields: [
      { key: "player_name", label: "Player name", type: "text", required: true },
      { key: "gamertag", label: "EA / platform gamertag", type: "text", required: true },
      {
        key: "platform",
        label: "Platform",
        type: "select",
        required: true,
        options: [
          { value: "pc", label: "PC" },
          { value: "ps5", label: "PlayStation 5" },
          { value: "ps4", label: "PlayStation 4" },
          { value: "xbox", label: "Xbox" },
          { value: "other", label: "Other" },
        ],
      },
      { key: "region", label: "Region", type: "text" },
      { key: "contact", label: "Contact", type: "text", required: true },
    ],
    theme: {
      accent: "#22D3EE",
      accentSecondary: "#EAB308",
      gradient: "from-cyan-600/30 to-yellow-600/15",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      iconHint: "🏆",
    },
    terminology: { participant: "Player", participants: "Players", match: "Match", matches: "Fixtures", score: "Score" },
    dashboardTabs: ["overview", "participants", "fixtures", "standings", "bracket", "results", "settings"],
    publicSections: ["hero", "register", "standings", "fixtures", "bracket", "players", "rules", "prizes", "announcements"],
  },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];

export function getGame(id: string | null | undefined): GameDefinition {
  if (id && id in GAMES) return GAMES[id as GameId];
  return GAMES.efootball;
}

export function listGames(): GameDefinition[] {
  return GAME_IDS.map((id) => GAMES[id]);
}

export function isBattleRoyale(gameId: string | null | undefined): boolean {
  const g = getGame(gameId);
  return g.defaultFormat === "battle_royale_rounds";
}

export function resolveBrScoring(config?: BrScoringConfig | null): BrScoringConfig {
  return {
    placement_points: { ...DEFAULT_BR_PLACEMENT, ...(config?.placement_points ?? {}) },
    kill_points: config?.kill_points ?? 1,
    label: config?.label ?? DEFAULT_BR_SCORING.label,
  };
}

export function computeBrPoints(
  placement: number,
  kills: number,
  scoring?: BrScoringConfig | null,
): { placementPoints: number; killPoints: number; total: number } {
  const s = resolveBrScoring(scoring);
  const placementPoints = s.placement_points[String(placement)] ?? 0;
  const killPoints = Math.max(0, kills) * (s.kill_points ?? 0);
  return { placementPoints, killPoints, total: placementPoints + killPoints };
}
