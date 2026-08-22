/**
 * First-open welcome (dark only):
 * 1) Story slides (Next / Skip)
 * 2) Login (if guest)
 * 3) Profile setup (if logged-in)
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Users,
  Gamepad2,
  MessageCircle,
  ChevronRight,
  User,
  Swords,
} from "lucide-react";

const WELCOME_KEY = "neparena_welcome_v2";

const SLIDES = [
  {
    title: "Welcome to NepARENA",
    text: "One home for multi-organizer esports — follow cups, results, and the community worldwide.",
    icon: Trophy,
    accent: "from-sky-500/25 to-violet-500/20",
  },
  {
    title: "Join live tournaments",
    text: "Browse organizers, register for upcoming cups, and track fixtures as matches go live.",
    icon: Swords,
    accent: "from-red-500/20 to-orange-500/15",
  },
  {
    title: "Organizers & players",
    text: "Follow your favourite orgs, build your profile, and stay connected with DMs.",
    icon: Users,
    accent: "from-emerald-500/20 to-sky-500/15",
  },
  {
    title: "Play & stay in the loop",
    text: "Mini-games for fun, news from organizers, and a feed that keeps you ready for the next match.",
    icon: Gamepad2,
    accent: "from-violet-500/20 to-sky-500/15",
  },
] as const;

export function isWelcomeDone(): boolean {
  try {
    return (
      localStorage.getItem(WELCOME_KEY) === "1" ||
      localStorage.getItem("neparena_welcome_v1") === "1"
    );
  } catch {
    return true;
  }
}

export function markWelcomeDone() {
  try {
    localStorage.setItem(WELCOME_KEY, "1");
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
    const t = window.setTimeout(() => setOpen(true), 120);
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

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col bg-[#0a0a0a] text-white">
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pt-12">
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b opacity-80",
            step === "slides" ? SLIDES[slide].accent : "from-sky-500/15 to-transparent",
          )}
        />

        {step === "slides" && (
          <div key={slide} className="relative z-10 flex max-w-sm flex-col items-center text-center">
            <div className="mb-8 grid h-28 w-28 place-items-center rounded-[2rem] border border-white/12 bg-white/[0.04] shadow-xl">
              {(() => {
                const Icon = SLIDES[slide].icon;
                return <Icon className="h-12 w-12 text-white" strokeWidth={1.5} />;
              })()}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{SLIDES[slide].title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
              {SLIDES[slide].text}
            </p>
            <div className="mt-8 flex gap-2">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === slide ? "w-6 bg-white" : "w-1.5 bg-white/25",
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {step === "login" && (
          <div className="relative z-10 max-w-sm text-center">
            <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[2rem] border border-white/12 bg-white/[0.04]">
              <MessageCircle className="h-11 w-11 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold">Sign in to continue</h2>
            <p className="mt-3 text-[15px] text-neutral-400">
              Save progress, message organizers, and join tournaments.
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
          <div className="relative z-10 max-w-sm text-center">
            <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[2rem] border border-white/12 bg-white/[0.04]">
              <User className="h-11 w-11 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold">Setup your profile</h2>
            <p className="mt-3 text-[15px] text-neutral-400">
              Add a photo, name, and country so organizers and players know you.
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

      <div className="px-6 pb-8 pt-2">
        {step === "slides" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={finish}
              className="h-12 flex-1 rounded-full border border-white/15 text-sm font-medium text-neutral-400 transition active:scale-[0.98]"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => {
                if (slide < SLIDES.length - 1) setSlide((s) => s + 1);
                else afterSlides();
              }}
              className="flex h-12 flex-[1.4] items-center justify-center gap-1 rounded-full bg-white text-sm font-semibold text-black transition active:scale-[0.98]"
            >
              {slide < SLIDES.length - 1 ? "Next" : "Continue"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
