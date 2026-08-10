import { useEffect, useState } from "react";

/**
 * Two silver balls fly in from sides → collide → burst → NepARENA logo.
 * Shows once per session tab.
 */
const KEY = "neparena-splash-seen";

export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"in" | "hit" | "logo" | "out" | "gone">(
    "in",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(KEY)) {
        setPhase("gone");
        onDone?.();
        return;
      }
    } catch {
      /* ignore */
    }

    const t1 = setTimeout(() => setPhase("hit"), 700);
    const t2 = setTimeout(() => setPhase("logo"), 1050);
    const t3 = setTimeout(() => setPhase("out"), 2200);
    const t4 = setTimeout(() => {
      setPhase("gone");
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
      onDone?.();
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onDone]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: "#0a0a0a",
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
    >
      {/* Left ball */}
      <div
        className="absolute h-14 w-14 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #fff 0%, #c0c0c0 45%, #666 100%)",
          boxShadow: "0 0 24px rgba(255,255,255,0.25)",
          left: phase === "in" ? "-20%" : "42%",
          top: "50%",
          transform:
            phase === "hit" || phase === "logo" || phase === "out"
              ? "translate(-50%, -50%) scale(0)"
              : "translateY(-50%)",
          transition:
            phase === "in"
              ? "left 0.7s cubic-bezier(0.22,1,0.36,1)"
              : "transform 0.35s ease, opacity 0.35s ease",
          opacity: phase === "logo" || phase === "out" ? 0 : 1,
        }}
      />
      {/* Right ball */}
      <div
        className="absolute h-14 w-14 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #fff 0%, #c0c0c0 45%, #666 100%)",
          boxShadow: "0 0 24px rgba(255,255,255,0.25)",
          right: phase === "in" ? "-20%" : "42%",
          top: "50%",
          transform:
            phase === "hit" || phase === "logo" || phase === "out"
              ? "translate(50%, -50%) scale(0)"
              : "translateY(-50%)",
          transition:
            phase === "in"
              ? "right 0.7s cubic-bezier(0.22,1,0.36,1)"
              : "transform 0.35s ease, opacity 0.35s ease",
          opacity: phase === "logo" || phase === "out" ? 0 : 1,
        }}
      />

      {/* Burst particles */}
      {(phase === "hit" || phase === "logo") &&
        Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const dist = 60 + (i % 3) * 18;
          return (
            <div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-neutral-300"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`,
                animation: "na-burst 0.55s ease-out forwards",
                animationDelay: `${i * 0.02}s`,
              }}
            />
          );
        })}

      {/* Logo */}
      <div
        className="relative z-10 flex flex-col items-center gap-3"
        style={{
          opacity: phase === "logo" || phase === "out" ? 1 : 0,
          transform:
            phase === "logo" || phase === "out"
              ? "scale(1) translateY(0)"
              : "scale(0.6) translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <img
          src="/neparena-logo.png"
          alt="NepARENA"
          width={96}
          height={96}
          className="h-24 w-24 rounded-2xl object-cover shadow-2xl ring-1 ring-white/15"
        />
        <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-400">
          NepARENA
        </div>
      </div>

      <style>{`
        @keyframes na-burst {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--tx, 40px), var(--ty, -20px)) scale(0); }
        }
      `}</style>
    </div>
  );
}
