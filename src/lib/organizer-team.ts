/**
 * Organizer team (owner / admin / moderator) — single source for dashboard + public page.
 */
import { supabase } from "./supabase";
import type { OrganizerMember, OrganizerMemberRole } from "./organizers";

/** Team member with profile fields for dashboard + public pages */
export type OrganizerTeamMember = OrganizerMember & {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email: string | null;
  is_verified?: boolean;
};

export async function listOrganizerTeam(
  organizerId: string,
): Promise<OrganizerTeamMember[]> {
  const { data: rows, error } = await supabase
    .from("organizer_members")
    .select("id, organizer_id, user_id, role, created_at")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: true });
  if (error || !rows?.length) return [];

  const userIds = rows.map((r) => r.user_id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, is_verified")
    .in("id", userIds);

  const pmap = new Map(
    ((profiles ?? []) as {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      is_verified?: boolean;
    }[]).map((p) => [p.id, p]),
  );

  const roleOrder: Record<OrganizerMemberRole, number> = {
    owner: 0,
    admin: 1,
    moderator: 2,
  };

  return (rows as OrganizerMember[])
    .map((r) => {
      const p = pmap.get(r.user_id);
      return {
        ...r,
        full_name: p?.full_name ?? null,
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        email: null as string | null,
        is_verified: !!p?.is_verified,
      };
    })
    .sort(
      (a, b) =>
        (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) ||
        (a.full_name || "").localeCompare(b.full_name || ""),
    );
}

export async function searchProfilesForTeam(
  query: string,
  limit = 12,
): Promise<
  {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_verified?: boolean;
  }[]
> {
  const q = query.trim();
  if (q.length < 1) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, is_verified")
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(limit);
  return (data ?? []) as {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_verified?: boolean;
  }[];
}

export async function addOrganizerMember(params: {
  organizerId: string;
  userId: string;
  role: OrganizerMemberRole;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("organizer_members").upsert(
    {
      organizer_id: params.organizerId,
      user_id: params.userId,
      role: params.role,
    },
    { onConflict: "organizer_id,user_id" },
  );
  if (error) return { ok: false, error: error.message };

  if (params.role === "owner") {
    await supabase
      .from("organizers")
      .update({ owner_user_id: params.userId })
      .eq("id", params.organizerId);
  }
  return { ok: true };
}

export async function updateOrganizerMemberRole(params: {
  organizerId: string;
  userId: string;
  role: OrganizerMemberRole;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("organizer_members")
    .update({ role: params.role })
    .eq("organizer_id", params.organizerId)
    .eq("user_id", params.userId);
  if (error) return { ok: false, error: error.message };

  if (params.role === "owner") {
    await supabase
      .from("organizers")
      .update({ owner_user_id: params.userId })
      .eq("id", params.organizerId);
  }
  return { ok: true };
}

export async function removeOrganizerMember(params: {
  organizerId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: owners } = await supabase
    .from("organizer_members")
    .select("user_id, role")
    .eq("organizer_id", params.organizerId)
    .eq("role", "owner");
  const ownerRows = owners ?? [];
  const isOwner = ownerRows.some((o) => o.user_id === params.userId);
  if (isOwner && ownerRows.length <= 1) {
    return { ok: false, error: "Cannot remove the only owner" };
  }

  const { error } = await supabase
    .from("organizer_members")
    .delete()
    .eq("organizer_id", params.organizerId)
    .eq("user_id", params.userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
