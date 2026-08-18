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

export async function ensureDefaultOrganizerPublic(): Promise<Organizer | null> {
  const existing = await getOrganizerBySlug(DEFAULT_ORGANIZER_SLUG);
  if (existing) return fillDefaultBranding(existing);
  return null;
}
