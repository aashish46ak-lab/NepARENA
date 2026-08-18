import { createClient } from "@supabase/supabase-js";

// Publishable (anon) key — safe to ship in client bundle.
// Backed by the external Supabase project owned by eFootball Nepal.
export const SUPABASE_URL = "https://jssexmnwpwjzkqxkevqf.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_H-A3XMZW18syaPUJCMk-yA_QhNZ8VQn";

export const OWNER_EMAIL = "aashish46ak@gmail.com";
export const PUBLIC_BUCKET = "efn-public";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "efn-auth",
  },
});

export type Role = "owner" | "admin" | "moderator" | "member";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  favourite_club: string | null;
  bio: string | null;
  country: string | null;
  social_links: Record<string, string> | null;
  is_suspended: boolean;
  has_password: boolean;
  is_verified?: boolean;
  created_at: string;
}

export type TournamentStatus =
  | "draft" | "upcoming" | "registration_open" | "registration_closed"
  | "check_in" | "live" | "ongoing" | "completed" | "archived";

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  status: TournamentStatus;
  registration_open: boolean;
  is_published: boolean;
  is_featured: boolean;
  logo_url: string | null;
  rules_url: string | null;
  rules_text: string | null;
  prize_image_url: string | null;
  bracket_type: string;
  /** Flexible competition format (stages, legs, groups, points). */
  format_config?: Record<string, unknown> | null;
  prize_pool: string | null;
  registration_fee: number;
  participants_count: number;
  max_players: number | null;
  registration_deadline: string | null;
  theme_color: string | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  /** efootball | free_fire | pubg | mlbb | ea_fc */
  game?: string | null;
  game_config?: Record<string, unknown> | null;
  organizer_id?: string | null;
}

export interface HallOfFameEntry {
  id: string;
  player_name: string;
  achievement: string;
  tournament: string | null;
  photo_url: string | null;
  year: number | null;
  sort_order: number;
}

export interface TournamentHistoryEntry {
  id: string;
  tournament_name: string;
  winner: string;
  runner_up: string | null;
  third_place?: string | null;
  year: number;
  banner_url: string | null;
  prize_pool: string | null;
  sort_order: number;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
  sort_order: number;
}

export interface CommunityLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string | null;
  sort_order: number;
}

export type ParticipantStatus = "pending" | "approved" | "rejected";

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string | null;
  player_name: string;
  club: string | null;
  status: ParticipantStatus;
  seed: number | null;
  photo_url?: string | null;
  club_logo_url?: string | null;
  created_at: string;
}

export interface Matchday {
  id: string;
  tournament_id: string;
  name: string;
  sort_order: number;
  is_published: boolean;
  notify_enabled?: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  matchday_id: string | null;
  home_id: string | null;
  away_id: string | null;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  round: number | null;
  position: number | null;
  scheduled_at: string | null;
  notes: string | null;
  status?: string;
  created_at: string;
  /** Multi-stage format metadata */
  stage_id?: string | null;
  stage_type?: string | null;
  group_key?: string | null;
  leg?: number | null;
  series_key?: string | null;
  aggregate_home?: number | null;
  aggregate_away?: number | null;
  is_aggregate_decider?: boolean;
}

export interface TournamentInvitation {
  id: string;
  tournament_id: string;
  email: string | null;
  token: string;
  status: string;
  created_at: string;
}
