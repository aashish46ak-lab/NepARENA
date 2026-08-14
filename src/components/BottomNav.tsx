/**
 * Floating glass bottom nav.
 * Dynamic Island on other-user / organizer / tournament deep pages.
 * Full bar on main tabs including own Profile.
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
      p.startsWith("/organizers") || p.startsWith("/o/") || p.startsWith("/become-organizer"),
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
    match: (p: string) => p.startsWith("/games") || p.startsWith("/vote"),
  },
  {
    to: "/profile" as const,
    label: "Profile",
    icon: User,
    match: (p: string) =>
      p === "/profile" ||
      p.startsWith("/members/") ||
      p.startsWith("/dashboard") ||
      p.startsWith("/platform"),
  },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [msgUnread, setMsgUnread] = useState(0);
  const [islandOpen, setIslandOpen] = useState(false);

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

  if (pathname.startsWith("/auth") || pathname.startsWith("/reset-password")) return null;

  // Island only on OTHER users' profiles, organizer sites, tournament detail
  const isOwnProfile = !!user?.id && pathname === `/members/${user.id}`;
  const useIsland =
    !isOwnProfile &&
    (pathname.startsWith("/members/") ||
      (pathname.startsWith("/o/") && pathname !== "/organizers") ||
      (pathname.startsWith("/tournaments/") && pathname !== "/tournaments") ||
      pathname.startsWith("/admin/tournaments/"));

  const navInner = (
    <>
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        const href =
          tab.to === "/profile" && user
            ? { to: "/members/$id" as const, params: { id: user.id } }
            : { to: tab.to };
        return (
          <Link
            key={tab.label}
            {...(href as { to: string; params?: { id: string } })}
            onClick={() => setIslandOpen(false)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 transition-all duration-200",
              active
                ? "bg-white/10 text-white"
                : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300",
            )}
          >
            <span className="relative">
              <Icon className={cn("h-[20px] w-[20px]", active && "stroke-[2.25px]")} />
              {"badge" in tab && tab.badge && msgUnread > 0 && (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white">
                  {msgUnread > 9 ? "9+" : msgUnread}
                </span>
              )}
            </span>
            <span className={cn("text-[10px] font-medium", active ? "text-white" : "text-neutral-500")}>
              {tab.label}
            </span>
            {active && <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-sky-400" />}
          </Link>
        );
      })}
    </>
  );

  if (useIsland) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {islandOpen && (
          <button
            type="button"
            className="pointer-events-auto fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={() => setIslandOpen(false)}
          />
        )}
        <div className="pointer-events-auto relative z-50">
          {!islandOpen ? (
            <button
              type="button"
              onClick={() => setIslandOpen(true)}
              className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-[#121214]/90 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition hover:scale-105 active:scale-95"
              aria-label="Open navigation"
            >
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              </span>
            </button>
          ) : (
            <div className="flex w-[min(100vw-1.5rem,20rem)] items-stretch gap-0.5 rounded-[1.5rem] border border-white/12 bg-[#121214]/92 px-1.5 py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
              {navInner}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label="Main"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-stretch gap-0.5 rounded-[1.75rem] border border-white/12 bg-[#121214]/82 px-1.5 py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        {navInner}
      </div>
    </nav>
  );
}
