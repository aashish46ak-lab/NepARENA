import { supabase } from "./supabase";

export type NotifType =
  | "follow"
  | "like"
  | "comment"
  | "repost"
  | "mention"
  | "share"
  | "message_request"
  | "message_accepted"
  | "tournament"
  | "info";

export async function notify(opts: {
  userId: string;
  title: string;
  body?: string | null;
  type?: NotifType | string;
  link?: string | null;
  actorId?: string | null;
  meta?: Record<string, unknown>;
}) {
  if (!opts.userId || opts.userId === opts.actorId) return null;
  const { data, error } = await supabase.rpc("create_notification", {
    p_user_id: opts.userId,
    p_title: opts.title,
    p_body: opts.body ?? null,
    p_type: opts.type ?? "info",
    p_link: opts.link ?? null,
    p_actor_id: opts.actorId ?? null,
    p_meta: opts.meta ?? {},
  });
  if (error) {
    // Fallback direct insert if RPC missing
    const { data: row } = await supabase
      .from("notifications")
      .insert({
        user_id: opts.userId,
        title: opts.title,
        body: opts.body ?? null,
        type: opts.type ?? "info",
        link: opts.link ?? null,
        actor_id: opts.actorId ?? null,
        meta: opts.meta ?? {},
      })
      .select("id")
      .maybeSingle();
    return (row as { id?: string } | null)?.id ?? null;
  }
  return (data as string) ?? null;
}
