import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

/** Professional splash — logo pulse, soft rings, smooth exit. */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("hold"), 350);
    const t2 = window.setTimeout(() => setPhase("out"), 1800);
    const t3 = window.setTimeout(() => onDone?.(), 2350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden bg-[#050505] transition-opacity duration-500 ${
        phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* soft ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.07)_0%,transparent_55%)]" />

      <div className="relative grid place-items-center">
        {/* expanding rings */}
        <span
          className={`absolute h-40 w-40 rounded-full border border-white/10 ${
            phase === "hold" ? "animate-[splashring_1.4s_ease-out_infinite]" : "opacity-0"
          }`}
        />
        <span
          className={`absolute h-56 w-56 rounded-full border border-white/5 ${
            phase === "hold" ? "animate-[splashring_1.4s_ease-out_0.35s_infinite]" : "opacity-0"
          }`}
        />

        <div
          className={`relative transition-all duration-700 ease-out ${
            phase === "in"
              ? "scale-50 opacity-0 rotate-[-8deg]"
              : phase === "hold"
                ? "scale-100 opacity-100 rotate-0"
                : "scale-110 opacity-0"
          }`}
        >
          <div className="relative">
            <div className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-white/20 via-transparent to-white/5 blur-md" />
            <img
              src="/neparena-logo.png"
              alt={PLATFORM_NAME}
              className="relative h-24 w-24 rounded-3xl object-contain bg-black p-1.5 shadow-[0_0_80px_rgba(255,255,255,0.15)] ring-1 ring-white/25 sm:h-28 sm:w-28"
              onError={(e) => {
                e.currentTarget.src = "/pwa-192x192.png";
              }}
            />
          </div>
        </div>
      </div>

      <div
        className={`mt-8 text-center transition-all duration-700 ${
          phase === "hold"
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        }`}
      >
        <p className="text-lg font-semibold tracking-[0.28em] text-neutral-100">
          {PLATFORM_NAME}
        </p>
        <p className="mt-1.5 text-[11px] tracking-[0.2em] text-neutral-500">
          ONE PLATFORM · ENDLESS ARENAS
        </p>
      </div>

      <div className="mt-10 h-0.5 w-28 overflow-hidden rounded-full bg-white/10">
        <div className="h-full origin-left animate-[splashbar_1.7s_ease-in-out_forwards] bg-gradient-to-r from-neutral-600 via-neutral-200 to-neutral-600" />
      </div>

      <style>{`
        @keyframes splashbar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes splashring {
          0% { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1.25); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
