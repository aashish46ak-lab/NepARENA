/**
 * Games hub — simplified top: title + search, square game cards.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
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
    blurb: "Take the spot-kick challenge",
    icon: Footprints,
    tone: "from-emerald-600/40 to-emerald-900/20",
  },
  {
    to: "/games/higher-lower" as const,
    title: "Higher or Lower",
    blurb: "Guess the next rating",
    icon: Shuffle,
    tone: "from-sky-600/40 to-sky-900/20",
  },
  {
    to: "/games/blind-ranking" as const,
    title: "Blind Ranking",
    blurb: "Rank players without names",
    icon: Target,
    tone: "from-violet-600/40 to-violet-900/20",
  },
  {
    to: "/games/daily-quiz" as const,
    title: "Daily Quiz",
    blurb: "Football knowledge check",
    icon: Brain,
    tone: "from-amber-600/40 to-amber-900/20",
  },
  {
    to: "/games/guess-club" as const,
    title: "Guess the Club",
    blurb: "Identify from the badge",
    icon: Trophy,
    tone: "from-rose-600/40 to-rose-900/20",
  },
  {
    to: "/vote/goat" as const,
    title: "GOAT Vote",
    blurb: "Pick the greatest",
    icon: Gamepad2,
    tone: "from-fuchsia-600/40 to-fuchsia-900/20",
  },
];

function GamesIndexPage() {
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const list = useMemo(() => {
    if (!q.trim()) return GAMES;
    const s = q.toLowerCase();
    return GAMES.filter(
      (g) => g.title.toLowerCase().includes(s) || g.blurb.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo={false} pageTitle="Games" />
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-lg font-semibold text-white">Games</h1>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-300 transition hover:bg-white/10"
            aria-label="Search games"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {searchOpen && (
          <div className="mb-4">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games…"
              className="h-11 rounded-2xl border-white/10 bg-white/[0.05]"
              autoFocus
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.to}
                to={g.to}
                className={cn(
                  "group relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br p-4 text-center transition hover:border-white/25 hover:scale-[1.02] active:scale-[0.98]",
                  g.tone,
                )}
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-black/30 ring-1 ring-white/10">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <p className="text-sm font-semibold text-white">{g.title}</p>
                <p className="text-[11px] leading-snug text-neutral-400">{g.blurb}</p>
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
