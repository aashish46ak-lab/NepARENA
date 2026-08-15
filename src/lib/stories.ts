import { supabase } from "./supabase";

export type StoryMediaType = "text" | "photo" | "video";

export type Story = {
  id: string;
  user_id: string;
  media_type: StoryMediaType;
  body: string | null;
  media_url: string | null;
  bg_color: string | null;
  created_at: string;
  expires_at: string;
  view_count: number;
  name?: string;
  avatar?: string | null;
  seen?: boolean;
};

export type StoryGroup = {
  user_id: string;
  name: string;
  avatar: string | null;
  stories: Story[];
  hasUnseen: boolean;
};

/** Active stories from people you follow + yourself */
export async function listActiveStories(viewerId: string): Promise<StoryGroup[]> {
  const { data: following } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", viewerId);
  const peerIds = new Set<string>([viewerId]);
  (following ?? []).forEach((f: { following_id: string }) => peerIds.add(f.following_id));

  const { data: memberships } = await supabase
    .from("dm_members")
    .select("conversation_id")
    .eq("user_id", viewerId)
    .limit(40);
  const convIds = (memberships ?? []).map((m) => m.conversation_id as string);
  if (convIds.length) {
    const { data: others } = await supabase
      .from("dm_members")
      .select("user_id")
      .in("conversation_id", convIds)
      .neq("user_id", viewerId);
    (others ?? []).forEach((o: { user_id: string }) => peerIds.add(o.user_id));
  }

  const ids = Array.from(peerIds);
  if (!ids.length) return [];

  const { data: rows } = await supabase
    .from("user_stories")
    .select("id, user_id, media_type, body, media_url, bg_color, created_at, expires_at, view_count")
    .in("user_id", ids)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(120);

  const stories = (rows ?? []) as Story[];
  if (!stories.length) return [];

  const storyIds = stories.map((s) => s.id);
  const { data: views } = await supabase
    .from("story_views")
    .select("story_id")
    .eq("viewer_id", viewerId)
    .in("story_id", storyIds);
  const seenSet = new Set((views ?? []).map((v: { story_id: string }) => v.story_id));

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", Array.from(new Set(stories.map((s) => s.user_id))));
  const pmap = new Map(((profs ?? []) as any[]).map((p) => [p.id as string, p]));

  const byUser = new Map<string, Story[]>();
  for (const s of stories) {
    const enriched = { ...s, seen: seenSet.has(s.id) };
    const arr = byUser.get(s.user_id) ?? [];
    arr.push(enriched);
    byUser.set(s.user_id, arr);
  }

  const groups: StoryGroup[] = [];
  if (byUser.has(viewerId)) {
    const p = pmap.get(viewerId);
    const list = byUser.get(viewerId)!;
    groups.push({
      user_id: viewerId,
      name: "Your story",
      avatar: p?.avatar_url ?? null,
      stories: list,
      hasUnseen: list.some((s) => !s.seen),
    });
    byUser.delete(viewerId);
  }
  for (const [uid, list] of byUser) {
    const p = pmap.get(uid);
    groups.push({
      user_id: uid,
      name: p?.full_name?.trim() || p?.username?.trim() || "Player",
      avatar: p?.avatar_url ?? null,
      stories: list,
      hasUnseen: list.some((s) => !s.seen),
    });
  }
  groups.sort((a, b) => Number(b.hasUnseen) - Number(a.hasUnseen));
  return groups;
}

export async function createStory(params: {
  userId: string;
  mediaType: StoryMediaType;
  body?: string | null;
  mediaUrl?: string | null;
  bgColor?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from("user_stories")
    .insert({
      user_id: params.userId,
      media_type: params.mediaType,
      body: params.body ?? null,
      media_url: params.mediaUrl ?? null,
      bg_color: params.bgColor ?? "#0ea5e9",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

export async function deleteStory(storyId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("user_stories").delete().eq("id", storyId);
  return error ? { error: error.message } : {};
}

export async function markStoryViewed(storyId: string, viewerId: string): Promise<void> {
  await supabase
    .from("story_views")
    .upsert({ story_id: storyId, viewer_id: viewerId, viewed_at: new Date().toISOString() }, { onConflict: "story_id,viewer_id" });
  try {
    await supabase.rpc("increment_story_views", { p_story_id: storyId });
  } catch {
    /* ignore */
  }
}
