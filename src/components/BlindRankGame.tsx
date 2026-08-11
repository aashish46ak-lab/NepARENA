import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, Shuffle, Trophy } from "lucide-react";
import { toast } from "sonner";

/** Famous footballers for blind ranking game */
const POOL = [
  "Messi", "Ronaldo", "Mbappé", "Haaland", "Neymar",
  "Salah", "De Bruyne", "Vinícius Jr", "Bellingham", "Saka",
  "Rodri", "Modrić", "Benzema", "Kane", "Lewandowski",
  "Pedri", "Foden", "Yamal", "Osimhen", "Lautaro",
  "Valverde", "Gavi", "Casemiro", "Van Dijk", "Alisson",
  "Courtois", "Donnarumma", "Robertson", "Cancelo", "Davies",
];

const POSITIONS = [
  { id: "gk", label: "GK", x: 50, y: 88 },
  { id: "lb", label: "LB", x: 18, y: 68 },
  { id: "cb1", label: "CB", x: 38, y: 72 },
  { id: "cb2", label: "CB", x: 62, y: 72 },
  { id: "rb", label: "RB", x: 82, y: 68 },
  { id: "cm1", label: "CM", x: 30, y: 48 },
  { id: "cm2", label: "CM", x: 50, y: 52 },
  { id: "cm3", label: "CM", x: 70, y: 48 },
  { id: "lw", label: "LW", x: 22, y: 28 },
  { id: "st", label: "ST", x: 50, y: 22 },
  { id: "rw", label: "RW", x: 78, y: 28 },
] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function BlindRankGame() {
  const [count, setCount] = useState(10);
  const [deck, setDeck] = useState<string[]>(() => shuffle(POOL).slice(0, 10));
  const [cursor, setCursor] = useState(0);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const pitchRef = useRef<HTMLDivElement>(null);

  const current = deck[cursor] ?? null;
  const filled = Object.keys(slots).length;
  const done = filled >= Math.min(count, POSITIONS.length) || cursor >= deck.length;

  const rotate = () => {
    setDeck(shuffle(POOL).slice(0, count));
    setCursor(0);
    setSlots({});
  };

  const place = (posId: string) => {
    if (!current || slots[posId]) return;
    setSlots((s) => ({ ...s, [posId]: current }));
    setCursor((c) => c + 1);
  };

  const exportPng = async () => {
    const el = pitchRef.current;
    if (!el) return;
    try {
      // Simple canvas snapshot via foreignObject is fragile; draw manually
      const w = 720;
      const h = 960;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // pitch
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#14532d");
      g.addColorStop(1, "#052e16");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // lines
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, w - 80, h - 80);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(40, h / 2);
      ctx.lineTo(w - 40, h / 2);
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NepARENA Blind Rank XI", w / 2, 32);

      for (const p of POSITIONS) {
        const name = slots[p.id];
        if (!name) continue;
        const x = (p.x / 100) * w;
        const y = (p.y / 100) * h;
        ctx.beginPath();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px system-ui";
        ctx.fillText(p.label, x, y - 36);
        ctx.font = "bold 13px system-ui";
        ctx.fillText(name, x, y + 5);
      }

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "14px system-ui";
      ctx.fillText("neparena.xyz", w / 2, h - 16);

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `neparena-blind-rank-${Date.now()}.png`;
      a.click();
      toast.success("PNG downloaded");
    } catch {
      toast.error("Could not export image");
    }
  };

  const remaining = useMemo(
    () => POSITIONS.filter((p) => !slots[p.id]),
    [slots],
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-emerald-950/40 to-black/40 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-100">
            <Trophy className="h-5 w-5 text-amber-400" />
            Blind Rank XI
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            Rotate random players · tap a position · build your blind ranking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={count}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCount(n);
              setDeck(shuffle(POOL).slice(0, n));
              setCursor(0);
              setSlots({});
            }}
            className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          >
            {[5, 6, 7, 8, 9, 10, 11].map((n) => (
              <option key={n} value={n}>
                {n} players
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" className="border-white/15" onClick={rotate}>
            <Shuffle className="mr-1.5 h-3.5 w-3.5" />
            Rotate
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15"
            onClick={() => {
              setCursor(0);
              setSlots({});
              setDeck(shuffle(POOL).slice(0, count));
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 text-black hover:bg-amber-400"
            disabled={filled === 0}
            onClick={() => void exportPng()}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Save PNG
          </Button>
        </div>
      </div>

      {!done && current && (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
          <p className="text-[11px] uppercase tracking-widest text-amber-200/80">
            Place this player · {cursor + 1}/{deck.length}
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-100">{current}</p>
          <p className="mt-1 text-xs text-neutral-400">
            Tap an empty position on the pitch
          </p>
        </div>
      )}

      {done && (
        <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
          Ranking complete — export as PNG or rotate for a new pack
        </div>
      )}

      <div
        ref={pitchRef}
        className="relative mx-auto aspect-[3/4] max-w-md overflow-hidden rounded-2xl border border-white/10"
        style={{
          background:
            "linear-gradient(180deg,#166534 0%,#14532d 40%,#052e16 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-4 rounded-lg border border-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div className="pointer-events-none absolute left-4 right-4 top-1/2 h-px bg-white/25" />

        {POSITIONS.map((p) => {
          const name = slots[p.id];
          const open = !name && !!current && !done;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!open}
              onClick={() => place(p.id)}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${
                open ? "cursor-pointer" : "cursor-default"
              }`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-full text-[10px] font-bold shadow-lg ring-2 ${
                  name
                    ? "bg-black/70 text-white ring-amber-400"
                    : open
                      ? "bg-white/15 text-white ring-white/40 animate-pulse"
                      : "bg-black/40 text-white/50 ring-white/15"
                }`}
              >
                {p.label}
              </span>
              {name && (
                <span className="mt-1 max-w-[72px] truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {remaining.length > 0 && current && (
        <p className="mt-3 text-center text-[11px] text-neutral-500">
          Open slots: {remaining.map((r) => r.label).join(" · ")}
        </p>
      )}
    </div>
  );
}
