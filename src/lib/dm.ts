import { supabase } from "./supabase";

export type DmThread = {
  conversation_id: string;
  peer_id: string;
  peer_name: string;
  peer_avatar: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
  status: "active" | "request" | "declined" | "blocked";
  initiated_by: string | null;
  peer_streak?: number;
};

export type DmMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  reaction: string | null;
  created_at: string;
};

export type UserNote = {
  user_id: string;
  body: string;
  created_at: string;
  expires_at: string;
  name?: string;
  avatar?: string | null;
};

export async function getOrCreateDm(peerId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_or_create_dm", {
    other_user: peerId,
  });
  if (error) {
    console.warn("get_or_create_dm", error.message);
    return null;
  }
  return (data as string) ?? null;
}

export async function acceptDmRequest(conversationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("accept_dm_request", { conv_id: conversationId });
  if (error) {
    console.warn("accept_dm_request", error.message);
    return false;
  }
  return !!data;
}

export async function declineDmRequest(conversationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("decline_dm_request", { conv_id: conversationId });
  if (error) {
    console.warn("decline_dm_request", error.message);
    return false;
  }
  return !!data;
}

export async function listDmThreads(userId: string): Promise<DmThread[]> {
  const { data: memberships } = await supabase
    .from("dm_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  const convIds = (memberships ?? []).map((m) => m.conversation_id as string);
  if (!convIds.length) return [];

  const readMap = new Map(
    (memberships ?? []).map((m) => [m.conversation_id as string, m.last_read_at as string | null]),
  );

  const { data: convs } = await supabase
    .from("dm_conversations")
    .select("id, status, initiated_by")
    .in("id", convIds);

  const statusMap = new Map(
    ((convs ?? []) as { id: string; status: string; initiated_by: string | null }[]).map((c) => [
      c.id,
      { status: (c.status || "active") as DmThread["status"], initiated_by: c.initiated_by },
    ]),
  );

  const { data: peers } = await supabase
    .from("dm_members")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds)
    .neq("user_id", userId);

  const peerByConv = new Map<string, string>();
  for (const p of peers ?? []) {
    peerByConv.set(p.conversation_id as string, p.user_id as string);
  }

  const peerIds = [...new Set([...peerByConv.values()])];
  const { data: profiles } = peerIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, login_streak")
        .in("id", peerIds)
    : { data: [] as any[] };

  const profileMap = new Map(
    ((profiles ?? []) as any[]).map((p) => [p.id as string, p]),
  );

  const { data: msgs } = await supabase
    .from("dm_messages")
    .select("id, conversation_id, body, created_at, sender_id")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
    .limit(400);

  const lastByConv = new Map<string, { body: string | null; at: string }>();
  const unreadByConv = new Map<string, number>();
  for (const m of msgs ?? []) {
    const cid = m.conversation_id as string;
    if (!lastByConv.has(cid)) {
      lastByConv.set(cid, {
        body: (m.body as string) ?? null,
        at: m.created_at as string,
      });
    }
    const lastRead = readMap.get(cid);
    if (
      m.sender_id !== userId &&
      (!lastRead || new Date(m.created_at as string) > new Date(lastRead))
    ) {
      unreadByConv.set(cid, (unreadByConv.get(cid) ?? 0) + 1);
    }
  }

  const threads: DmThread[] = convIds.map((cid) => {
    const peerId = peerByConv.get(cid) ?? "";
    const prof = profileMap.get(peerId);
    const last = lastByConv.get(cid);
    const st = statusMap.get(cid);
    return {
      conversation_id: cid,
      peer_id: peerId,
      peer_name: prof?.full_name?.trim() || prof?.username?.trim() || "Player",
      peer_avatar: prof?.avatar_url ?? null,
      last_body: last?.body ?? null,
      last_at: last?.at ?? null,
      unread: unreadByConv.get(cid) ?? 0,
      status: st?.status ?? "active",
      initiated_by: st?.initiated_by ?? null,
      peer_streak: Number(prof?.login_streak ?? 0),
    };
  });

  threads.sort((a, b) => {
    const ta = a.last_at ? new Date(a.last_at).getTime() : 0;
    const tb = b.last_at ? new Date(b.last_at).getTime() : 0;
    return tb - ta;
  });

  return threads;
}

export async function listDmMessages(
  conversationId: string,
  limit = 80,
): Promise<DmMessage[]> {
  const { data } = await supabase
    .from("dm_messages")
    .select("id, conversation_id, sender_id, body, image_url, reaction, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as DmMessage[];
}

export async function sendDmMessage(opts: {
  conversationId: string;
  senderId: string;
  body?: string;
  imageUrl?: string;
}): Promise<{ error?: string }> {
  const { error } = await supabase.from("dm_messages").insert({
    conversation_id: opts.conversationId,
    sender_id: opts.senderId,
    body: opts.body?.trim() || null,
    image_url: opts.imageUrl ?? null,
  });
  if (error) return { error: error.message };
  await supabase
    .from("dm_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", opts.conversationId);
  return {};
}

export async function markDmRead(conversationId: string, userId: string) {
  await supabase
    .from("dm_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function reactToDm(messageId: string, reaction: string | null) {
  await supabase.from("dm_messages").update({ reaction }).eq("id", messageId);
}

export function formatMsgTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Instagram-style notes (24h) */
export async function getMyNote(userId: string): Promise<UserNote | null> {
  const { data } = await supabase
    .from("user_notes")
    .select("user_id, body, created_at, expires_at")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return (data as UserNote) ?? null;
}

export async function setMyNote(userId: string, body: string): Promise<{ error?: string }> {
  const trimmed = body.trim().slice(0, 20);
  if (!trimmed) return { error: "Note is empty" };
  const { error } = await supabase.from("user_notes").upsert({
    user_id: userId,
    body: trimmed,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  return error ? { error: error.message } : {};
}

export async function deleteMyNote(userId: string) {
  await supabase.from("user_notes").delete().eq("user_id", userId);
}

export async function listFriendNotes(peerIds: string[]): Promise<UserNote[]> {
  if (!peerIds.length) return [];
  const { data } = await supabase
    .from("user_notes")
    .select("user_id, body, created_at, expires_at")
    .in("user_id", peerIds)
    .gt("expires_at", new Date().toISOString());
  const notes = (data ?? []) as UserNote[];
  if (!notes.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in(
      "id",
      notes.map((n) => n.user_id),
    );
  const map = new Map(((profs ?? []) as any[]).map((p) => [p.id as string, p]));
  return notes.map((n) => {
    const p = map.get(n.user_id);
    return {
      ...n,
      name: p?.full_name?.trim() || p?.username?.trim() || "Player",
      avatar: p?.avatar_url ?? null,
    };
  });
}
