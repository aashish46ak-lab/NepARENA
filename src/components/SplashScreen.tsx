/**
 * Splash — logo + loading bar with rolling ball → goal net → ball scores → done.
 */
import { useEffect, useRef, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

const SESSION_KEY = "neparena_splash_seen_v5";
const TOTAL_MS = 3400;

export function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
  } catch {
    /* private mode */
  }
  return true;
}

function markSplashSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

type Phase = "in" | "roll" | "goal" | "out";

export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<Phase>("in");
  const [visible, setVisible] = useState(true);
  const doneRef = useRef(false);

  useEffect(() => {
    const img = new Image();
    img.src = "/neparena-logo.png";

    const t1 = window.setTimeout(() => setPhase("roll"), 280);
    const t2 = window.setTimeout(() => setPhase("goal"), 2400);
    const t3 = window.setTimeout(() => setPhase("out"), 3000);
    const t4 = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      markSplashSeen();
      setVisible(false);
      onDone?.();
    }, TOTAL_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onDone]);

  if (!visible) return null;

  const progress =
    phase === "in" ? 0 : phase === "roll" ? 88 : phase === "goal" ? 100 : 100;

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0a]"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.45s cubic-bezier(0.22,1,0.36,1)",
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(56,189,248,0.12), transparent 55%)",
        }}
      />

      <div
        className="relative z-10 flex flex-col items-center"
        style={{
          opacity: phase === "in" ? 0 : 1,
          transform:
            phase === "in"
              ? "scale(0.88) translateY(10px)"
              : phase === "out"
                ? "scale(1.04) translateY(-4px)"
                : "scale(1)",
          transition:
            "opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <img
          src="/neparena-logo.png"
          alt={PLATFORM_NAME}
          width={96}
          height={96}
          className="h-20 w-20 rounded-[1.2rem] bg-black object-contain shadow-lg ring-1 ring-white/15 sm:h-24 sm:w-24"
          onError={(e) => {
            e.currentTarget.src = "/pwa-192x192.png";
          }}
        />
        <h1 className="mt-5 text-lg font-semibold tracking-[0.28em] text-white sm:text-xl">
          {PLATFORM_NAME}
        </h1>
        <p className="mt-1.5 text-[11px] font-medium tracking-wide text-neutral-500">
          Compete. Connect. Conquer.
        </p>
      </div>

      <div className="relative z-10 mt-12 w-[min(280px,78vw)]">
        <div className="relative h-3 overflow-visible rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400"
            style={{
              width: `${progress}%`,
              transition:
                phase === "roll"
                  ? "width 2.1s cubic-bezier(0.22,1,0.36,1)"
                  : "width 0.35s ease",
            }}
          />

          <div
            className="absolute top-1/2 z-20"
            style={{
              width: 22,
              height: 22,
              marginTop: -11,
              left:
                phase === "in"
                  ? "0%"
                  : phase === "roll"
                    ? "calc(88% - 11px)"
                    : "calc(100% - 6px)",
              transition:
                phase === "roll"
                  ? "left 2.1s cubic-bezier(0.22,1,0.36,1)"
                  : phase === "goal"
                    ? "left 0.35s cubic-bezier(0.34,1.4,0.64,1)"
                    : "left 0.2s ease",
              opacity: phase === "goal" || phase === "out" ? 0.2 : 1,
            }}
          >
            <div
              className="h-full w-full rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #fff 0%, #e5e5e5 45%, #a3a3a3 100%)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)",
                animation:
                  phase === "roll"
                    ? "na-ball-spin 0.55s linear infinite"
                    : undefined,
              }}
            />
          </div>

          <div
            className="absolute -right-1 top-1/2 z-10"
            style={{
              width: 28,
              height: 36,
              marginTop: -18,
              opacity: phase === "in" ? 0 : 1,
              transform: phase === "goal" || phase === "out" ? "scale(1.08)" : "scale(1)",
              transition: "opacity 0.4s ease 0.3s, transform 0.3s ease",
            }}
          >
            <div className="absolute inset-y-0 left-0 w-[2px] bg-white/90" />
            <div className="absolute left-0 right-0 top-0 h-[2px] bg-white/90" />
            <div className="absolute inset-y-0 right-0 w-[2px] bg-white/90" />
            <div
              className="absolute inset-[3px] opacity-70"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                backgroundSize: "5px 5px",
              }}
            />
            {(phase === "goal" || phase === "out") && (
              <div
                className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 30%, #fff, #d4d4d4)",
                  boxShadow: "0 0 12px rgba(255,255,255,0.5)",
                  animation: "na-goal-pop 0.4s cubic-bezier(0.34,1.4,0.64,1) both",
                }}
              />
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">
          {phase === "goal" || phase === "out" ? "Goal!" : "Loading…"}
        </p>
      </div>

      <style>{`
        @keyframes na-ball-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes na-goal-pop {
          0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
          70% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
