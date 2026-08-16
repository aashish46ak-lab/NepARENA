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

export type OrganizerStatus = "pending" | "active" | "suspended";
export type MemberRole = "owner" | "admin" | "moderator";

export type Organizer = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url?: string | null;
  description?: string | null;
  is_verified: boolean;
  status: OrganizerStatus;
  created_at?: string;
  theme?: Record<string, unknown> | null;
  owner_id?: string | null;
};

export type OrganizerMember = {
  organizer_id: string;
  user_id: string;
  role: MemberRole;
  created_at?: string;
};

export type OrganizerTeamMember = {
  user_id: string;
  role: MemberRole;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((x) => x.toLowerCase() === e);
}

export async function listActiveOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select("id, name, slug, logo_url, cover_url, description, is_verified, status, created_at, theme, owner_id")
    .in("status", ["active", "pending"])
    .order("name");
  if (error) {
    console.warn("listActiveOrganizers", error.message);
    return [];
  }
  const rows = (data ?? []) as Organizer[];
  if (rows.length > 0) {
    return rows.filter((o) => o.status === "active" || o.is_verified);
  }
  const { data: fallback } = await supabase
    .from("organizers")
    .select("id, name, slug, logo_url, cover_url, description, is_verified, status, created_at, theme, owner_id")
    .order("name")
    .limit(50);
  return (fallback ?? []) as Organizer[];
}

export async function listAllOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select("id, name, slug, logo_url, cover_url, description, is_verified, status, created_at, theme, owner_id")
    .order("name");
  if (error) return [];
  return (data ?? []) as Organizer[];
}

export async function getOrganizerBySlug(slug: string): Promise<Organizer | null> {
  const raw = decodeURIComponent((slug || "").trim());
  const candidates = Array.from(
    new Set([raw, raw.toLowerCase(), raw.replace(/\s+/g, "-").toLowerCase()].filter(Boolean)),
  );
  for (const s of candidates) {
    const { data, error } = await supabase
      .from("organizers")
      .select("id, name, slug, logo_url, cover_url, description, is_verified, status, created_at, theme, owner_id")
      .eq("slug", s)
      .maybeSingle();
    if (!error && data) return data as Organizer;
  }
  const { data: byName } = await supabase
    .from("organizers")
    .select("id, name, slug, logo_url, cover_url, description, is_verified, status, created_at, theme, owner_id")
    .ilike("name", raw.replace(/-/g, " "))
    .limit(1)
    .maybeSingle();
  return (byName as Organizer) ?? null;
}

/** Notify platform super-admins / owners about organizer applications. */
export async function notifyPlatformAdmins(opts: {
  title: string;
  body?: string;
  link?: string;
  actorId?: string | null;
}) {
  const ids = new Set<string>();
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("email", [...SUPER_ADMIN_EMAILS]);
    for (const p of (profiles ?? []) as { id: string }[]) ids.add(p.id);
  } catch {
    /* profiles.email may not exist */
  }
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["owner", "admin"]);
    for (const r of (roles ?? []) as { user_id: string }[]) ids.add(r.user_id);
  } catch {
    /* ignore */
  }
  const { notify } = await import("./notifications");
  for (const uid of ids) {
    await notify({
      userId: uid,
      title: opts.title,
      body: opts.body ?? null,
      type: "info",
      link: opts.link ?? "/platform",
      actorId: opts.actorId ?? null,
    });
  }
  return ids.size;
}

export async function getFollowerCount(organizerId: string): Promise<number> {
  const { count, error } = await supabase
    .from("organizer_followers")
    .select("*", { count: "exact", head: true })
    .eq("organizer_id", organizerId);
  if (error) return 0;
  return count ?? 0;
}

