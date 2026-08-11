import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

/**
 * Professional + fun splash: infinity pulse, logo rise, arena rings, progress.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"boot" | "play" | "out">("boot");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("play"), 80);
    const t2 = window.setTimeout(() => setPhase("out"), 2400);
    const t3 = window.setTimeout(() => onDone?.(), 2950);
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(56,189,248,0.14)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_90%,rgba(244,63,94,0.1)_0%,transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,rgba(168,85,247,0.08)_0%,transparent_35%)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(16)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/40 animate-[floatdot_3.5s_ease-in-out_infinite]"
            style={{
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              left: `${5 + ((i * 6.3) % 90)}%`,
              top: `${8 + ((i * 9.1) % 78)}%`,
              animationDelay: `${i * 0.14}s`,
              opacity: 0.12 + (i % 4) * 0.08,
            }}
          />
        ))}
      </div>

      <div className="relative grid place-items-center">
        {[36, 52, 72].map((size, i) => (
          <span
            key={size}
            className={`absolute rounded-full border ${
              i === 0
                ? "border-sky-400/30"
                : i === 1
                  ? "border-rose-400/20"
                  : "border-violet-400/15"
            } ${phase === "play" ? "animate-[arenaring_1.7s_ease-out_infinite]" : "opacity-0"}`}
            style={{
              height: size * 4,
              width: size * 4,
              animationDelay: `${i * 0.22}s`,
            }}
          />
        ))}

        <div
          className={`relative transition-all duration-700 ease-out ${
            phase === "boot"
              ? "scale-50 opacity-0 translate-y-8 rotate-[-8deg]"
              : phase === "play"
                ? "scale-100 opacity-100 translate-y-0 rotate-0"
                : "scale-110 opacity-0 -translate-y-3"
          }`}
        >
          <div className="relative">
            <div className="absolute -inset-5 rounded-[2.2rem] bg-gradient-to-br from-sky-400/30 via-transparent to-rose-400/25 blur-2xl" />
            <img
              src="/neparena-logo.png"
              alt={PLATFORM_NAME}
              className="relative h-24 w-24 rounded-[1.6rem] object-contain bg-black p-2.5 shadow-[0_0_70px_rgba(56,189,248,0.3)] ring-1 ring-white/35 sm:h-28 sm:w-28"
              onError={(e) => {
                e.currentTarget.src = "/pwa-192x192.png";
              }}
            />
          </div>
        </div>
      </div>

      <div
        className={`mt-10 text-center transition-all duration-700 delay-100 ${
          phase === "play"
            ? "translate-y-0 opacity-100"
            : "translate-y-5 opacity-0"
        }`}
      >
        <p className="text-2xl font-bold tracking-[0.18em] text-neutral-50 sm:text-3xl">
          {PLATFORM_NAME}
        </p>
        <p className="mt-2.5 text-[11px] font-medium tracking-[0.32em] text-neutral-400">
          ONE PLATFORM · ENDLESS ARENAS
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Nepal's multi-organizer esports platform
        </p>
      </div>

      <div className="mt-14 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full origin-left animate-[splashbar_2.3s_ease-in-out_forwards] bg-gradient-to-r from-sky-400 via-white to-rose-400" />
      </div>

      <style>{`
        @keyframes splashbar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes arenaring {
          0% { transform: scale(0.7); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes floatdot {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.2); }
        }
      `}</style>
    </div>
  );
}
