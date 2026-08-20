/**
 * First-login onboarding — 5 short screens.
 * Final screen links to Rules; works for global players.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "neparena_onboarding_done_v5:";
const LEGACY_KEYS = [
  "neparena_onboarding_done_v4:",
  "neparena_onboarding_done_v3:",
  "neparena_onboarding_done_v2:",
  "neparena_onboarding_done_v1",
];

const SCREENS = [
  {
    title: "Welcome to NepARENA",
    text: "A multi-organizer esports platform for players, organizers, and fans worldwide.",
  },
  {
    title: "Compete & Follow Tournaments",
    text: "Discover tournaments, follow fixtures, check standings, and keep up with results in one place.",
  },
  {
    title: "Build Your Gaming Profile",
    text: "Create your profile, share achievements, and connect with the global competitive community.",
  },
  {
    title: "Stay Updated",
    text: "Follow tournament news, announcements, guides, and community updates — all in one hub.",
  },
  {
    title: "Play Fair. Respect Everyone.",
    text: "Follow NepARENA's community and tournament rules to keep competition fair and enjoyable for everyone.",
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
      localStorage.removeItem(`neparena_onboarding_done_v2:${userId}`);
      localStorage.removeItem(`neparena_onboarding_done_v3:${userId}`);
      localStorage.removeItem(`neparena_onboarding_done_v4:${userId}`);
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

  const finish = () => {
    markOnboardingDone(user?.id);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div
        className={cn(
          "w-full max-w-sm overflow-hidden rounded-3xl border border-white/12 bg-[#121214] shadow-2xl",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
          <img
            src="/neparena-logo.png"
            alt="NepARENA"
            className="mb-5 h-14 w-14 rounded-2xl object-contain ring-1 ring-white/15"
          />
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            {step + 1} / {SCREENS.length}
          </p>
          <h2 id="onboard-title" className="text-lg font-bold text-white">
            {screen.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">{screen.text}</p>

          <div className="mt-6 flex w-full flex-col gap-2">
            {isLast ? (
              <>
                <Button asChild className="w-full rounded-full bg-white text-black hover:bg-neutral-100">
                  <Link to="/rules" onClick={finish}>
                    View Rules
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full border-white/15"
                  onClick={finish}
                >
                  Get Started
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="w-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 text-white"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </Button>
            )}
          </div>

          {!isLast ? (
            <button
              type="button"
              className="mt-3 text-xs text-neutral-600 hover:text-neutral-400"
              onClick={finish}
            >
              Skip
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
