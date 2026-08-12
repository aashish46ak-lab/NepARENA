/**
 * NepARENA multi-tenant helpers.
 * Existing SQL tables (organizers, organizer_members, followers, …) unchanged.
 */
import { supabase } from "./supabase";

export const PLATFORM_NAME = "NepARENA";

/** Platform super admins — full /platform access */
export const SUPER_ADMIN_EMAILS = [
  "aashish46ak@gmail.com",
  "baralk851@gmail.com",
] as const;

export const SUPER_ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0];
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
  follower_count?: number;
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
  const e = (email ?? "").toLowerCase();
  return SUPER_ADMIN_EMAILS.some((x) => x.toLowerCase() === e);
}

function randomToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return (
      crypto.randomUUID().replace(/-/g, "") +
      crypto.randomUUID().replace(/-/g, "").slice(0, 16)
    );
  }
  return `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `org-${Date.now()}`
  );
}

async function brandFromSiteSettings(): Promise<{
  logo_url: string | null;
  banner_url: string | null;
  tagline: string | null;
}> {
  const { data } = await supabase
    .from("site_settings")
    .select("logo_url, hero_image_url, tagline")
    .limit(1)
    .maybeSingle();
  return {
    logo_url: (data as { logo_url?: string | null } | null)?.logo_url ?? null,
    banner_url:
      (data as { hero_image_url?: string | null } | null)?.hero_image_url ?? null,
    tagline: (data as { tagline?: string | null } | null)?.tagline ?? null,
  };
}

function withSiteBrand(
  org: Organizer,
  brand: {
    logo_url: string | null;
    banner_url: string | null;
    tagline: string | null;
  },
): Organizer {
  if (org.slug !== DEFAULT_ORGANIZER_SLUG) return org;
  return {
    ...org,
    logo_url: org.logo_url || brand.logo_url,
    banner_url: org.banner_url || brand.banner_url,
    tagline: org.tagline || brand.tagline,
  };
}

export async function listActiveOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .eq("status", "active")
    .order("name");
  if (error) {
    console.error(error);
    return [];
  }
  const list = (data ?? []) as Organizer[];
  const needsBrand = list.some(
    (o) => o.slug === DEFAULT_ORGANIZER_SLUG && (!o.logo_url || !o.banner_url),
  );
  if (!needsBrand) return list;
  const brand = await brandFromSiteSettings();
  return list.map((o) => withSiteBrand(o, brand));
}

export async function listAllOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Organizer[];
}

export async function getOrganizerBySlug(slug: string): Promise<Organizer | null> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  let org = data as Organizer;
  if (org.slug === DEFAULT_ORGANIZER_SLUG && (!org.logo_url || !org.banner_url)) {
    const brand = await brandFromSiteSettings();
    org = withSiteBrand(org, brand);
  }
  return org;
}

export async function getFollowerCount(organizerId: string): Promise<number> {
  const { count } = await supabase
    .from("organizer_followers")
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", organizerId);
  return count ?? 0;
}

/** Follow — prefers secure RPC (auth.uid only). Falls back to RLS insert. */
export async function followOrganizer(organizerId: string, userId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== userId) {
    return { error: { message: "Unauthorized" } } as const;
  }
  const rpc = await supabase.rpc("secure_follow_organizer", {
    p_organizer_id: organizerId,
  });
  if (!rpc.error) return rpc;
  return supabase.from("organizer_followers").upsert(
    { organizer_id: organizerId, user_id: userId },
    { onConflict: "organizer_id,user_id" },
  );
}

export async function unfollowOrganizer(organizerId: string, userId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== userId) {
    return { error: { message: "Unauthorized" } } as const;
  }
  const rpc = await supabase.rpc("secure_unfollow_organizer", {
    p_organizer_id: organizerId,
  });
  if (!rpc.error) return rpc;
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

export async function isFollowing(
  organizerId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("organizer_followers")
    .select("organizer_id")
    .eq("organizer_id", organizerId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function getPlatformStats() {
  const organizers = await listAllOrganizers();

  const [
    tournamentCount,
    playerCount,
    matchCount,
    liveTournaments,
    completedTournaments,
    recentUsers,
    pendingInvites,
    unreadMessages,
  ] = await Promise.all([
    supabase.from("tournaments").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .in("status", ["live", "ongoing"]),
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("profiles")
      .select("id, username, avatar_url, created_at, full_name")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("organizer_invitations")
      .select("id, email, status, token, created_at, organizer_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    // UNREAD only — clears after admin opens threads
    supabase
      .from("platform_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_from_admin", false)
      .eq("read_by_admin", false),
  ]);

  const byStatus = {
    active: organizers.filter((o) => o.status === "active").length,
    pending: organizers.filter((o) => o.status === "pending").length,
    suspended: organizers.filter((o) => o.status === "suspended").length,
    verified: organizers.filter((o) => o.is_verified).length,
  };

  return {
    organizers: organizers.length,
    tournaments: tournamentCount.count ?? 0,
    players: playerCount.count ?? 0,
    matches: matchCount.count ?? 0,
    liveTournaments: liveTournaments.count ?? 0,
    completedTournaments: completedTournaments.count ?? 0,
    messages: unreadMessages.count ?? 0,
    byStatus,
    organizersList: organizers,
    recentUsers: (recentUsers.data ?? []) as {
      id: string;
      username: string | null;
      full_name?: string | null;
      avatar_url: string | null;
      created_at: string;
    }[],
    pendingInvites: (pendingInvites.data ?? []) as {
      id: string;
      email: string;
      status: string;
      token: string;
      created_at: string;
      organizer_id: string | null;
    }[],
  };
}

export async function setOrganizerVerified(organizerId: string, verified: boolean) {
  const rpc = await supabase.rpc("admin_set_organizer_verified", {
    p_organizer_id: organizerId,
    p_verified: verified,
  });
  if (!rpc.error) return rpc;
  return supabase
    .from("organizers")
    .update({ is_verified: verified, updated_at: new Date().toISOString() })
    .eq("id", organizerId);
}

/** Server-driven auto-verify when criteria met (logo, banner, contact, ≥1 completed tournament). */
export async function evaluateOrganizerVerification(organizerId: string) {
  return supabase.rpc("evaluate_organizer_verification", {
    p_organizer_id: organizerId,
  });
}

export async function inviteOrganizer(params: {
  email: string;
  name: string;
  invitedBy: string;
}): Promise<
  { ok: true; token: string; slug: string } | { ok: false; error: string }
> {
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
    .select("id")
    .single();
  if (orgErr || !org) return { ok: false, error: orgErr?.message ?? "Failed" };

  const token = randomToken();
  const { error: invErr } = await supabase.from("organizer_invitations").insert({
    email,
    token,
    invited_by: params.invitedBy,
    organizer_id: org.id,
    status: "pending",
  });
  if (invErr) return { ok: false, error: invErr.message };
  return { ok: true, token, slug };
}

export async function setOrganizerStatus(
  organizerId: string,
  status: OrganizerStatus,
) {
  const rpc = await supabase.rpc("admin_set_organizer_status", {
    p_organizer_id: organizerId,
    p_status: status,
  });
  if (!rpc.error) return rpc;
  return supabase.from("organizers").update({ status }).eq("id", organizerId);
}

/** Ensure user is owner/admin of eFootball Nepal (idempotent). */
export async function ensureEfootballNepalAdmin(userId: string) {
  const org = await getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
  if (!org) return { ok: false as const, error: "Organizer missing — run SQL 11" };
  const { error } = await supabase.from("organizer_members").upsert(
    {
      organizer_id: org.id,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "organizer_id,user_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  await supabase
    .from("organizers")
    .update({ owner_user_id: userId, status: "active", is_verified: true })
    .eq("id", org.id);
  return { ok: true as const, organizerId: org.id };
}

export async function getInvitationByToken(token: string) {
  const { data, error } = await supabase
    .from("organizer_invitations")
    .select("*, organizer:organizers(*)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as OrganizerInvitation & {
    organizer?: Organizer | null;
    status: string;
  };
}

export async function acceptInvitation(params: {
  token: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const inv = await getInvitationByToken(params.token);
  if (!inv || inv.status !== "pending") {
    return { ok: false, error: "Invitation not found or already used" };
  }
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return { ok: false, error: "Invitation expired" };
  }
  const organizerId = inv.organizer_id;
  if (!organizerId) return { ok: false, error: "No organizer on invitation" };

  const { error: memErr } = await supabase.from("organizer_members").upsert(
    {
      organizer_id: organizerId,
      user_id: params.userId,
      role: "owner",
    },
    { onConflict: "organizer_id,user_id" },
  );
  if (memErr) return { ok: false, error: memErr.message };

  await supabase
    .from("organizers")
    .update({
      owner_user_id: params.userId,
      status: "active",
    })
    .eq("id", organizerId);

  await supabase
    .from("organizer_invitations")
    .update({ status: "accepted" })
    .eq("token", params.token);

  return { ok: true };
}

export async function getDefaultOrganizer(): Promise<Organizer | null> {
  return getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
}

export async function listOrganizerMemberships(
  userId: string,
): Promise<(OrganizerMember & { organizer?: Organizer })[]> {
  const { data, error } = await supabase
    .from("organizer_members")
    .select("*, organizer:organizers(*)")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []) as (OrganizerMember & { organizer?: Organizer })[];
}
