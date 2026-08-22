/**
 * Cool first-open onboarding (dark only).
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ChevronRight, MessageCircle, User } from "lucide-react";

const WELCOME_KEY = "neparena_welcome_v3";

const SLIDES = [
  {
    kicker: "01 · Arena",
    title: "Your esports HQ",
    text: "Live cups, results, and organizers — one place for every match that matters.",
    glow: "rgba(56,189,248,0.35)",
    ring: "from-sky-400/40 via-violet-500/20 to-transparent",
    emoji: "🏟️",
  },
  {
    kicker: "02 · Compete",
    title: "Register. Play. Climb.",
    text: "Join upcoming tournaments in a tap. Track fixtures the second they go live.",
    glow: "rgba(248,113,113,0.3)",
    ring: "from-red-400/35 via-orange-400/15 to-transparent",
    emoji: "⚡",
  },
  {
    kicker: "03 · Connect",
    title: "Orgs, DMs & feed",
    text: "Follow organizers, chat with players, and never miss the next drop.",
    glow: "rgba(52,211,153,0.28)",
    ring: "from-emerald-400/30 via-sky-400/15 to-transparent",
    emoji: "💬",
  },
] as const;

export function isWelcomeDone(): boolean {
  try {
    return (
      localStorage.getItem(WELCOME_KEY) === "1" ||
      localStorage.getItem("neparena_welcome_v2") === "1" ||
      localStorage.getItem("neparena_welcome_v1") === "1"
    );
  } catch {
    return true;
  }
}

export function markWelcomeDone() {
  try {
    localStorage.setItem(WELCOME_KEY, "1");
    localStorage.setItem("neparena_welcome_v2", "1");
    localStorage.setItem("neparena_welcome_v1", "1");
  } catch {
    /* ignore */
  }
}

type Step = "slides" | "login" | "profile";

export function WelcomeFlow({ enabled }: { enabled: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("slides");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (isWelcomeDone()) return;
    const t = window.setTimeout(() => setOpen(true), 100);
    return () => clearTimeout(t);
  }, [enabled]);

  if (!open || !enabled) return null;

  const finish = () => {
    markWelcomeDone();
    setOpen(false);
  };

  const afterSlides = () => {
    if (!user) setStep("login");
    else setStep("profile");
  };

  const s = SLIDES[slide];

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col overflow-hidden bg-[#07070a] text-white">
      <div
        className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full blur-3xl"
        style={{ background: s?.glow ?? "rgba(56,189,248,0.25)" }}
      />
      <div className="pointer-events-none absolute -right-20 bottom-32 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pt-10">
        {step === "slides" && (
          <div key={slide} className="relative z-10 w-full max-w-sm">
            <div
              className={cn(
                "relative mx-auto mb-8 flex h-44 w-full items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b",
                s.ring,
              )}
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                boxShadow: `0 0 60px ${s.glow}`,
              }}
            >
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.12), transparent 50%)",
                }}
              />
              <span className="relative text-6xl drop-shadow-lg" aria-hidden>
                {s.emoji}
              </span>
              <span className="absolute bottom-3 left-4 rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-neutral-300 backdrop-blur">
                {s.kicker}
              </span>
            </div>

            <h2 className="text-center text-[1.65rem] font-bold leading-tight tracking-tight">
              {s.title}
            </h2>
            <p className="mx-auto mt-3 max-w-[18rem] text-center text-[14px] leading-relaxed text-neutral-400">
              {s.text}
            </p>

            <div className="mt-8 flex justify-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setSlide(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === slide ? "w-7 bg-white" : "w-1.5 bg-white/25",
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {step === "login" && (
          <div className="relative z-10 w-full max-w-sm text-center">
            <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl border border-white/12 bg-white/[0.04] shadow-[0_0_40px_rgba(56,189,248,0.15)]">
              <MessageCircle className="h-9 w-9 text-sky-300" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold">You’re almost in</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Sign in to join cups, message orgs, and save your progress.
            </p>
            <Link
              to="/auth"
              onClick={finish}
              className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition active:scale-[0.98]"
            >
              Continue to login
            </Link>
            <button
              type="button"
              onClick={finish}
              className="mt-3 text-sm text-neutral-500 underline-offset-2 hover:underline"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === "profile" && (
          <div className="relative z-10 w-full max-w-sm text-center">
            <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl border border-white/12 bg-white/[0.04]">
              <User className="h-9 w-9 text-emerald-300" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold">Setup your profile</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Photo, name, country — so the arena knows who you are.
            </p>
            <button
              type="button"
              onClick={() => {
                finish();
                if (user?.id) {
                  void navigate({ to: "/members/$id", params: { id: user.id } });
                }
              }}
              className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition active:scale-[0.98]"
            >
              Open profile
            </button>
            <button
              type="button"
              onClick={finish}
              className="mt-3 text-sm text-neutral-500 underline-offset-2 hover:underline"
            >
              Later
            </button>
          </div>
        )}
      </div>

      {step === "slides" && (
        <div className="relative z-10 px-6 pb-9 pt-2">
          <div className="mx-auto flex max-w-sm gap-2">
            <button
              type="button"
              onClick={finish}
              className="h-12 flex-1 rounded-full border border-white/12 text-sm font-medium text-neutral-400 transition active:scale-[0.98]"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => {
                if (slide < SLIDES.length - 1) setSlide((x) => x + 1);
                else afterSlides();
              }}
              className="flex h-12 flex-[1.5] items-center justify-center gap-1 rounded-full bg-white text-sm font-semibold text-black transition active:scale-[0.98]"
            >
              {slide < SLIDES.length - 1 ? "Next" : "Let’s go"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
