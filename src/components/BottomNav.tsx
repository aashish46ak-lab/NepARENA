/**
 * Compact floating glass bottom nav — levitated ~0.6in, slightly larger touch targets.
 * Island mode on organizer profiles, member profiles, tournaments, etc.
 * Fully hidden when a mobile chat overlay is open (body[data-mobile-chat]).
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, MessageCircle, Gamepad2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const TABS = [
  { to: "/" as const, label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    to: "/organizers" as const,
    label: "Organizers",
    icon: Building2,
    match: (p: string) =>
      p.startsWith("/organizers") || p.startsWith("/become-organizer"),
  },
  {
    to: "/messages" as const,
    label: "Messages",
    icon: MessageCircle,
    match: (p: string) => p.startsWith("/messages"),
    badge: true,
  },
  {
    to: "/games" as const,
    label: "Games",
    icon: Gamepad2,
    match: (p: string) => p === "/games" || p === "/games/",
  },
  {
    to: "/profile" as const,
    label: "Profile",
    icon: User,
    match: (p: string) => p === "/profile" || p.startsWith("/members/"),
  },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [msgUnread, setMsgUnread] = useState(0);
  const [islandOpen, setIslandOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Hide completely while mobile DM chat overlay is open
  useEffect(() => {
    const check = () => {
      setChatOpen(document.body.getAttribute("data-mobile-chat") === "1");
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-mobile-chat"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setMsgUnread(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("dm_threads")
          .select("id, unread_count")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .eq("status", "active");
        if (cancelled) return;
        const total = (data ?? []).reduce(
          (acc: number, r: { unread_count?: number | null }) => acc + (Number(r.unread_count) || 0),
          0,
        );
        setMsgUnread(total);
      } catch {
        /* ignore */
      }
    };
    void load();
    const ch = supabase
      .channel("bottom-nav-dm-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, () => void load())
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user?.id]);

  useEffect(() => {
    setIslandOpen(false);
  }, [pathname]);

  // Fully hide bottom nav on auth / admin / game detail / open mobile chat
  if (chatOpen) return null;
  if (pathname.startsWith("/auth") || pathname.startsWith("/reset-password")) return null;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/platform")) return null;
  if (pathname.startsWith("/games/") && pathname !== "/games/" && pathname !== "/games") return null;
  if (pathname.startsWith("/vote/")) return null;
  if (pathname.startsWith("/admin/tournaments")) return null;

  const isOwnProfile = !!user?.id && pathname === `/members/${user.id}`;
  // Island (floating circle → expand) on deep pages including organizer profiles
  const useIsland =
    !isOwnProfile &&
    (pathname.startsWith("/o/") ||
      pathname.startsWith("/members/") ||
      (pathname.startsWith("/tournaments/") && pathname !== "/tournaments") ||
      pathname.startsWith("/hall-of-fame") ||
      pathname.startsWith("/history") ||
      pathname.startsWith("/gallery") ||
      pathname.startsWith("/about"));

  // Levitated ~0.6 inch from bottom for floating feel
  const bottomPad = "pb-[calc(0.95rem+16px+env(safe-area-inset-bottom,0px))]";

  const navInner = (
    <>
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        const href =
          tab.to === "/profile" && user
            ? { to: "/members/$id" as const, params: { id: user.id } }
            : { to: tab.to };
        const onboard =
          tab.label === "Home"
            ? "feed"
            : tab.label === "Organizers"
              ? "organizers"
              : tab.label === "Messages"
                ? "messages"
                : tab.label === "Games"
                  ? "games"
                  : tab.label === "Profile"
                    ? "profile"
                    : undefined;
        return (
          <Link
            key={tab.label}
            {...(href as { to: string; params?: { id: string } })}
            data-onboard={onboard}
            onClick={() => setIslandOpen(false)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0 rounded-xl py-2 transition-all duration-200",
              active
                ? "bg-white/10 text-white"
                : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300",
            )}
          >
            <span className="relative">
              <Icon className={cn("h-[20px] w-[20px]", active && "stroke-[2.25px]")} />
              {"badge" in tab && tab.badge && msgUnread > 0 && (
                <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-sky-500 px-0.5 text-[8px] font-bold text-white">
                  {msgUnread > 9 ? "9+" : msgUnread}
                </span>
              )}
            </span>
            <span className={cn("text-[10px] font-medium leading-tight", active ? "text-white" : "text-neutral-500")}>
              {tab.label}
            </span>
            {active && <span className="absolute -bottom-0.5 h-0.5 w-4 rounded-full bg-sky-400" />}
          </Link>
        );
      })}
    </>
  );

  if (useIsland) {
    return (
      <div className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3", bottomPad)}>
        {islandOpen && (
          <button
            type="button"
            className="pointer-events-auto fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150"
            aria-label="Close navigation"
            onClick={() => setIslandOpen(false)}
          />
        )}
        <div className="pointer-events-auto relative z-50">
          {!islandOpen ? (
            <button
              type="button"
              onClick={() => setIslandOpen(true)}
              className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-[#121214]/92 shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition hover:scale-105 active:scale-95"
              aria-label="Open navigation"
            >
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              </span>
            </button>
          ) : (
            <div className="flex w-[min(100vw-1.5rem,19rem)] items-stretch gap-0.5 rounded-[1.35rem] border border-white/12 bg-[#121214]/94 px-1 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
              {navInner}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <nav
      className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3", bottomPad)}
      aria-label="Main" data-onboard="bottom-nav"
    >
      <div className="pointer-events-auto flex w-full max-w-[21rem] items-stretch gap-0.5 rounded-[1.35rem] border border-white/12 bg-[#121214]/85 px-1 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {navInner}
      </div>
    </nav>
  );
}
