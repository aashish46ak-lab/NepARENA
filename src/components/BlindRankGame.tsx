import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LEGEND_PLAYERS } from "@/components/AllTimeXi";
import { Download, Play, RotateCcw, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RankPlayer = {
  name: string;
  overall: number;
  color: string;
  positions: string[];
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Premium eFootball-style card face (gradient + OVR + initials as visual) */
function PlayerCardFace({
  player,
  size = "lg",
  rank,
}: {
  player: RankPlayer;
  size?: "sm" | "md" | "lg";
  rank?: number;
}) {
  const dims =
    size === "lg"
      ? "h-56 w-40 sm:h-64 sm:w-44"
      : size === "md"
        ? "h-20 w-14"
        : "h-14 w-10";
  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-xl border border-white/30 bg-gradient-to-b shadow-[0_0_30px_rgba(56,189,248,0.2)]",
        dims,
        player.color,
      )}
    >
      <div className="flex items-start justify-between px-2 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/80">
          {player.positions[0] ?? "—"}
        </span>
        <span className="rounded bg-black/40 px-1.5 py-0.5 text-xs font-black text-amber-300 tabular-nums">
          {player.overall}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span
          className={cn(
            "font-black text-white/90 drop-shadow-lg",
            size === "lg" ? "text-5xl" : size === "md" ? "text-lg" : "text-xs",
          )}
        >
          {initials(player.name)}
        </span>
      </div>
      <div className="bg-black/50 px-1.5 py-1.5 text-center backdrop-blur-sm">
        <p
          className={cn(
            "truncate font-semibold leading-tight text-white",
            size === "lg" ? "text-sm" : "text-[9px]",
          )}
        >
          {player.name}
        </p>
      </div>
      {rank != null && (
        <span className="absolute left-1.5 top-8 grid h-6 w-6 place-items-center rounded-full bg-sky-500 text-[10px] font-black text-white shadow">
          #{rank}
        </span>
      )}
    </div>
  );
}

