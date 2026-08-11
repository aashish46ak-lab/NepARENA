import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, X, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

type Msg = {
  id: string;
  body: string;
  image_url: string | null;
  is_from_organizer: boolean;
  created_at: string;
  sender_name: string | null;
};

/**
 * Messenger-style chat with an organizer.
 * Uses organizer_messages table when available; falls back to platform_messages
 * with an [org:id] prefix so data is never lost.
 */
export function OrganizerChat({
  organizerId,
  organizerName,
  mode = "button",
}: {
  organizerId: string;
  organizerName: string;
  mode?: "button" | "fab";
}) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
    // Prefer dedicated table
    const { data, error } = await supabase
      .from("organizer_messages")
      .select("id, body, image_url, is_from_organizer, created_at, sender_name")
      .eq("organizer_id", organizerId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(80);

    if (!error && data) {
      setMessages(data as Msg[]);
      const unreadCount = (data as Msg[]).filter(
        (m) => m.is_from_organizer && !(m as Msg & { read_by_user?: boolean }).read_by_user,
      ).length;
      // Count organizer messages not yet acknowledged client-side
      setUnread(
        (data as Msg[]).filter((m) => m.is_from_organizer).length > 0 && !open
          ? Math.min(
              (data as Msg[]).filter((m) => m.is_from_organizer).length,
              99,
            )
          : 0,
      );
      if (open) setUnread(0);
      return;
    }

    // Fallback: platform_messages tagged with org id
    const { data: fb } = await supabase
      .from("platform_messages")
      .select("id, body, is_from_admin, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(80);
    const tagged = (fb ?? [])
      .filter((m: { body: string }) =>
        m.body.startsWith(`[org:${organizerId}]`),
      )
      .map(
        (m: {
          id: string;
          body: string;
          is_from_admin: boolean;
          created_at: string;
        }) => ({
          id: m.id,
          body: m.body.replace(`[org:${organizerId}] `, ""),
          image_url: null as string | null,
          is_from_organizer: m.is_from_admin,
          created_at: m.created_at,
          sender_name: null as string | null,
        }),
      );
    setMessages(tagged);
    if (!open) {
      setUnread(tagged.filter((m) => m.is_from_organizer).length ? 1 : 0);
    }
  }, [user, organizerId, open]);

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
    if (open) {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages.length]);

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
        // Fallback without dedicated table
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
          <div className="flex h-[min(92vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0e0e0e] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-neutral-100">
                  {organizerName}
                </p>
                <p className="text-[11px] text-neutral-500">
                  Messenger · appears as {displayName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {!user && (
                <p className="rounded-xl bg-white/5 p-3 text-sm text-neutral-400">
                  Sign in to message this organizer.
                </p>
              )}
              {user && messages.length === 0 && (
                <p className="py-8 text-center text-xs text-neutral-500">
                  No messages yet — say hello 👋
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.is_from_organizer
                      ? "bg-white/10 text-neutral-100"
                      : "ml-auto bg-neutral-200 text-black"
                  }`}
                >
                  {m.image_url && (
                    <img
                      src={m.image_url}
                      alt=""
                      className="mb-1.5 max-h-40 rounded-lg object-cover"
                    />
                  )}
                  {m.body && m.body !== "📷 Photo" && <p>{m.body}</p>}
                  <p
                    className={`mt-1 text-[10px] ${
                      m.is_from_organizer
                        ? "text-neutral-500"
                        : "text-black/50"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 p-3">
              {!user ? (
                <Button asChild className="w-full bg-neutral-100 text-black">
                  <Link to="/auth">Sign in to send</Link>
                </Button>
              ) : (
                <>
                  {preview && (
                    <div className="mb-2 flex items-center gap-2">
                      <img
                        src={preview}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="text-xs text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-neutral-400 hover:text-neutral-200"
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
                      placeholder="Message…"
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-white/25"
                    />
                    <Button
                      size="icon"
                      disabled={busy}
                      onClick={() => void send()}
                      className="h-10 w-10 shrink-0 bg-neutral-100 text-black"
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
        </div>
      )}
    </>
  );
}
