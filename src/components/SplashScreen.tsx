/**
 * Session splash — red & blue ribbons fly in, form a loop, then reveal NepARENA logo.
 */
import { useEffect, useRef, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

const SESSION_KEY = "neparena_splash_seen_v4";
const TOTAL_MS = 3200;

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

type Phase = "ribbons" | "loop" | "logo" | "out";

export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<Phase>("ribbons");
  const [visible, setVisible] = useState(true);
  const doneRef = useRef(false);

  useEffect(() => {
    const img = new Image();
    img.src = "/neparena-logo.png";

    const t1 = window.setTimeout(() => setPhase("loop"), 700);
    const t2 = window.setTimeout(() => setPhase("logo"), 1500);
    const t3 = window.setTimeout(() => setPhase("out"), 2700);
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

  const showRibbons = phase === "ribbons" || phase === "loop";
  const showLogo = phase === "logo" || phase === "out";

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden bg-[#06060a]"
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
            "radial-gradient(ellipse at 50% 42%, rgba(37,99,235,0.18), transparent 55%), radial-gradient(ellipse at 50% 55%, rgba(220,38,38,0.12), transparent 50%)",
        }}
      />

      <div
        className="pointer-events-none absolute"
        style={{
          width: 220,
          height: 28,
          borderRadius: 999,
          background: "linear-gradient(90deg, #dc2626, #f87171, #dc2626)",
          boxShadow: "0 0 28px rgba(220,38,38,0.55)",
          top: "42%",
          left: "50%",
          transform:
            phase === "ribbons"
              ? "translate(-180%, -50%) rotate(-18deg)"
              : phase === "loop"
                ? "translate(-55%, -80%) rotate(-25deg) scale(0.85)"
                : "translate(-50%, -50%) scale(0)",
          opacity: showRibbons ? 1 : 0,
          transition: "transform 0.75s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
        }}
      />

      <div
        className="pointer-events-none absolute"
        style={{
          width: 220,
          height: 28,
          borderRadius: 999,
          background: "linear-gradient(90deg, #1d4ed8, #60a5fa, #1d4ed8)",
          boxShadow: "0 0 28px rgba(37,99,235,0.55)",
          top: "48%",
          left: "50%",
          transform:
            phase === "ribbons"
              ? "translate(80%, -50%) rotate(18deg)"
              : phase === "loop"
                ? "translate(-45%, -20%) rotate(25deg) scale(0.85)"
                : "translate(-50%, -50%) scale(0)",
          opacity: showRibbons ? 1 : 0,
          transition: "transform 0.75s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
        }}
      />

      {phase === "loop" && (
        <div
          className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 120,
            height: 64,
            borderRadius: "50%",
            border: "10px solid transparent",
            borderTopColor: "#dc2626",
            borderBottomColor: "#2563eb",
            boxShadow: "0 0 40px rgba(99,102,241,0.35)",
            animation: "na-loop-pulse 0.9s ease infinite alternate",
          }}
        />
      )}

      <div
        className="relative z-10 flex flex-col items-center"
        style={{
          opacity: showLogo ? 1 : 0,
          transform: showLogo
            ? phase === "out"
              ? "scale(1.06) translateY(-6px)"
              : "scale(1) translateY(0)"
            : "scale(0.7) translateY(16px)",
          transition:
            "opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div
          className="rounded-[1.35rem] p-[3px]"
          style={{
            background: "linear-gradient(135deg, #dc2626, #2563eb, #dc2626)",
            boxShadow: "0 0 48px rgba(37,99,235,0.35), 0 0 24px rgba(220,38,38,0.25)",
          }}
        >
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            width={96}
            height={96}
            className="h-20 w-20 rounded-[1.2rem] bg-[#0a0a0a] object-contain sm:h-24 sm:w-24"
            onError={(e) => {
              e.currentTarget.src = "/pwa-192x192.png";
            }}
          />
        </div>
        <h1 className="mt-5 text-lg font-semibold tracking-[0.28em] text-white sm:text-xl">
          {PLATFORM_NAME}
        </h1>
        <p className="mt-1.5 text-[11px] font-medium tracking-wide text-neutral-400">
          Compete. Connect. Conquer.
        </p>
      </div>

      <style>{`
        @keyframes na-loop-pulse {
          from { transform: translate(-50%, -50%) scale(0.92); opacity: 0.85; }
          to { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
