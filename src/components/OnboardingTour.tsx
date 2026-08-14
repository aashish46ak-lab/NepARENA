/**
 * First-time user onboarding — premium spotlight tour.
 * Shown once after first login; persisted in localStorage (+ optional profile flag).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
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
  /** CSS selector or data attribute target */
  target?: string;
  /** Only show on these path prefixes (empty = any) */
  paths?: string[];
};

const STEPS: Step[] = [
  {
    id: "create",
    title: "Create a post",
    body: "Share updates, images and announcements with the community from here.",
    target: "[data-onboard='create-post']",
    paths: ["/"],
  },
  {
    id: "notifications",
    title: "Notifications",
    body: "Get likes, follows, messages and tournament updates in one place.",
    target: "[data-onboard='notifications']",
    paths: ["/"],
  },
  {
    id: "about",
    title: "About Us",
    body: "Learn what NepARENA offers and meet the platform.",
    target: "[data-onboard='about']",
    paths: ["/"],
  },
  {
    id: "members",
    title: "Members",
    body: "Browse registered players and discover new teammates.",
    target: "[data-onboard='members']",
    paths: ["/"],
  },
  {
    id: "feed",
    title: "Your feed",
    body: "This is your personalized feed for posts and announcements.",
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
    body: "Chat with friends, organizers and groups.",
    target: "[data-onboard='messages']",
  },
  {
    id: "games",
    title: "Games",
    body: "Play skill games and explore gaming categories.",
    target: "[data-onboard='games']",
  },
  {
    id: "profile",
    title: "Your profile",
    body: "Edit details, switch accounts and open dashboards from your profile menu.",
    target: "[data-onboard='profile']",
  },
  {
    id: "nav",
    title: "Bottom navigation",
    body: "Jump anywhere in NepARENA with the bar at the bottom.",
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

export function OnboardingTour() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isOnboardingDone()) return;
    // Delay so DOM targets exist
    const t = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(t);
  }, [user?.id]);

  const activeSteps = useMemo(() => {
    return STEPS.filter((s) => {
      if (!s.paths?.length) return true;
      return s.paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
    });
  }, [pathname]);

  const current = activeSteps[step] ?? STEPS[step] ?? STEPS[0];
  const total = Math.max(activeSteps.length, STEPS.length);
  const isLast = step >= total - 1;

  const complete = useCallback(() => {
    markOnboardingDone();
    setOpen(false);
    setFinished(false);
  }, []);

  if (!user || !open) return null;

  if (finished) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
        <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#121214]/95 p-8 text-center shadow-2xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-500/20 text-sky-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Welcome to NepARENA!</h2>
          <p className="mt-2 text-sm text-neutral-400">
            You are all set. Explore tournaments, connect with players and enjoy the platform.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button className="w-full rounded-full bg-white text-black hover:bg-neutral-100" onClick={complete}>
              Start Exploring
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-full text-neutral-400"
              onClick={() => {
                setFinished(false);
                setStep(0);
              }}
            >
              Replay Tutorial
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-4 pb-28 backdrop-blur-[2px] sm:items-center sm:pb-4">
      <div
        className={cn(
          "w-full max-w-md rounded-3xl border border-white/15 bg-black/80 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl",
          "animate-in fade-in slide-in-from-bottom-4 duration-300",
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-sky-400">
              {step + 1} / {total}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">{current?.title}</h3>
          </div>
          <button
            type="button"
            onClick={complete}
            className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label="Skip"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-neutral-300">{current?.body}</p>
        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-neutral-400"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition",
                  i === step ? "bg-sky-400" : "bg-white/20",
                )}
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
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
        <button
          type="button"
          className="mt-3 w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
          onClick={complete}
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}
