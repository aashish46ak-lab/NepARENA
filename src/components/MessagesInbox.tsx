import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Loader2, ImagePlus, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { uploadPublicImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

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
};

/** Messenger inbox for platform superadmin or organizer dashboard. */
export function MessagesInbox({
  mode,
  organizerId,
}: {
  mode: "platform" | "organizer";
  organizerId?: string;
}) {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

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
            const t = map.get(p.id);
            if (t) {
              t.sender_name = t.sender_name || p.full_name || p.username || "User";
              t.avatar_url = p.avatar_url;
            }
          }
        }
        setThreads([...map.values()].sort((a, b) => (a.last_at < b.last_at ? 1 : -1)));
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
            const t = map.get(p.id);
            if (t) {
              t.sender_name = t.sender_name || p.full_name || p.username || "User";
              t.avatar_url = p.avatar_url;
            }
          }
        }
        setThreads([...map.values()].sort((a, b) => (a.last_at < b.last_at ? 1 : -1)));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMsgs = async (uid: string) => {
    if (mode === "platform") {
      const { data } = await supabase
        .from("platform_messages")
        .select("id, body, image_url, is_from_admin, created_at, sender_name")
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(100);
      setMsgs(
        (
          (data as {
            id: string;
            body: string | null;
            image_url?: string | null;
            is_from_admin: boolean;
            created_at: string;
            sender_name: string | null;
          }[]) ?? []
        ).map((m) => ({
          id: m.id,
          body: m.body,
          image_url: m.image_url ?? null,
          is_from_side: m.is_from_admin,
          created_at: m.created_at,
          sender_name: m.sender_name,
        })),
      );
      await supabase
        .from("platform_messages")
        .update({ read_by_admin: true })
        .eq("user_id", uid)
        .eq("is_from_admin", false)
        .eq("read_by_admin", false);
    } else if (organizerId) {
      const { data } = await supabase
        .from("organizer_messages")
        .select("id, body, image_url, is_from_organizer, created_at, sender_name")
        .eq("organizer_id", organizerId)
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(100);
      setMsgs(
        (
          (data as {
            id: string;
            body: string | null;
            image_url: string | null;
            is_from_organizer: boolean;
            created_at: string;
            sender_name: string | null;
          }[]) ?? []
        ).map((m) => ({
          id: m.id,
          body: m.body,
          image_url: m.image_url,
          is_from_side: m.is_from_organizer,
          created_at: m.created_at,
          sender_name: m.sender_name,
        })),
      );
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
          body: body || (image_url ? "📷 Photo" : null),
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
          body: body || (image_url ? "📷 Photo" : null),
          image_url,
          is_from_organizer: true,
          read_by_organizer: true,
          read_by_user: false,
          sender_name: myName,
        });
        if (error) throw error;
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
          <h3 className="font-semibold">Messages</h3>
          {totalUnread > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
        <p className="text-[11px] text-neutral-500">
          {mode === "platform" ? "From NepARENA floating chat" : "From organizer page"}
        </p>
      </div>

      <div className="grid min-h-[420px] md:grid-cols-[280px_1fr]">
        <div
          className={cn(
            "border-b border-white/10 md:border-b-0 md:border-r",
            active ? "hidden md:block" : "block",
          )}
        >
          {loading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
            </div>
          ) : threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-neutral-500">No messages yet</p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {threads.map((t) => (
                <li key={t.user_id}>
                  <button
                    type="button"
                    onClick={() => setActive(t.user_id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/[0.04]",
                      active === t.user_id && "bg-white/[0.06]",
                    )}
                  >
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-800 text-xs font-semibold">
                        {(t.sender_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{t.sender_name ?? "User"}</p>
                        {t.unread > 0 && (
                          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                            {t.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-neutral-500">{t.last_body}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cn("flex flex-col", !active && "hidden md:flex")}>
          {!active ? (
            <div className="grid flex-1 place-items-center text-sm text-neutral-500">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
                <button type="button" className="md:hidden" onClick={() => setActive(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold">{activeThread?.sender_name ?? "User"}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 320 }}>
                {msgs.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.is_from_side
                        ? "ml-auto bg-sky-500/90 text-white"
                        : "bg-white/10 text-neutral-100",
                    )}
                  >
                    {m.image_url && (
                      <img
                        src={m.image_url}
                        alt=""
                        className="mb-1.5 max-h-36 w-full rounded-xl object-cover"
                      />
                    )}
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        m.is_from_side ? "text-white/70" : "text-neutral-500",
                      )}
                    >
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 p-3">
                {photo && (
                  <div className="relative mb-2 inline-block">
                    <span className="text-xs text-neutral-400">{photo.name}</span>
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="ml-2 text-red-400"
                    >
                      <X className="inline h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 text-neutral-400 hover:text-white">
                    <ImagePlus className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setPhoto(f);
                        e.target.value = "";
                      }}
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
                    placeholder="Reply…"
                    className="min-h-10 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
                  />
                  <Button
                    size="icon"
                    disabled={busy}
                    onClick={() => void send()}
                    className="h-10 w-10 bg-sky-500 text-white hover:bg-sky-400"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
