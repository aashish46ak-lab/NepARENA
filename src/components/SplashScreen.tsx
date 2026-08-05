import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Native-feeling launch splash — shows once per browser session. */
export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("efn-splash")) return;
      sessionStorage.setItem("efn-splash", "1");
    } catch {
      return;
    }
    setShow(true);
    const t1 = setTimeout(() => setLeaving(true), 1100);
    const t2 = setTimeout(() => setShow(false), 1650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[200] grid place-items-center bg-background transition-opacity duration-500",
        leaving && "opacity-0 pointer-events-none",
      )}
    >
      <div className="flex flex-col items-center gap-4 animate-[splash-pop_.7s_ease]">
        <img
          src="/android-chrome-512x512.png"
          alt=""
          className="h-20 w-20 rounded-2xl glow-brand"
        />
        <div className="text-center">
          <p className="text-xl font-bold text-gradient-brand">eFootball Nepal</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tournaments · Community · Glory
          </p>
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 rounded-full bg-gradient-brand animate-[splash-bar_1.1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}