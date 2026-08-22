/**
 * Classic liquid navigation.
 * Smooth tab→tab circle slide; active icon optically centered in the white disc.
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

const BAR_H = 70;
const CIRCLE = 58;
/** Lift icon so its visual center sits in the circle center (circle center ≈ bar top) */
const ICON_LIFT = 37;
const PAGE_BG = "#0a0a0c";
const NAV_BG = "#1a1b24";
/** Smooth, no-overshoot ease — avoids sticky feel */
const EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const DURATION_MS = 480;

/** Survives remounts — prevents jump-to-Home */
let cachedCircleLeft: number | null = null;
let cachedActiveIndex = 0;

function resolveActiveIndex(pathname: string): number {
  const idx = TABS.findIndex((t) => t.match(pathname));
  return idx >= 0 ? idx : cachedActiveIndex;
}

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
  const [circleLeft, setCircleLeft] = useState(() => cachedCircleLeft ?? 0);
  const [positioned, setPositioned] = useState(() => cachedCircleLeft != null);
  const [animate, setAnimate] = useState(() => cachedCircleLeft != null);
  const activeIndex = resolveActiveIndex(pathname);
  const lastLeft = useRef(cachedCircleLeft ?? 0);

  const measure = () => {
    const track = trackRef.current;
    const el = itemRefs.current[activeIndex];
    if (!track || !el) return false;
    const t = track.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.width < 1) return false;
    const next = r.left - t.left + r.width / 2 - CIRCLE / 2;
    // Skip tiny updates that restart CSS transitions (jank source)
    if (Math.abs(next - lastLeft.current) < 0.75 && positioned) {
      return true;
    }
    lastLeft.current = next;
    cachedCircleLeft = next;
    cachedActiveIndex = activeIndex;
    setCircleLeft(next);
    setPositioned(true);
    return true;
  };

  useLayoutEffect(() => {
    const hadPrior = cachedCircleLeft != null;
    // Enable animation BEFORE writing the new left so the browser interpolates
    setAnimate(hadPrior);
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, activeIndex]);

  useEffect(() => {
    const onResize = () => {
      setAnimate(false);
      measure();
      window.setTimeout(() => setAnimate(true), 50);
    };
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
      <div
        aria-hidden
        className="pointer-events-none absolute z-[1]"
        style={{
          width: CIRCLE,
          height: CIRCLE,
          top: -CIRCLE / 2,
          left: 0,
          transform: `translate3d(${circleLeft}px, 0, 0)`,
          opacity: positioned ? 1 : 0,
          transition: animate
            ? `transform ${DURATION_MS}ms ${EASE}`
            : "none",
          willChange: animate ? "transform" : "auto",
        }}
      >
        <div
          className="absolute inset-0 rounded-full bg-white"
          style={{
            border: `6px solid ${PAGE_BG}`,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        />
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
            <span
              className="absolute left-1/2 flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                top: "50%",
                marginTop: -14,
                marginLeft: -14,
                transform: active
                  ? `translate3d(0, -${ICON_LIFT}px, 0)`
                  : "translate3d(0, 0, 0)",
                transition: `transform ${DURATION_MS}ms ${EASE}`,
                willChange: "transform",
              }}
            >
              <Icon
                style={{
                  width: 22,
                  height: 22,
                  strokeWidth: active ? 2.35 : 2,
                  color: active ? NAV_BG : "rgba(255,255,255,0.55)",
                  transition: `color ${DURATION_MS}ms ${EASE}`,
                }}
              />
              {"badge" in tab && tab.badge && msgUnread > 0 && (
                <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-sky-500 px-0.5 text-[8px] font-bold text-white">
                  {msgUnread > 9 ? "9+" : msgUnread}
                </span>
              )}
            </span>

            <span
              className="absolute text-[10px] font-medium leading-none"
              style={{
                bottom: 10,
                color: active ? "#ffffff" : "transparent",
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(4px)",
                transition: `opacity ${DURATION_MS}ms ${EASE}, transform ${DURATION_MS}ms ${EASE}`,
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
