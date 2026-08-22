/**
 * Splash — logo + realistic pitch, ball rolls into the goal net, then fade out.
 */
import { useEffect, useRef, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

const SESSION_KEY = "neparena_splash_seen_v6";
const TOTAL_MS = 3800;

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

    const t1 = window.setTimeout(() => setPhase("roll"), 350);
    const t2 = window.setTimeout(() => setPhase("goal"), 2700);
    const t3 = window.setTimeout(() => setPhase("out"), 3400);
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

  const ballLeft =
    phase === "in" ? "6%" : phase === "roll" ? "78%" : "86%";

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden bg-[#060806]"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.5s cubic-bezier(0.22,1,0.36,1)",
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(34,120,60,0.18), transparent 55%)",
        }}
      />

      <div
        className="relative z-10 flex flex-col items-center"
        style={{
          opacity: phase === "in" ? 0 : 1,
          transform:
            phase === "in"
              ? "scale(0.9) translateY(12px)"
              : phase === "out"
                ? "scale(1.03) translateY(-6px)"
                : "scale(1)",
          transition:
            "opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)",
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
      </div>

      <div
        className="relative z-10 mt-10 w-[min(320px,86vw)]"
        style={{
          opacity: phase === "in" ? 0 : 1,
          transition: "opacity 0.5s ease 0.15s",
        }}
      >
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            height: 72,
            background:
              "repeating-linear-gradient(90deg, #1a6b3a 0px, #1a6b3a 28px, #185f34 28px, #185f34 56px)",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.08), 0 12px 28px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="absolute inset-x-3 top-2 bottom-2 rounded-sm"
            style={{ border: "1.5px solid rgba(255,255,255,0.35)" }}
          />
          <div
            className="absolute top-2 bottom-2 left-1/2 w-px -translate-x-1/2"
            style={{ background: "rgba(255,255,255,0.3)" }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ border: "1.5px solid rgba(255,255,255,0.28)" }}
          />
          <div
            className="absolute left-3 top-1/2 h-10 w-8 -translate-y-1/2"
            style={{ border: "1.5px solid rgba(255,255,255,0.22)" }}
          />
          <div
            className="absolute right-3 top-1/2 h-12 w-10 -translate-y-1/2"
            style={{ border: "1.5px solid rgba(255,255,255,0.28)" }}
          />

          <div
            className="absolute right-[6px] top-1/2 z-20"
            style={{
              width: 26,
              height: 42,
              marginTop: -21,
              transform:
                phase === "goal" || phase === "out" ? "scale(1.05)" : "scale(1)",
              transition: "transform 0.25s ease",
            }}
          >
            <div
              className="absolute inset-y-0 left-0 w-[2.5px] rounded-full"
              style={{ background: "linear-gradient(#f5f5f5, #d4d4d4)" }}
            />
            <div
              className="absolute left-0 right-0 top-0 h-[2.5px] rounded-full"
              style={{ background: "linear-gradient(90deg, #f5f5f5, #e5e5e5)" }}
            />
            <div
              className="absolute inset-y-0 right-0 w-[2.5px] rounded-full"
              style={{ background: "linear-gradient(#f5f5f5, #d4d4d4)" }}
            />
            <div
              className="absolute inset-[3px] right-[2px]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "4px 4px",
                opacity: 0.85,
              }}
            />
            {(phase === "goal" || phase === "out") && (
              <div
                className="absolute left-[6px] top-1/2 z-30"
                style={{
                  width: 14,
                  height: 14,
                  marginTop: -7,
                  animation:
                    "na-goal-settle 0.45s cubic-bezier(0.34,1.3,0.64,1) both",
                }}
              >
                <FootballBall size={14} spinning={false} />
              </div>
            )}
          </div>

          <div
            className="absolute bottom-[14px] z-10 h-[5px] rounded-full"
            style={{
              width: 20,
              left: ballLeft,
              marginLeft: -2,
              background: "rgba(0,0,0,0.35)",
              filter: "blur(2px)",
              transition:
                phase === "roll"
                  ? "left 2.3s cubic-bezier(0.25,0.1,0.25,1)"
                  : phase === "goal"
                    ? "left 0.3s ease, opacity 0.25s ease"
                    : "left 0.2s ease",
              opacity: phase === "goal" || phase === "out" ? 0 : 0.7,
            }}
          />

          <div
            className="absolute z-30"
            style={{
              width: 22,
              height: 22,
              bottom: 16,
              left: ballLeft,
              marginLeft: -11,
              transition:
                phase === "roll"
                  ? "left 2.3s cubic-bezier(0.25,0.1,0.25,1)"
                  : phase === "goal"
                    ? "left 0.28s cubic-bezier(0.4,0,1,1), opacity 0.2s ease 0.15s"
                    : "left 0.2s ease",
              opacity: phase === "goal" || phase === "out" ? 0 : 1,
            }}
          >
            <FootballBall size={22} spinning={phase === "roll"} />
          </div>
        </div>

        <p className="mt-3.5 text-center text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">
          {phase === "goal" || phase === "out" ? "Goal!" : "Loading…"}
        </p>
      </div>

      <style>{`
        @keyframes na-ball-roll {
          from { transform: rotate(0deg); }
          to { transform: rotate(720deg); }
        }
        @keyframes na-goal-settle {
          0% { transform: scale(0.5) translateX(-8px); opacity: 0; }
          60% { transform: scale(1.12) translateX(0); opacity: 1; }
          100% { transform: scale(1) translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** Classic black/white panel football — pure CSS, no icons */
function FootballBall({ size, spinning }: { size: number; spinning: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 32% 28%, #ffffff 0%, #f3f3f3 42%, #d0d0d0 78%, #a8a8a8 100%)",
        boxShadow:
          "0 2px 4px rgba(0,0,0,0.45), inset 0 -2px 3px rgba(0,0,0,0.18), inset 0 1px 2px rgba(255,255,255,0.7)",
        animation: spinning ? "na-ball-roll 0.9s linear infinite" : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          width: size * 0.32,
          height: size * 0.32,
          marginLeft: -(size * 0.16),
          marginTop: -(size * 0.16),
          background: "#111",
          clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
          opacity: 0.92,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "12%",
          borderRadius: "50%",
          border: `${Math.max(1, size * 0.06)}px solid rgba(20,20,20,0.55)`,
          borderTopColor: "transparent",
          borderLeftColor: "rgba(20,20,20,0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: "55%",
          width: "38%",
          height: "28%",
          borderRadius: "50%",
          border: `${Math.max(1, size * 0.05)}px solid rgba(15,15,15,0.7)`,
          borderBottomColor: "transparent",
          borderRightColor: "transparent",
          transform: "rotate(-25deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "8%",
          top: "55%",
          width: "38%",
          height: "28%",
          borderRadius: "50%",
          border: `${Math.max(1, size * 0.05)}px solid rgba(15,15,15,0.7)`,
          borderBottomColor: "transparent",
          borderLeftColor: "transparent",
          transform: "rotate(25deg)",
        }}
      />
    </div>
  );
}
