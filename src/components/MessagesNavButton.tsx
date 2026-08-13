import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { listDmThreads } from "@/lib/dm";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Messages button for sticky search row — red badge + pulse when unread */
export function MessagesNavButton({ className }: { className?: string }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const threads = await listDmThreads(user.id);
      if (cancelled) return;
      setUnread(threads.reduce((s, t) => s + (t.unread || 0), 0));
    };
    void tick();
    const id = window.setInterval(tick, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);

  if (!user) return null;

  return (
    <Link
      to="/messages"
      className={cn(
        "relative flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-sm font-medium text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.07]",
        unread > 0 && "border-rose-500/40 bg-rose-500/10",
        className,
      )}
      aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
    >
      <span className="relative">
        <MessageCircle className={cn("h-4 w-4", unread > 0 && "text-rose-300")} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
        )}
      </span>
      <span className="hidden sm:inline">Messages</span>
      {unread > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
