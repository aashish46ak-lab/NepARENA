import { supabase } from "./supabase";

export async function getUserFollowerCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("user_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}

export async function getUserFollowingCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("user_follows")
    .select("following_id", { count: "exact", head: true })
    .eq("follower_id", userId);
  return count ?? 0;
}

export async function isFollowingUser(
  viewerId: string,
  targetUserId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("following_id", targetUserId)
    .maybeSingle();
  return !!data;
}

export async function followUser(viewerId: string, targetUserId: string) {
  if (viewerId === targetUserId) {
    return { error: { message: "Cannot follow yourself" } } as const;
  }
  return supabase.from("user_follows").upsert(
    { follower_id: viewerId, following_id: targetUserId },
    { onConflict: "follower_id,following_id" },
  );
}

export async function unfollowUser(viewerId: string, targetUserId: string) {
  return supabase
    .from("user_follows")
    .delete()
    .eq("follower_id", viewerId)
    .eq("following_id", targetUserId);
}

export async function listFollowers(userId: string, limit = 48) {
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id, created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = (data ?? []).map((r: { follower_id: string }) => r.follower_id);
  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  return (profiles ?? []) as {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }[];
}

export async function listFollowingUsers(userId: string, limit = 48) {
  const { data } = await supabase
    .from("user_follows")
    .select("following_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = (data ?? []).map((r: { following_id: string }) => r.following_id);
  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  return (profiles ?? []) as {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }[];
}
