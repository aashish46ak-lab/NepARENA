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
  primary_game?: string | null;
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

const ORG_SELECT =
  "id, name, slug, logo_url, banner_url, description, is_verified, status, created_at, owner_user_id, primary_game";

const ORG_SELECT_MIN =
  "id, name, slug, logo_url, description, is_verified, status, created_at, primary_game";

function mapOrgRow(row: Record<string, unknown> | null | undefined): Organizer | null {
  if (!row || !row.id) return null;
  const banner = (row.banner_url as string | null) ?? (row.cover_url as string | null) ?? null;
  return {
    id: String(row.id),
    name: String(row.name ?? "Organizer"),
    slug: String(row.slug ?? ""),
    logo_url: (row.logo_url as string | null) ?? null,
    cover_url: banner,
    description: (row.description as string | null) ?? null,
    is_verified: Boolean(row.is_verified),
    status: (row.status as OrganizerStatus) || "active",
    created_at: row.created_at as string | undefined,
    theme: (row.theme as Record<string, unknown> | null) ?? null,
    owner_id: (row.owner_user_id as string | null) ?? (row.owner_id as string | null) ?? null,
    primary_game: (row.primary_game as string | null) ?? null,
  };
}

async function fillDefaultBranding(mapped: Organizer): Promise<Organizer> {
  if (
    (mapped.logo_url && mapped.cover_url) ||
    !(mapped.slug === DEFAULT_ORGANIZER_SLUG || /efootball/i.test(mapped.name))
  ) {
    return mapped;
  }
  const { data: site } = await supabase
    .from("site_settings")
    .select("logo_url, hero_image_url")
    .limit(1)
    .maybeSingle();
  const logo = (site as { logo_url?: string | null } | null)?.logo_url;
  const cover = (site as { hero_image_url?: string | null } | null)?.hero_image_url;
  if (logo && !mapped.logo_url) mapped.logo_url = logo;
  if (cover && !mapped.cover_url) mapped.cover_url = cover;
  return mapped;
}

export async function listActiveOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select(ORG_SELECT)
    .in("status", ["active", "pending"])
    .order("name");
  if (error) console.warn("listActiveOrganizers", error.message);
  let rows = ((data ?? []) as Record<string, unknown>[])
    .map((r) => mapOrgRow(r))
    .filter((o): o is Organizer => !!o)
    .filter((o) => o.status === "active" || o.is_verified);

  if (!rows.length) {
    const { data: fallback } = await supabase
      .from("organizers")
      .select(ORG_SELECT_MIN)
      .order("name")
      .limit(50);
    rows = ((fallback ?? []) as Record<string, unknown>[])
      .map((r) => mapOrgRow(r))
      .filter((o): o is Organizer => !!o);
  }

  const hasDefault = rows.some(
    (o) => o.slug === DEFAULT_ORGANIZER_SLUG || /efootball\s*nepal/i.test(o.name),
  );
  if (!hasDefault) {
    const def = await ensureDefaultOrganizerPublic();
    if (def) rows = [def, ...rows];
  } else {
    rows = await Promise.all(rows.map((o) => fillDefaultBranding(o)));
  }
  return rows;
}

export async function listAllOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase.from("organizers").select(ORG_SELECT).order("name");
  if (error) return [];
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
      if ((full.data as { status?: string }).status === "deleted") return null;
      return mapOrgRow(full.data as Record<string, unknown>);
    }
    const min = await supabase.from("organizers").select(ORG_SELECT_MIN).eq("slug", s).maybeSingle();
    if (min.error) console.warn("getOrganizerBySlug", s, min.error.message);
    if (min.data && (min.data as { status?: string }).status === "deleted") return null;
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
    if ((byName as { status?: string } | null)?.status === "deleted") return null;
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
  } catch { /* ignore */ }
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["owner", "admin"]);
    for (const r of (roles ?? []) as { user_id: string }[]) ids.add(r.user_id);
  } catch { /* ignore */ }
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
  if (!organizerId || organizerId.startsWith("default-")) return 0;
  const { count, error } = await supabase
    .from("organizer_followers")
    .select("*", { count: "exact", head: true })
    .eq("organizer_id", organizerId);
  if (error) return 0;
  return count ?? 0;
}

export async function followOrganizer(organizerId: string, userId: string) {
  if (!organizerId || organizerId.startsWith("default-")) {
    return { ok: false as const, error: "Organizer not ready" };
  }
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
  if (!organizerId || organizerId.startsWith("default-")) return false;
  const { data } = await supabase
    .from("organizer_followers")
    .select("organizer_id")
    .eq("organizer_id", organizerId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function listOrganizerFollowers(
  organizerId: string,
  limit = 100,
): Promise<{ id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]> {
  if (!organizerId || organizerId.startsWith("default-") || organizerId.startsWith("seed-")) return [];
  const { data: rows } = await supabase
    .from("organizer_followers")
    .select("user_id")
    .eq("organizer_id", organizerId)
    .limit(limit);
  const ids = (rows ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  const map = new Map(((profiles ?? []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]));
  return ids
    .map((id) => {
      const p = map.get(id);
      return p
        ? { id: p.id, username: p.username, full_name: p.full_name, avatar_url: p.avatar_url }
        : { id, username: null, full_name: null, avatar_url: null };
    })
    .filter(Boolean);
}

export async function getPlatformStats() {
  const [
    orgsCount, usersCount, tournamentsCount, liveCount, doneCount,
    orgsListRes, recentUsersRes, invitesRes, messagesRes, pendingAppsRes,
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
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function evaluateOrganizerVerification(organizerId: string) {
  return setOrganizerVerified(organizerId, true);
}

export async function inviteOrganizer(params: {
  email: string; name: string; slug: string; invitedBy: string;
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
      .insert({ name, slug, status: "active", is_verified: false, owner_user_id: params.userId })
      .select(ORG_SELECT_MIN)
      .single();
    if (error) return { ok: false as const, error: error.message };
    org = mapOrgRow(data as Record<string, unknown>);
    if (!org) return { ok: false as const, error: "Create failed" };
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

export async function ensureDefaultOrganizerPublic(): Promise<Organizer | null> {
  const existing = await getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
  if (existing) return fillDefaultBranding(existing);
  return null;
}

export async function listOrganizerMemberships(userId: string): Promise<(OrganizerMember & { organizer?: Organizer })[]> {
  const { data } = await supabase.from("organizer_members").select("organizer_id, user_id, role, created_at").eq("user_id", userId);
  let rows = (data ?? []) as OrganizerMember[];
  const memberIds = new Set(rows.map((r) => r.organizer_id));

  const { data: owned } = await supabase
    .from("organizers")
    .select(ORG_SELECT_MIN + ", owner_user_id")
    .eq("owner_user_id", userId);
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
      .filter((o): o is Organizer => !!o)
      .map((o) => [o.id, o]),
  );
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
  organizerId: string; userId: string; role: MemberRole;
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
  organizerId: string; userId: string; role: MemberRole;
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
