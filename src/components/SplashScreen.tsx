import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

/**
 * Professional + fun splash:
 * arena pulse rings, logo rise, tagline, progress bar, smooth fade-out.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"boot" | "play" | "out">("boot");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("play"), 120);
    const t2 = window.setTimeout(() => setPhase("out"), 2100);
    const t3 = window.setTimeout(() => onDone?.(), 2680);
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(56,189,248,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(244,63,94,0.08)_0%,transparent_45%)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/30 animate-[floatdot_3.2s_ease-in-out_infinite]"
            style={{
              left: `${8 + ((i * 7) % 84)}%`,
              top: `${12 + ((i * 11) % 70)}%`,
              animationDelay: `${i * 0.18}s`,
              opacity: 0.15 + (i % 5) * 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative grid place-items-center">
        <span
          className={`absolute h-36 w-36 rounded-full border border-sky-400/20 ${
            phase === "play" ? "animate-[arenaring_1.6s_ease-out_infinite]" : "opacity-0"
          }`}
        />
        <span
          className={`absolute h-52 w-52 rounded-full border border-rose-400/15 ${
            phase === "play"
              ? "animate-[arenaring_1.6s_ease-out_0.25s_infinite]"
              : "opacity-0"
          }`}
        />
        <span
          className={`absolute h-72 w-72 rounded-full border border-white/5 ${
            phase === "play"
              ? "animate-[arenaring_1.6s_ease-out_0.5s_infinite]"
              : "opacity-0"
          }`}
        />

        <div
          className={`relative transition-all duration-700 ease-out ${
            phase === "boot"
              ? "scale-50 opacity-0 translate-y-6"
              : phase === "play"
                ? "scale-100 opacity-100 translate-y-0"
                : "scale-105 opacity-0 -translate-y-2"
          }`}
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-sky-400/25 via-transparent to-rose-400/20 blur-xl" />
            <img
              src="/neparena-logo.png"
              alt={PLATFORM_NAME}
              className="relative h-24 w-24 rounded-3xl object-contain bg-black p-2 shadow-[0_0_60px_rgba(56,189,248,0.25)] ring-1 ring-white/30 sm:h-28 sm:w-28"
              onError={(e) => {
                e.currentTarget.src = "/pwa-192x192.png";
              }}
            />
          </div>
        </div>
      </div>

      <div
        className={`mt-9 text-center transition-all duration-700 ${
          phase === "play"
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0"
        }`}
      >
        <p className="text-xl font-bold tracking-[0.22em] text-neutral-50">
          {PLATFORM_NAME}
        </p>
        <p className="mt-2 text-[11px] font-medium tracking-[0.28em] text-neutral-400">
          ONE PLATFORM · ENDLESS ARENAS
        </p>
      </div>

      <div className="mt-12 h-1 w-36 overflow-hidden rounded-full bg-white/10">
        <div className="h-full origin-left animate-[splashbar_2s_ease-in-out_forwards] bg-gradient-to-r from-sky-500 via-white to-rose-400" />
      </div>

      <style>{`
        @keyframes splashbar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes arenaring {
          0% { transform: scale(0.75); opacity: 0.55; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes floatdot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
