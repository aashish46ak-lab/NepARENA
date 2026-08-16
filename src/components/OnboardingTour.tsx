/**
 * Premium floating-spotlight first-login tour.
 * Layers over the real homepage -- no separate tutorial page.
 * Persistence: localStorage keyed by user id when available.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "neparena_onboarding_done_v2:";
const LEGACY_KEY = "neparena_onboarding_done_v1";
const PAD = 8;
const MAX_RADIUS = 16;
const TRANSITION_MS = 280;
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type Step = {
  id: string;
  title: string;
  body: string;
  target?: string;
  goTo?: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to NepARENA",
    body: "Discover organizers, join tournaments, and connect with players -- all in one place. A quick tour takes under a minute.",
  },
  {
    id: "feed",
    title: "Your Feed",
    body: "See posts and updates from people and organizers you follow.",
    target: "[data-onboard='feed']",
  },
  {
    id: "organizers",
    title: "Find Organizers",
    body: "Discover gaming organizers, follow them, and keep up with their communities.",
    target: "[data-onboard='organizers']",
  },
  {
    id: "tournaments",
    title: "Tournaments",
    body: "Explore live and upcoming tournaments, fixtures, and results.",
    target: "[data-onboard='tournaments']",
  },
  {
    id: "messages",
    title: "Messages",
    body: "Chat privately, create groups, and stay connected without leaving the app.",
    target: "[data-onboard='messages']",
  },
  {
    id: "profile",
    title: "Your Profile",
    body: "Manage your profile, settings, account switching, and dashboards from here.",
    target: "[data-onboard='profile']",
  },
];

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
};

function storageKey(userId?: string | null) {
  return userId ? `${STORAGE_PREFIX}${userId}` : `${STORAGE_PREFIX}anon`;
}

export function isOnboardingDone(userId?: string | null): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (localStorage.getItem(storageKey(userId)) === "1") return true;
    if (localStorage.getItem(LEGACY_KEY) === "1") {
      localStorage.setItem(storageKey(userId), "1");
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function markOnboardingDone(userId?: string | null) {
  try {
    localStorage.setItem(storageKey(userId), "1");
    localStorage.setItem(LEGACY_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(userId?: string | null) {
  try {
    localStorage.removeItem(storageKey(userId));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function requestOnboardingReplay() {
  try {
    sessionStorage.setItem("neparena_onboarding_replay", "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("neparena:replay-onboarding"));
}

function measureTarget(selector?: string): Rect | null {
  if (!selector || typeof document === "undefined") return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const left = Math.max(4, r.left - PAD);
  const top = Math.max(4, r.top - PAD);
  const width = Math.min(window.innerWidth - left - 4, r.width + PAD * 2);
  const height = Math.min(window.innerHeight - top - 4, r.height + PAD * 2);
  const radius = Math.min(MAX_RADIUS, Math.min(width, height) / 2);
  return { left, top, width, height, radius };
}

function cardPosition(hole: Rect | null): React.CSSProperties {
  const cardW = Math.min(320, window.innerWidth - 24);
  const cardH = 200;
  if (!hole) {
    return {
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: cardW,
      zIndex: 220,
    };
  }
  const spaceBelow = window.innerHeight - (hole.top + hole.height);
  const spaceAbove = hole.top;
  let top: number;
  if (spaceBelow >= cardH + 24) {
    top = hole.top + hole.height + 14;
  } else if (spaceAbove >= cardH + 24) {
    top = hole.top - cardH - 14;
  } else {
    top = Math.max(12, Math.min(hole.top + hole.height + 14, window.innerHeight - cardH - 12));
  }
  const left = Math.min(
    Math.max(12, hole.left + hole.width / 2 - cardW / 2),
    window.innerWidth - cardW - 12,
  );
  return { position: "fixed", left, top, width: cardW, zIndex: 220 };
}

export function OnboardingTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hole, setHole] = useState<Rect | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const retryRef = useRef(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    try {
      reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reducedMotion.current = false;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const start = () => {
      setStep(0);
      setFinished(false);
      setOpen(true);
    };
    let replay = false;
    try {
      replay = sessionStorage.getItem("neparena_onboarding_replay") === "1";
      if (replay) sessionStorage.removeItem("neparena_onboarding_replay");
    } catch {
      /* ignore */
    }
    if (replay || !isOnboardingDone(user.id)) {
      const t = window.setTimeout(start, replay ? 200 : 800);
      return () => window.clearTimeout(t);
    }
    const onReplay = () => start();
    window.addEventListener("neparena:replay-onboarding", onReplay);
    return () => window.removeEventListener("neparena:replay-onboarding", onReplay);
  }, [user?.id]);

  const current = STEPS[Math.min(step, STEPS.length - 1)]!;
  const total = STEPS.length;
  const isLast = step >= total - 1;

  const refresh = useCallback(() => {
    const rect = measureTarget(current.target);
    setHole(rect);
    setCardStyle(cardPosition(rect));
    if (rect && current.target) {
      const el = document.querySelector(current.target) as HTMLElement | null;
      el?.scrollIntoView({
        behavior: reducedMotion.current ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    }
    return !!rect || !current.target;
  }, [current.target, current.id]);

  useLayoutEffect(() => {
    if (!open || finished) return;
    retryRef.current = 0;
    let cancelled = false;
    const tryMeasure = () => {
      if (cancelled) return;
      const ok = refresh();
      if (!ok && current.target) {
        retryRef.current += 1;
        if (retryRef.current < 6) {
          window.setTimeout(tryMeasure, 120);
        } else if (step < total - 1) {
          setStep((s) => s + 1);
        } else {
          setFinished(true);
        }
      }
    };
    tryMeasure();
    const onResize = () => {
      if (!cancelled) refresh();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, finished, step, refresh, current.target, total]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        markOnboardingDone(user?.id);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, user?.id]);

  const complete = useCallback(() => {
    markOnboardingDone(user?.id);
    setOpen(false);
    setFinished(false);
    setStep(0);
  }, [user?.id]);

  const goNext = () => {
    if (isLast) setFinished(true);
    else setStep((s) => s + 1);
  };

  if (!user || !open) return null;

  const ease = reducedMotion.current ? "ease" : SPRING;
  const dur = reducedMotion.current ? "150ms" : `${TRANSITION_MS}ms`;

  if (finished) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal
        aria-label="Tour complete"
      >
        <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#121214]/95 p-8 text-center shadow-2xl ring-1 ring-white/10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-500/20 text-sky-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">You&apos;re all set</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Explore NepARENA -- find organizers, join tournaments, and connect with players.
          </p>
          <Button className="mt-6 w-full rounded-full bg-white text-black hover:bg-neutral-100" onClick={complete}>
            Start Exploring
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal aria-labelledby="onboard-title">
      <div
        className="fixed inset-0 bg-black/65"
        style={{
          pointerEvents: "auto",
          backdropFilter: reducedMotion.current ? undefined : "blur(2px)",
        }}
        onClick={(e) => e.stopPropagation()}
        aria-hidden
      />

      {hole && (
        <>
          <div
            className="pointer-events-none fixed"
            style={{
              left: hole.left,
              top: hole.top,
              width: hole.width,
              height: hole.height,
              borderRadius: hole.radius,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              transition: `left ${dur} ${ease}, top ${dur} ${ease}, width ${dur} ${ease}, height ${dur} ${ease}, border-radius ${dur} ${ease}`,
              zIndex: 201,
            }}
          />
          <div
            className="pointer-events-none fixed border-2 border-sky-400/70 shadow-[0_0_20px_rgba(56,189,248,0.35)]"
            style={{
              left: hole.left - 2,
              top: hole.top - 2,
              width: hole.width + 4,
              height: hole.height + 4,
              borderRadius: hole.radius + 2,
              transition: `left ${dur} ${ease}, top ${dur} ${ease}, width ${dur} ${ease}, height ${dur} ${ease}, border-radius ${dur} ${ease}`,
              zIndex: 202,
            }}
          />
          <div
            className="fixed"
            style={{
              left: hole.left,
              top: hole.top,
              width: hole.width,
              height: hole.height,
              borderRadius: hole.radius,
              zIndex: 203,
              pointerEvents: "none",
            }}
            aria-hidden
          />
        </>
      )}

      <div
        className={cn(
          "rounded-2xl border border-white/15 bg-[#0c0c0e]/95 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl",
        )}
        style={{
          ...cardStyle,
          transition: reducedMotion.current
            ? `opacity ${dur} ease`
            : `left ${dur} ${ease}, top ${dur} ${ease}, opacity ${dur} ease`,
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-sky-400">
              {step + 1} / {total}
            </p>
            <h3 id="onboard-title" className="mt-0.5 text-base font-semibold text-white">
              {current.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={complete}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-neutral-300">{current.body}</p>
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
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition",
                  i === step ? "bg-sky-400 scale-125" : "bg-white/20",
                )}
              />
            ))}
          </div>
          {step === 0 ? (
            <Button type="button" size="sm" className="rounded-full bg-sky-500 text-white hover:bg-sky-400" onClick={goNext}>
              Get Started
            </Button>
          ) : isLast ? (
            <Button type="button" size="sm" className="rounded-full bg-sky-500 text-white hover:bg-sky-400" onClick={() => setFinished(true)}>
              Finish
            </Button>
          ) : (
            <Button type="button" size="sm" className="rounded-full bg-white text-black hover:bg-neutral-100" onClick={goNext}>
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
