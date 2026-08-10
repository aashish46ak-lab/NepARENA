import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Floating Chat with Admin on platform pages. Guests see; login required to send. */
export function AdminChatFab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; body: string; is_from_admin: boolean; created_at: string }[]
  >([]);

  useEffect(() => {
    if (!open || !user) return;
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
  }, [open, user?.id]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("platform_messages")
      .select("id, body, is_from_admin, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50);
    setMessages((data as typeof messages) ?? []);
  }

  async function send() {
    if (!user) {
      toast.message("Sign in to message admins");
      return;
    }
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase.from("platform_messages").insert({
      user_id: user.id,
      body,
      is_from_admin: false,
      read_by_admin: false,
      read_by_user: true,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    void load();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-400 text-black shadow-xl ring-1 ring-white/20"
        aria-label="Chat with Admin"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[420px] w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Chat with Admin</p>
              <p className="text-[11px] text-neutral-500">NepARENA support</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-neutral-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {!user && (
              <p className="rounded-xl bg-white/5 p-3 text-sm text-neutral-400">
                Guests can view this chat. Sign in to send a message to platform admins.
              </p>
            )}
            {user && messages.length === 0 && (
              <p className="text-center text-xs text-neutral-500">No messages yet</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.is_from_admin
                    ? "bg-white/10 text-neutral-100"
                    : "ml-auto bg-neutral-200 text-black"
                }`}
              >
                {m.body}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-3">
            {!user ? (
              <Button asChild className="w-full bg-neutral-100 text-black">
                <Link to="/auth">Sign in to send</Link>
              </Button>
            ) : (
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void send();
                  }}
                  placeholder="Write a message…"
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
                />
                <Button
                  size="icon"
                  disabled={busy}
                  onClick={() => void send()}
                  className="bg-neutral-100 text-black"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
