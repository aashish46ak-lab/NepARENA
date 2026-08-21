/**
 * First-login onboarding — polished multi-step flow for global players.
 * Animations respect prefers-reduced-motion.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Swords,
  UserCircle2,
  Megaphone,
  Scale,
  Globe2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STORAGE_PREFIX = "neparena_onboarding_done_v6:";
const LEGACY_KEYS = [
  "neparena_onboarding_done_v5:",
  "neparena_onboarding_done_v4:",
  "neparena_onboarding_done_v3:",
  "neparena_onboarding_done_v2:",
  "neparena_onboarding_done_v1",
];

const SCREENS = [
  {
    title: "Welcome to NepARENA",
    text: "Your home for multi-organizer esports — players, organizers, and fans worldwide compete in one place.",
    icon: Globe2,
    tint: "text-sky-300 bg-sky-500/15 border-sky-500/30",
    glow: "rgba(56,189,248,0.2)",
  },
  {
    title: "Compete & track results",
    text: "Join tournaments, follow fixtures and standings, and see live results as matches finish.",
    icon: Swords,
    tint: "text-violet-300 bg-violet-500/15 border-violet-500/30",
    glow: "rgba(139,92,246,0.2)",
  },
  {
    title: "Build your profile",
    text: "Showcase your club, achievements, and activity. Connect with the competitive community.",
    icon: UserCircle2,
    tint: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
    glow: "rgba(52,211,153,0.2)",
  },
  {
    title: "News, guides & updates",
    text: "Stay informed with platform news, how-to guides, and announcements from organizers you follow.",
    icon: Megaphone,
    tint: "text-amber-300 bg-amber-500/15 border-amber-500/30",
    glow: "rgba(251,191,36,0.2)",
  },
  {
    title: "Play fair. Respect everyone.",
    text: "Community and tournament rules keep competition clean for every player and organizer.",
    icon: Scale,
    tint: "text-rose-300 bg-rose-500/15 border-rose-500/30",
    glow: "rgba(244,63,94,0.2)",
    final: true,
  },
] as const;

function storageKey(userId?: string | null) {
  return userId ? `${STORAGE_PREFIX}${userId}` : `${STORAGE_PREFIX}anon`;
}

export function isOnboardingDone(userId?: string | null): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (localStorage.getItem(storageKey(userId)) === "1") return true;
    for (const leg of LEGACY_KEYS) {
      const k = leg.endsWith(":") ? `${leg}${userId || "anon"}` : leg;
      if (localStorage.getItem(k) === "1" || localStorage.getItem(leg) === "1") {
        localStorage.setItem(storageKey(userId), "1");
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function markOnboardingDone(userId?: string | null) {
  try {
    localStorage.setItem(storageKey(userId), "1");
    localStorage.setItem("neparena_onboarding_done_v1", "1");
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(userId?: string | null) {
  try {
    localStorage.removeItem(storageKey(userId));
    localStorage.removeItem("neparena_onboarding_done_v1");
    for (const leg of LEGACY_KEYS) {
      const k = leg.endsWith(":") ? `${leg}${userId || "anon"}` : leg;
      localStorage.removeItem(k);
      localStorage.removeItem(leg);
    }
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
}

export function OnboardingTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [animKey, setAnimKey] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let replay = false;
    try {
      replay = sessionStorage.getItem("neparena_onboarding_replay") === "1";
      if (replay) sessionStorage.removeItem("neparena_onboarding_replay");
    } catch {
      /* ignore */
    }
    if (replay || !isOnboardingDone(user?.id)) {
      setOpen(true);
      setStep(0);
      requestAnimationFrame(() => setEntered(true));
    }
  }, [user?.id]);

  const go = useCallback((next: number, direction: "next" | "prev") => {
    setDir(direction);
    setAnimKey((k) => k + 1);
    setStep(next);
  }, []);

  if (!open) return null;

  const screen = SCREENS[step]!;
  const isLast = step >= SCREENS.length - 1;
  const isFirst = step === 0;
  const Icon = screen.icon;
  const progress = ((step + 1) / SCREENS.length) * 100;

  const finish = () => {
    markOnboardingDone(user?.id);
    setEntered(false);
    window.setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center",
        "bg-black/70 backdrop-blur-md",
        "transition-opacity duration-300 ease-out",
        entered ? "opacity-100" : "opacity-0",
      )}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div
        className={cn(
          "w-full max-w-sm overflow-hidden rounded-3xl border border-white/12 bg-[#121214]",
          "shadow-2xl shadow-black/60",
          "transition-all duration-300 ease-out",
          entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.97] opacity-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-white/5">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 transition-[width] duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="relative flex flex-col items-center px-6 pb-6 pt-7 text-center">
          <div
            className="pointer-events-none absolute left-1/2 top-10 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl transition-colors duration-500"
            style={{ background: screen.glow }}
            aria-hidden
          />

          <div
            key={`icon-${animKey}`}
            className={cn(
              "relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border",
              screen.tint,
              "animate-na-pop",
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={1.75} />
          </div>

          <div className="mb-4 flex items-center gap-1.5" aria-hidden>
            {SCREENS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                onClick={() => go(i, i > step ? "next" : "prev")}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-5 bg-sky-400"
                    : i < step
                      ? "w-1.5 bg-sky-400/50 hover:bg-sky-400/70"
                      : "w-1.5 bg-white/15 hover:bg-white/25",
                )}
              />
            ))}
          </div>

          <div
            key={`copy-${animKey}`}
            className={cn(
              "w-full",
              dir === "next" ? "animate-na-slide-next" : "animate-na-slide-prev",
            )}
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              {step + 1} of {SCREENS.length}
            </p>
            <h2 id="onboard-title" className="text-lg font-bold tracking-tight text-white sm:text-xl">
              {screen.title}
            </h2>
            <p className="mx-auto mt-2 max-w-[300px] text-sm leading-relaxed text-neutral-400">
              {screen.text}
            </p>
          </div>

          <div className="mt-7 flex w-full flex-col gap-2">
            {isLast ? (
              <>
                <Button
                  asChild
                  className="w-full rounded-full bg-white text-black transition hover:bg-neutral-100 active:scale-[0.98]"
                >
                  <Link to="/rules" onClick={finish}>
                    View Rules
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full border-white/15 text-white transition hover:bg-white/5 active:scale-[0.98]"
                  onClick={finish}
                >
                  Get Started
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                {!isFirst ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-white/15 px-3 text-neutral-300 transition hover:bg-white/5 active:scale-95"
                    onClick={() => go(step - 1, "prev")}
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:brightness-110 active:scale-[0.98]"
                  onClick={() => go(step + 1, "next")}
                >
                  Continue
                  <ChevronRight className="ml-1 h-4 w-4 opacity-90" />
                </Button>
              </div>
            )}
          </div>

          {!isLast ? (
            <button
              type="button"
              className="mt-4 text-xs text-neutral-600 transition hover:text-neutral-400"
              onClick={finish}
            >
              Skip for now
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
