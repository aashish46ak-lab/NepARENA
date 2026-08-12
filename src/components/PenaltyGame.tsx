import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RotateCcw, Target } from "lucide-react";

type Zone = "L" | "C" | "R";
const ZONES: Zone[] = ["L", "C", "R"];
const MAX = 5;

function randZone(): Zone {
  return ZONES[Math.floor(Math.random() * 3)]!;
}

function zoneFromSwipe(dx: number, dy: number): Zone {
  // Up-dominant → center; left/right bias from dx
  if (Math.abs(dx) < 28 && dy < -20) return "C";
  if (dx < -20) return "L";
  if (dx > 20) return "R";
  if (dy < -10) return "C";
  return randZone();
}

export function PenaltyGame({ compact = false }: { compact?: boolean }) {
  const [goals, setGoals] = useState(0);
  const [saves, setSaves] = useState(0);
  const [kick, setKick] = useState(0);
  const [phase, setPhase] = useState<"ready" | "flying" | "result" | "done">("ready");
  const [aim, setAim] = useState<Zone | null>(null);
  const [dive, setDive] = useState<Zone | null>(null);
  const [scored, setScored] = useState<boolean | null>(null);
  const [ballStyle, setBallStyle] = useState<React.CSSProperties>({});
  const [keeperStyle, setKeeperStyle] = useState<React.CSSProperties>({});
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const reset = () => {
    setGoals(0);
    setSaves(0);
    setKick(0);
    setPhase("ready");
    setAim(null);
    setDive(null);
    setScored(null);
    setBallStyle({});
    setKeeperStyle({});
  };

  const fire = (dir: Zone) => {
    if (phase !== "ready" || kick >= MAX) return;
    const keeper = randZone();
    setAim(dir);
    setDive(keeper);
    setPhase("flying");

    const tx = dir === "L" ? "-42%" : dir === "R" ? "42%" : "0%";
    const kx = keeper === "L" ? "-38%" : keeper === "R" ? "38%" : "0%";

    setBallStyle({
      transform: `translate(calc(-50% + ${tx}), -210%) scale(0.55)`,
      transition: "transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)",
    });
    setKeeperStyle({
      transform: `translateX(${kx})`,
      transition: "transform 0.4s cubic-bezier(0.25, 0.9, 0.3, 1)",
    });

    const hit = dir !== keeper;
    window.setTimeout(() => {
      setScored(hit);
      if (hit) setGoals((g) => g + 1);
      else setSaves((s) => s + 1);
      setPhase("result");
      const next = kick + 1;
      setKick(next);
      window.setTimeout(() => {
        setBallStyle({});
        setKeeperStyle({});
        setAim(null);
        setDive(null);
        setScored(null);
        setPhase(next >= MAX ? "done" : "ready");
      }, 900);
    }, 600);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "ready") return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (phase !== "ready" || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    startRef.current = null;
    // Need intentional swipe upward / sideways
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    fire(zoneFromSwipe(dx, dy));
  };

  if (compact) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-950 to-[#0a1f14] p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400">3D mini game</p>
        <h3 className="mt-1 text-lg font-bold text-white">Penalty Shootout</h3>
        <p className="mt-1 text-xs text-slate-400">Swipe to shoot · random keeper · 5 kicks</p>
        <Button asChild className="mt-4 bg-emerald-500 font-semibold text-white hover:bg-emerald-400">
          <a href="/games/penalty">
            <Target className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#06140e]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">Penalty Shootout</p>
          <p className="text-[10px] text-slate-500">Swipe ball · 3D goal · 5 kicks</p>
        </div>
        <span className="text-[11px] tabular-nums text-slate-400">
          {Math.min(kick, MAX)}/{MAX}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 pt-3 text-center">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2">
          <p className="text-xl font-black text-emerald-300">{goals}</p>
          <p className="text-[10px] uppercase text-slate-400">Goals</p>
        </div>
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-2">
          <p className="text-xl font-black text-rose-300">{saves}</p>
          <p className="text-[10px] uppercase text-slate-400">Saves</p>
        </div>
      </div>

      {/* 3D pitch stage */}
      <div
        className="relative mx-3 mt-3 h-64 overflow-hidden rounded-2xl select-none touch-none"
        style={{
          perspective: "900px",
          background:
            "linear-gradient(180deg, #0c4a6e 0%, #0e7490 18%, #14532d 18%, #166534 55%, #052e16 100%)",
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startRef.current = null;
        }}
      >
        {/* Stadium lights glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/10 to-transparent" />

        {/* Goal frame — 3D plane */}
        <div
          className="absolute left-1/2 top-6 w-[78%] -translate-x-1/2"
          style={{ transformStyle: "preserve-3d", transform: "rotateX(8deg)" }}
        >
          <div className="relative h-28 rounded-t-lg border-[3px] border-white/90 bg-sky-950/40 shadow-[0_0_40px_rgba(255,255,255,0.12)]">
            {/* Net pattern */}
            <div
              className="absolute inset-1 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
                backgroundSize: "10px 10px",
              }}
            />
            {/* Dive zone hints */}
            <div className="absolute inset-0 grid grid-cols-3">
              {ZONES.map((z) => (
                <div
                  key={z}
                  className={cn(
                    "border-white/5",
                    z !== "R" && "border-r",
                    dive === z && phase !== "ready" && "bg-rose-500/20",
                    aim === z && scored && "bg-emerald-400/25",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Keeper */}
        <div
          className="absolute left-1/2 top-[4.75rem] z-10 flex -translate-x-1/2 flex-col items-center"
          style={keeperStyle}
        >
          <div className="text-3xl drop-shadow-lg" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}>
            🧤
          </div>
          <div className="-mt-1 h-8 w-6 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-md ring-1 ring-black/20" />
          <div className="h-5 w-9 rounded-b-md bg-gradient-to-b from-yellow-500 to-amber-800" />
        </div>

        {/* Penalty spot + ball */}
        <div className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2">
          <div className="mb-2 h-1.5 w-10 rounded-full bg-white/40" />
          <div
            className="relative left-1/2 h-11 w-11 -translate-x-1/2 cursor-grab active:cursor-grabbing"
            style={{
              ...ballStyle,
              filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.45))",
            }}
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-white via-neutral-100 to-neutral-400 text-lg ring-2 ring-white/50">
              ⚽
            </div>
          </div>
        </div>

        {/* Pitch lines */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-[90%] -translate-x-1/2 rounded-t-[50%] border border-white/15" />

        {phase === "ready" && (
          <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] font-medium text-white/70">
            Swipe up · left · right on the ball
          </p>
        )}
        {phase === "result" && scored != null && (
          <p
            className={cn(
              "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-2xl font-black tracking-wide",
              scored ? "text-emerald-300" : "text-rose-300",
            )}
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
          >
            {scored ? "GOAL!" : "SAVED!"}
          </p>
        )}
      </div>

      <div className="space-y-2 p-3">
        {phase === "ready" && (
          <div className="grid grid-cols-3 gap-2">
            {ZONES.map((z) => (
              <Button
                key={z}
                size="sm"
                variant="outline"
                className="border-white/15 text-xs"
                onClick={() => fire(z)}
              >
                {z === "L" ? "← Left" : z === "C" ? "Center" : "Right →"}
              </Button>
            ))}
          </div>
        )}
        {phase === "done" && (
          <div className="space-y-2 text-center">
            <p className="text-base font-bold text-white">
              {goals > saves ? "You win the shootout 🏆" : goals === saves ? "Draw" : "Keeper wins"}
            </p>
            <p className="text-xs text-slate-400">
              {goals} – {saves}
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
