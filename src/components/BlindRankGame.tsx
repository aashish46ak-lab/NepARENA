import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LEGEND_PLAYERS } from "@/components/AllTimeXi";
import { playerPhotoFallback, playerPhotoUrl } from "@/lib/player-photos";
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

const CARD_H = 176;
const SPIN_MS = 1800;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
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

/** Draw portrait with face bias (upper center crop). */
function drawFaceCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }
  const target = dw / dh;
  // Prefer upper portion of image (faces)
  let cropH = Math.min(sh * 0.62, sh);
  let cropW = cropH * target;
  if (cropW > sw) {
    cropW = sw;
    cropH = cropW / target;
  }
  const sx = Math.max(0, (sw - cropW) / 2);
  const sy = Math.max(0, sh * 0.06);
  ctx.drawImage(img, sx, sy, cropW, Math.min(cropH, sh - sy), dx, dy, dw, dh);
}

function FaceImg({
  src,
  name,
  className,
}: {
  src: string;
  name: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={name}
      className={cn("h-full w-full object-cover", className)}
      style={{ objectPosition: "center 18%" }}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = playerPhotoFallback(name);
      }}
    />
  );
}

function toPlayer(p: (typeof LEGEND_PLAYERS)[number]): RankPlayer {
  return {
    name: p.name,
    overall: p.overall,
    positions: p.positions,
    photo: playerPhotoUrl(p.name),
  };
}

function ratingPct(overall: number): number {
  return Math.min(99, Math.max(70, overall));
}

