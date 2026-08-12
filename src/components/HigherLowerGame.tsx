import { useMemo, useState } from "react";
import { LEGEND_PLAYERS } from "@/components/AllTimeXi";
import { playerPhotoUrl, playerPhotoFallback } from "@/lib/player-photos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, RotateCcw, TrendingUp } from "lucide-react";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function HigherLowerGame({ compact = false }: { compact?: boolean }) {
  const deck = useMemo(
    () => shuffle(LEGEND_PLAYERS).slice(0, 24),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [seed, setSeed] = useState(0);

  const current = deck[idx];
  const next = deck[idx + 1];

  const restart = () => {
    setIdx(0);
    setScore(0);
    setStreak(0);
    setReveal(false);
    setWrong(false);
    setSeed((s) => s + 1);
  };

  // Force new deck on restart via key-like seed in parent — simple reset uses same deck
  const guess = (higher: boolean) => {
    if (!current || !next || reveal || wrong) return;
    const isHigher = next.overall >= current.overall;
    const ok = higher ? isHigher : !isHigher;
    setReveal(true);
    if (ok) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      window.setTimeout(() => {
        setReveal(false);
        if (idx + 1 >= deck.length - 1) {
          setWrong(true); // end as win path
        } else {
          setIdx((i) => i + 1);
        }
      }, 750);
    } else {
      setStreak(0);
      setWrong(true);
    }
  };

  if (compact) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-950 to-[#1a1205] p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400">OVR battle</p>
        <h3 className="mt-1 text-lg font-bold text-white">Higher or Lower</h3>
        <p className="mt-1 text-xs text-slate-400">Guess the next legend’s overall</p>
        <Button asChild className="mt-4 bg-amber-500 font-semibold text-black hover:bg-amber-400">
          <a href="/games/higher-lower">
            <TrendingUp className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  if (!current || !next) {
    return (
      <div className="rounded-2xl border border-white/10 p-6 text-center">
        <p className="font-bold text-white">Run complete — score {score}</p>
        <Button className="mt-3" onClick={restart}>
          <RotateCcw className="mr-2 h-4 w-4" /> Play again
        </Button>
      </div>
    );
  }

  return (
    <div key={seed} className="mx-auto max-w-md overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-b from-slate-950 via-[#12100a] to-black">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">Higher or Lower</p>
          <p className="text-[10px] text-slate-500">Legend overall ratings</p>
        </div>
        <div className="text-right text-[11px] tabular-nums text-slate-400">
          <p>Score <span className="font-bold text-amber-300">{score}</span></p>
          <p>Streak {streak}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        <Card name={current.name} overall={current.overall} showOvr label="Current" />
        <Card
          name={next.name}
          overall={next.overall}
          showOvr={reveal || wrong}
          label="Next"
          highlight={reveal}
        />
      </div>

      {wrong ? (
        <div className="space-y-2 px-3 pb-4 text-center">
          <p className="text-sm font-semibold text-rose-300">
            {idx + 1 >= deck.length - 1 && score > 0 && !reveal
              ? "Amazing run!"
              : `Wrong — ${next.name} is ${next.overall} OVR`}
          </p>
          <p className="text-xs text-slate-400">Final score: {score}</p>
          <Button onClick={restart} className="bg-amber-500 text-black hover:bg-amber-400">
            <RotateCcw className="mr-2 h-4 w-4" /> Play again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-3 pb-4">
          <Button
            disabled={reveal}
            onClick={() => guess(true)}
            className="bg-emerald-600 font-bold text-white hover:bg-emerald-500"
          >
            <ArrowUp className="mr-1.5 h-4 w-4" /> Higher
          </Button>
          <Button
            disabled={reveal}
            onClick={() => guess(false)}
            className="bg-rose-600 font-bold text-white hover:bg-rose-500"
          >
            <ArrowDown className="mr-1.5 h-4 w-4" /> Lower
          </Button>
        </div>
      )}
    </div>
  );
}

function Card({
  name,
  overall,
  showOvr,
  label,
  highlight,
}: {
  name: string;
  overall: number;
  showOvr: boolean;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-black/40",
        highlight ? "border-amber-400/50" : "border-white/10",
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <img
          src={playerPhotoUrl(name)}
          alt={name}
          className="h-full w-full object-cover object-top"
          onError={(e) => {
            e.currentTarget.src = playerPhotoFallback(name);
          }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2 pb-2 pt-8">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
          <p className="truncate text-xs font-bold text-white">{name}</p>
          <p className="text-lg font-black tabular-nums text-amber-300">
            {showOvr ? overall : "?"}
          </p>
        </div>
      </div>
    </div>
  );
}
