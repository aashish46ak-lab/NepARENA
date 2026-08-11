import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

/**
 * Professional + fun splash: soft grid, pulsing arena rings, logo rise, progress.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"boot" | "play" | "out">("boot");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("play"), 60);
    const t2 = window.setTimeout(() => setPhase("out"), 2600);
    const t3 = window.setTimeout(() => onDone?.(), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden bg-[#030303] transition-opacity duration-500 ${
        phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(56,189,248,0.16)_0%,transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_85%,rgba(244,63,94,0.12)_0%,transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_10%,rgba(168,85,247,0.1)_0%,transparent_35%)]" />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
        }}
      />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white animate-[floatdot_4s_ease-in-out_infinite]"
            style={{
              width: 2 + (i % 4),
              height: 2 + (i % 4),
              left: `${4 + ((i * 4.7) % 92)}%`,
              top: `${6 + ((i * 7.3) % 82)}%`,
              animationDelay: `${i * 0.12}s`,
              opacity: 0.1 + (i % 5) * 0.06,
            }}
          />
        ))}
      </div>

      {/* Logo + rings */}
      <div className="relative grid place-items-center">
        {[40, 58, 80].map((size, i) => (
          <span
            key={size}
            className={`absolute rounded-full border ${
              i === 0
                ? "border-sky-400/40"
                : i === 1
                  ? "border-rose-400/25"
                  : "border-violet-400/20"
            } ${phase === "play" ? "animate-[arenaring_2s_ease-out_infinite]" : "opacity-0"}`}
            style={{
              height: size * 4,
              width: size * 4,
              animationDelay: `${i * 0.28}s`,
            }}
          />
        ))}

        <div
          className={`relative transition-all duration-800 ease-out ${
            phase === "boot"
              ? "scale-40 opacity-0 translate-y-10 rotate-[-12deg]"
              : phase === "play"
                ? "scale-100 opacity-100 translate-y-0 rotate-0"
                : "scale-110 opacity-0 -translate-y-4"
          }`}
          style={{ transitionDuration: "800ms" }}
        >
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.4rem] bg-gradient-to-br from-sky-400/35 via-transparent to-rose-400/30 blur-3xl animate-[glowpulse_2.2s_ease-in-out_infinite]" />
            <img
              src="/neparena-logo.png"
              alt={PLATFORM_NAME}
              className="relative h-24 w-24 rounded-[1.6rem] object-contain bg-black p-2.5 shadow-[0_0_80px_rgba(56,189,248,0.35)] ring-1 ring-white/40 sm:h-28 sm:w-28"
              onError={(e) => {
                e.currentTarget.src = "/pwa-192x192.png";
              }}
            />
          </div>
        </div>
      </div>

      {/* Brand text */}
      <div
        className={`mt-11 text-center transition-all duration-700 ${
          phase === "play"
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0"
        }`}
        style={{ transitionDelay: phase === "play" ? "120ms" : "0ms" }}
      >
        <p className="text-2xl font-bold tracking-[0.2em] text-neutral-50 sm:text-3xl">
          {PLATFORM_NAME}
        </p>
        <p className="mt-2.5 text-[11px] font-medium tracking-[0.35em] text-neutral-400">
          ONE PLATFORM · ENDLESS ARENAS
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Nepal's multi-organizer esports platform
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-14 h-1 w-44 overflow-hidden rounded-full bg-white/10">
        <div className="h-full origin-left animate-[splashbar_2.5s_cubic-bezier(0.22,1,0.36,1)_forwards] bg-gradient-to-r from-sky-400 via-white to-rose-400" />
      </div>

      <style>{`
        @keyframes splashbar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes arenaring {
          0% { transform: scale(0.65); opacity: 0.55; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes floatdot {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-14px) scale(1.25); }
        }
        @keyframes glowpulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
