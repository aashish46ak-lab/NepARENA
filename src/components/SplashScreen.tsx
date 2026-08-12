import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

/**
 * Clean professional splash — dark stage, logo, thin progress, soft exit.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 2200;
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase("hold");
        window.setTimeout(() => setPhase("out"), 280);
        window.setTimeout(() => onDone?.(), 700);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-[#050505] transition-opacity duration-500 ${
        phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden
    >
      {/* Soft center glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06)_0%,transparent_55%)]" />

      <div
        className={`relative flex flex-col items-center transition-all duration-700 ease-out ${
          phase === "in"
            ? "translate-y-2 opacity-0 scale-95"
            : phase === "out"
              ? "-translate-y-1 opacity-0 scale-100"
              : "translate-y-0 opacity-100 scale-100"
        }`}
        style={phase === "in" ? { transitionDelay: "40ms" } : undefined}
      >
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-white/[0.04] blur-2xl" />
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            className="relative h-20 w-20 rounded-2xl object-contain bg-black p-2 ring-1 ring-white/15 sm:h-24 sm:w-24"
            onError={(e) => {
              e.currentTarget.src = "/pwa-192x192.png";
            }}
          />
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-[0.2em] text-white sm:text-2xl">
          {PLATFORM_NAME}
        </h1>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">
          Esports · Nepal
        </p>

        {/* Progress */}
        <div className="mt-10 h-[2px] w-40 overflow-hidden rounded-full bg-white/10 sm:w-52">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neutral-400 via-white to-neutral-400"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
