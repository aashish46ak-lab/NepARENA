import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { MessageCircle, Send, X, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadPublicImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  body: string | null;
  image_url: string | null;
  is_from_organizer: boolean;
  created_at: string;
  read_by_user: boolean | null;
};

/**
 * Messenger-style chat with this organizer.
 * Table: organizer_messages (organizer_id, user_id, body, image_url,
 * is_from_organizer, read_by_user, read_by_organizer, sender_name).
 */
export function OrganizerChatFab({
  organizerId,
  organizerName,
  organizerLogo,
}: {
  organizerId: string;
  organizerName: string;
  organizerLogo?: string | null;
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
    profile?.full_name || profile?.username || user?.email?.split("@")[0] || "Player";

  async function load() {
    if (!user) return;
    const { data, error } = await supabase
      .from("organizer_messages")
      .select("id, body, image_url, is_from_organizer, created_at, read_by_user")
      .eq("organizer_id", organizerId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(80);
    if (error) {
      console.warn("organizer_messages:", error.message);
      return;
    }
    const rows = (data as Msg[]) ?? [];
    setMessages(rows);
    setUnread(rows.filter((m) => m.is_from_organizer && !m.read_by_user).length);
  }

  async function markRead() {
    if (!user) return;
    await supabase
      .from("organizer_messages")
      .update({ read_by_user: true })
      .eq("organizer_id", organizerId)
      .eq("user_id", user.id)
      .eq("is_from_organizer", true)
      .eq("read_by_user", false);
    setUnread(0);
  }

  useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel(`org-chat-${organizerId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organizer_messages",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, organizerId]);

  useEffect(() => {
    if (open && user) {
      void markRead();
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messages.length]);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function send() {
    if (!user) {
      toast.message("Sign in to message " + organizerName);
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
      const { error } = await supabase.from("organizer_messages").insert({
        organizer_id: organizerId,
        user_id: user.id,
        body: body || null,
        image_url,
        is_from_organizer: false,
        read_by_organizer: false,
        read_by_user: true,
        sender_name: displayName,
      });
      if (error) throw error;
      setText("");
      setPhoto(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-white/15"
        aria-label={`Message ${organizerName}`}
      >
        <MessageCircle className="h-4 w-4" />
        Message
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
          <div className="flex h-[min(92vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0f0f0f] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              {organizerLogo ? (
                <img
                  src={organizerLogo}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-700 text-xs font-bold">
                  {organizerName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{organizerName}</p>
                <p className="text-[11px] text-neutral-500">Messages</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {!user && (
                <p className="rounded-xl bg-white/5 p-3 text-sm text-neutral-400">
                  Sign in to message {organizerName}. Your saved name will be used.
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
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2 text-sm",
                    m.is_from_organizer
                      ? "bg-white/10 text-neutral-100"
                      : "ml-auto bg-sky-500/90 text-white",
                  )}
                >
                  {m.image_url && (
                    <img
                      src={m.image_url}
                      alt=""
                      className="mb-1.5 max-h-40 w-full rounded-xl object-cover"
                    />
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      m.is_from_organizer ? "text-neutral-500" : "text-white/70",
                    )}
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
                <div className="space-y-2">
                  {preview && (
                    <div className="relative inline-block">
                      <img
                        src={preview}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-neutral-400 hover:text-white"
                      aria-label="Add photo"
                    >
                      <ImagePlus className="h-5 w-5" />
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
                      placeholder={`Message as ${displayName}…`}
                      className="min-h-10 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
                    />
                    <Button
                      size="icon"
                      disabled={busy}
                      onClick={() => void send()}
                      className="h-10 w-10 shrink-0 bg-sky-500 text-white hover:bg-sky-400"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
