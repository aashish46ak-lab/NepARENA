import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfileStreak, recordLoginStreak } from "@/lib/streaks";
import { cn } from "@/lib/utils";

const SESSION_KEY = "neparena_streak_assistant_v1";

export function StreakAssistant() {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"enter" | "talk" | "exit">("enter");
  const [line, setLine] = useState("");
  const [streak, setStreak] = useState(0);
  const [dimmed, setDimmed] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      if (Math.random() > 0.42) {
        sessionStorage.setItem(SESSION_KEY, "skip");
        return;
      }
    } catch {
      /* private mode */
    }

    let cancelled = false;
    (async () => {
      const rec = await recordLoginStreak();
      let s = 0;
      let dim = false;
      if (rec.ok) {
        s = rec.streak;
        dim = false;
      } else {
        const f = await fetchProfileStreak(user.id);
        s = f.streak;
        dim = f.dimmed;
      }
      if (cancelled) return;
      setStreak(s);
      setDimmed(dim);
      if (s <= 0) {
        setLine("Log in every day (local midnight) to build your streak.");
      } else if (dim) {
        setLine(`Your ${s}-day streak is cooling — log in before midnight to keep the fire!`);
      } else if (s < 3) {
        setLine(`You're on a ${s}-day streak. Reach 3 days to unlock the badge!`);
      } else {
        setLine(`You're on a ${s}-day streak. Keep logging in daily!`);
      }
      setVisible(true);
      setPhase("enter");
      window.setTimeout(() => setPhase("talk"), 700);
      window.setTimeout(() => setPhase("exit"), 5200);
      window.setTimeout(() => {
        setVisible(false);
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* ignore */
        }
      }, 6000);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-20 left-0 z-[80] sm:bottom-24"
      aria-live="polite"
    >
      <div
        className="flex items-end gap-2 pl-3"
        style={{
          transform:
            phase === "enter"
              ? "translateX(-120%)"
              : phase === "exit"
                ? "translateX(-130%)"
                : "translateX(0)",
          transition: "transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          className="relative text-4xl drop-shadow-lg"
          style={{
            animation:
              phase === "talk" ? "neparena-ball-roll 0.9s ease-out" : undefined,
          }}
        >
          ⚽
        </div>
        <div
          className="mb-1 max-w-[220px] rounded-2xl border border-white/15 bg-black/85 px-3 py-2 text-xs text-neutral-100 shadow-xl backdrop-blur-md sm:max-w-[260px]"
          style={{
            opacity: phase === "talk" ? 1 : 0,
            transform: phase === "talk" ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
        >
          <p className="font-semibold text-sky-300">👋 Hi! I'm Streak.</p>
          <p className="mt-1 leading-relaxed text-neutral-300">{line}</p>
          {streak > 0 && (
            <p className={cn("mt-1.5 text-[11px] font-bold", dimmed ? "text-neutral-400" : "text-amber-300")}>
              {dimmed ? "🧊" : "🔥"}⚽ {streak} Day Streak{dimmed ? " · dim" : ""}
            </p>
          )}
        </div>
      </div>
      <style>{`
        @keyframes neparena-ball-roll {
          0% { transform: rotate(-40deg) translateX(-8px); }
          100% { transform: rotate(0deg) translateX(0); }
        }
      `}</style>
    </div>
  );
}
