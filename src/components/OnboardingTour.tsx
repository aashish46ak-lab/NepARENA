/**
 * First-login spotlight tour — circular hole + dim overlay + tooltips.
 * Persisted in localStorage so it runs once per browser.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "neparena_onboarding_done_v1";

type Step = {
  id: string;
  title: string;
  body: string;
  target?: string;
  paths?: string[];
};

const STEPS: Step[] = [
  {
    id: "create",
    title: "Create a post",
    body: "Share updates, photos and announcements with the community.",
    target: "[data-onboard='create-post']",
    paths: ["/"],
  },
  {
    id: "notifications",
    title: "Notifications",
    body: "Likes, follows, messages and tournament alerts land here.",
    target: "[data-onboard='notifications']",
    paths: ["/"],
  },
  {
    id: "feed",
    title: "Your feed",
    body: "Scroll personalized posts and announcements.",
    target: "[data-onboard='feed']",
    paths: ["/", "/feed"],
  },
  {
    id: "organizers",
    title: "Organizers",
    body: "Follow organizers and join their tournaments.",
    target: "[data-onboard='organizers']",
  },
  {
    id: "messages",
    title: "Messages",
    body: "Chat with friends, groups and organizers.",
    target: "[data-onboard='messages']",
  },
  {
    id: "games",
    title: "Games",
    body: "Play skill games and explore categories.",
    target: "[data-onboard='games']",
  },
  {
    id: "profile",
    title: "Your profile",
    body: "Edit details, open dashboards and sign out from the menu.",
    target: "[data-onboard='profile']",
  },
  {
    id: "nav",
    title: "Bottom navigation",
    body: "Jump anywhere with the bar at the bottom.",
    target: "[data-onboard='bottom-nav']",
  },
];

export function isOnboardingDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

type Rect = { top: number; left: number; width: number; height: number; radius: number };

function measure(selector?: string): Rect | null {
  if (!selector || typeof document === "undefined") return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const pad = 10;
  const size = Math.max(r.width, r.height) + pad * 2;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return {
    left: cx - size / 2,
    top: cy - size / 2,
    width: size,
    height: size,
    radius: size / 2,
  };
}

export function OnboardingTour() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hole, setHole] = useState<Rect | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isOnboardingDone()) return;
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [user?.id]);

  const activeSteps = useMemo(() => {
    return STEPS.filter((s) => {
      if (!s.paths?.length) return true;
      return s.paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
    });
  }, [pathname]);

  const steps = activeSteps.length ? activeSteps : STEPS;
  const current = steps[Math.min(step, steps.length - 1)] ?? STEPS[0];
  const total = steps.length;
  const isLast = step >= total - 1;

  const refreshHole = useCallback(() => {
    const rect = measure(current?.target);
    setHole(rect);
    if (rect && current?.target) {
      const el = document.querySelector(current.target) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }, [current?.target, current?.id]);

  useLayoutEffect(() => {
    if (!open || finished) return;
    refreshHole();
    const onResize = () => refreshHole();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const t = window.setTimeout(refreshHole, 350);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.clearTimeout(t);
    };
  }, [open, finished, step, refreshHole, pathname]);

  const complete = useCallback(() => {
    markOnboardingDone();
    setOpen(false);
    setFinished(false);
    setStep(0);
  }, []);

  if (!user || !open) return null;

  if (finished) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
        <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#121214]/95 p-8 text-center shadow-2xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-500/20 text-sky-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Welcome to NepARENA!</h2>
          <p className="mt-2 text-sm text-neutral-400">
            You are all set. Explore tournaments, connect with players and enjoy the platform.
          </p>
          <Button className="mt-6 w-full rounded-full bg-white text-black hover:bg-neutral-100" onClick={complete}>
            Start Exploring
          </Button>
        </div>
      </div>
    );
  }

  const tooltipStyle: React.CSSProperties = hole
    ? {
        position: "fixed",
        left: Math.min(Math.max(16, hole.left + hole.width / 2 - 160), window.innerWidth - 336),
        top: Math.min(hole.top + hole.height + 16, window.innerHeight - 220),
        width: 320,
        zIndex: 202,
      }
    : {};

  return (
    <div className="fixed inset-0 z-[200]" aria-modal role="dialog">
      {/* Full-viewport blur + dim base (under spotlight hole) */}
      <div
        className="pointer-events-none fixed inset-0 bg-black/70 backdrop-blur-[4px] transition-opacity duration-500"
        style={{ opacity: hole ? 1 : 1 }}
      />
      {/* Circular spotlight cutout — clears blur inside the hole via box-shadow mask */}
      <div
        className="pointer-events-none fixed transition-all duration-500 ease-out"
        style={
          hole
            ? {
                background: "transparent",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                borderRadius: "9999px",
                left: hole.left,
                top: hole.top,
                width: hole.width,
                height: hole.height,
                position: "fixed",
                zIndex: 1,
              }
            : { display: "none" }
        }
      />
      {/* Soft ring around spotlight */}
      {hole && (
        <div
          className="pointer-events-none fixed z-[201] rounded-full border-2 border-sky-400/80 shadow-[0_0_24px_rgba(56,189,248,0.45)] transition-all duration-500 ease-out"
          style={{
            left: hole.left - 3,
            top: hole.top - 3,
            width: hole.width + 6,
            height: hole.height + 6,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className={cn(
          "rounded-2xl border border-white/15 bg-black/90 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl",
          "animate-in fade-in zoom-in-95 duration-300",
          !hole && "fixed bottom-28 left-1/2 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
        )}
        style={hole ? tooltipStyle : undefined}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-sky-400">
              {step + 1} / {total}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-white">{current?.title}</h3>
          </div>
          <button
            type="button"
            onClick={complete}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label="Skip"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-neutral-300">{current?.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-neutral-400"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="mr-0.5 h-4 w-4" /> Back
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
              <span
                key={i}
                className={cn("h-1.5 w-1.5 rounded-full transition", i === step ? "bg-sky-400" : "bg-white/20")}
              />
            ))}
          </div>
          {isLast ? (
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-sky-500 text-white hover:bg-sky-400"
              onClick={() => setFinished(true)}
            >
              Finish
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-white text-black hover:bg-neutral-100"
              onClick={() => setStep((s) => s + 1)}
            >
              Next <ChevronRight className="ml-0.5 h-4 w-4" />
            </Button>
          )}
        </div>
        <button type="button" className="mt-2 w-full text-center text-xs text-neutral-500 hover:text-neutral-300" onClick={complete}>
          Skip tour
        </button>
      </div>
    </div>
  );
}