export function BlindRankGame({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");
  const [size, setSize] = useState(8);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [deck, setDeck] = useState<RankPlayer[]>([]);
  const [cursor, setCursor] = useState(0);
  const [slots, setSlots] = useState<(RankPlayer | null)[]>([]);
  const [placed, setPlaced] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState<RankPlayer[]>([]);
  const [reelY, setReelY] = useState(0);
  const [reelAnimate, setReelAnimate] = useState(false);
  const spinEnd = useRef<number | null>(null);

  const current =
    phase === "play" && !spinning
      ? deck[cursor] ?? null
      : spinning
        ? reel[reel.length - 1] ?? null
        : null;
  const filled = slots.filter(Boolean).length;

  useEffect(() => {
    return () => {
      if (spinEnd.current) window.clearTimeout(spinEnd.current);
    };
  }, []);

  const start = () => {
    const pool = shuffle(LEGEND_PLAYERS.map(toPlayer));
    setDeck(pool.slice(0, size));
    setSlots(Array.from({ length: size }, () => null));
    setCursor(0);
    setPlaced(false);
    setSpinning(false);
    setReel([]);
    setReelY(0);
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

    const faces = shuffle(LEGEND_PLAYERS.map(toPlayer)).slice(0, 14);
    const strip = [...faces, target];
    setReel(strip);
    setReelY(0);
    setReelAnimate(false);
    setSpinning(true);
    setPlaced(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReelAnimate(true);
        setReelY(-(strip.length - 1) * CARD_H);
      });
    });

    if (spinEnd.current) window.clearTimeout(spinEnd.current);
    spinEnd.current = window.setTimeout(() => {
      setCursor(nextIdx);
      setSpinning(false);
      setReelAnimate(false);
      setReelY(0);
      setReel([target]);
      setPlaced(false);
    }, SPIN_MS);
  };

  const reset = () => {
    if (spinEnd.current) window.clearTimeout(spinEnd.current);
    setPhase("setup");
    setDeck([]);
    setSlots([]);
    setCursor(0);
    setPlaced(false);
    setSpinning(false);
    setReel([]);
  };

  /** Vertical ranking cards export — 1 column stacked */
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
      const n = slots.filter(Boolean).length || size;
      const W = 1080;
      const headerH = 220;
      const cardH = 130;
      const gap = 14;
      const pad = 48;
      const H = headerH + n * (cardH + gap) + 80;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#020617");
      bg.addColorStop(0.4, "#0b1d3a");
      bg.addColorStop(1, "#020617");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // soft glow
      ctx.fillStyle = "rgba(14,165,233,0.08)";
      ctx.beginPath();
      ctx.ellipse(W / 2, 80, 280, 100, 0, 0, Math.PI * 2);
      ctx.fill();

      const logo = await loadImage("/neparena-logo.png");
      if (logo) ctx.drawImage(logo, W / 2 - 44, 28, 88, 88);

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "bold 42px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MY BLIND RANKING", W / 2, 150);
      ctx.fillStyle = "rgba(148,163,184,0.95)";
      ctx.font = "22px system-ui";
      ctx.fillText("Powered by NepARENA", W / 2, 185);

      let y = headerH;
      for (let i = 0; i < slots.length; i++) {
        const p = slots[i];
        if (!p) continue;

        // Card background
        ctx.fillStyle = "rgba(15,23,42,0.92)";
        roundRect(ctx, pad, y, W - pad * 2, cardH, 18);
        ctx.fill();
        ctx.strokeStyle = "rgba(56,189,248,0.35)";
        ctx.lineWidth = 2;
        roundRect(ctx, pad, y, W - pad * 2, cardH, 18);
        ctx.stroke();

        // Rank badge
        ctx.fillStyle = "#0ea5e9";
        ctx.beginPath();
        ctx.arc(pad + 42, y + cardH / 2, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 26px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`#${i + 1}`, pad + 42, y + cardH / 2 + 9);

        // Face portrait box
        const px = pad + 90;
        const py = y + 14;
        const pw = 102;
        const ph = cardH - 28;
        ctx.save();
        roundRect(ctx, px, py, pw, ph, 12);
        ctx.clip();
        const photo = await loadImage(p.photo);
        if (photo) {
          drawFaceCrop(ctx, photo, px, py, pw, ph);
        } else {
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(px, py, pw, ph);
        }
        ctx.restore();

        // Name + meta
        ctx.textAlign = "left";
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 32px system-ui";
        ctx.fillText(p.name, px + pw + 24, y + 52);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "22px system-ui";
        ctx.fillText(
          `${p.positions[0] ?? "—"} · OVR ${p.overall}`,
          px + pw + 24,
          y + 86,
        );

        // Rating %
        const pct = ratingPct(p.overall);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 28px system-ui";
        ctx.textAlign = "right";
        ctx.fillText(`${pct}%`, W - pad - 28, y + cardH / 2 + 10);

        y += cardH + gap;
      }

      ctx.fillStyle = "rgba(148,163,184,0.85)";
      ctx.font = "20px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("neparena.xyz/games/blind-ranking", W / 2, H - 32);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `neparena-blind-ranking-top${n}-${Date.now()}.png`;
      a.click();
      toast.success("Vertical ranking PNG saved");
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-400">Viral game</p>
        <h3 className="mt-1 text-lg font-bold text-white">Blind Ranking</h3>
        <p className="mt-1 text-xs text-slate-400">Spin · face cards · Top 8 export</p>
        <Button asChild className="mt-4 bg-sky-500 font-semibold text-white hover:bg-sky-400">
          <a href="/games/blind-ranking">
            <Play className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  const displayCard = spinning ? null : current;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-b from-slate-950 via-[#0a1628] to-black">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">Blind Ranking</p>
          <p className="text-[10px] text-slate-500">Face cards · vertical export</p>
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
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: size }, (_, i) => (
              <div
                key={i}
                className="grid h-11 w-11 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] text-[10px] font-bold text-slate-500"
              >
                #{i + 1}
              </div>
            ))}
          </div>
          <Button onClick={start} className="w-full bg-sky-500 font-semibold text-white hover:bg-sky-400">
            <Play className="mr-2 h-4 w-4" /> Start Top {size}
          </Button>
        </div>
      )}

      {phase === "play" && (
        <div className="flex gap-2 p-2.5">
          <div className="flex w-[4.75rem] shrink-0 flex-col gap-1.5 sm:w-[5.5rem]">
            {slots.map((p, i) => {
              const open = !p && !!current && !placed && !spinning;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!open}
                  onClick={() => place(i)}
                  className={cn(
                    "relative h-12 w-full overflow-hidden rounded-lg border sm:h-14",
                    p
                      ? "border-sky-500/50 shadow-[0_0_12px_rgba(14,165,233,0.25)]"
                      : open
                        ? "border-sky-400/80 bg-sky-500/15 animate-pulse"
                        : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  {p ? (
                    <>
                      <FaceImg src={p.photo} name={p.name} />
                      <span className="absolute left-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-sky-500 text-[8px] font-black text-white">
                        {i + 1}
                      </span>
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[8px] font-semibold text-white truncate px-0.5">
                        {p.name.split(" ").slice(-1)[0]}
                      </span>
                    </>
                  ) : (
                    <span className="grid h-full place-items-center text-[10px] font-bold text-slate-500">
                      #{i + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center">
            <div
              className="relative w-full max-w-[150px] overflow-hidden rounded-xl ring-2 ring-sky-400/30 sm:max-w-[170px]"
              style={{
                height: CARD_H,
                boxShadow: spinning
                  ? "0 0 32px rgba(14,165,233,0.45)"
                  : "0 0 16px rgba(14,165,233,0.15)",
              }}
            >
              {/* Gradient mask edges while spinning */}
              {spinning && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-black/70 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-black/70 to-transparent" />
                </>
              )}
              {spinning && reel.length > 0 ? (
                <div
                  className="absolute inset-x-0 top-0"
                  style={{
                    transform: `translateY(${reelY}px)`,
                    transition: reelAnimate
                      ? `transform ${SPIN_MS}ms cubic-bezier(0.08, 0.82, 0.12, 1)`
                      : "none",
                  }}
                >
                  {reel.map((p, i) => (
                    <div key={`${p.name}-${i}`} style={{ height: CARD_H }} className="w-full">
                      <FaceImg src={p.photo} name={p.name} />
                    </div>
                  ))}
                </div>
              ) : displayCard ? (
                <FaceImg src={displayCard.photo} name={displayCard.name} />
              ) : (
                <div className="grid h-full place-items-center text-xs text-slate-500">—</div>
              )}
            </div>

            {!spinning && displayCard && (
              <div className="mt-1.5 text-center">
                <p className="text-xs font-bold text-white">{displayCard.name}</p>
                <p className="text-[10px] text-slate-400">
                  {displayCard.positions[0]} · {displayCard.overall} · {ratingPct(displayCard.overall)}%
                </p>
              </div>
            )}

            <p className="mt-1 text-center text-[10px] text-slate-500">
              {spinning
                ? "Spinning…"
                : placed
                  ? "Locked — Next"
                  : "Tap rank on left"}
            </p>

            <Button
              size="sm"
              disabled={spinning || !placed}
              onClick={nextPlayer}
              className="mt-2 w-full max-w-[150px] bg-sky-500 font-bold text-white hover:bg-sky-400 disabled:opacity-40"
            >
              {spinning ? "Spinning…" : "Next →"}
            </Button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-3 p-3">
          <p className="text-center text-sm font-bold text-sky-200">Your ranking is ready</p>
          {/* Vertical stack — same as export layout */}
          <div className="mx-auto max-w-xs space-y-1.5">
            {slots.map((p, i) =>
              p ? (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-sky-500/25 bg-white/[0.04] p-1.5"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-500 text-[11px] font-black text-white">
                    {i + 1}
                  </span>
                  <div className="h-11 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
                    <FaceImg src={p.photo} name={p.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.positions[0]} · {ratingPct(p.overall)}%
                    </p>
                  </div>
                </div>
              ) : null,
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button size="sm" className="bg-sky-500 text-white hover:bg-sky-400" onClick={() => void exportPng()}>
              <Download className="mr-1 h-3.5 w-3.5" /> PNG
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" onClick={() => void share()}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
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
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
