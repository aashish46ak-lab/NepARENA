/**
 * NepARENA multi-tenant helpers.
 * Tournament manager / eFootball cores are independent of this module.
 */
import { supabase } from "./supabase";

export const PLATFORM_NAME = "NepARENA";

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
  primary_game?: string | null;
  created_at?: string;
};

export type OrganizerMember = {
  organizer_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
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
  return (SUPER_ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase());
}

const ORG_SELECT =
  "id, name, slug, logo_url, banner_url, description, tagline, primary_color, secondary_color, website_url, contact_email, is_verified, status, created_at, owner_user_id, primary_game";
const ORG_SELECT_MIN =
  "id, name, slug, logo_url, description, is_verified, status, created_at, primary_game";

function mapOrgRow(row: Record<string, unknown> | null): Organizer | null {
  if (!row) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    tagline: (row.tagline as string) ?? null,
    description: (row.description as string) ?? null,
    logo_url: (row.logo_url as string) ?? null,
    banner_url: (row.banner_url as string) ?? null,
    primary_color: (row.primary_color as string) ?? null,
    secondary_color: (row.secondary_color as string) ?? null,
    owner_user_id: (row.owner_user_id as string) ?? null,
    status: (row.status as OrganizerStatus) || "active",
    is_verified: !!row.is_verified,
    website_url: (row.website_url as string) ?? null,
    contact_email: (row.contact_email as string) ?? null,
    primary_game: (row.primary_game as string) ?? null,
    created_at: row.created_at as string | undefined,
  };
}

function fillDefaultBranding(o: Organizer): Organizer {
  return o;
}

export async function listActiveOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select(ORG_SELECT_MIN)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) {
    console.warn("listActiveOrganizers", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[])
    .map((r) => mapOrgRow(r))
    .filter((o): o is Organizer => !!o)
    .filter((o) => o.status === "active" || o.is_verified);
}

export async function listAllOrganizers(): Promise<Organizer[]> {
  const { data } = await supabase
    .from("organizers")
    .select(ORG_SELECT_MIN)
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as Record<string, unknown>[])
    .map((r) => mapOrgRow(r))
    .filter((o): o is Organizer => !!o);
}

export async function getOrganizerBySlug(slug: string): Promise<Organizer | null> {
  const raw = decodeURIComponent((slug || "").trim());
  if (!raw) return null;
  const candidates = Array.from(
    new Set([raw, raw.toLowerCase(), raw.replace(/\s+/g, "-").toLowerCase()].filter(Boolean)),
  );

  async function rowBySlug(s: string): Promise<Organizer | null> {
    const full = await supabase.from("organizers").select(ORG_SELECT).eq("slug", s).maybeSingle();
    if (!full.error && full.data) {
      const st = (full.data as { status?: string }).status;
      if (st === "deleted" || st === "rejected" || st === "suspended") return null;
      return mapOrgRow(full.data as Record<string, unknown>);
    }
    const min = await supabase.from("organizers").select(ORG_SELECT_MIN).eq("slug", s).maybeSingle();
    if (min.error) console.warn("getOrganizerBySlug", s, min.error.message);
    if (min.data) {
      const st = (min.data as { status?: string }).status;
      if (st === "deleted" || st === "rejected" || st === "suspended") return null;
    }
    return mapOrgRow(min.data as Record<string, unknown> | null);
  }

  for (const s of candidates) {
    const mapped = await rowBySlug(s);
    if (mapped) return fillDefaultBranding(mapped);
  }

  const { data: byName } = await supabase
    .from("organizers")
    .select(ORG_SELECT_MIN)
    .ilike("name", `%${raw.replace(/-/g, " ")}%`)
    .limit(1)
    .maybeSingle();
  const named = mapOrgRow(byName as Record<string, unknown> | null);
  if (named) {
    const bst = (byName as { status?: string } | null)?.status;
    if (bst === "deleted" || bst === "rejected" || bst === "suspended") return null;
    return fillDefaultBranding(named);
  }

  if (/efootball/i.test(raw) || raw === DEFAULT_ORGANIZER_SLUG) {
    return ensureDefaultOrganizerPublic();
  }
  return null;
}

