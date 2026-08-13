import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { formatMsgTime, listDmThreads, type DmThread } from "@/lib/dm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";

/** Recent conversations under homepage hero — Messenger style */
export function HomeMessagesPreview() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<DmThread[]>([]);

  useEffect(() => {
    if (!user) return;
    void listDmThreads(user.id).then(setThreads);
    const t = window.setInterval(() => {
      void listDmThreads(user.id).then(setThreads);
    }, 20000);
    return () => clearInterval(t);
  }, [user?.id]);

  if (!user) return null;

  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            <MessageCircle className="h-4 w-4" /> Messages
          </h2>
          <Link to="/messages" className="text-xs font-medium text-sky-400 hover:text-sky-300">
            Open inbox
          </Link>
        </div>

        {threads.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-neutral-500">
            No chats yet. Find a player and tap Message.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            {threads.slice(0, 5).map((t) => (
              <Link
                key={t.conversation_id}
                to="/messages"
                search={{ c: t.conversation_id }}
                className="flex items-center gap-3 border-b border-white/5 px-3 py-3 last:border-0 hover:bg-white/[0.04]"
              >
                <div className="relative">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={t.peer_avatar ?? undefined} />
                    <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {t.unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-sky-400 ring-2 ring-[#0a0a0a]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{t.peer_name}</p>
                    <span className="shrink-0 text-[10px] text-neutral-500">
                      {formatMsgTime(t.last_at)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-neutral-500">{t.last_body || "Conversation"}</p>
                </div>
                {t.unread > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white">
                    {t.unread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
