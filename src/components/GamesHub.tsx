import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Play, Target, Shuffle, Swords, Trophy } from "lucide-react";

const GAMES = [
  {
    id: "blind-ranking",
    href: "/games/blind-ranking",
    title: "Blind Ranking",
    desc: "Spin face cards · place ranks · export vertical PNG",
    tag: "Viral",
    accent: "from-sky-600/30 to-transparent border-sky-500/25",
    icon: Shuffle,
    live: true,
  },
  {
    id: "penalty",
    href: "/games/penalty",
    title: "Penalty Shootout",
    desc: "Left · center · right — beat the keeper in 5 kicks",
    tag: "New",
    accent: "from-emerald-600/30 to-transparent border-emerald-500/25",
    icon: Target,
    live: true,
  },
  {
    id: "goat",
    href: "/vote/goat",
    title: "Vote Your GOAT",
    desc: "Messi vs Ronaldo community poll",
    tag: "Poll",
    accent: "from-violet-600/30 to-transparent border-violet-500/25",
    icon: Trophy,
    live: true,
  },
  {
    id: "higher-lower",
    href: "#",
    title: "Higher or Lower",
    desc: "Guess OVR — coming soon",
    tag: "Soon",
    accent: "from-amber-600/20 to-transparent border-amber-500/15",
    icon: Swords,
    live: false,
  },
];

export function GamesHub() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {GAMES.map((g) => (
        <div
          key={g.id}
          className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5 ${g.accent}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-black/40 ring-1 ring-white/10">
              <g.icon className="h-5 w-5 text-white" />
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-200">
              {g.tag}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">{g.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{g.desc}</p>
          {g.live ? (
            <Button asChild size="sm" className="mt-4 bg-white/15 text-white hover:bg-white/25">
              <Link to={g.href}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Play
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled className="mt-4 opacity-50">
              Coming soon
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
