import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { buildSeoHead } from "@/lib/seo";
import { Gamepad2, Play, Shuffle, Target, TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/")({
  head: () => ({
    ...buildSeoHead({
      title: "Play Games — NepARENA",
      description: "Blind Ranking, Penalty Shootout, Higher or Lower and more on NepARENA.",
      path: "/games",
    }),
  }),
  component: GamesLobbyPage,
});

const GAMES = [
  {
    id: "blind-ranking",
    href: "/games/blind-ranking",
    title: "Blind Ranking",
    desc: "Spin face cards, place ranks, export your vertical PNG card.",
    tag: "Viral",
    icon: Shuffle,
    accent: "from-sky-950/80 to-black border-sky-500/25",
  },
  {
    id: "penalty",
    href: "/games/penalty",
    title: "Penalty Shootout",
    desc: "Swipe to shoot. Random keeper dive. Five kicks.",
    tag: "New",
    icon: Target,
    accent: "from-emerald-950/80 to-black border-emerald-500/20",
  },
  {
    id: "higher-lower",
    href: "/games/higher-lower",
    title: "Higher or Lower",
    desc: "Guess the next football legend overall rating.",
    tag: "Live",
    icon: TrendingUp,
    accent: "from-amber-950/70 to-black border-amber-500/20",
  },
] as const;

function GamesLobbyPage() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-neutral-400">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" /> Home
          </Link>
        </Button>

        <div className="mb-8 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-500 text-black shadow-lg ring-2 ring-white/10">
            <Gamepad2 className="h-8 w-8" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              NepARENA Arcade
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white">Play Games</h1>
            <p className="text-sm text-neutral-500">Pick a game · play · share</p>
          </div>
        </div>

        <ul className="space-y-3">
          {GAMES.map((g) => (
            <li key={g.id}>
              <div
                className={`overflow-hidden rounded-3xl border bg-gradient-to-br p-5 ${g.accent}`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/50 ring-1 ring-white/10">
                    <g.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{g.title}</h2>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                        {g.tag}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">{g.desc}</p>
                    <a
                      href={g.href}
                      className="mt-3 inline-flex h-8 items-center justify-center rounded-md bg-neutral-100 px-3 text-sm font-semibold text-black hover:bg-white"
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Play
                    </a>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
