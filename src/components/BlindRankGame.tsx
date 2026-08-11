import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LEGEND_PLAYERS } from "@/components/AllTimeXi";
import { playerPhotoUrl } from "@/lib/player-photos";
import { ChevronDown, Download, Play, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export function BlindRankGame({
  compact = false,
}: {
  /** homepage teaser — show CTA only */
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [size, setSize] = useState(5);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [deck, setDeck] = useState<RankPlayer[]>([]);
  const [cursor, setCursor] = useState(0);
  const [slots, setSlots] = useState<(RankPlayer | null)[]>([]);
  const [awaitingNext, setAwaitingNext] = useState(false);

  const current = phase === "play" && !awaitingNext ? deck[cursor] ?? null : null;
  const filled = slots.filter(Boolean).length;

  const start = () => {
    const pool = shuffle(
      LEGEND_PLAYERS.map((p) => ({
        name: p.name,
        overall: p.overall,
        positions: p.positions,
        photo: playerPhotoUrl(p.name),
      })),
    );
    setDeck(pool.slice(0, size));
    setSlots(Array.from({ length: size }, () => null));
    setCursor(0);
    setAwaitingNext(false);
    setPhase("play");
    setSizeOpen(false);
  };

  const place = (index: number) => {
    if (!current || slots[index] || awaitingNext) return;
    setSlots((prev) => {
      const next = [...prev];
      next[index] = current;
      return next;
    });
    if (cursor + 1 >= size) {
      setPhase("done");
      setAwaitingNext(false);
    } else {
      setAwaitingNext(true);
    }
  };

  const nextPlayer = () => {
    if (!awaitingNext) return;
    setCursor((c) => c + 1);
    setAwaitingNext(false);
  };

  const reset = () => {
    setPhase("setup");
    setDeck([]);
    setSlots([]);
    setCursor(0);
    setAwaitingNext(false);
  };

  const exportPng = async () => {
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

      // logo
      const logo = await loadImage("/neparena-logo.png");
      if (logo) {
        ctx.drawImage(logo, W / 2 - 48, 36, 96, 96);
      }

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MY BLIND RANKING TEST", W / 2, 170);
      ctx.fillStyle = "rgba(148,163,184,0.95)";
      ctx.font = "26px system-ui, sans-serif";
      ctx.fillText("Powered by NepARENA", W / 2, 210);

      const rowH = Math.min(96, Math.floor((H - 300) / size) - 10);
      const startY = 240;

      for (let i = 0; i < slots.length; i++) {
        const p = slots[i];
        if (!p) continue;
        const y = startY + i * (rowH + 10);

        ctx.fillStyle = "rgba(15,23,42,0.9)";
        roundRect(ctx, 64, y, W - 128, rowH, 16);
        ctx.fill();
        ctx.strokeStyle = "rgba(56,189,248,0.4)";
        ctx.lineWidth = 2;
        roundRect(ctx, 64, y, W - 128, rowH, 16);
        ctx.stroke();

        // rank
        ctx.fillStyle = "#0ea5e9";
        ctx.beginPath();
        ctx.arc(120, y + rowH / 2, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`#${i + 1}`, 120, y + rowH / 2 + 8);

        // photo
        const photo = await loadImage(p.photo);
        const px = 170;
        const py = y + 10;
        const ph = rowH - 20;
        const pw = ph * 0.75;
        if (photo) {
          ctx.save();
          roundRect(ctx, px, py, pw, ph, 10);
          ctx.clip();
          ctx.drawImage(photo, px, py, pw, ph);
          ctx.restore();
        } else {
          ctx.fillStyle = "#1e3a8a";
          roundRect(ctx, px, py, pw, ph, 10);
          ctx.fill();
        }

        ctx.textAlign = "left";
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 30px system-ui";
        ctx.fillText(p.name, px + pw + 24, y + rowH / 2 + 6);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 22px system-ui";
        ctx.textAlign = "right";
        ctx.fillText(`OVR ${p.overall}`, W - 100, y + rowH / 2 + 8);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(148,163,184,0.85)";
      ctx.font = "22px system-ui";
      ctx.fillText("neparena.xyz/games/blind-ranking", W / 2, H - 40);

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
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
          text: "Play the Blind Ranking test on NepARENA!",
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
          Rank legends one by one — no peeking ahead
        </p>
        <Button
          asChild
          className="mt-4 bg-sky-500 font-semibold text-white hover:bg-sky-400"
        >
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
          <p className="text-[10px] text-slate-500">NepARENA</p>
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
          <div className="space-y-1.5">
            {Array.from({ length: size }, (_, i) => (
              <div
                key={i}
                className="flex h-9 items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-2.5"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                  #{i + 1}
                </span>
                <span className="text-xs text-slate-600">Empty</span>
              </div>
            ))}
          </div>
          <Button
            onClick={start}
            className="w-full bg-sky-500 font-semibold text-white hover:bg-sky-400"
          >
            <Play className="mr-2 h-4 w-4" /> Start
          </Button>
        </div>
      )}

      {phase === "play" && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-2 p-2.5">
          {/* LEFT ranks */}
          <div className="max-h-[58vh] space-y-1.5 overflow-y-auto pr-0.5">
            {slots.map((p, i) => {
              const open = !p && !!current && !awaitingNext;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!open}
                  onClick={() => place(i)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left transition",
                    p
                      ? "border-sky-500/30 bg-sky-500/10"
                      : open
                        ? "border-sky-400/50 bg-sky-500/5 animate-pulse"
                        : "border-white/10 bg-white/[0.02] opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black",
                      p ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-400",
                    )}
                  >
                    {i + 1}
                  </span>
                  {p ? (
                    <>
                      <img
                        src={p.photo}
                        alt=""
                        className="h-8 w-6 rounded object-cover object-top"
                        onError={(e) => {
                          e.currentTarget.src = playerPhotoUrl(p.name);
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-white">
                        {p.name.split(" ").slice(-1)[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-500">Tap</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT current player */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/30 p-2">
            {awaitingNext ? (
              <>
                <p className="text-center text-xs text-slate-400">Slot locked</p>
                <Button
                  size="sm"
                  onClick={nextPlayer}
                  className="mt-3 bg-sky-500 font-bold text-white hover:bg-sky-400"
                >
                  Next player →
                </Button>
              </>
            ) : current ? (
              <>
                <img
                  key={current.name}
                  src={current.photo}
                  alt={current.name}
                  className="h-36 w-28 rounded-xl object-cover object-top shadow-lg ring-1 ring-white/20 sm:h-40 sm:w-32"
                  onError={(e) => {
                    e.currentTarget.src = playerPhotoUrl(current.name);
                  }}
                />
                <p className="mt-2 text-center text-sm font-bold leading-tight text-white">
                  {current.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {current.positions[0]} · {current.overall}
                </p>
                <p className="mt-1 text-center text-[10px] text-slate-500">
                  Tap a rank on the left
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-3 p-3">
          <p className="text-center text-sm font-bold text-sky-200">
            Your Blind Ranking is Complete!
          </p>
          <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
            {slots.map((p, i) =>
              p ? (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-500 text-[10px] font-black text-white">
                    #{i + 1}
                  </span>
                  <img
                    src={p.photo}
                    alt=""
                    className="h-9 w-7 rounded object-cover object-top"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-500">OVR {p.overall}</p>
                  </div>
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
          <p className="text-center text-[10px] text-slate-500">Download · Share · Play again</p>
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
