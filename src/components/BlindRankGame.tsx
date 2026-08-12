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

const CARD_H = 168; // px — reel item height

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

export function BlindRankGame({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");
  const [size, setSize] = useState(5);
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
      window.setTimeout(() => setPhase("done"), 350);
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

    // Build smooth vertical reel: random faces + final target
    const faces = shuffle(LEGEND_PLAYERS.map(toPlayer)).slice(0, 10);
    const strip = [...faces, target];
    setReel(strip);
    setReelY(0);
    setReelAnimate(false);
    setSpinning(true);
    setPlaced(false);

    // Start CSS transition on next frame
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
    }, 1400);
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
      ctx.font = "26px system-ui";
      ctx.fillText("Powered by NepARENA", W / 2, 210);

      const gap = 12;
      const cols = Math.min(5, size);
      const cellW = Math.floor((W - 96 - gap * (cols - 1)) / cols);
      const cellH = Math.floor(cellW * 1.25);
      const startY = 250;
      for (let i = 0; i < slots.length; i++) {
        const p = slots[i];
        if (!p) continue;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 48 + col * (cellW + gap);
        const y = startY + row * (cellH + gap);
        const photo = await loadImage(p.photo);
        if (photo) {
          ctx.drawImage(photo, x, y, cellW, cellH);
        } else {
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(x, y, cellW, cellH);
        }
        ctx.fillStyle = "#0ea5e9";
        ctx.beginPath();
        ctx.arc(x + 22, y + 22, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`#${i + 1}`, x + 22, y + 27);
      }
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-400">Viral game</p>
        <h3 className="mt-1 text-lg font-bold text-white">Blind Ranking</h3>
        <p className="mt-1 text-xs text-slate-400">Spin · rank · share</p>
        <Button asChild className="mt-4 bg-sky-500 font-semibold text-white hover:bg-sky-400">
          <a href="/games/blind-ranking">
            <Play className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  const displayCard = spinning
    ? null
    : current;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-b from-slate-950 via-[#0a1628] to-black">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">Blind Ranking</p>
          <p className="text-[10px] text-slate-500">eFootball cards · NepARENA</p>
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
            <Play className="mr-2 h-4 w-4" /> Start
          </Button>
        </div>
      )}

      {phase === "play" && (
        <div className="flex gap-2 p-2.5">
          {/* Compact rank column — mobile-friendly size */}
          <div className="flex w-[4.5rem] shrink-0 flex-col gap-1.5 sm:w-[5.25rem]">
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
                      ? "border-sky-500/40"
                      : open
                        ? "border-sky-400/70 bg-sky-500/10 animate-pulse"
                        : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  {p ? (
                    <>
                      <img src={p.photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute left-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-sky-500 text-[8px] font-black text-white">
                        {i + 1}
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

          {/* Card + smooth reel */}
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <div
              className="relative w-full max-w-[140px] overflow-hidden rounded-xl ring-1 ring-white/20 sm:max-w-[160px]"
              style={{ height: CARD_H }}
            >
              {spinning && reel.length > 0 ? (
                <div
                  className="absolute inset-x-0 top-0"
                  style={{
                    transform: `translateY(${reelY}px)`,
                    transition: reelAnimate
                      ? "transform 1.25s cubic-bezier(0.12, 0.75, 0.2, 1)"
                      : "none",
                  }}
                >
                  {reel.map((p, i) => (
                    <img
                      key={`${p.name}-${i}`}
                      src={p.photo}
                      alt=""
                      className="w-full object-cover"
                      style={{ height: CARD_H }}
                    />
                  ))}
                </div>
              ) : displayCard ? (
                <img
                  src={displayCard.photo}
                  alt={displayCard.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-xs text-slate-500">—</div>
              )}
            </div>

            {!spinning && displayCard && (
              <div className="mt-1.5 text-center">
                <p className="text-xs font-bold text-white">{displayCard.name}</p>
                <p className="text-[10px] text-slate-400">
                  {displayCard.positions[0]} · {displayCard.overall}
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
              className="mt-2 w-full max-w-[140px] bg-sky-500 font-bold text-white hover:bg-sky-400 disabled:opacity-40"
            >
              {spinning ? "…" : "Next →"}
            </Button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-3 p-3">
          <p className="text-center text-sm font-bold text-sky-200">Ranking complete!</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {slots.map((p, i) =>
              p ? (
                <div key={i} className="relative h-16 w-12 overflow-hidden rounded-lg border border-white/10 sm:h-20 sm:w-14">
                  <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                  <span className="absolute left-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-sky-500 text-[8px] font-black text-white">
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
        </div>
      )}
    </div>
  );
}
