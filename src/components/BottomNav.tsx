/**
 * Liquid floating-circle bottom nav.
 * Circle slides tab→tab with a wave arc; small air gap above the bar.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, MessageCircle, Gamepad2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const BAR_H = 68;
const CIRCLE = 54;
/** Air gap between circle bottom and bar top — floating feel */
const AIR_GAP = 8;
/** Circle top = -(circle + gap) so it sits fully above the bar with space */
const CIRCLE_TOP = -(CIRCLE + AIR_GAP);
/**
 * Icon lift: from resting position up into circle center.
 * Circle center Y relative to bar top = CIRCLE_TOP + CIRCLE/2
 */
const ICON_LIFT = 38;

/** Wave horizontal ease — overshoot then settle */
const EASE_X = "cubic-bezier(0.34, 1.4, 0.64, 1)";

function LiquidNavBar({
  pathname,
  userId,
  msgUnread,
  onNavigate,
}: {
  pathname: string;
  userId?: string;
  msgUnread: number;
  onNavigate?: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [circleLeft, setCircleLeft] = useState(0);
  const [ready, setReady] = useState(false);
  const [waveUp, setWaveUp] = useState(false);
  const prevIndex = useRef(-1);

  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.match(pathname)),
  );

  const measure = () => {
    const track = trackRef.current;
    const el = itemRefs.current[activeIndex];
    if (!track || !el) return;
    const t = track.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const center = r.left - t.left + r.width / 2;
    setCircleLeft(center - CIRCLE / 2);
    setReady(true);
  };

  useLayoutEffect(() => {
    if (prevIndex.current >= 0 && prevIndex.current !== activeIndex) {
      setWaveUp(true);
      const t = window.setTimeout(() => setWaveUp(false), 320);
      prevIndex.current = activeIndex;
      measure();
      const id = requestAnimationFrame(measure);
      return () => {
        clearTimeout(t);
        cancelAnimationFrame(id);
      };
    }
    prevIndex.current = activeIndex;
    measure();
    const id = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, activeIndex]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <div
      ref={trackRef}
      className="navigation relative flex w-full items-stretch overflow-visible px-1.5"
      style={{ height: BAR_H }}
    >
      {/* Floating white circle — slides from previous tab, waves up mid-travel */}
      <div
        aria-hidden
        className={cn(
          "indicator pointer-events-none absolute z-[2] rounded-full bg-white",
          "border-[5px] border-[#0a0a0c]",
          "shadow-[0_10px_28px_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.2)]",
          "will-change-transform",
        )}
        style={{
          width: CIRCLE,
          height: CIRCLE,
          top: CIRCLE_TOP,
          left: 0,
          transform: `translate3d(${circleLeft}px, ${waveUp ? -10 : 0}px, 0)`,
          opacity: ready ? 1 : 0,
          transition: ready
            ? [`transform 0.55s ${EASE_X}`, `opacity 0.2s ease`].join(", ")
            : "none",
        }}
      />

      {TABS.map((tab, i) => {
        const active = i === activeIndex;
        const Icon = tab.icon;
        const href =
          tab.to === "/profile" && userId
            ? { to: "/members/$id" as const, params: { id: userId } }
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
            ref={(node) => {
              itemRefs.current[i] = node;
            }}
            {...(href as { to: string; params?: { id: string } })}
            data-onboard={onboard}
            onClick={() => onNavigate?.()}
            className={cn(
              "relative z-10 flex flex-1 flex-col items-center justify-end",
              "pb-2.5 transition-colors duration-300",
            )}
          >
            <span
              className="relative flex items-center justify-center will-change-transform"
              style={{
                width: 28,
                height: 28,
                transform: active
                  ? `translate3d(0, -${ICON_LIFT}px, 0)`
                  : "translate3d(0, 0, 0)",
                transition: `transform 0.55s ${EASE_X}`,
              }}
            >
              <Icon
                className={cn(
                  "icon transition-colors duration-300",
                  active ? "text-[#141724]" : "text-neutral-500",
                )}
                style={{
                  width: 22,
                  height: 22,
                  strokeWidth: active ? 2.4 : 2,
                }}
              />
              {"badge" in tab && tab.badge && msgUnread > 0 && (
                <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-sky-500 px-0.5 text-[8px] font-bold text-white">
                  {msgUnread > 9 ? "9+" : msgUnread}
                </span>
              )}
            </span>

            <span
              className={cn(
                "mt-0.5 text-[10px] font-medium leading-none transition-colors duration-300",
                active ? "text-white" : "text-neutral-500",
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [msgUnread, setMsgUnread] = useState(0);
  const [islandOpen, setIslandOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      setChatOpen(document.body.getAttribute("data-mobile-chat") === "1");
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-mobile-chat"],
    });
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
          (acc: number, r: { unread_count?: number | null }) =>
            acc + (Number(r.unread_count) || 0),
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_messages" },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user?.id]);

  useEffect(() => {
    setIslandOpen(false);
  }, [pathname]);

  if (chatOpen) return null;
  if (pathname.startsWith("/auth") || pathname.startsWith("/reset-password"))
    return null;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/platform"))
    return null;
  if (
    pathname.startsWith("/games/") &&
    pathname !== "/games/" &&
    pathname !== "/games"
  )
    return null;
  if (pathname.startsWith("/vote/")) return null;
  if (pathname.startsWith("/admin/tournaments")) return null;

  const isOwnProfile = !!user?.id && pathname === `/members/${user.id}`;
  const useIsland =
    !isOwnProfile &&
    (pathname.startsWith("/o/") ||
      pathname.startsWith("/members/") ||
      (pathname.startsWith("/tournaments/") && pathname !== "/tournaments") ||
      pathname.startsWith("/hall-of-fame") ||
      pathname.startsWith("/history") ||
      pathname.startsWith("/gallery") ||
      pathname.startsWith("/about"));

  const bottomPad =
    "pb-[calc(0.85rem+12px+env(safe-area-inset-bottom,0px))]";

  const shellClass =
    "overflow-visible rounded-[28px] border border-white/10 " +
    "bg-[#141724] shadow-[0_12px_36px_rgba(0,0,0,0.55)]";

  if (useIsland) {
    return (
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3",
          bottomPad,
        )}
      >
        {islandOpen && (
          <button
            type="button"
            className="pointer-events-auto fixed inset-0 z-40 bg-black/35 backdrop-blur-[3px] animate-in fade-in duration-200"
            aria-label="Close navigation"
            onClick={() => setIslandOpen(false)}
          />
        )}
        <div className="pointer-events-auto relative z-50 pt-12">
          {!islandOpen ? (
            <button
              type="button"
              onClick={() => setIslandOpen(true)}
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full transition hover:scale-105 active:scale-95",
                "border border-white/15 bg-[#141724] shadow-[0_8px_28px_rgba(0,0,0,0.55)]",
              )}
              aria-label="Open navigation"
            >
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white/85 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/55" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              </span>
            </button>
          ) : (
            <div
              className={cn(
                "w-[min(100vw-1.5rem,22rem)] animate-in fade-in zoom-in-95 duration-200",
                shellClass,
              )}
            >
              <LiquidNavBar
                pathname={pathname}
                userId={user?.id}
                msgUnread={msgUnread}
                onNavigate={() => setIslandOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <nav
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3",
        bottomPad,
      )}
      aria-label="Main"
      data-onboard="bottom-nav"
    >
      <div className={cn("pointer-events-auto w-full max-w-[22rem] pt-12")}>
        <div className={shellClass}>
          <LiquidNavBar
            pathname={pathname}
            userId={user?.id}
            msgUnread={msgUnread}
          />
        </div>
      </div>
    </nav>
  );
}
