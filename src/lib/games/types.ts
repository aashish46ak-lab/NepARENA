/**
 * Multi-game tournament foundation types.
 * eFootball remains the legacy default; other games plug into shared infrastructure.
 */

export type GameId =
  | "efootball"
  | "free_fire"
  | "pubg"
  | "mlbb"
  | "ea_fc";

export type ParticipantMode = "solo" | "duo" | "squad" | "team_5v5" | "1v1";

export type TournamentFormatKind =
  | "round_robin"
  | "single_elimination"
  | "double_elimination"
  | "group_knockout"
  | "battle_royale_rounds"
  | "swiss";

export type SeriesFormat = "bo1" | "bo3" | "bo5";

export type MatchResultStatus =
  | "scheduled"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "verified"
  | "published"
  | "rejected";

export type DisputeStatus = "open" | "reviewing" | "resolved" | "rejected";

/** Configurable BR scoring (Free Fire / PUBG) */
export type BrScoringConfig = {
  placement_points: Record<string, number>;
  kill_points: number;
  label?: string;
};

export type GameTheme = {
  accent: string;
  accentSecondary: string;
  gradient: string;
  badgeClass: string;
  iconHint: string;
};

export type RegistrationField = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "roster";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  modes?: ParticipantMode[];
  help?: string;
};

export type GameDefinition = {
  id: GameId;
  name: string;
  shortName: string;
  description: string;
  usesLegacyEngine: boolean;
  participantModes: ParticipantMode[];
  defaultMode: ParticipantMode;
  formats: TournamentFormatKind[];
  defaultFormat: TournamentFormatKind;
  seriesFormats?: SeriesFormat[];
  registrationFields: RegistrationField[];
  theme: GameTheme;
  terminology: {
    participant: string;
    participants: string;
    match: string;
    matches: string;
    score?: string;
  };
  dashboardTabs: string[];
  publicSections: string[];
  defaultBrScoring?: BrScoringConfig;
};

export type TournamentGameConfig = {
  participant_mode?: ParticipantMode;
  team_size?: number;
  max_teams?: number;
  region?: string;
  server?: string;
  lobby_info?: string;
  series_format?: SeriesFormat;
  br_scoring?: BrScoringConfig;
  platform?: string;
  custom_rules?: string;
  rounds_count?: number;
};
