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
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
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
  third_place: string | null;
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
  tier: "platinum" | "gold" | "silver" | "partner";
  sort_order: number;
}

export interface CommunityLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string | null;
  clicks: number;
  sort_order: number;
}

export interface OwnerInfo {
  id: string;
  name: string;
  title: string;
  bio: string;
  photo_url: string | null;
  email: string | null;
  contact: string | null;
}

export interface Moderator {
  id: string;
  name: string;
  role_title: string;
  bio: string | null;
  photo_url: string | null;
  sort_order: number;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  tagline: string;
  logo_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string | null;
  about_short: string;
  footer_text: string;
  updated_at: string;
}

export type ParticipantStatus = "pending" | "approved" | "rejected";

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string | null;
  player_name: string;
  club: string | null;
  photo_url: string | null;
  club_logo_url: string | null;
  status: ParticipantStatus;
  seed: number | null;
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
  round: number;
  position: number;
  home_id: string | null;
  away_id: string | null;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  penalty_home: number | null;
  penalty_away: number | null;
  extra_time: string | null;
  notes: string | null;
  status: "scheduled" | "live" | "paused" | "finished" | string;
  venue: string | null;
  platform: string | null;
  stream_url: string | null;
  referee: string | null;
  proof_url: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface MatchSubmission {
  id: string;
  match_id: string;
  participant_id: string;
  user_id: string;
  home_score: number | null;
  away_score: number | null;
  screenshot_url: string | null;
  note: string | null;
  status: SubmissionStatus;
  created_at: string;
}

export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";

export interface TournamentInvitation {
  id: string;
  tournament_id: string;
  user_id: string;
  invited_by: string | null;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
}

export type ReportStatus = "pending" | "in_review" | "resolved" | "dismissed";
export type ReportType = "tournament" | "match" | "player" | "other";

export interface Report {
  id: string;
  reporter_id: string | null;
  type: ReportType | string;
  tournament_id: string | null;
  match_id: string | null;
  player_name: string | null;
  reason: string;
  description: string | null;
  screenshot_url: string | null;
  status: ReportStatus;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}
export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}
