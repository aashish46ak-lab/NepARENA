import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Loader2, ImagePlus, X, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { uploadPublicImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { getOrCreateDm, sendDmMessage } from "@/lib/dm";

type Thread = {
  user_id: string;
  sender_name: string | null;
  last_body: string | null;
  last_at: string;
  unread: number;
  avatar_url?: string | null;
};

type Msg = {
  id: string;
  body: string | null;
  image_url: string | null;
  is_from_side: boolean;
  created_at: string;
  sender_name: string | null;
  seen_by_other: boolean;
};

export function MessagesInbox({
  mode,
  organizerId,
  onUnreadChange,
}: {
  mode: "platform" | "organizer";
  organizerId?: string;
  onUnreadChange?: (n: number) => void;
}) {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const myName =
    profile?.full_name || profile?.username || user?.email?.split("@")[0] || "Admin";

  const loadThreads = async () => {
    setLoading(true);
    try {
      if (mode === "platform") {
        const { data } = await supabase
          .from("platform_messages")
          .select("user_id, body, created_at, is_from_admin, read_by_admin, sender_name")
          .order("created_at", { ascending: false })
          .limit(300);
        const map = new Map<string, Thread>();
        for (const row of data ?? []) {
          const uid = row.user_id as string;
          if (!map.has(uid)) {
            map.set(uid, {
              user_id: uid,
              sender_name: (row.sender_name as string) || null,
              last_body: (row.body as string) || null,
              last_at: row.created_at as string,
              unread: 0,
            });
          }
          if (!row.is_from_admin && !row.read_by_admin) {
            map.get(uid)!.unread += 1;
          }
        }
        const ids = [...map.keys()];
        if (ids.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", ids);
          for (const p of profiles ?? []) {
            const t = map.get(p.id as string);
            if (t) {
              t.sender_name =
                t.sender_name ||
                (p.full_name as string) ||
                (p.username as string) ||
                null;
              t.avatar_url = (p.avatar_url as string) || null;
            }
          }
        }
        const list = [...map.values()].sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
        setThreads(list);
        onUnreadChange?.(list.reduce((s, t) => s + t.unread, 0));
      } else if (organizerId) {
        const { data } = await supabase
          .from("organizer_messages")
          .select(
            "user_id, body, created_at, is_from_organizer, read_by_organizer, sender_name",
          )
          .eq("organizer_id", organizerId)
          .order("created_at", { ascending: false })
          .limit(300);
        const map = new Map<string, Thread>();
        for (const row of data ?? []) {
          const uid = row.user_id as string;
          if (!map.has(uid)) {
            map.set(uid, {
              user_id: uid,
              sender_name: (row.sender_name as string) || null,
              last_body: (row.body as string) || null,
              last_at: row.created_at as string,
              unread: 0,
            });
          }
          if (!row.is_from_organizer && !row.read_by_organizer) {
            map.get(uid)!.unread += 1;
          }
        }
        const ids = [...map.keys()];
        if (ids.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", ids);
          for (const p of profiles ?? []) {
            const t = map.get(p.id as string);
            if (t) {
              t.sender_name =
                t.sender_name ||
                (p.full_name as string) ||
                (p.username as string) ||
                null;
              t.avatar_url = (p.avatar_url as string) || null;
            }
          }
        }
        const list = [...map.values()].sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
        setThreads(list);
        onUnreadChange?.(list.reduce((s, t) => s + t.unread, 0));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMsgs = async (uid: string) => {
    if (mode === "platform") {
      const { data } = await supabase
        .from("platform_messages")
        .select(
          "id, body, image_url, is_from_admin, created_at, sender_name, read_by_user, read_by_admin",
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(120);
      setMsgs(
        (
          (data as {
            id: string;
            body: string | null;
            image_url: string | null;
            is_from_admin: boolean;
            created_at: string;
            sender_name: string | null;
            read_by_user: boolean | null;
            read_by_admin: boolean | null;
          }[]) ?? []
        ).map((m) => ({
          id: m.id,
          body: m.body,
          image_url: m.image_url,
          is_from_side: m.is_from_admin,
          created_at: m.created_at,
          sender_name: m.sender_name,
          seen_by_other: m.is_from_admin ? !!m.read_by_user : !!m.read_by_admin,
        })),
      );
      setThreads((prev) => {
        const next = prev.map((t) =>
          t.user_id === uid ? { ...t, unread: 0 } : t,
        );
        onUnreadChange?.(next.reduce((s, t) => s + t.unread, 0));
        return next;
      });
      const rpc = await supabase.rpc("admin_mark_platform_thread_read", {
        p_user_id: uid,
      });
      if (rpc.error) {
        await supabase
          .from("platform_messages")
          .update({ read_by_admin: true })
          .eq("user_id", uid)
          .eq("is_from_admin", false)
          .eq("read_by_admin", false);
      }
    } else if (organizerId) {
      const { data } = await supabase
        .from("organizer_messages")
        .select(
          "id, body, image_url, is_from_organizer, created_at, sender_name, read_by_user, read_by_organizer",
        )
        .eq("organizer_id", organizerId)
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(120);
      setMsgs(
        (
          (data as {
            id: string;
            body: string | null;
            image_url: string | null;
            is_from_organizer: boolean;
            created_at: string;
            sender_name: string | null;
            read_by_user: boolean | null;
            read_by_organizer: boolean | null;
          }[]) ?? []
        ).map((m) => ({
          id: m.id,
          body: m.body,
          image_url: m.image_url,
          is_from_side: m.is_from_organizer,
          created_at: m.created_at,
          sender_name: m.sender_name,
          seen_by_other: m.is_from_organizer
            ? !!m.read_by_user
            : !!m.read_by_organizer,
        })),
      );
      setThreads((prev) => {
        const next = prev.map((t) =>
          t.user_id === uid ? { ...t, unread: 0 } : t,
        );
        onUnreadChange?.(next.reduce((s, t) => s + t.unread, 0));
        return next;
      });
      await supabase
        .from("organizer_messages")
        .update({ read_by_organizer: true })
        .eq("organizer_id", organizerId)
        .eq("user_id", uid)
        .eq("is_from_organizer", false)
        .eq("read_by_organizer", false);
    }
    void loadThreads();
  };

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, organizerId]);

  useEffect(() => {
    if (active) void loadMsgs(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const send = async () => {
    if (!user || !active) return;
    const body = text.trim();
    if (!body && !photo) return;
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (photo) {
        image_url = await uploadPublicImage(photo, "avatars", { folder: "messages" });
      }
      if (mode === "platform") {
        const payload: Record<string, unknown> = {
          user_id: active,
          body: body || (image_url ? "Photo" : null),
          is_from_admin: true,
          read_by_admin: true,
          read_by_user: false,
          sender_name: myName,
        };
        if (image_url) payload.image_url = image_url;
        const { error } = await supabase.from("platform_messages").insert(payload);
        if (error) throw error;
      } else if (organizerId) {
        const { error } = await supabase.from("organizer_messages").insert({
          organizer_id: organizerId,
          user_id: active,
          body: body || (image_url ? "Photo" : null),
          image_url,
          is_from_organizer: true,
          read_by_organizer: true,
          read_by_user: false,
          sender_name: myName,
        });
        if (error) throw error;
        try {
          const cid = await getOrCreateDm(active);
          if (cid && user) {
            await sendDmMessage({
              conversationId: cid,
              senderId: user.id,
              body: body || undefined,
              imageUrl: image_url || undefined,
            });
          }
        } catch {
          /* non-fatal */
        }
      }
      setText("");
      setPhoto(null);
      void loadMsgs(active);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);
  const activeThread = threads.find((t) => t.user_id === active);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-semibold">Messages</h3>
          {totalUnread > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
        {active && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white"
            onClick={() => setActive(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Inbox
          </button>
        )}
      </div>

      {!active ? (
        <div className="max-h-[420px] overflow-y-auto">
          {loading && (
            <div className="grid place-items-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loading && threads.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No messages yet</p>
          )}
          {threads.map((t) => (
            <button
              key={t.user_id}
              type="button"
              onClick={() => setActive(t.user_id)}
              className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left hover:bg-white/[0.04]"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-xs font-bold">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (t.sender_name || "?")[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{t.sender_name || "Member"}</p>
                  {t.unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {t.unread}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{t.last_body || "Photo"}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex h-[420px] flex-col">
          <div className="border-b border-white/10 px-4 py-2 text-sm font-medium">
            {activeThread?.sender_name || "Conversation"}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.is_from_side ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    m.is_from_side
                      ? "bg-sky-600/90 text-white"
                      : "bg-white/10 text-neutral-100",
                  )}
                >
                  {m.image_url && (
                    <button type="button" className="mb-1 block" onClick={() => setLightbox(m.image_url)}>
                      <img
                        src={m.image_url}
                        alt=""
                        className="max-h-40 rounded-lg object-cover"
                      />
                    </button>
                  )}
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1 text-[10px]",
                      m.is_from_side ? "justify-end text-white/70" : "text-neutral-500",
                    )}
                  >
                    <span>
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {m.is_from_side &&
                      (m.seen_by_other ? (
                        <span className="inline-flex items-center gap-0.5 text-sky-200" title="Seen">
                          <CheckCheck className="h-3 w-3" /> Seen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5" title="Delivered">
                          <Check className="h-3 w-3" /> Delivered
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 p-2">
            {photo && (
              <div className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
                <span className="truncate">{photo.name}</span>
                <button type="button" onClick={() => setPhoto(null)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-white/10 p-2 hover:bg-white/5">
                <ImagePlus className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Message\u2026"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/25"
              />
              <Button size="sm" disabled={busy} onClick={() => void send()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
