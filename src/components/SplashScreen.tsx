import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

/** Premium splash — smooth logo scale + fade. */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("hold"), 400);
    const t2 = window.setTimeout(() => setPhase("out"), 1600);
    const t3 = window.setTimeout(() => onDone?.(), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-500 ${
        phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div
        className={`transition-all duration-700 ease-out ${
          phase === "in"
            ? "scale-75 opacity-0"
            : phase === "hold"
              ? "scale-100 opacity-100"
              : "scale-105 opacity-0"
        }`}
      >
        <img
          src="/neparena-logo.png"
          alt={PLATFORM_NAME}
          className="h-24 w-24 rounded-3xl object-contain bg-black shadow-[0_0_60px_rgba(255,255,255,0.12)] ring-1 ring-white/20 p-1"
          onError={(e) => {
            e.currentTarget.src = "/android-chrome-512x512.png";
          }}
        />
      </div>
      <p
        className={`mt-6 text-sm font-medium tracking-[0.35em] text-neutral-400 transition-opacity duration-700 ${
          phase === "hold" ? "opacity-100" : "opacity-0"
        }`}
      >
        {PLATFORM_NAME}
      </p>
      <div className="mt-10 h-0.5 w-24 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-full origin-left animate-[splashbar_1.6s_ease-in-out_forwards] bg-gradient-to-r from-neutral-500 to-neutral-200" />
      </div>
      <style>{`
        @keyframes splashbar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
