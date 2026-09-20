/**
 * Games hub — premium cards, device-aware grid.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { buildSeoHead } from "@/lib/seo";
import { Input } from "@/components/ui/input";
import { Search, Gamepad2, Target, Trophy, Brain, Footprints, Shuffle, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/")({
  head: () => ({
    ...buildSeoHead({
      title: "Mini Games",
      description: "Play football mini-games on NepARENA — penalty, quiz, ranking and more.",
      path: "/games",
    }),
  }),
  component: GamesIndexPage,
});

const GAMES = [
  {
    to: "/games/penalty" as const,
    title: "Penalty Shootout",
    blurb: "Spot-kick challenge — aim and score",
    icon: Footprints,
    accent: "emerald",
    gradient: "from-emerald-500/40 via-emerald-900/30 to-black",
    ring: "ring-emerald-400/25",
    badge: "Skill",
  },
  {
    to: "/games/higher-lower" as const,
    title: "Higher or Lower",
    blurb: "Guess player ratings",
    icon: Shuffle,
    accent: "sky",
    gradient: "from-sky-500/40 via-sky-900/30 to-black",
    ring: "ring-sky-400/25",
    badge: "Quick",
  },
  {
    to: "/games/blind-ranking" as const,
    title: "Blind Ranking",
    blurb: "Rank without seeing names",
    icon: Target,
    accent: "violet",
    gradient: "from-violet-500/40 via-violet-900/30 to-black",
    ring: "ring-violet-400/25",
    badge: "Puzzle",
  },
  {
    to: "/games/daily-quiz" as const,
    title: "Daily Quiz",
    blurb: "Football knowledge check",
    icon: Brain,
    accent: "amber",
    gradient: "from-amber-500/40 via-amber-900/30 to-black",
    ring: "ring-amber-400/25",
    badge: "Daily",
  },
  {
    to: "/games/guess-club" as const,
    title: "Guess the Club",
    blurb: "Badge recognition challenge",
    icon: Trophy,
    accent: "rose",
    gradient: "from-rose-500/40 via-rose-900/30 to-black",
    ring: "ring-rose-400/25",
    badge: "Fans",
  },
  {
    to: "/vote/goat" as const,
    title: "GOAT Vote",
    blurb: "Pick the greatest of all time",
    icon: Gamepad2,
    accent: "fuchsia",
    gradient: "from-fuchsia-500/40 via-fuchsia-900/30 to-black",
    ring: "ring-fuchsia-400/25",
    badge: "Vote",
  },
];

function GamesIndexPage() {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    if (!q.trim()) return GAMES;
    const s = q.toLowerCase();
    return GAMES.filter(
      (g) =>
        g.title.toLowerCase().includes(s) ||
        g.blurb.toLowerCase().includes(s) ||
        g.badge.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto w-full max-w-md px-3 pb-28 pt-4 sm:max-w-2xl sm:px-4 md:max-w-3xl lg:max-w-4xl lg:px-6">
        <div className="mb-4 flex flex-col gap-1 sm:mb-5">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Games</h1>
          <p className="text-xs text-neutral-500 sm:text-sm">
            Quick football mini-games — no install, play on NepARENA.
          </p>
        </div>

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search games…"
            className="h-11 rounded-2xl border-white/10 bg-white/[0.05] pl-10 transition focus-visible:ring-sky-500/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3">
          {list.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.to}
                to={g.to}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-0 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition duration-200",
                  "hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_14px_40px_rgba(0,0,0,0.5)] active:scale-[0.98]",
                  g.gradient,
                )}
              >
                <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 p-4 sm:aspect-[5/4]">
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur-sm">
                    {g.badge}
                  </span>
                  <div
                    className={cn(
                      "grid h-14 w-14 place-items-center rounded-2xl bg-black/45 shadow-inner ring-1 transition group-hover:scale-105 sm:h-16 sm:w-16",
                      g.ring,
                    )}
                  >
                    <Icon className="h-7 w-7 text-white drop-shadow sm:h-8 sm:w-8" />
                  </div>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    <Play className="h-3 w-3 fill-current" /> Play
                  </span>
                </div>
                <div className="border-t border-white/8 bg-black/35 px-3 py-2.5 backdrop-blur-sm">
                  <p className="text-sm font-semibold leading-snug text-white">{g.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-400">{g.blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {list.length === 0 && (
          <p className="mt-10 text-center text-sm text-neutral-500">No games match your search.</p>
        )}
      </div>
    </PageShell>
  );
}
