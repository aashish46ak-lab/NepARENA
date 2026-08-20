import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

const MIN_MS = 1800;

type Phase = "in" | "hold" | "out";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("hold"), 400);
    const t2 = window.setTimeout(() => setPhase("out"), MIN_MS);
    const t3 = window.setTimeout(() => onDone(), MIN_MS + 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#07070a]"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.4s ease",
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
    >
      <div
        className="flex flex-col items-center"
        style={{
          transform: phase === "in" ? "scale(0.92)" : "scale(1)",
          opacity: phase === "in" ? 0.6 : 1,
          transition: "transform 0.5s ease, opacity 0.5s ease",
        }}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-sky-500/20 blur-2xl" />
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            className="relative h-20 w-20 rounded-3xl object-contain ring-1 ring-white/10"
            onError={(e) => {
              e.currentTarget.src = "/neparena-logo.png";
            }}
          />
        </div>

        <h1 className="mt-6 text-lg font-semibold tracking-[0.28em] text-white sm:text-xl">
          {PLATFORM_NAME}
        </h1>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-500">
          Esports · Worldwide
        </p>

        <div className="mt-8 h-0.5 w-16 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-sky-400/80"
            style={{
              width: phase === "out" ? "100%" : phase === "hold" ? "100%" : "20%",
              transition: "width 1.6s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
