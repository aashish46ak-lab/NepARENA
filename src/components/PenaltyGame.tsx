import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RotateCcw, Target } from "lucide-react";

type Side = "L" | "C" | "R";
const SIDES: Side[] = ["L", "C", "R"];

function pick(): Side {
  return SIDES[Math.floor(Math.random() * 3)]!;
}

export function PenaltyGame({ compact = false }: { compact?: boolean }) {
  const [playerGoals, setPlayerGoals] = useState(0);
  const [keeperSaves, setKeeperSaves] = useState(0);
  const [round, setRound] = useState(1);
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const maxRounds = 5;

  const shoot = (dir: Side) => {
    if (busy || round > maxRounds) return;
    setBusy(true);
    const dive = pick();
    const scored = dir !== dive;
    window.setTimeout(() => {
      if (scored) setPlayerGoals((g) => g + 1);
      else setKeeperSaves((s) => s + 1);
      setLast(scored ? `GOAL! Keeper dived ${dive}` : `SAVED! Keeper guessed ${dive}`);
      setRound((r) => r + 1);
      setBusy(false);
    }, 450);
  };

  const reset = () => {
    setPlayerGoals(0);
    setKeeperSaves(0);
    setRound(1);
    setLast(null);
    setBusy(false);
  };

  if (compact) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-950 to-[#0a1f14] p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400">Mini game</p>
        <h3 className="mt-1 text-lg font-bold text-white">Penalty Shootout</h3>
        <p className="mt-1 text-xs text-slate-400">Pick left · center · right · beat the keeper</p>
        <Button asChild className="mt-4 bg-emerald-500 font-semibold text-white hover:bg-emerald-400">
          <a href="/games/penalty">
            <Target className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  const done = round > maxRounds;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-slate-950 via-[#0a1f14] to-black">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">Penalty Shootout</p>
          <p className="text-[10px] text-slate-500">Best of 5 · pure luck + nerve</p>
        </div>
        <span className="text-[11px] tabular-nums text-slate-400">
          {Math.min(round, maxRounds)}/{maxRounds}
        </span>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-2xl font-black text-emerald-300">{playerGoals}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Goals</p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
            <p className="text-2xl font-black text-rose-300">{keeperSaves}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Saves</p>
          </div>
        </div>

        <div className="relative mx-auto h-28 max-w-[240px] rounded-t-[40%] border-2 border-white/20 bg-gradient-to-b from-emerald-900/40 to-emerald-950/60">
          <div className="absolute inset-x-6 top-2 h-16 rounded-t-3xl border border-white/15" />
          <p className="absolute inset-x-0 bottom-2 text-center text-[10px] text-slate-400">
            {busy ? "Keeper diving…" : done ? "Shootout over" : "Aim your shot"}
          </p>
        </div>

        {last && (
          <p className={cn("text-center text-sm font-semibold", last.startsWith("GOAL") ? "text-emerald-300" : "text-rose-300")}>
            {last}
          </p>
        )}

        {!done ? (
          <div className="grid grid-cols-3 gap-2">
            {SIDES.map((s) => (
              <Button
                key={s}
                disabled={busy}
                onClick={() => shoot(s)}
                className="bg-white/10 font-bold text-white hover:bg-emerald-500/30"
              >
                {s === "L" ? "← Left" : s === "C" ? "Center" : "Right →"}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-2 text-center">
            <p className="text-lg font-bold text-white">
              {playerGoals > keeperSaves ? "You win the shootout 🏆" : playerGoals === keeperSaves ? "Draw" : "Keeper wins"}
            </p>
            <Button onClick={reset} variant="outline" className="border-white/15">
              <RotateCcw className="mr-2 h-4 w-4" /> Play again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
