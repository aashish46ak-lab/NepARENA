import { useCallback, useMemo, useState } from "react";
import { LEGEND_PLAYERS } from "@/components/AllTimeXi";
import { playerPhotoUrl, playerPhotoFallback } from "@/lib/player-photos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, RotateCcw, TrendingUp } from "lucide-react";
import { GameResultActions } from "@/components/GameResultActions";

/** FIFA Mobile-style all-time peak overall (tight 78–99 band) */
function fifaMobileOvr(name: string, base: number): number {
  // Clamp to familiar mobile card range; slight name hash variance ±1
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const jitter = (h % 3) - 1; // -1, 0, 1
  return Math.max(78, Math.min(99, base + jitter));
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type CardPlayer = { name: string; ovr: number };

function buildDeck(seed: number): CardPlayer[] {
  const rng = mulberry32(seed);
  const pool = shuffle(LEGEND_PLAYERS, rng);
  const cards: CardPlayer[] = [];
  const used = new Set<string>();
  for (const p of pool) {
    if (used.has(p.name)) continue;
    used.add(p.name);
    cards.push({ name: p.name, ovr: fifaMobileOvr(p.name, p.overall) });
    if (cards.length >= 30) break;
  }
  // Avoid long runs of identical OVR by light re-shuffle of ties
  return cards;
}

export function HigherLowerGame({ compact = false }: { compact?: boolean }) {
  const [seed, setSeed] = useState(() => Date.now() ^ (Math.random() * 1e9));
  const deck = useMemo(() => buildDeck(seed), [seed]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [wrong, setWrong] = useState(false);

  const current = deck[idx];
  const next = deck[idx + 1];

  const restart = useCallback(() => {
    setSeed(Date.now() ^ (Math.random() * 1e9) ^ (performance.now() | 0));
    setIdx(0);
    setScore(0);
    setStreak(0);
    setReveal(false);
    setWrong(false);
  }, []);

  const guess = (higher: boolean) => {
    if (!current || !next || reveal || wrong) return;
    const isHigher = next.ovr >= current.ovr;
    const ok = higher ? isHigher : !isHigher;
    setReveal(true);
    if (ok) {
      setScore((s) => {
        const n = s + 1;
        setBest((b) => Math.max(b, n));
        return n;
      });
      setStreak((s) => s + 1);
      window.setTimeout(() => {
        setReveal(false);
        if (idx + 1 >= deck.length - 1) setWrong(true);
        else setIdx((i) => i + 1);
      }, 750);
    } else {
      setStreak(0);
      setWrong(true);
    }
  };

  if (compact) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-950 to-[#1a1205] p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400">FIFA Mobile OVR</p>
        <h3 className="mt-1 text-lg font-bold text-white">Higher or Lower</h3>
        <p className="mt-1 text-xs text-slate-400">All-time peak overall · fresh deck every run</p>
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
      <div className="space-y-3 rounded-2xl border border-white/10 p-6 text-center">
        <p className="font-bold text-white">Run complete — score {score}</p>
        <GameResultActions
          game="Higher or Lower"
          headline={`Scored ${score}`}
          lines={[`Best this session: ${Math.max(best, score)}`, "FIFA Mobile-style OVR"]}
        />
        <Button className="mt-1" onClick={restart}>
          <RotateCcw className="mr-2 h-4 w-4" /> New deck
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-b from-slate-950 via-[#12100a] to-black">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">Higher or Lower</p>
          <p className="text-[10px] text-slate-500">FIFA Mobile all-time peak OVR (78–99)</p>
        </div>
        <div className="text-right text-[11px] tabular-nums text-slate-400">
          <p>
            Score <span className="font-bold text-amber-300">{score}</span>
          </p>
          <p>Streak {streak}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        <Card name={current.name} ovr={current.ovr} show label="Current" />
        <Card name={next.name} ovr={next.ovr} show={reveal || wrong} label="Next" highlight={reveal} />
      </div>

      {wrong ? (
        <div className="space-y-3 px-3 pb-4 text-center">
          <p className="text-sm font-semibold text-rose-300">
            {idx + 1 >= deck.length - 1 && score > 0
              ? "Amazing run!"
              : `Wrong — ${next.name} is ${next.ovr} OVR`}
          </p>
          <p className="text-xs text-slate-400">Final score: {score}</p>
          <GameResultActions
            game="Higher or Lower"
            headline={`Scored ${score}`}
            lines={[`Best: ${Math.max(best, score)}`, `Last: ${next.name} (${next.ovr})`]}
          />
          <Button onClick={restart} className="bg-amber-500 text-black hover:bg-amber-400">
            <RotateCcw className="mr-2 h-4 w-4" /> New random deck
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
  ovr,
  show,
  label,
  highlight,
}: {
  name: string;
  ovr: number;
  show: boolean;
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
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = playerPhotoFallback(name);
          }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2 pb-2 pt-8">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
          <p className="truncate text-xs font-bold text-white">{name}</p>
          <p className="text-lg font-black tabular-nums text-amber-300">{show ? ovr : "?"}</p>
        </div>
      </div>
    </div>
  );
}