export async function notifyPlatformAdmins(opts: {
  title: string;
  body?: string;
}) {
  /* best-effort; table may not exist */
  try {
    await supabase.from("platform_notifications").insert({
      title: opts.title,
      body: opts.body ?? null,
    });
  } catch {
    /* ignore */
  }
}

export async function getFollowerCount(organizerId: string): Promise<number> {
  const { count } = await supabase
    .from("organizer_followers")
    .select("*", { count: "exact", head: true })
    .eq("organizer_id", organizerId);
  return count ?? 0;
}

export async function followOrganizer(organizerId: string, userId: string) {
  const { error } = await supabase
    .from("organizer_followers")
    .upsert({ organizer_id: organizerId, user_id: userId }, { onConflict: "organizer_id,user_id" });
  if (error) throw error;
}

export async function unfollowOrganizer(organizerId: string, userId: string) {
  const { error } = await supabase
    .from("organizer_followers")
    .delete()
    .eq("organizer_id", organizerId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function listFollowedOrganizerIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("organizer_followers").select("organizer_id").eq("user_id", userId);
  return (data ?? []).map((r) => r.organizer_id as string);
}

export async function isFollowing(organizerId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("organizer_followers")
    .select("user_id")
    .eq("organizer_id", organizerId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function listOrganizerFollowers(organizerId: string, limit = 80) {
  const { data } = await supabase
    .from("organizer_followers")
    .select("user_id, created_at")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = (data ?? []).map((r) => r.user_id as string);
  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  const map = new Map(
    ((profiles ?? []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]).map(
      (p) => [p.id, p],
    ),
  );
  return ids.map((id) => {
    const p = map.get(id);
    return {
      id,
      username: p?.username ?? null,
      full_name: p?.full_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });
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
    supabase
      .from("organizers")
      .select("id, name, slug, logo_url, is_verified, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, created_at, is_verified")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("organizer_invitations")
      .select("id, email, name, slug, status, created_at, token")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("platform_messages").select("*", { count: "exact", head: true }).eq("read", false),
    supabase.from("organizer_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const organizersList = (orgsListRes.data ?? []) as {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    status: string;
    created_at?: string;
  }[];

  return {
    organizers: orgsCount.count ?? organizersList.length,
    players: usersCount.count ?? 0,
    users: usersCount.count ?? 0,
    tournaments: tournamentsCount.count ?? 0,
    liveTournaments: liveCount.count ?? 0,
    completedTournaments: doneCount.count ?? 0,
    organizersList,
    recentUsers: (recentUsersRes.data ?? []) as {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
      created_at: string;
      is_verified?: boolean;
    }[],
    pendingInvites: (invitesRes.data ?? []) as {
      id: string;
      email: string;
      name: string;
      slug: string;
      status: string;
      created_at: string;
      token: string;
    }[],
    messages: messagesRes.count ?? 0,
    pendingApplications: pendingAppsRes.count ?? 0,
    byStatus: {
      active: organizersList.filter((o) => o.status === "active").length,
      pending: organizersList.filter((o) => o.status === "pending").length,
      suspended: organizersList.filter((o) => o.status === "suspended").length,
      verified: organizersList.filter((o) => o.is_verified).length,
    },
  };
}

export async function setOrganizerVerified(organizerId: string, verified: boolean) {
  const { error } = await supabase.from("organizers").update({ is_verified: verified }).eq("id", organizerId);
  if (error) throw error;
}

export async function evaluateOrganizerVerification(organizerId: string) {
  return { ok: true as const };
}

export async function inviteOrganizer(params: { email: string; name: string; invitedBy: string }) {
  const slug =
    params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `org-${Date.now()}`;
  const token = crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
  const { error } = await supabase.from("organizer_invitations").insert({
    email: params.email.trim().toLowerCase(),
    name: params.name.trim(),
    slug,
    token,
    invited_by: params.invitedBy,
    status: "pending",
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, token, slug };
}

export async function setOrganizerStatus(organizerId: string, status: OrganizerStatus) {
  const { error } = await supabase.from("organizers").update({ status }).eq("id", organizerId);
  if (error) throw error;
}

export async function ensureEfootballNepalAdmin(userId: string) {
  const org = await getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
  if (!org) return;
  await supabase.from("organizer_members").upsert(
    { organizer_id: org.id, user_id: userId, role: "owner" },
    { onConflict: "organizer_id,user_id" },
  );
}

export async function getInvitationByToken(token: string) {
  const { data } = await supabase.from("organizer_invitations").select("*").eq("token", token).maybeSingle();
  return data;
}

export async function acceptInvitation(params: { token: string; userId: string }) {
  const inv = await getInvitationByToken(params.token);
  if (!inv || (inv as { status?: string }).status !== "pending")
    return { ok: false as const, error: "Invalid invitation" };
  const name = String((inv as { name?: string }).name || "Organizer");
  const slug = String((inv as { slug?: string }).slug || `org-${Date.now()}`);
  const { data: org, error } = await supabase
    .from("organizers")
    .insert({ name, slug, status: "active", is_verified: false, owner_user_id: params.userId })
    .select("id, slug")
    .maybeSingle();
  if (error || !org)
    return { ok: false as const, error: error?.message || "Could not create organizer" };
  await supabase.from("organizer_members").upsert(
    { organizer_id: org.id, user_id: params.userId, role: "owner" },
    { onConflict: "organizer_id,user_id" },
  );
  await supabase.from("organizer_invitations").update({ status: "accepted" }).eq("token", params.token);
  return { ok: true as const, organizerId: org.id as string, slug: org.slug as string };
}

export async function getDefaultOrganizer(): Promise<Organizer | null> {
  return getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
}

export async function ensureDefaultOrganizerPublic(): Promise<Organizer | null> {
  const existing = await getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
  if (existing) return existing;
  return null;
}

export async function listOrganizerMemberships(
  userId: string,
): Promise<(OrganizerMember & { organizer?: Organizer })[]> {
  const { data: members } = await supabase
    .from("organizer_members")
    .select("organizer_id, user_id, role, created_at")
    .eq("user_id", userId);
  let rows = (members ?? []) as OrganizerMember[];
  const memberIds = new Set(rows.map((r) => r.organizer_id));

  const { data: owned } = await supabase.from("organizers").select("id, created_at").eq("owner_user_id", userId);
  for (const o of owned ?? []) {
    const id = o.id as string;
    if (!memberIds.has(id)) {
      rows = [
        ...rows,
        {
          organizer_id: id,
          user_id: userId,
          role: "owner" as MemberRole,
          created_at: (o as { created_at?: string }).created_at ?? new Date().toISOString(),
        },
      ];
      memberIds.add(id);
      await supabase.from("organizer_members").upsert(
        { organizer_id: id, user_id: userId, role: "owner" },
        { onConflict: "organizer_id,user_id" },
      );
    }
  }

  if (!rows.length) return [];
  const ids = rows.map((r) => r.organizer_id);
  const { data: orgs } = await supabase.from("organizers").select(ORG_SELECT_MIN).in("id", ids);
  const map = new Map(
    ((orgs ?? []) as Record<string, unknown>[])
      .map((r) => mapOrgRow(r))
      .filter(
        (o): o is Organizer =>
          !!o && o.status !== "suspended" && (o as { status?: string }).status !== "rejected",
      )
      .map((o) => [o.id, o]),
  );
  return rows.filter((r) => map.has(r.organizer_id)).map((r) => ({ ...r, organizer: map.get(r.organizer_id) }));
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
  const map = new Map(
    ((profiles ?? []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]).map(
      (p) => [p.id, p],
    ),
  );
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
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(limit);
  return data ?? [];
}

export async function addOrganizerMember(params: {
  organizerId: string;
  userId: string;
  role: MemberRole;
}) {
  const { error } = await supabase.from("organizer_members").upsert(
    { organizer_id: params.organizerId, user_id: params.userId, role: params.role },
    { onConflict: "organizer_id,user_id" },
  );
  if (error) return { ok: false as const, error: error.message };
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
