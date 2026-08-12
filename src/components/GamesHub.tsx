import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Gamepad2, Play, Target, Shuffle, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const GAMES = [
  {
    id: "blind-ranking",
    href: "/games/blind-ranking",
    title: "Blind Ranking",
    desc: "Spin face cards · place ranks · export PNG",
    tag: "Viral",
    accent: "border-sky-500/30 bg-sky-500/10",
    icon: Shuffle,
  },
  {
    id: "penalty",
    href: "/games/penalty",
    title: "Penalty Shootout",
    desc: "Swipe to shoot · 3D pitch · 5 kicks",
    tag: "New",
    accent: "border-emerald-500/30 bg-emerald-500/10",
    icon: Target,
  },
  {
    id: "higher-lower",
    href: "/games/higher-lower",
    title: "Higher or Lower",
    desc: "Guess the next legend’s overall rating",
    tag: "Live",
    accent: "border-amber-500/30 bg-amber-500/10",
    icon: TrendingUp,
  },
];

export function GamesHub() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-3xl border border-sky-500/25 bg-gradient-to-br from-sky-950/80 via-slate-950 to-black p-6 text-left transition hover:border-sky-400/40 hover:shadow-[0_0_40px_rgba(56,189,248,0.15)]"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl transition group-hover:bg-sky-400/30" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 text-white shadow-lg shadow-sky-500/30 ring-1 ring-white/20">
            <Gamepad2 className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-400/90">
              Arcade
            </p>
            <h3 className="mt-0.5 text-xl font-black tracking-tight text-white sm:text-2xl">
              Play Games
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Blind Ranking · Penalty · Higher or Lower
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100 ring-1 ring-white/10 sm:inline-flex">
            <Play className="h-3.5 w-3.5" /> Open
          </span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-3 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c10] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">Play Games</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2 p-3">
              {GAMES.map((g) => (
                <li key={g.id}>
                  <Link
                    to={g.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-3 transition hover:bg-white/[0.04]",
                      g.accent,
                    )}
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/40 ring-1 ring-white/10">
                      <g.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{g.title}</p>
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-300">
                          {g.tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{g.desc}</p>
                    </div>
                    <Play className="h-4 w-4 shrink-0 text-neutral-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
