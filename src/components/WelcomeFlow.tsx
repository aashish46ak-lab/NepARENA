/**
 * First-open welcome:
 * 1) Story slides (Next)
 * 2) Theme select
 * 3) Login (if guest)
 * 4) Profile setup (if logged-in)
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { applyTheme, type ThemeMode } from "@/components/ThemeChooser";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Users,
  Gamepad2,
  MessageCircle,
  Moon,
  Sun,
  ChevronRight,
  User,
} from "lucide-react";

const WELCOME_KEY = "neparena_welcome_v1";

const SLIDES = [
  {
    title: "Your esports home",
    text: "Follow organizers, join live cups, and track results — all in one arena.",
    icon: Trophy,
    accent: "from-red-500/30 to-blue-600/30",
  },
  {
    title: "Organizers & community",
    text: "Discover verified organizers, follow the ones you love, and never miss a tournament.",
    icon: Users,
    accent: "from-blue-500/25 to-cyan-500/20",
  },
  {
    title: "Play & chat",
    text: "Mini-games for fun, DMs with players and orgs, and a feed that keeps you in the loop.",
    icon: Gamepad2,
    accent: "from-violet-500/25 to-red-500/20",
  },
] as const;

export function isWelcomeDone(): boolean {
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
    /* ignore */
  }
}

type Step = "slides" | "theme" | "login" | "profile";

export function WelcomeFlow({ enabled }: { enabled: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("slides");
  const [slide, setSlide] = useState(0);
  const [theme, setTheme] = useState<ThemeMode>("dark");

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

  const afterTheme = () => {
    if (!user) setStep("login");
    else setStep("profile");
  };

  const pickTheme = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col bg-background text-foreground">
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pt-12">
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b opacity-80",
            step === "slides" ? SLIDES[slide].accent : "from-sky-500/15 to-transparent",
          )}
        />

        {step === "slides" && (
          <div
            key={slide}
            className="relative z-10 flex max-w-sm flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-400"
          >
            <div className="mb-8 grid h-28 w-28 place-items-center rounded-[2rem] border border-border bg-card shadow-xl">
              {(() => {
                const Icon = SLIDES[slide].icon;
                return <Icon className="h-12 w-12 text-foreground" strokeWidth={1.5} />;
              })()}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{SLIDES[slide].title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {SLIDES[slide].text}
            </p>
            <div className="mt-8 flex gap-2">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === slide ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {step === "theme" && (
          <div className="relative z-10 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-400">
            <h2 className="text-center text-2xl font-bold">Choose your look</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Change anytime in Settings
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => pickTheme("dark")}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl border px-3 py-6 transition active:scale-[0.98]",
                  theme === "dark"
                    ? "border-sky-500/50 bg-[#0a0a0a] ring-2 ring-sky-500/30"
                    : "border-border bg-card",
                )}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-neutral-800">
                  <Moon className="h-6 w-6 text-neutral-100" />
                </span>
                <span className="text-sm font-semibold">Dark</span>
                <span className="text-[10px] text-muted-foreground">Black & silver</span>
              </button>
              <button
                type="button"
                onClick={() => pickTheme("light")}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl border px-3 py-6 transition active:scale-[0.98]",
                  theme === "light"
                    ? "border-teal-600/40 bg-[#eef2ef] ring-2 ring-teal-600/25"
                    : "border-border bg-card",
                )}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#2f4a4a]">
                  <Sun className="h-6 w-6 text-[#f7faf8]" />
                </span>
                <span className="text-sm font-semibold text-[#15201c]">Light</span>
                <span className="text-[10px] text-[#5a6b64]">Sage & teal</span>
              </button>
            </div>
          </div>
        )}

        {step === "login" && (
          <div className="relative z-10 max-w-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[2rem] border border-border bg-card">
              <MessageCircle className="h-11 w-11 text-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold">Sign in to continue</h2>
            <p className="mt-3 text-[15px] text-muted-foreground">
              Save your progress, message organizers, and join tournaments.
            </p>
            <Link
              to="/auth"
              onClick={finish}
              className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background transition active:scale-[0.98]"
            >
              Continue to login
            </Link>
            <button
              type="button"
              onClick={finish}
              className="mt-3 text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === "profile" && (
          <div className="relative z-10 max-w-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[2rem] border border-border bg-card">
              <User className="h-11 w-11 text-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold">Setup your profile</h2>
            <p className="mt-3 text-[15px] text-muted-foreground">
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
              className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background transition active:scale-[0.98]"
            >
              Open profile
            </button>
            <button
              type="button"
              onClick={finish}
              className="mt-3 text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              Later
            </button>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-2">
        {step === "slides" && (
          <button
            type="button"
            onClick={() => {
              if (slide < SLIDES.length - 1) setSlide((s) => s + 1);
              else setStep("theme");
            }}
            className="flex h-12 w-full items-center justify-center gap-1 rounded-full bg-foreground text-sm font-semibold text-background transition active:scale-[0.98]"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {step === "theme" && (
          <button
            type="button"
            onClick={afterTheme}
            className="flex h-12 w-full items-center justify-center gap-1 rounded-full bg-foreground text-sm font-semibold text-background transition active:scale-[0.98]"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