export function BlindRankGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [size, setSize] = useState(5);
  const [deck, setDeck] = useState<RankPlayer[]>([]);
  const [cursor, setCursor] = useState(0);
  const [slots, setSlots] = useState<(RankPlayer | null)[]>([]);
  const [placing, setPlacing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  const current = phase === "play" ? deck[cursor] ?? null : null;
  const filled = slots.filter(Boolean).length;
  const emptyIndexes = useMemo(
    () => slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0),
    [slots],
  );

  const start = () => {
    const pool = shuffle(
      LEGEND_PLAYERS.map((p) => ({
        name: p.name,
        overall: p.overall,
        color: p.color,
        positions: p.positions,
      })),
    );
    const pick = pool.slice(0, size);
    setDeck(pick);
    setSlots(Array.from({ length: size }, () => null));
    setCursor(0);
    setPhase("play");
  };

  const place = (index: number) => {
    if (!current || slots[index] || placing) return;
    setPlacing(true);
    setSlots((prev) => {
      const next = [...prev];
      next[index] = current;
      return next;
    });
    window.setTimeout(() => {
      const nextCursor = cursor + 1;
      if (nextCursor >= size) {
        setPhase("done");
      } else {
        setCursor(nextCursor);
      }
      setPlacing(false);
    }, 280);
  };

  const reset = () => {
    setPhase("setup");
    setDeck([]);
    setSlots([]);
    setCursor(0);
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

      // background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#020617");
      bg.addColorStop(0.5, "#0c1a3a");
      bg.addColorStop(1, "#020617");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // glow orbs
      ctx.fillStyle = "rgba(56,189,248,0.12)";
      ctx.beginPath();
      ctx.arc(200, 200, 280, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(244,63,94,0.1)";
      ctx.beginPath();
      ctx.arc(900, 1100, 260, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MY BLIND RANKING TEST", W / 2, 90);

      ctx.fillStyle = "rgba(148,163,184,0.9)";
      ctx.font = "28px system-ui, sans-serif";
      ctx.fillText("Powered by NepARENA", W / 2, 140);

      const cardH = Math.min(100, Math.floor((H - 280) / size) - 12);
      const startY = 190;

      slots.forEach((p, i) => {
        if (!p) return;
        const y = startY + i * (cardH + 12);
        // row bg
        ctx.fillStyle = "rgba(15,23,42,0.85)";
        roundRect(ctx, 80, y, W - 160, cardH, 18);
        ctx.fill();
        ctx.strokeStyle = "rgba(56,189,248,0.35)";
        ctx.lineWidth = 2;
        roundRect(ctx, 80, y, W - 160, cardH, 18);
        ctx.stroke();

        // rank circle
        ctx.fillStyle = "#0ea5e9";
        ctx.beginPath();
        ctx.arc(140, y + cardH / 2, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 26px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`#${i + 1}`, 140, y + cardH / 2 + 9);

        // mini card
        const cx = 230;
        const cy = y + 12;
        const cw = 56;
        const ch = cardH - 24;
        const g = ctx.createLinearGradient(cx, cy, cx, cy + ch);
        g.addColorStop(0, "#38bdf8");
        g.addColorStop(1, "#1e3a8a");
        ctx.fillStyle = g;
        roundRect(ctx, cx, cy, cw, ch, 10);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px system-ui";
        ctx.fillText(initials(p.name), cx + cw / 2, cy + ch / 2 + 6);

        // name + ovr
        ctx.textAlign = "left";
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 32px system-ui";
        ctx.fillText(p.name, 310, y + cardH / 2 + 4);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 24px system-ui";
        ctx.textAlign = "right";
        ctx.fillText(String(p.overall), W - 120, y + cardH / 2 + 8);
      });

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(148,163,184,0.8)";
      ctx.font = "22px system-ui";
      ctx.fillText("neparena.xyz", W / 2, H - 40);

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
    try {
      await exportPng();
      if (navigator.share) {
        await navigator.share({
          title: "My Blind Ranking — NepARENA",
          text: "I just finished a Blind Ranking test on NepARENA!",
          url: "https://neparena.xyz",
        });
      }
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-b from-slate-950 via-[#0a1628] to-black p-4 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-500/20 ring-1 ring-sky-400/40">
          <Trophy className="h-5 w-5 text-sky-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Blind Ranking</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Viral ranking test · one player at a time · lock forever
          </p>
        </div>
      </div>

      {/* SETUP */}
      {phase === "setup" && (
        <div className="space-y-5">
          <p className="text-sm text-slate-300">Choose ranking size</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSize(n)}
                className={cn(
                  "rounded-xl border py-3 text-sm font-semibold transition",
                  size === n
                    ? "border-sky-400 bg-sky-500/20 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25",
                )}
              >
                Top {n}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {Array.from({ length: size }, (_, i) => (
              <div
                key={i}
                className="flex h-14 items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
                  #{i + 1}
                </span>
                <span className="text-sm text-slate-600">Empty slot</span>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            onClick={start}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-base font-bold text-white shadow-[0_0_30px_rgba(56,189,248,0.35)] hover:from-sky-400 hover:to-blue-500"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Blind Ranking
          </Button>
        </div>
      )}

      {/* PLAY */}
      {phase === "play" && current && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-400/80">
              Place this player · {filled + 1}/{size}
            </p>
            <div className="mt-4 flex justify-center">
              <div
                key={current.name}
                className="animate-[cardIn_0.35s_ease-out]"
              >
                <PlayerCardFace player={current} size="lg" />
              </div>
            </div>
            <p className="mt-3 text-xl font-bold text-white">{current.name}</p>
            <p className="text-xs text-slate-400">
              {current.positions.join(" · ")} · OVR {current.overall}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Tap an empty rank slot below — locked once placed
            </p>
          </div>

          <div className="space-y-2">
            {slots.map((p, i) => {
              const open = !p && !placing;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!open}
                  onClick={() => place(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    p
                      ? "border-sky-500/30 bg-sky-500/10"
                      : open
                        ? "border-sky-400/40 bg-sky-500/5 hover:bg-sky-500/15 animate-pulse"
                        : "border-white/10 bg-white/[0.02] opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black",
                      p ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-400",
                    )}
                  >
                    #{i + 1}
                  </span>
                  {p ? (
                    <>
                      <PlayerCardFace player={p} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{p.name}</p>
                        <p className="text-[11px] text-slate-400">
                          OVR {p.overall} · locked
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500">Tap to place here</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-slate-600">
            {emptyIndexes.length} slots left · upcoming players hidden
          </p>
        </div>
      )}

      {/* DONE */}
      {phase === "done" && (
        <div className="space-y-5" ref={shareRef}>
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-4 text-center">
            <p className="text-lg font-bold text-sky-100">
              Your Blind Ranking is Complete!
            </p>
            <p className="mt-1 text-xs text-slate-400">Share your ranking with friends</p>
          </div>

          <div className="space-y-2">
            {slots.map((p, i) =>
              p ? (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-500 text-xs font-black text-white">
                    #{i + 1}
                  </span>
                  <PlayerCardFace player={p} size="sm" rank={i + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{p.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {p.positions[0]} · OVR {p.overall}
                    </p>
                  </div>
                </div>
              ) : null,
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              onClick={() => void exportPng()}
              className="bg-sky-500 font-semibold text-white hover:bg-sky-400"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
            <Button
              variant="outline"
              className="border-white/15"
              onClick={() => void share()}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" className="border-white/15" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Play Again
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
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
