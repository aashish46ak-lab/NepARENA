/**
 * NepARENA multi-tenant helpers (dev branch).
 * Production (main) continues as single-tenant eFootball Nepal until Deploy Now.
 */
import { supabase } from "./supabase";

export const PLATFORM_NAME = "NepARENA";
export const SUPER_ADMIN_EMAIL = "aashish46ak@gmail.com";
export const DEFAULT_ORGANIZER_SLUG = "efootball-nepal";

export type OrganizerStatus = "pending" | "active" | "suspended" | "rejected";
export type OrganizerMemberRole = "owner" | "admin" | "moderator";

export interface Organizer {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  owner_user_id: string | null;
  status: OrganizerStatus;
  is_verified: boolean;
  website_url: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizerMember {
  id: string;
  organizer_id: string;
  user_id: string;
  role: OrganizerMemberRole;
  created_at: string;
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/** Load public active organizers (requires 11-neparena-organizers.sql applied). */
export async function listActiveOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .eq("status", "active")
    .order("name");
  if (error) {
    console.warn("[NepARENA] organizers table missing or RLS blocked:", error.message);
    return [];
  }
  return (data ?? []) as Organizer[];
}

export async function getOrganizerBySlug(slug: string): Promise<Organizer | null> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.warn("[NepARENA] getOrganizerBySlug:", error.message);
    return null;
  }
  return (data as Organizer | null) ?? null;
}

export async function getDefaultOrganizer(): Promise<Organizer | null> {
  return getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
}

export async function followOrganizer(organizerId: string, userId: string) {
  return supabase.from("organizer_followers").upsert({
    organizer_id: organizerId,
    user_id: userId,
  });
}

export async function unfollowOrganizer(organizerId: string, userId: string) {
  return supabase
    .from("organizer_followers")
    .delete()
    .eq("organizer_id", organizerId)
    .eq("user_id", userId);
}

export async function listFollowedOrganizerIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("organizer_followers")
    .select("organizer_id")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((r: { organizer_id: string }) => r.organizer_id);
}
