import { Link } from "@tanstack/react-router";
import { Gamepad2, Play } from "lucide-react";

/** Homepage entry — opens dedicated /games page */
export function GamesHub() {
  return (
    <Link
      to="/games"
      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-neutral-900 via-black to-neutral-950 p-6 text-left transition hover:border-white/30 hover:shadow-[0_0_40px_rgba(255,255,255,0.06)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-3xl transition group-hover:bg-white/10" />
      <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-500 text-black shadow-lg ring-1 ring-white/20">
        <Gamepad2 className="h-8 w-8" />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
          Arcade
        </p>
        <h3 className="mt-0.5 text-xl font-black tracking-tight text-white sm:text-2xl">
          Play Games
        </h3>
        <p className="mt-1 text-xs text-neutral-500">Open the games lobby</p>
      </div>
      <span className="relative hidden shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-100 ring-1 ring-white/10 sm:inline-flex">
        <Play className="h-3.5 w-3.5" /> Open
      </span>
    </Link>
  );
}
