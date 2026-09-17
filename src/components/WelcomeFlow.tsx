import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const WELCOME_KEY = "neparena_welcome_v4";

const SLIDES = [
  {
    title: "Home of competitive cups",
    text: "Discover live and upcoming events from organizers across the NepARENA community.",
    glow: "bg-red-500/25",
  },
  {
    title: "Register. Play. Standings.",
    text: "Join cups, follow every fixture, and see standings update without group-chat chaos.",
    glow: "bg-sky-500/25",
  },
  {
    title: "Follow orgs & players",
    text: "Organizer pages, player results, direct messages, and the community feed.",
    glow: "bg-violet-500/25",
  },
  {
    title: "Ready when you are",
    text: "Create a free account to join events, or explore as a guest anytime.",
    glow: "bg-emerald-500/20",
  },
] as const;

export function isWelcomeDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return true;
  }
}

export function markWelcomeDone() {
  try {
    localStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function WelcomeFlow({ enabled, onDone }: { enabled: boolean; onDone?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (isWelcomeDone()) {
      onDone?.();
      return;
    }
    setOpen(true);
  }, [enabled, onDone]);

  if (!enabled || !open) return null;

  const finish = () => {
    markWelcomeDone();
    setOpen(false);
    onDone?.();
  };

  const current = SLIDES[slide]!;
  const isLast = slide === SLIDES.length - 1;
  const isFirst = slide === 0;

  return (
    <div
      className="fixed inset-0 z-[9990] bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-[30%] h-64 w-64 -translate-x-1/2 rounded-full blur-3xl",
          current.glow,
        )}
      />

      {/* Skip always top-right */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <img
          src="/neparena-logo-ui.png"
          alt="NepARENA"
          width={44}
          height={44}
          className="h-11 w-11 object-contain"
          onError={(e) => {
            e.currentTarget.src = "/icon-192.png";
          }}
        />
        <button
          type="button"
          onClick={finish}
          className="rounded-full border border-white/25 bg-black/60 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/10"
        >
          Skip
        </button>
      </div>

      {/* Center content — smaller logo so footer never clips */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pb-28 pt-16 text-center">
        <div key={slide} className="w-full max-w-sm">
          <div className="mx-auto grid h-36 w-36 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] sm:h-44 sm:w-44">
            <img
              src="/neparena-logo-ui.png"
              alt=""
              width={160}
              height={160}
              className="h-28 w-28 object-contain sm:h-36 sm:w-36"
              onError={(e) => {
                e.currentTarget.src = "/icon-192.png";
              }}
            />
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            {slide + 1} of {SLIDES.length}
          </p>
          <h2 id="welcome-title" className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            {current.title}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-neutral-400">
            {current.text}
          </p>
        </div>
      </div>

      {/* Continue always pinned to bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/95 px-4 pt-3 backdrop-blur-md"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto w-full max-w-md space-y-3">
          <div className="flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setSlide(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === slide ? "w-8 bg-red-500" : "w-2 bg-white/25",
                )}
              />
            ))}
          </div>

          {isLast ? (
            <div className="flex flex-col gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={finish}
                  className="flex h-14 w-full items-center justify-center rounded-full bg-white text-base font-bold text-black"
                >
                  Go to home
                </button>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={finish}
                    className="flex h-14 w-full items-center justify-center rounded-full bg-red-600 text-base font-bold text-white"
                  >
                    Create free account
                  </Link>
                  <button
                    type="button"
                    onClick={finish}
                    className="flex h-12 w-full items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-neutral-200"
                  >
                    Explore as guest
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => setSlide((s) => Math.max(0, s - 1))}
                  aria-label="Back"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSlide((s) => Math.min(SLIDES.length - 1, s + 1))}
                className="flex h-14 flex-1 items-center justify-center gap-1 rounded-full bg-white text-base font-bold text-black"
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
