import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { MessageCircle, Send, X, ImagePlus, Loader2, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadPublicImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  body: string | null;
  image_url: string | null;
  is_from_admin: boolean;
  created_at: string;
  read_by_user: boolean | null;
  read_by_admin: boolean | null;
};

/** Floating Chat with NepARENA platform admins. Photo + unread badge. */
export function AdminChatFab() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayName =
    profile?.full_name || profile?.username || user?.email?.split("@")[0] || "Player";

  async function load() {
    if (!user) return;
    const { data, error } = await supabase
      .from("platform_messages")
      .select("id, body, image_url, is_from_admin, created_at, read_by_user, read_by_admin")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(80);
    if (error) {
      const { data: d2 } = await supabase
        .from("platform_messages")
        .select("id, body, is_from_admin, created_at, read_by_user, read_by_admin")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(80);
      const rows = ((d2 as Msg[]) ?? []).map((m) => ({
        ...m,
        image_url: null,
      }));
      setMessages(rows);
      setUnread(rows.filter((m) => m.is_from_admin && !m.read_by_user).length);
      return;
    }
    const rows = (data as Msg[]) ?? [];
    setMessages(rows);
    setUnread(rows.filter((m) => m.is_from_admin && !m.read_by_user).length);
  }

  async function markRead() {
    if (!user) return;
    await supabase
      .from("platform_messages")
      .update({ read_by_user: true })
      .eq("user_id", user.id)
      .eq("is_from_admin", true)
      .eq("read_by_user", false);
    setUnread(0);
  }

  useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel(`platform-chat-${user.id}`)
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
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      toast.message("Sign in to message NepARENA");
      return;
    }
    const body = text.trim();
    if (!body && !photo) return;
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (photo) {
        image_url = await uploadPublicImage(photo, "avatars", { folder: "messages" });
      }
      const payload: Record<string, unknown> = {
        user_id: user.id,
        body: body || (image_url ? "📷 Photo" : null),
        is_from_admin: false,
        read_by_admin: false,
        read_by_user: true,
        sender_name: displayName,
      };
      if (image_url) payload.image_url = image_url;
      const { error } = await supabase.from("platform_messages").insert(payload);
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
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-400 text-black shadow-xl ring-1 ring-white/20"
        aria-label="Chat with NepARENA"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(92vh,480px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <img
              src="/neparena-logo.png"
              alt=""
              className="h-9 w-9 rounded-full object-contain bg-black ring-1 ring-white/20"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">NepARENA</p>
              <p className="text-[11px] text-neutral-500">Platform support</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-neutral-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {!user && (
              <p className="rounded-xl bg-white/5 p-3 text-sm text-neutral-400">
                Sign in to message platform admins. Your saved name will be shown.
              </p>
            )}
            {user && messages.length === 0 && (
              <p className="py-8 text-center text-xs text-neutral-500">No messages yet</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.is_from_admin
                    ? "bg-white/10 text-neutral-100"
                    : "ml-auto bg-neutral-200 text-black",
                )}
              >
                {m.image_url && (
                  <button type="button" className="mb-1.5 block w-full" onClick={() => setLightbox(m.image_url)}>
                    <img
                      src={m.image_url}
                      alt=""
                      className="max-h-36 w-full rounded-xl object-cover"
                    />
                  </button>
                )}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {!m.is_from_admin && (
                  <p className="mt-1 flex items-center justify-end gap-0.5 text-[10px] opacity-70">
                    {m.read_by_admin ? (
                      <><CheckCheck className="h-3 w-3" /> Seen</>
                    ) : (
                      <><Check className="h-3 w-3" /> Delivered</>
                    )}
                  </p>
                )}
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
                    <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
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
                    accept="image/*,video/*"
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
                    placeholder={`As ${displayName}…`}
                    className="min-h-10 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
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
              </div>
            )}
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" onClick={() => setLightbox(null)}>
            <X className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
