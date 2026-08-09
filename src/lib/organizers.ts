/**
 * NepARENA multi-tenant helpers (neparena-dev only).
 * Production (main) stays single-tenant until Deploy Now.
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
  facebook_url?: string | null;
  instagram_url?: string | null;
  discord_url?: string | null;
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

export interface OrganizerInvitation {
  id: string;
  email: string;
  token: string;
  invited_by: string | null;
  organizer_id: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

function randomToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || `org-${Date.now()}`;
}

export async function listActiveOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .eq("status", "active")
    .order("name");
  if (error) {
    console.warn("[NepARENA] organizers:", error.message);
    return [];
  }
  return (data ?? []) as Organizer[];
}

/** Super Admin: all statuses */
export async function listAllOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[NepARENA] listAllOrganizers:", error.message);
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
  if (error) return null;
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

export async function isFollowing(organizerId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("organizer_followers")
    .select("organizer_id")
    .eq("organizer_id", organizerId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** Platform stats for Super Admin (best-effort; tables may miss columns until SQL applied). */
export async function getPlatformStats() {
  const organizers = await listAllOrganizers();
  const { count: tournamentCount } = await supabase
    .from("tournaments")
    .select("id", { count: "exact", head: true });
  const { count: playerCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const byStatus = {
    active: organizers.filter((o) => o.status === "active").length,
    pending: organizers.filter((o) => o.status === "pending").length,
    suspended: organizers.filter((o) => o.status === "suspended").length,
    verified: organizers.filter((o) => o.is_verified).length,
  };

  return {
    organizers: organizers.length,
    tournaments: tournamentCount ?? 0,
    players: playerCount ?? 0,
    byStatus,
    organizersList: organizers,
  };
}

/**
 * Super Admin invites an organizer by email.
 * Creates pending organizer + invitation token.
 */
export async function inviteOrganizer(params: {
  email: string;
  name: string;
  invitedBy: string;
}): Promise<{ ok: true; token: string; slug: string } | { ok: false; error: string }> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  if (!email || !name) return { ok: false, error: "Email and name required" };

  let slug = slugify(name);
  const existing = await getOrganizerBySlug(slug);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: org, error: orgErr } = await supabase
    .from("organizers")
    .insert({
      slug,
      name,
      status: "pending",
      is_verified: false,
      contact_email: email,
    })
    .select("*")
    .single();

  if (orgErr || !org) {
    return { ok: false, error: orgErr?.message ?? "Could not create organizer (run 11-neparena-organizers.sql?)" };
  }

  const token = randomToken();
  const { error: invErr } = await supabase.from("organizer_invitations").insert({
    email,
    token,
    invited_by: params.invitedBy,
    organizer_id: org.id,
    status: "pending",
  });

  if (invErr) {
    return { ok: false, error: invErr.message };
  }

  return { ok: true, token, slug };
}

export async function getInvitationByToken(token: string): Promise<
  (OrganizerInvitation & { organizer?: Organizer | null }) | null
> {
  const { data, error } = await supabase
    .from("organizer_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  const inv = data as OrganizerInvitation;
  let organizer: Organizer | null = null;
  if (inv.organizer_id) {
    const { data: o } = await supabase
      .from("organizers")
      .select("*")
      .eq("id", inv.organizer_id)
      .maybeSingle();
    organizer = (o as Organizer) ?? null;
  }
  return { ...inv, organizer };
}

export async function acceptInvitation(params: {
  token: string;
  userId: string;
}): Promise<{ ok: true; organizerId: string } | { ok: false; error: string }> {
  const inv = await getInvitationByToken(params.token);
  if (!inv) return { ok: false, error: "Invalid invitation" };
  if (inv.status !== "pending") return { ok: false, error: "Invitation already used or revoked" };
  if (new Date(inv.expires_at) < new Date()) return { ok: false, error: "Invitation expired" };
  if (!inv.organizer_id) return { ok: false, error: "No organizer on invitation" };

  await supabase
    .from("organizers")
    .update({
      status: "active",
      owner_user_id: params.userId,
      is_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inv.organizer_id);

  await supabase.from("organizer_members").upsert({
    organizer_id: inv.organizer_id,
    user_id: params.userId,
    role: "owner",
  });

  await supabase
    .from("organizer_invitations")
    .update({ status: "accepted" })
    .eq("id", inv.id);

  return { ok: true, organizerId: inv.organizer_id };
}

export async function setOrganizerStatus(
  organizerId: string,
  status: OrganizerStatus,
) {
  return supabase
    .from("organizers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", organizerId);
}

export async function listOrganizerMemberships(userId: string): Promise<OrganizerMember[]> {
  const { data, error } = await supabase
    .from("organizer_members")
    .select("*")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []) as OrganizerMember[];
}
