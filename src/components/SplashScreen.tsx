import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "neparena_splash_seen_v9";
const TOTAL_MS = 1400;

export function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

function markSplashSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setLeaving(true), TOTAL_MS - 300);
    const doneTimer = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      markSplashSeen();
      onDone?.();
    }, TOTAL_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9998] grid place-items-center overflow-hidden bg-black transition-opacity duration-300 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
      aria-label="NepARENA is loading"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.2),transparent_55%)]" />
      <div className="relative flex flex-col items-center px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <img
          src="/neparena-logo-ui.png"
          alt="NepARENA"
          width={256}
          height={256}
          fetchPriority="high"
          className="h-44 w-44 object-contain sm:h-52 sm:w-52"
        />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Nepal’s tournament platform
        </p>
      </div>
    </div>
  );
}