export async function followOrganizer(organizerId: string, userId: string) {
  const { error } = await supabase
    .from("organizer_followers")
    .upsert({ organizer_id: organizerId, user_id: userId }, { onConflict: "organizer_id,user_id" });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function unfollowOrganizer(organizerId: string, userId: string) {
  const { error } = await supabase
    .from("organizer_followers")
    .delete()
    .eq("organizer_id", organizerId)
    .eq("user_id", userId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function listFollowedOrganizerIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("organizer_followers").select("organizer_id").eq("user_id", userId);
  return (data ?? []).map((r) => r.organizer_id as string);
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

export async function getPlatformStats() {
  const [
    orgsCount,
    usersCount,
    tournamentsCount,
    liveCount,
    doneCount,
    orgsListRes,
    recentUsersRes,
    invitesRes,
    messagesRes,
    pendingAppsRes,
  ] = await Promise.all([
    supabase.from("organizers").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("tournaments").select("*", { count: "exact", head: true }),
    supabase.from("tournaments").select("*", { count: "exact", head: true }).in("status", ["live", "ongoing"]),
    supabase.from("tournaments").select("*", { count: "exact", head: true }).in("status", ["completed", "archived"]),
    supabase.from("organizers").select("id, name, slug, logo_url, is_verified, status, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, username, full_name, avatar_url, created_at, is_verified").order("created_at", { ascending: false }).limit(50),
    supabase.from("organizer_invitations").select("id, email, name, slug, status, created_at, token").eq("status", "pending").order("created_at", { ascending: false }).limit(30),
    supabase.from("platform_messages").select("*", { count: "exact", head: true }).eq("read", false),
    supabase.from("organizer_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const organizersList = (orgsListRes.data ?? []) as {
    id: string; name: string; slug: string; logo_url: string | null; is_verified: boolean; status: string; created_at?: string;
  }[];

  const byStatus = {
    active: organizersList.filter((o) => o.status === "active").length,
    pending: organizersList.filter((o) => o.status === "pending").length,
    suspended: organizersList.filter((o) => o.status === "suspended").length,
    verified: organizersList.filter((o) => o.is_verified).length,
  };

  return {
    organizers: orgsCount.count ?? organizersList.length,
    players: usersCount.count ?? 0,
    users: usersCount.count ?? 0,
    tournaments: tournamentsCount.count ?? 0,
    liveTournaments: liveCount.count ?? 0,
    completedTournaments: doneCount.count ?? 0,
    organizersList,
    recentUsers: (recentUsersRes.data ?? []) as {
      id: string; username: string | null; full_name: string | null; avatar_url: string | null; created_at: string; is_verified?: boolean;
    }[],
    pendingInvites: (invitesRes.data ?? []) as {
      id: string; email: string; name: string; slug: string; status: string; created_at: string; token: string;
    }[],
    messages: messagesRes.count ?? 0,
    pendingApplications: pendingAppsRes.count ?? 0,
    byStatus,
  };
}

export async function setOrganizerVerified(organizerId: string, verified: boolean) {
  const { error } = await supabase.from("organizers").update({ is_verified: verified }).eq("id", organizerId);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function evaluateOrganizerVerification(organizerId: string) {
  return setOrganizerVerified(organizerId, true);
}

export async function inviteOrganizer(params: {
  email: string;
  name: string;
  slug: string;
  invitedBy: string;
}) {
  const token = crypto.randomUUID();
  const { data, error } = await supabase
    .from("organizer_invitations")
    .insert({
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      slug: params.slug.trim().toLowerCase(),
      token,
      invited_by: params.invitedBy,
      status: "pending",
    })
    .select("id, token")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: (data as any).id as string, token: (data as any).token as string };
}

export async function setOrganizerStatus(organizerId: string, status: OrganizerStatus) {
  const { error } = await supabase.from("organizers").update({ status }).eq("id", organizerId);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function ensureEfootballNepalAdmin(userId: string) {
  const org = await getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
  if (!org) return;
  await supabase.from("organizer_members").upsert(
    { organizer_id: org.id, user_id: userId, role: "admin" },
    { onConflict: "organizer_id,user_id" },
  );
}

export async function getInvitationByToken(token: string) {
  const { data } = await supabase.from("organizer_invitations").select("*").eq("token", token).maybeSingle();
  return data;
}

export async function acceptInvitation(params: { token: string; userId: string }) {
  const inv = await getInvitationByToken(params.token);
  if (!inv || (inv as any).status !== "pending") return { ok: false as const, error: "Invalid invitation" };
  const slug = (inv as any).slug as string;
  const name = (inv as any).name as string;
  let org = await getOrganizerBySlug(slug);
  if (!org) {
    const { data, error } = await supabase
      .from("organizers")
      .insert({ name, slug, status: "active", is_verified: false, owner_id: params.userId })
      .select("id, name, slug, logo_url, is_verified, status")
      .single();
    if (error) return { ok: false as const, error: error.message };
    org = data as Organizer;
  }
  await supabase.from("organizer_members").upsert(
    { organizer_id: org.id, user_id: params.userId, role: "owner" },
    { onConflict: "organizer_id,user_id" },
  );
  await supabase.from("organizer_invitations").update({ status: "accepted" }).eq("token", params.token);
  return { ok: true as const, organizer: org };
}

export async function getDefaultOrganizer(): Promise<Organizer | null> {
  return getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
}

export async function listOrganizerMemberships(userId: string): Promise<(OrganizerMember & { organizer?: Organizer })[]> {
  const { data } = await supabase.from("organizer_members").select("organizer_id, user_id, role, created_at").eq("user_id", userId);
  const rows = (data ?? []) as OrganizerMember[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.organizer_id);
  const { data: orgs } = await supabase.from("organizers").select("id, name, slug, logo_url, is_verified, status").in("id", ids);
  const map = new Map(((orgs ?? []) as Organizer[]).map((o) => [o.id, o]));
  return rows.map((r) => ({ ...r, organizer: map.get(r.organizer_id) }));
}

export async function listOrganizerTeam(organizerId: string): Promise<OrganizerTeamMember[]> {
  const { data: members } = await supabase
    .from("organizer_members")
    .select("user_id, role")
    .eq("organizer_id", organizerId);
  const rows = (members ?? []) as { user_id: string; role: MemberRole }[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  const map = new Map(((profiles ?? []) as any[]).map((p) => [p.id as string, p]));
  const order: Record<string, number> = { owner: 0, admin: 1, moderator: 2 };
  return rows
    .map((r) => {
      const p = map.get(r.user_id);
      return {
        user_id: r.user_id,
        role: r.role,
        username: p?.username ?? null,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    })
    .sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
}

export async function searchProfilesForTeam(q: string, limit = 12) {
  const query = q.trim();
  if (!query) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(limit);
  return (data ?? []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[];
}

export async function addOrganizerMember(params: {
  organizerId: string;
  userId: string;
  role: MemberRole;
}) {
  const { data, error } = await supabase.rpc("add_organizer_member", {
    p_organizer_id: params.organizerId,
    p_user_id: params.userId,
    p_role: params.role,
  });
  if (!error && data !== false) return { ok: true as const };
  const { error: e2 } = await supabase.from("organizer_members").upsert(
    { organizer_id: params.organizerId, user_id: params.userId, role: params.role },
    { onConflict: "organizer_id,user_id" },
  );
  if (e2) return { ok: false as const, error: e2.message };
  return { ok: true as const };
}

export async function updateOrganizerMemberRole(params: {
  organizerId: string;
  userId: string;
  role: MemberRole;
}) {
  const { error } = await supabase
    .from("organizer_members")
    .update({ role: params.role })
    .eq("organizer_id", params.organizerId)
    .eq("user_id", params.userId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function removeOrganizerMember(params: { organizerId: string; userId: string }) {
  const { error } = await supabase
    .from("organizer_members")
    .delete()
    .eq("organizer_id", params.organizerId)
    .eq("user_id", params.userId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
