import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const WELCOME_KEY = "neparena_welcome_v4";

const SLIDES = [
  {
    title: "Home of competitive cups",
    text: "Discover live and upcoming events from organizers across the NepARENA community.",
    glow: "bg-red-500/20",
    accent: "from-red-500/30 via-red-500/5 to-transparent",
  },
  {
    title: "Register. Play. Standings.",
    text: "Join cups, follow every fixture, and see standings update without the chaos of group chats.",
    glow: "bg-sky-500/20",
    accent: "from-sky-500/30 via-sky-500/5 to-transparent",
  },
  {
    title: "Follow orgs & players",
    text: "Keep up with organizer pages, player results, direct messages, and the community feed.",
    glow: "bg-violet-500/20",
    accent: "from-violet-500/30 via-violet-500/5 to-transparent",
  },
  {
    title: "Ready when you are",
    text: "Your next cup, rivalry, and result all have a home here.",
    glow: "bg-red-500/20",
    accent: "from-red-500/30 via-violet-500/10 to-transparent",
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
  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[9990] flex min-h-[100dvh] flex-col overflow-hidden bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className={cn("pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl transition-colors duration-500", current.glow)} />

      <header className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <img src="/neparena-logo-ui.png" alt="NepARENA" width={80} height={80} className="h-14 w-14 object-contain" />
        <button
          type="button"
          onClick={finish}
          className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
        >
          Skip
        </button>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-4 text-center">
        <div key={slide} className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
          <div className={cn("mx-auto grid h-64 w-full max-w-xs place-items-center rounded-2xl border border-white/10 bg-gradient-to-b", current.accent)}>
            <img src="/neparena-logo-ui.png" alt="" width={256} height={256} className="h-48 w-48 object-contain" />
          </div>
          <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{slide + 1} of 4</p>
          <h2 id="welcome-title" className="mt-2 text-2xl font-bold sm:text-3xl">{current.title}</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-neutral-400 sm:text-base">{current.text}</p>
        </div>
      </main>

      <footer className="relative z-10 shrink-0 border-t border-white/10 bg-black/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-4 flex justify-center gap-2" aria-label={`Slide ${slide + 1} of 4`}>
            {SLIDES.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setSlide(index)}
                className={cn("h-1.5 rounded-full transition-all duration-300", index === slide ? "w-8 bg-red-500" : "w-2 bg-white/20")}
              />
            ))}
          </div>

          {isLast ? (
            <div className="space-y-2">
              {user ? (
                <Button className="h-12 w-full rounded-full" onClick={finish}>Go to home</Button>
              ) : (
                <>
                  <Button asChild className="h-12 w-full rounded-full bg-red-600 text-white hover:bg-red-500">
                    <Link to="/auth" onClick={finish}>Create free account</Link>
                  </Button>
                  <Button type="button" variant="ghost" className="h-11 w-full rounded-full text-neutral-300" onClick={finish}>
                    Explore as guest
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              {slide > 0 && (
                <Button type="button" variant="outline" className="h-12 w-12 rounded-full border-white/15" onClick={() => setSlide((value) => value - 1)} aria-label="Previous slide">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <Button type="button" className="h-12 flex-1 rounded-full bg-white text-black hover:bg-neutral-200" onClick={() => setSlide((value) => value + 1)}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
