/**
 * Games hub — premium square cards, title + search. No home header.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { buildSeoHead } from "@/lib/seo";
import { Input } from "@/components/ui/input";
import { Search, Gamepad2, Target, Trophy, Brain, Footprints, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/")({
  head: () => ({
    ...buildSeoHead({
      title: "Games — NepARENA",
      description: "Play mini-games on NepARENA.",
      path: "/games",
    }),
  }),
  component: GamesIndexPage,
});

const GAMES = [
  {
    to: "/games/penalty" as const,
    title: "Penalty Shootout",
    blurb: "Spot-kick challenge",
    icon: Footprints,
    tone: "from-emerald-500/35 via-emerald-800/25 to-[#0a0a0a]",
  },
  {
    to: "/games/higher-lower" as const,
    title: "Higher or Lower",
    blurb: "Guess the rating",
    icon: Shuffle,
    tone: "from-sky-500/35 via-sky-800/25 to-[#0a0a0a]",
  },
  {
    to: "/games/blind-ranking" as const,
    title: "Blind Ranking",
    blurb: "Rank without names",
    icon: Target,
    tone: "from-violet-500/35 via-violet-800/25 to-[#0a0a0a]",
  },
  {
    to: "/games/daily-quiz" as const,
    title: "Daily Quiz",
    blurb: "Football knowledge",
    icon: Brain,
    tone: "from-amber-500/35 via-amber-800/25 to-[#0a0a0a]",
  },
  {
    to: "/games/guess-club" as const,
    title: "Guess the Club",
    blurb: "Badge challenge",
    icon: Trophy,
    tone: "from-rose-500/35 via-rose-800/25 to-[#0a0a0a]",
  },
  {
    to: "/vote/goat" as const,
    title: "GOAT Vote",
    blurb: "Pick the greatest",
    icon: Gamepad2,
    tone: "from-fuchsia-500/35 via-fuchsia-800/25 to-[#0a0a0a]",
  },
];

function GamesIndexPage() {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    if (!q.trim()) return GAMES;
    const s = q.toLowerCase();
    return GAMES.filter(
      (g) => g.title.toLowerCase().includes(s) || g.blurb.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <h1 className="mb-3 text-lg font-semibold tracking-tight text-white">Games</h1>
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search games…"
            className="h-11 rounded-2xl border-white/10 bg-white/[0.05] pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          {list.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.to}
                to={g.to}
                className={cn(
                  "group relative flex aspect-square flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.35rem] border border-white/10 bg-gradient-to-br p-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] active:scale-[0.98]",
                  g.tone,
                )}
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-black/40 shadow-inner ring-1 ring-white/15 transition group-hover:scale-105 group-hover:ring-white/25">
                  <Icon className="h-7 w-7 text-white drop-shadow" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{g.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-neutral-400">{g.blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {list.length === 0 && (
          <p className="mt-8 text-center text-sm text-neutral-500">No games match your search.</p>
        )}
      </div>
    </PageShell>
  );
}
