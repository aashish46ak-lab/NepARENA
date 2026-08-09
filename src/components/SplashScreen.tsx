import { useEffect, useRef, useState } from "react";

/**
 * Client-only splash. Shows once per page load, then permanently dismissed.
 * Uses a ref guard so StrictMode double-mount cannot restart the animation loop.
 */
export function SplashScreen({ maxMs = 1200 }: { maxMs?: number }) {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const ran = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in dev — only allow one splash cycle
    if (ran.current) return;
    ran.current = true;

    const t1 = setTimeout(() => setPhase("in"), 20);
    const t2 = setTimeout(() => setPhase("out"), Math.max(500, maxMs - 350));
    const t3 = setTimeout(() => setPhase("hidden"), maxMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [maxMs]);

  if (phase === "hidden") return null;

  const exiting = phase === "out";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% 15%, #102044 0%, #0a162e 40%, #050b16 100%)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.03)" : "scale(1)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        pointerEvents: "none",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(56,189,248,0.22) 0%, transparent 50%)",
          animation: "na-glow 2.2s ease-in-out infinite alternate",
        }}
      />

      <div
        className="relative flex flex-col items-center gap-6 px-6"
        style={{
          animation: exiting ? undefined : "na-rise 0.65s cubic-bezier(.16,1,.3,1) both",
        }}
      >
        <div className="relative">
          <div
            className="absolute -inset-4 rounded-[32px] blur-2xl"
            style={{
              background: "rgba(59,130,246,0.35)",
              animation: "na-pulse 1.6s ease-in-out infinite",
            }}
          />
          <img
            src="/neparena-logo.png"
            alt="NepARENA"
            width={96}
            height={96}
            className="relative h-24 w-24 rounded-[24px] object-cover"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.12), 0 20px 50px rgba(0,0,0,0.45)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/android-chrome-512x512.png";
            }}
          />
        </div>

        <div className="text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: "rgba(147,197,253,0.95)" }}
          >
            NepARENA
          </p>
          <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl" style={{ color: "#f0f7ff" }}>
            Tournament Platform
          </p>
          <p className="mt-1.5 text-xs" style={{ color: "rgba(147,197,253,0.45)" }}>
            Host · Compete · Follow
          </p>
        </div>

        <div
          className="h-[3px] w-48 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: "40%",
              background: "linear-gradient(90deg, #38bdf8, #60a5fa, #818cf8)",
              animation: "na-bar 1s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes na-bar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(280%); }
        }
        @keyframes na-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes na-pulse {
          0%, 100% { opacity: 0.45; transform: scale(0.96); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }
        @keyframes na-glow {
          from { opacity: 0.55; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
