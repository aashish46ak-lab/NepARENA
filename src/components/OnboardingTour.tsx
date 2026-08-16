/**
 * Arena Quest — playful first-login discovery (not a linear tutorial).
 * Tap highlighted zones to unlock stamps. Persists per user.
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
import {
  X,
  Sparkles,
  Trophy,
  Users,
  MessageCircle,
  Newspaper,
  UserCircle2,
  Flame,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "neparena_onboarding_done_v3:";
const LEGACY_KEYS = ["neparena_onboarding_done_v2:", "neparena_onboarding_done_v1"];
const PAD = 10;
const MAX_RADIUS = 18;
const TRANSITION_MS = 320;
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type Quest = {
  id: string;
  stamp: string;
  title: string;
  hook: string;
  tip: string;
  target?: string;
  icon: "spark" | "feed" | "org" | "cup" | "msg" | "me";
};

const QUESTS: Quest[] = [
  {
    id: "welcome",
    stamp: "👋",
    title: "You're in the Arena",
    hook: "NepARENA is your esports HQ — organizers, tournaments, chat, games.",
    tip: "Tap \"Let's explore\" and unlock spots around the app. No boring slides.",
    icon: "spark",
  },
  {
    id: "feed",
    stamp: "📰",
    title: "The Feed",
    hook: "This is the pulse — posts, wins, and noise from people you follow.",
    tip: "Scroll later. For now, tap the highlighted zone to stamp it.",
    target: "[data-onboard='feed']",
    icon: "feed",
  },
  {
    id: "organizers",
    stamp: "🏟️",
    title: "Organizers",
    hook: "Every community lives under an organizer. Follow the ones you vibe with.",
    tip: "Tap the spotlight to claim this stamp.",
    target: "[data-onboard='organizers']",
    icon: "org",
  },
  {
    id: "tournaments",
    stamp: "🏆",
    title: "Tournaments",
    hook: "Live brackets, upcoming cups, results — the competitive core.",
    tip: "Find a cup, join when you're ready. Tap to unlock.",
    target: "[data-onboard='tournaments']",
    icon: "cup",
  },
  {
    id: "messages",
    stamp: "💬",
    title: "Messages",
    hook: "DMs, groups, organizer chats — Messenger-style, right here.",
    tip: "Message from any profile. Tap to stamp Messages.",
    target: "[data-onboard='messages']",
    icon: "msg",
  },
  {
    id: "profile",
    stamp: "⚡",
    title: "Your base",
    hook: "Profile, streaks, settings, account switch — your player hub.",
    tip: "Last stamp. Tap your profile zone to finish the quest.",
    target: "[data-onboard='profile']",
    icon: "me",
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
    if (userId) localStorage.removeItem(`neparena_onboarding_done_v2:${userId}`);
    localStorage.removeItem("neparena_onboarding_done_v2:anon");
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
  const cardW = Math.min(340, window.innerWidth - 24);
  const cardH = 230;
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
  if (spaceBelow >= cardH + 20) {
    top = hole.top + hole.height + 16;
  } else if (spaceAbove >= cardH + 20) {
    top = hole.top - cardH - 16;
  } else {
    top = Math.max(12, Math.min(hole.top + hole.height + 16, window.innerHeight - cardH - 12));
  }
  const left = Math.min(
    Math.max(12, hole.left + hole.width / 2 - cardW / 2),
    window.innerWidth - cardW - 12,
  );
  return { position: "fixed", left, top, width: cardW, zIndex: 220 };
}

function QuestIcon({ icon, className }: { icon: Quest["icon"]; className?: string }) {
  const c = cn("h-5 w-5", className);
  switch (icon) {
    case "feed":
      return <Newspaper className={c} />;
    case "org":
      return <Users className={c} />;
    case "cup":
      return <Trophy className={c} />;
    case "msg":
      return <MessageCircle className={c} />;
    case "me":
      return <UserCircle2 className={c} />;
    default:
      return <Zap className={c} />;
  }
}

export function OnboardingTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [pop, setPop] = useState(false);
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
      setUnlocked([]);
      setPop(false);
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
      const t = window.setTimeout(start, replay ? 200 : 700);
      return () => window.clearTimeout(t);
    }
    const onReplay = () => start();
    window.addEventListener("neparena:replay-onboarding", onReplay);
    return () => window.removeEventListener("neparena:replay-onboarding", onReplay);
  }, [user?.id]);

  const current = QUESTS[Math.min(step, QUESTS.length - 1)]!;
  const total = QUESTS.length;
  const isLast = step >= total - 1;
  const isWelcome = step === 0;

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
        if (retryRef.current < 8) {
          window.setTimeout(tryMeasure, 140);
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
    setUnlocked([]);
  }, [user?.id]);

  const unlockAndAdvance = () => {
    const id = current.id;
    setUnlocked((u) => (u.includes(id) ? u : [...u, id]));
    setPop(true);
    window.setTimeout(() => setPop(false), reducedMotion.current ? 120 : 450);
    if (isLast) {
      window.setTimeout(() => setFinished(true), reducedMotion.current ? 80 : 280);
    } else {
      window.setTimeout(() => setStep((s) => s + 1), reducedMotion.current ? 80 : 220);
    }
  };

  if (!user || !open) return null;

  const ease = reducedMotion.current ? "ease" : SPRING;
  const dur = reducedMotion.current ? "150ms" : `${TRANSITION_MS}ms`;

  if (finished) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        role="dialog"
        aria-modal
        aria-label="Quest complete"
      >
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#1a1a22] to-[#0c0c0e] p-7 text-center shadow-2xl ring-1 ring-sky-500/20">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-lg shadow-sky-500/30">
            <Flame className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-white">Quest complete</h2>
          <p className="mt-2 text-sm text-neutral-400">
            You unlocked the Arena. Go find a tournament, follow an organizer, or message a player.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {QUESTS.filter((q) => q.id !== "welcome").map((q) => (
              <span
                key={q.id}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sm"
                title={q.title}
              >
                <span aria-hidden>{q.stamp}</span>
                <span className="text-[11px] font-semibold text-neutral-300">{q.title}</span>
              </span>
            ))}
          </div>
          <Button
            className="mt-6 w-full rounded-full bg-white text-black hover:bg-neutral-100"
            onClick={complete}
          >
            Enter the Arena
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal aria-labelledby="quest-title">
      <div
        className="fixed inset-0 bg-black/70"
        style={{
          pointerEvents: "auto",
          backdropFilter: reducedMotion.current ? undefined : "blur(3px)",
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
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
              transition: `left ${dur} ${ease}, top ${dur} ${ease}, width ${dur} ${ease}, height ${dur} ${ease}, border-radius ${dur} ${ease}`,
              zIndex: 201,
            }}
          />
          <div
            className="pointer-events-none fixed border-2 border-sky-400/80 shadow-[0_0_28px_rgba(56,189,248,0.45)]"
            style={{
              left: hole.left - 3,
              top: hole.top - 3,
              width: hole.width + 6,
              height: hole.height + 6,
              borderRadius: hole.radius + 3,
              transition: `left ${dur} ${ease}, top ${dur} ${ease}, width ${dur} ${ease}, height ${dur} ${ease}, border-radius ${dur} ${ease}`,
              zIndex: 202,
              animation: reducedMotion.current ? undefined : "questPulse 1.6s ease-in-out infinite",
            }}
          />
          <button
            type="button"
            className="fixed cursor-pointer border-0 bg-transparent p-0"
            style={{
              left: hole.left,
              top: hole.top,
              width: hole.width,
              height: hole.height,
              borderRadius: hole.radius,
              zIndex: 203,
            }}
            aria-label={`Discover ${current.title}`}
            onClick={unlockAndAdvance}
          />
        </>
      )}

      {pop && (
        <div
          className="pointer-events-none fixed inset-0 z-[230] flex items-center justify-center"
          aria-hidden
        >
          <span className="animate-in zoom-in-50 fade-in duration-300 text-5xl drop-shadow-lg">
            {current.stamp}
          </span>
        </div>
      )}

      <div
        className={cn(
          "rounded-2xl border border-white/15 bg-[#0c0c0e]/96 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl",
        )}
        style={{
          ...cardStyle,
          transition: reducedMotion.current
            ? `opacity ${dur} ease`
            : `left ${dur} ${ease}, top ${dur} ${ease}, opacity ${dur} ease`,
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500/30 to-violet-500/20 text-sky-300">
              <QuestIcon icon={current.icon} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-400">
                Arena Quest · {Math.min(step + 1, total)}/{total}
              </p>
              <h3 id="quest-title" className="text-base font-bold text-white">
                {current.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={complete}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label="Skip quest"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm font-medium leading-snug text-neutral-100">{current.hook}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{current.tip}</p>

        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Stamps collected">
          {QUESTS.map((q, i) => {
            const got = unlocked.includes(q.id) || i < step;
            return (
              <span
                key={q.id}
                className={cn(
                  "inline-flex h-7 min-w-7 items-center justify-center rounded-full border text-sm transition",
                  got
                    ? "border-sky-400/40 bg-sky-500/15 scale-105"
                    : i === step
                      ? "border-white/25 bg-white/10"
                      : "border-white/8 bg-white/[0.03] opacity-40",
                )}
                title={q.title}
              >
                {q.stamp}
              </span>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {isWelcome ? (
            <Button
              type="button"
              className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:from-sky-400 hover:to-violet-400"
              onClick={unlockAndAdvance}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Let's explore
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-neutral-400"
                onClick={complete}
              >
                Skip
              </Button>
              <Button
                type="button"
                size="sm"
                className="ml-auto rounded-full bg-white text-black hover:bg-neutral-100"
                onClick={unlockAndAdvance}
              >
                {isLast ? "Claim last stamp" : "Got it — next"}
              </Button>
            </>
          )}
        </div>
        {!isWelcome && hole && (
          <p className="mt-2 text-center text-[11px] text-neutral-500">
            or tap the glowing area to discover
          </p>
        )}
      </div>

      <style>{`
        @keyframes questPulse {
          0%, 100% { box-shadow: 0 0 18px rgba(56,189,248,0.35); }
          50% { box-shadow: 0 0 32px rgba(56,189,248,0.65); }
        }
      `}</style>
    </div>
  );
}
