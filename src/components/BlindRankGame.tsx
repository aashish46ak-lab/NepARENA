import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LEGEND_PLAYERS } from "@/components/AllTimeXi";
import { playerPhotoUrl } from "@/lib/player-photos";
import { ChevronDown, Download, Play, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type RankPlayer = {
  name: string;
  overall: number;
  positions: string[];
  photo: string;
};

type Phase = "setup" | "play" | "done";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function toPlayer(p: (typeof LEGEND_PLAYERS)[number]): RankPlayer {
  return {
    name: p.name,
    overall: p.overall,
    positions: p.positions,
    photo: playerPhotoUrl(p.name),
  };
}

export function BlindRankGame({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");
  const [size, setSize] = useState(5);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [deck, setDeck] = useState<RankPlayer[]>([]);
  const [cursor, setCursor] = useState(0);
  const [slots, setSlots] = useState<(RankPlayer | null)[]>([]);
  /** After place: keep card visible until user hits Next */
  const [placed, setPlaced] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinFace, setSpinFace] = useState<RankPlayer | null>(null);
  const spinTimer = useRef<number | null>(null);

  const current =
    phase === "play" && !spinning ? deck[cursor] ?? null : spinning ? spinFace : null;
  const filled = slots.filter(Boolean).length;
  const allFilled = filled >= size;

  useEffect(() => {
    return () => {
      if (spinTimer.current) window.clearInterval(spinTimer.current);
    };
  }, []);

  const start = () => {
    const pool = shuffle(LEGEND_PLAYERS.map(toPlayer));
    setDeck(pool.slice(0, size));
    setSlots(Array.from({ length: size }, () => null));
    setCursor(0);
    setPlaced(false);
    setSpinning(false);
    setSpinFace(null);
    setPhase("play");
    setSizeOpen(false);
  };

  const place = (index: number) => {
    if (!current || slots[index] || placed || spinning) return;
    setSlots((prev) => {
      const next = [...prev];
      next[index] = current;
      return next;
    });
    setPlaced(true);
    if (cursor + 1 >= size) {
      // last player placed — finish after brief moment
      window.setTimeout(() => setPhase("done"), 400);
    }
  };

  const nextPlayer = () => {
    if (spinning) return;
    if (!placed && current) {
      toast.message("Place this player on a rank first");
      return;
    }
    if (cursor + 1 >= size) {
      setPhase("done");
      return;
    }

    const nextIdx = cursor + 1;
    const target = deck[nextIdx];
    if (!target) {
      setPhase("done");
      return;
    }

    // Spin reel of random faces then land on next deck player
    setSpinning(true);
    setPlaced(false);
    const faces = shuffle(LEGEND_PLAYERS.map(toPlayer)).slice(0, 18);
    let tick = 0;
    if (spinTimer.current) window.clearInterval(spinTimer.current);
    spinTimer.current = window.setInterval(() => {
      setSpinFace(faces[tick % faces.length]!);
      tick += 1;
      if (tick > 14) {
        if (spinTimer.current) window.clearInterval(spinTimer.current);
        spinTimer.current = null;
        setSpinFace(target);
        setCursor(nextIdx);
        setSpinning(false);
        setPlaced(false);
      }
    }, 70);
  };

  const reset = () => {
    if (spinTimer.current) window.clearInterval(spinTimer.current);
    setPhase("setup");
    setDeck([]);
    setSlots([]);
    setCursor(0);
    setPlaced(false);
    setSpinning(false);
    setSpinFace(null);
  };

  const exportPng = async () => {
    if (!user) {
      toast.message("Sign in to save / download", {
        action: {
          label: "Sign in",
          onClick: () => {
            window.location.href = "/auth/";
          },
        },
      });
      return;
    }
    try {
      const W = 1080;
      const H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#020617");
      bg.addColorStop(0.45, "#0c1a3a");
      bg.addColorStop(1, "#020617");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const logo = await loadImage("/neparena-logo.png");
      if (logo) ctx.drawImage(logo, W / 2 - 48, 36, 96, 96);

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MY BLIND RANKING TEST", W / 2, 170);
      ctx.fillStyle = "rgba(148,163,184,0.95)";
      ctx.font = "26px system-ui, sans-serif";
      ctx.fillText("Powered by NepARENA", W / 2, 210);

      const gap = 14;
      const cols = 2;
      const cellW = Math.floor((W - 128 - gap) / cols);
      const cellH = cellW;
      const startY = 250;

      for (let i = 0; i < slots.length; i++) {
        const p = slots[i];
        if (!p) continue;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 64 + col * (cellW + gap);
        const y = startY + row * (cellH + gap + 8);

        ctx.fillStyle = "rgba(15,23,42,0.95)";
        roundRect(ctx, x, y, cellW, cellH, 18);
        ctx.fill();

        const photo = await loadImage(p.photo);
        if (photo) {
          ctx.save();
          roundRect(ctx, x + 8, y + 8, cellW - 16, cellH - 48, 12);
          ctx.clip();
          ctx.drawImage(photo, x + 8, y + 8, cellW - 16, cellH - 48);
          ctx.restore();
        }

        ctx.fillStyle = "#0ea5e9";
        ctx.beginPath();
        ctx.arc(x + 28, y + 28, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`#${i + 1}`, x + 28, y + 33);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(p.name, x + cellW / 2, y + cellH - 16);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(148,163,184,0.85)";
      ctx.font = "22px system-ui";
      ctx.fillText("neparena.xyz/games/blind-ranking", W / 2, H - 40);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `neparena-blind-ranking-${Date.now()}.png`;
      a.click();
      toast.success("PNG downloaded");
    } catch {
      toast.error("Could not export image");
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/games/blind-ranking`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Blind Ranking — NepARENA",
          text: "Play Blind Ranking on NepARENA!",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* cancel */
    }
  };

  if (compact) {
    return (
      <div className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-slate-950 to-[#0a1628] p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-400">
          Viral game
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">Blind Ranking</h3>
        <p className="mt-1 text-xs text-slate-400">
          Spin · rank · share — play free
        </p>
        <Button asChild className="mt-4 bg-sky-500 font-semibold text-white hover:bg-sky-400">
          <a href="/games/blind-ranking">
            <Play className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-b from-slate-950 via-[#0a1628] to-black">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
        <div>
          <p className="text-sm font-bold text-white">Blind Ranking</p>
          <p className="text-[10px] text-slate-500">NepARENA · photos on</p>
        </div>
        {phase === "setup" && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSizeOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200"
            >
              Top {size}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", sizeOpen && "rotate-180")} />
            </button>
            {sizeOpen && (
              <div className="absolute right-0 z-20 mt-1 max-h-40 w-28 overflow-y-auto rounded-xl border border-white/15 bg-slate-900 py-1 shadow-xl">
                {[5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setSize(n);
                      setSizeOpen(false);
                    }}
                    className={cn(
                      "block w-full px-3 py-1.5 text-left text-xs",
                      size === n ? "bg-sky-500/20 text-sky-200" : "text-slate-300 hover:bg-white/5",
                    )}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {phase === "play" && (
          <span className="text-[11px] tabular-nums text-slate-400">
            {filled}/{size}
          </span>
        )}
      </div>

      {phase === "setup" && (
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: size }, (_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg border border-dashed border-white/15 bg-white/[0.03] grid place-items-center"
              >
                <span className="text-[10px] font-bold text-slate-500">#{i + 1}</span>
              </div>
            ))}
          </div>
          <Button onClick={start} className="w-full bg-sky-500 font-semibold text-white hover:bg-sky-400">
            <Play className="mr-2 h-4 w-4" /> Start
          </Button>
        </div>
      )}

      {phase === "play" && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-2 p-2.5">
          {/* LEFT — square rank slots */}
          <div className="max-h-[62vh] space-y-1.5 overflow-y-auto pr-0.5">
            {slots.map((p, i) => {
              const open = !p && !!current && !placed && !spinning;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!open}
                  onClick={() => place(i)}
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-xl border transition",
                    p
                      ? "border-sky-500/40"
                      : open
                        ? "border-sky-400/60 bg-sky-500/10 animate-pulse"
                        : "border-white/10 bg-white/[0.03] opacity-70",
                  )}
                >
                  {p ? (
                    <>
                      <img
                        src={p.photo}
                        alt={p.name}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                        onError={(e) => {
                          e.currentTarget.src = playerPhotoUrl(p.name);
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-1 pb-1.5 pt-6">
                        <p className="truncate text-center text-[9px] font-semibold leading-tight text-white">
                          {p.name}
                        </p>
                      </div>
                      <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-sky-500 text-[9px] font-black text-white">
                        {i + 1}
                      </span>
                    </>
                  ) : (
                    <div className="grid h-full place-items-center">
                      <span className="text-[11px] font-bold text-slate-500">#{i + 1}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT — player card + Next always under card */}
          <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/30 p-2">
            <div
              className={cn(
                "relative aspect-[3/4] w-full max-w-[160px] overflow-hidden rounded-xl ring-1 ring-white/20",
                spinning && "ring-sky-400/60",
              )}
            >
              {current ? (
                <>
                  <img
                    key={current.name + (spinning ? "-spin" : "")}
                    src={current.photo}
                    alt={current.name}
                    className={cn(
                      "h-full w-full object-cover object-top transition",
                      spinning && "opacity-90 scale-105",
                    )}
                    onError={(e) => {
                      e.currentTarget.src = playerPhotoUrl(current.name);
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-8">
                    <p className="text-center text-xs font-bold leading-tight text-white">
                      {spinning ? "…" : current.name}
                    </p>
                    {!spinning && (
                      <p className="text-center text-[10px] text-slate-300">
                        {current.positions[0]} · {current.overall}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid h-full place-items-center text-xs text-slate-500">—</div>
              )}
              {spinning && (
                <div className="pointer-events-none absolute inset-0 bg-sky-500/10" />
              )}
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-500">
              {spinning
                ? "Spinning…"
                : placed
                  ? "Locked — press Next"
                  : "Tap a square rank on the left"}
            </p>

            <Button
              size="sm"
              disabled={spinning || (!placed && !allFilled)}
              onClick={nextPlayer}
              className="mt-2 w-full max-w-[160px] bg-sky-500 font-bold text-white hover:bg-sky-400 disabled:opacity-40"
            >
              {spinning ? "Spinning…" : placed ? "Next →" : "Next"}
            </Button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-3 p-3">
          <p className="text-center text-sm font-bold text-sky-200">
            Your Blind Ranking is Complete!
          </p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {slots.map((p, i) =>
              p ? (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl border border-white/10"
                >
                  <img src={p.photo} alt={p.name} className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-0.5 pb-1 pt-4">
                    <p className="truncate text-center text-[8px] font-semibold text-white">{p.name}</p>
                  </div>
                  <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-sky-500 text-[9px] font-black text-white">
                    {i + 1}
                  </span>
                </div>
              ) : null,
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button size="sm" className="bg-sky-500 text-white hover:bg-sky-400" onClick={() => void exportPng()}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" onClick={() => void share()}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-500">Download needs login · Share · Play again</p>
        </div>
      )}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
