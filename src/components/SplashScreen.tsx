import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

/**
 * Premium splash:
 * 1) Emerge from fade
 * 2) Top-right shine sweep
 * 3) Collapse exit into the page
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"boot" | "show" | "collapse">("boot");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Boot → content fades in
    const tShow = window.setTimeout(() => setPhase("show"), 80);

    const start = performance.now();
    const duration = 2400;
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // Hold briefly then collapse away
        window.setTimeout(() => setPhase("collapse"), 320);
        window.setTimeout(() => onDone?.(), 980);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearTimeout(tShow);
      cancelAnimationFrame(raf);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden bg-[#030303]"
      style={{
        transition:
          phase === "collapse"
            ? "transform 0.65s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.55s ease, border-radius 0.65s ease"
            : undefined,
        transform:
          phase === "collapse"
            ? "scale(0.08) translateY(-8%)"
            : phase === "boot"
              ? "scale(1.02)"
              : "scale(1)",
        opacity: phase === "collapse" ? 0 : phase === "boot" ? 0.92 : 1,
        borderRadius: phase === "collapse" ? "50%" : "0",
        pointerEvents: phase === "collapse" ? "none" : "auto",
      }}
      aria-hidden
    >
      {/* Ambient base */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.07)_0%,transparent_55%)]" />

      {/* Top-right shine sweep */}
      <div
        className="pointer-events-none absolute -right-1/4 -top-1/4 h-[70vmax] w-[70vmax]"
        style={{
          background:
            "conic-gradient(from 200deg at 30% 30%, transparent 0deg, rgba(255,255,255,0.14) 40deg, transparent 90deg)",
          animation: "neparenaShine 2.8s ease-in-out infinite",
          opacity: phase === "collapse" ? 0 : 1,
          transition: "opacity 0.4s ease",
        }}
      />
      {/* Diagonal light streak top-right → center */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ opacity: phase === "show" ? 1 : 0, transition: "opacity 0.6s ease" }}
      >
        <div
          className="absolute -right-20 top-0 h-[140%] w-24 origin-top-right rotate-[-28deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), rgba(255,255,255,0.22), rgba(255,255,255,0.08), transparent)",
            animation: "neparenaStreak 2.2s ease-in-out infinite",
            filter: "blur(6px)",
          }}
        />
      </div>

      {/* Content — fade emerge */}
      <div
        className="relative flex flex-col items-center"
        style={{
          opacity: phase === "boot" ? 0 : phase === "collapse" ? 0 : 1,
          transform:
            phase === "boot"
              ? "translateY(18px) scale(0.92)"
              : phase === "collapse"
                ? "translateY(-12px) scale(0.96)"
                : "translateY(0) scale(1)",
          transition:
            "opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1), transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="relative">
          {/* Soft halo */}
          <div
            className="absolute -inset-10 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
              animation: phase === "show" ? "neparenaPulse 2s ease-in-out infinite" : undefined,
            }}
          />
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            className="relative h-[5.25rem] w-[5.25rem] rounded-[1.35rem] object-contain bg-black p-2.5 ring-1 ring-white/20 sm:h-24 sm:w-24"
            style={{
              boxShadow: "0 0 40px rgba(255,255,255,0.08), 0 12px 40px rgba(0,0,0,0.5)",
            }}
            onError={(e) => {
              e.currentTarget.src = "/pwa-192x192.png";
            }}
          />
        </div>

        <h1
          className="mt-7 text-xl font-semibold tracking-[0.28em] text-white sm:text-2xl"
          style={{
            textShadow: "0 0 24px rgba(255,255,255,0.15)",
            letterSpacing: "0.28em",
          }}
        >
          {PLATFORM_NAME}
        </h1>
        <p className="mt-2.5 text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500 sm:text-[11px]">
          Esports · Nepal
        </p>

        {/* Progress line */}
        <div className="mt-12 h-[2px] w-44 overflow-hidden rounded-full bg-white/[0.08] sm:w-56">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.35), #fff, rgba(255,255,255,0.4))",
              boxShadow: "0 0 12px rgba(255,255,255,0.35)",
              transition: "width 0.05s linear",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes neparenaShine {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.55; }
          50% { transform: rotate(18deg) scale(1.06); opacity: 0.95; }
        }
        @keyframes neparenaStreak {
          0% { transform: rotate(-28deg) translateX(40%); opacity: 0; }
          25% { opacity: 0.9; }
          55% { opacity: 0.5; }
          100% { transform: rotate(-28deg) translateX(-120%); opacity: 0; }
        }
        @keyframes neparenaPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
