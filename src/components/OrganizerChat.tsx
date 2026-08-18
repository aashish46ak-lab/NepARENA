import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, X, ImagePlus, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  body: string;
  image_url: string | null;
  is_from_organizer: boolean;
  created_at: string;
  sender_name: string | null;
};

/**
 * Messenger-style chat with an organizer (follower ↔ organizer).
 * Uses organizer_messages; falls back to platform_messages with [org:id] prefix.
 *
 * mode:
 *  - "button" / "fab" → trigger + modal overlay
 *  - "panel" → always-open embedded digital message panel (for organizer page tab)
 */
export function OrganizerChat({
  organizerId,
  organizerName,
  organizerLogo,
  mode = "button",
  className,
}: {
  organizerId: string;
  organizerName: string;
  organizerLogo?: string | null;
  mode?: "button" | "fab" | "panel";
  className?: string;
}) {
  const { user, profile } = useAuth();
  const isPanel = mode === "panel";
  const [open, setOpen] = useState(isPanel);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayName =
    profile?.full_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Player";

  const load = useCallback(async () => {
    if (!user) {
      setMessages([]);
      setUnread(0);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizer_messages")
        .select("id, body, image_url, is_from_organizer, created_at, sender_name")
        .eq("organizer_id", organizerId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(120);

      if (!error && data) {
        setMessages(data as Msg[]);
        const orgMsgs = (data as Msg[]).filter((m) => m.is_from_organizer);
        setUnread(!open && !isPanel && orgMsgs.length ? Math.min(orgMsgs.length, 99) : 0);
        if (open || isPanel) setUnread(0);
        return;
      }

      const { data: plat } = await supabase
        .from("platform_messages")
        .select("id, body, is_from_admin, created_at")
        .eq("user_id", user.id)
        .ilike("body", `[org:${organizerId}]%`)
        .order("created_at", { ascending: true })
        .limit(80);

      const tagged = ((plat ?? []) as { id: string; body: string; is_from_admin: boolean; created_at: string }[]).map(
        (m) => ({
          id: m.id,
          body: m.body.replace(`[org:${organizerId}] `, ""),
          image_url: null as string | null,
          is_from_organizer: m.is_from_admin,
          created_at: m.created_at,
          sender_name: null as string | null,
        }),
      );
      setMessages(tagged);
      if (!open && !isPanel) {
        setUnread(tagged.filter((m) => m.is_from_organizer).length ? 1 : 0);
      }
    } finally {
      setLoading(false);
    }
  }, [user, organizerId, open, isPanel]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`org-chat-${organizerId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organizer_messages" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "platform_messages",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user?.id, organizerId, load]);

  useEffect(() => {
    if (open || isPanel) {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, isPanel, messages.length]);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  const send = async () => {
    if (!user) {
      toast.message("Sign in to message the organizer");
      return;
    }
    const body = text.trim();
    if (!body && !photo) return;
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (photo) {
        image_url = await uploadPublicImage(photo, "messages");
      }

      const row = {
        organizer_id: organizerId,
        user_id: user.id,
        body: body || (image_url ? "📷 Photo" : ""),
        image_url,
        is_from_organizer: false,
        sender_name: displayName,
        read_by_organizer: false,
        read_by_user: true,
      };

      const { error } = await supabase.from("organizer_messages").insert(row);
      if (error) {
        const { error: e2 } = await supabase.from("platform_messages").insert({
          user_id: user.id,
          body: `[org:${organizerId}] ${body || "📷 Photo"}`,
          is_from_admin: false,
          read_by_admin: false,
          read_by_user: true,
        });
        if (e2) throw e2;
      }
      setText("");
      setPhoto(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      if (sameDay) {
        return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const chatBody = (
    <div
      className={cn(
        "flex flex-col overflow-hidden border border-white/10 bg-[#0e0e10]",
        isPanel
          ? "h-[min(70vh,560px)] w-full rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
          : "h-[min(92vh,560px)] w-full max-w-md rounded-t-3xl shadow-2xl sm:rounded-3xl",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-sky-500/10 via-transparent to-violet-500/10 px-4 py-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10">
          {organizerLogo ? (
            <img src={organizerLogo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-sky-200">
              {(organizerName || "?").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{organizerName}</p>
          <p className="text-[11px] text-neutral-500">
            Direct line · you appear as {displayName}
          </p>
        </div>
        {!isPanel && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {!user && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5">
              <Lock className="h-5 w-5 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-300">Sign in to message this organizer</p>
            <Link
              to="/auth"
              className="rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-400"
            >
              Sign in
            </Link>
          </div>
        )}

        {user && loading && messages.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        )}

        {user && !loading && messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <MessageCircle className="h-8 w-8 text-neutral-600" />
            <p className="text-sm font-medium text-neutral-300">Start the conversation</p>
            <p className="max-w-[220px] text-xs text-neutral-500">
              Messages go directly to {organizerName}. Only you and the organizer team can see this thread.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const mine = !m.is_from_organizer;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[82%] space-y-1 rounded-2xl px-3 py-2 text-sm shadow-sm",
                  mine
                    ? "rounded-br-md bg-sky-500 text-white"
                    : "rounded-bl-md border border-white/10 bg-white/[0.06] text-neutral-100",
                )}
              >
                {!mine && m.sender_name && (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
                    {m.sender_name}
                  </p>
                )}
                {m.image_url && (
                  <img
                    src={m.image_url}
                    alt=""
                    className="mb-1 max-h-48 w-full rounded-xl object-cover"
                  />
                )}
                {m.body && m.body !== "📷 Photo" && (
                  <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
                )}
                <p
                  className={cn(
                    "text-right text-[10px]",
                    mine ? "text-white/70" : "text-neutral-500",
                  )}
                >
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 bg-[#0a0a0c] px-3 py-3">
        {!user ? (
          <p className="text-center text-xs text-neutral-500">Sign in to send a message</p>
        ) : (
          <>
            {preview && (
              <div className="mb-2 flex items-center gap-2">
                <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-white/10" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="text-xs font-medium text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-neutral-400 transition hover:border-white/20 hover:text-neutral-200"
                aria-label="Add photo"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhoto(f);
                  e.target.value = "";
                }}
              />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={`Message ${organizerName}…`}
                className="min-h-10 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-sky-400/40"
              />
              <Button
                size="icon"
                disabled={busy || (!text.trim() && !photo)}
                onClick={() => void send()}
                className="h-10 w-10 shrink-0 bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (isPanel) {
    return chatBody;
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={
        mode === "fab"
          ? "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-black shadow-xl ring-1 ring-white/20"
          : "relative inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-white/15"
      }
      aria-label={`Message ${organizerName}`}
    >
      <MessageCircle className={mode === "fab" ? "h-6 w-6" : "h-3.5 w-3.5"} />
      {mode === "button" && <span>Message</span>}
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );

  return (
    <>
      {trigger}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          {chatBody}
        </div>
      )}
    </>
  );
}
