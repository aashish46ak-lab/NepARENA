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

export type Role = "owner" | "moderator" | "member";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  favourite_club: string | null;
  bio: string | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  status: "upcoming" | "registration_open" | "ongoing" | "completed";
  registration_open: boolean;
  prize_pool: string | null;
  participants_count: number;
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
