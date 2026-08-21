import { useEffect, useRef, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

const SESSION_KEY = "neparena_splash_seen_v3";
const TOTAL_MS = 2200;

/** True only on first paint of a browser session */
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

/**
 * Short modern splash — first session load only.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [visible, setVisible] = useState(true);
  const doneRef = useRef(false);

  useEffect(() => {
    const img = new Image();
    img.src = "/pwa-192x192.png";

    const t1 = window.setTimeout(() => setPhase("hold"), 180);
    const t2 = window.setTimeout(() => setPhase("out"), 1750);
    const t3 = window.setTimeout(() => {
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
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-[#0a0a0a]"
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
            "radial-gradient(ellipse at 50% 38%, rgba(56,189,248,0.14), transparent 58%)",
          opacity: phase === "out" ? 0 : 1,
          transition: "opacity 0.5s ease",
        }}
      />

      <div
        className="pointer-events-none absolute left-1/2 top-[42%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/20"
        style={{
          transform: `translate(-50%, -50%) scale(${phase === "hold" ? 1.35 : phase === "out" ? 1.6 : 0.85})`,
          opacity: phase === "hold" ? 0.35 : 0,
          transition: "transform 1.2s ease, opacity 0.6s ease",
        }}
        aria-hidden
      />

      <div
        className="relative flex flex-col items-center"
        style={{
          opacity: phase === "in" ? 0 : 1,
          transform:
            phase === "in"
              ? "scale(0.9) translateY(12px)"
              : phase === "out"
                ? "scale(1.04) translateY(-4px)"
                : "scale(1) translateY(0)",
          transition:
            "opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div
          className="relative rounded-[1.25rem] p-1"
          style={{
            boxShadow:
              phase === "hold"
                ? "0 0 48px rgba(56,189,248,0.28), 0 0 0 1px rgba(56,189,248,0.15)"
                : "0 0 24px rgba(56,189,248,0.12)",
            transition: "box-shadow 0.55s ease",
          }}
        >
          <img
            src="/pwa-192x192.png"
            alt={PLATFORM_NAME}
            width={96}
            height={96}
            className="h-20 w-20 rounded-[1.1rem] bg-black object-contain sm:h-24 sm:w-24"
            onError={(e) => {
              e.currentTarget.src = "/neparena-logo.png";
            }}
          />
        </div>

        <h1
          className="mt-6 text-lg font-semibold tracking-[0.28em] text-white sm:text-xl"
          style={{
            opacity: phase === "in" ? 0 : 1,
            transform: phase === "in" ? "translateY(6px)" : "translateY(0)",
            transition: "opacity 0.5s ease 0.08s, transform 0.5s ease 0.08s",
          }}
        >
          {PLATFORM_NAME}
        </h1>
        <p
          className="mt-2 text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-500"
          style={{
            opacity: phase === "in" ? 0 : 1,
            transition: "opacity 0.5s ease 0.15s",
          }}
        >
          Esports · Worldwide
        </p>

        <div className="mt-8 h-0.5 w-20 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
            style={{
              width: phase === "in" ? "12%" : "100%",
              transition: "width 1.55s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
