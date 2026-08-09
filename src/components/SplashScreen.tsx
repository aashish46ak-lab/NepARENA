import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Figma-style launch splash — dark navy, logo, progress bar.
 * Covers the blue blank during auth / client route load so users
 * never see an empty blue screen between SSR and hydration.
 */
export function SplashScreen({
  force = false,
  minMs = 900,
}: {
  /** Keep visible while parent says loading */
  force?: boolean;
  minMs?: number;
}) {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), minMs);
    return () => clearTimeout(t);
  }, [minMs]);

  useEffect(() => {
    if (force || !minDone) return;
    setFade(true);
    const t = setTimeout(() => setVisible(false), 420);
    return () => clearTimeout(t);
  }, [force, minDone]);

  // If force goes true again (route change), bring splash back briefly
  useEffect(() => {
    if (force) {
      setVisible(true);
      setFade(false);
    }
  }, [force]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[300] flex flex-col items-center justify-center",
        "transition-opacity duration-400",
        fade && "opacity-0 pointer-events-none",
      )}
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 20%, #0b1835 0%, #061226 45%, #02040a 100%)",
      }}
    >
      {/* soft glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(37,99,235,0.25) 0%, transparent 55%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-5 px-6">
        <div className="relative">
          <div className="absolute -inset-3 rounded-[28px] bg-blue-500/20 blur-xl" />
          <img
            src="/neparena-logo.png"
            alt="NepARENA"
            className="relative h-[88px] w-[88px] rounded-[22px] object-cover shadow-2xl ring-1 ring-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/android-chrome-512x512.png";
            }}
          />
        </div>

        <div className="text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-300/90"
          >
            NepARENA
          </p>
          <p className="mt-1.5 text-lg font-bold tracking-tight text-white sm:text-xl">
            Tournament Platform
          </p>
          <p className="mt-1 text-xs text-blue-200/50">
            Host · Compete · Follow
          </p>
        </div>

        {/* progress bar */}
        <div className="mt-2 h-[3px] w-44 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-400 via-sky-300 to-blue-500"
            style={{
              animation: "neparena-splash-bar 1.05s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes neparena-splash-bar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(340%); }
        }
      `}</style>
    </div>
  );
}

/** Full-screen pending state for ssr:false routes (dashboard / platform). */
export function RoutePendingSplash() {
  return <SplashScreen force minMs={400} />;
}
