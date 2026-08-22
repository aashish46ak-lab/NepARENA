/**
 * Classic liquid navigation (Ilmah / CodingLab style).
 * White circle sits on the bar with curved notches; active icon lifts into the circle.
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

/** Matches reference: ~70px bar, ~70px circle, top -50% */
const BAR_H = 70;
const CIRCLE = 58;
/** Page / shell background — used for circle border + notch curves */
const PAGE_BG = "#0a0a0c";
const NAV_BG = "#1a1b24";
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

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
      className="relative flex w-full items-center justify-center overflow-visible"
      style={{ height: BAR_H }}
    >
      {/*
        Liquid indicator — white circle + side notches (box-shadow curves).
        top: -50% of circle height so it rests half above the bar (classic look).
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-[1] will-change-transform"
        style={{
          width: CIRCLE,
          height: CIRCLE,
          top: -CIRCLE / 2,
          left: 0,
          transform: `translate3d(${circleLeft}px, 0, 0)`,
          opacity: ready ? 1 : 0,
          transition: ready
            ? `transform 0.5s ${EASE}, opacity 0.2s ease`
            : "none",
        }}
      >
        {/* White disc */}
        <div
          className="absolute inset-0 rounded-full bg-white"
          style={{
            border: `6px solid ${PAGE_BG}`,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        />
        {/* Left notch curve */}
        <span
          className="absolute"
          style={{
            top: "48%",
            left: -20,
            width: 20,
            height: 20,
            background: "transparent",
            borderTopRightRadius: 20,
            boxShadow: `1px -10px 0 0 ${PAGE_BG}`,
          }}
        />
        {/* Right notch curve */}
        <span
          className="absolute"
          style={{
            top: "48%",
            right: -20,
            width: 20,
            height: 20,
            background: "transparent",
            borderTopLeftRadius: 20,
            boxShadow: `-1px -10px 0 0 ${PAGE_BG}`,
          }}
        />
      </div>

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
            className="relative z-10 flex h-full flex-1 flex-col items-center justify-center"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {/* Icon — lifts into white circle when active */}
            <span
              className="relative flex items-center justify-center will-change-transform"
              style={{
                width: 28,
                height: 28,
                transform: active ? "translateY(-32px)" : "translateY(0)",
                transition: `transform 0.5s ${EASE}`,
              }}
            >
              <Icon
                className="transition-colors duration-300"
                style={{
                  width: 22,
                  height: 22,
                  strokeWidth: active ? 2.35 : 2,
                  color: active ? NAV_BG : "rgba(255,255,255,0.55)",
                }}
              />
              {"badge" in tab && tab.badge && msgUnread > 0 && (
                <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-sky-500 px-0.5 text-[8px] font-bold text-white">
                  {msgUnread > 9 ? "9+" : msgUnread}
                </span>
              )}
            </span>

            {/* Label — only fully visible when active (reference style) */}
            <span
              className="absolute text-[10px] font-medium leading-none will-change-transform"
              style={{
                bottom: 10,
                color: active ? "#ffffff" : "transparent",
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(6px)",
                transition: `opacity 0.4s ${EASE}, transform 0.4s ${EASE}, color 0.3s ease`,
              }}
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
    "pb-[calc(0.75rem+10px+env(safe-area-inset-bottom,0px))]";

  const shellClass =
    "overflow-visible rounded-[18px] " +
    "shadow-[0_15px_25px_rgba(0,0,0,0.35)]";

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
        <div className="pointer-events-auto relative z-50 pt-10">
          {!islandOpen ? (
            <button
              type="button"
              onClick={() => setIslandOpen(true)}
              className="grid h-12 w-12 place-items-center rounded-full border border-white/10 transition hover:scale-105 active:scale-95"
              style={{ background: NAV_BG }}
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
              style={{ background: NAV_BG }}
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
      <div className="pointer-events-auto w-full max-w-[22rem] pt-10">
        <div className={shellClass} style={{ background: NAV_BG }}>
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
