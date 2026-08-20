/**
 * First-login onboarding — polished 5-screen flow for global players.
 * Final screen: View Rules + Get Started.
 */
import { useEffect, useState } from "react";
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
    text: "A multi-organizer esports platform for players, organizers, and fans around the world.",
    icon: Globe2,
    tint: "text-sky-300 bg-sky-500/15 border-sky-500/30",
  },
  {
    title: "Compete & follow tournaments",
    text: "Discover cups, track fixtures and standings, and stay on top of results — all in one place.",
    icon: Swords,
    tint: "text-violet-300 bg-violet-500/15 border-violet-500/30",
  },
  {
    title: "Build your gaming profile",
    text: "Set up your profile, share achievements, and connect with the competitive community worldwide.",
    icon: UserCircle2,
    tint: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  },
  {
    title: "Stay in the loop",
    text: "News, guides, announcements, and organizer updates — so you never miss what matters.",
    icon: Megaphone,
    tint: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  },
  {
    title: "Play fair. Respect everyone.",
    text: "Clear community and tournament rules keep competition fair for every player and organizer.",
    icon: Scale,
    tint: "text-rose-300 bg-rose-500/15 border-rose-500/30",
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
    return false;
  } catch {
    return true;
  }
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
    if (userId) {
      for (const leg of LEGACY_KEYS) {
        if (leg.endsWith(":")) localStorage.removeItem(`${leg}${userId}`);
      }
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
    }
  }, [user?.id]);

  if (!open) return null;

  const screen = SCREENS[step]!;
  const isLast = step >= SCREENS.length - 1;
  const isFirst = step === 0;
  const Icon = screen.icon;

  const finish = () => {
    markOnboardingDone(user?.id);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center">
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/12 bg-[#121214] shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
      >
        <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" />

        <div className="flex flex-col items-center px-6 pb-6 pt-7 text-center">
          <div
            className={cn(
              "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border",
              screen.tint,
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={1.75} />
          </div>

          <div className="mb-4 flex items-center gap-1.5" aria-hidden>
            {SCREENS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-5 bg-sky-400"
                    : i < step
                      ? "w-1.5 bg-sky-400/50"
                      : "w-1.5 bg-white/15",
                )}
              />
            ))}
          </div>

          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            {step + 1} of {SCREENS.length}
          </p>
          <h2 id="onboard-title" className="text-lg font-bold tracking-tight text-white">
            {screen.title}
          </h2>
          <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-neutral-400">
            {screen.text}
          </p>

          <div className="mt-7 flex w-full flex-col gap-2">
            {isLast ? (
              <>
                <Button
                  asChild
                  className="w-full rounded-full bg-white text-black hover:bg-neutral-100"
                >
                  <Link to="/rules" onClick={finish}>
                    View Rules
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full border-white/15 text-white hover:bg-white/5"
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
                    className="rounded-full border-white/15 px-3 text-neutral-300 hover:bg-white/5"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 font-semibold text-white shadow-lg shadow-sky-500/20"
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continue
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
