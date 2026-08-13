import { supabase } from "./supabase";

export type DmThread = {
  conversation_id: string;
  peer_id: string;
  peer_name: string;
  peer_avatar: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
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

  // Peers in same conversations
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
        .select("id, username, full_name, avatar_url")
        .in("id", peerIds)
    : { data: [] as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[] };

  const profileMap = new Map(
    ((profiles ?? []) as {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    }[]).map((p) => [p.id, p]),
  );

  // Latest message per conversation
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
    return {
      conversation_id: cid,
      peer_id: peerId,
      peer_name:
        prof?.full_name?.trim() ||
        prof?.username?.trim() ||
        "Player",
      peer_avatar: prof?.avatar_url ?? null,
      last_body: last?.body ?? null,
      last_at: last?.at ?? null,
      unread: unreadByConv.get(cid) ?? 0,
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
