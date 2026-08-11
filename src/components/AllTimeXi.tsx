import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Shirt, X } from "lucide-react";

export type XiSlot = {
  pos: string;
  label: string;
  name: string | null;
};

export type AllTimeXi = {
  formation: string;
  slots: XiSlot[];
};

const FORMATION_433: XiSlot[] = [
  { pos: "GK", label: "GK", name: null },
  { pos: "LB", label: "LB", name: null },
  { pos: "CB", label: "CB", name: null },
  { pos: "CB", label: "CB", name: null },
  { pos: "RB", label: "RB", name: null },
  { pos: "CM", label: "CM", name: null },
  { pos: "CM", label: "CM", name: null },
  { pos: "CM", label: "CM", name: null },
  { pos: "LW", label: "LW", name: null },
  { pos: "ST", label: "ST", name: null },
  { pos: "RW", label: "RW", name: null },
];

/** Curated legends — images via ui-avatars (no upload needed) */
export const LEGEND_PLAYERS = [
  "Lionel Messi",
  "Cristiano Ronaldo",
  "Pelé",
  "Diego Maradona",
  "Zinedine Zidane",
  "Ronaldinho",
  "Ronaldo Nazário",
  "Johan Cruyff",
  "Franz Beckenbauer",
  "Paolo Maldini",
  "Franco Baresi",
  "Cafu",
  "Roberto Carlos",
  "Andrea Pirlo",
  "Xavi Hernández",
  "Andrés Iniesta",
  "Luka Modrić",
  "Kevin De Bruyne",
  "Thierry Henry",
  "Kylian Mbappé",
  "Neymar Jr",
  "Mohamed Salah",
  "Robert Lewandowski",
  "Manuel Neuer",
  "Gianluigi Buffon",
  "Iker Casillas",
  "Sergio Ramos",
  "Virgil van Dijk",
  "Kaká",
  "Steven Gerrard",
  "Frank Lampard",
  "Patrick Vieira",
  "Claude Makélélé",
  "Gareth Bale",
  "Luis Suárez",
  "Karim Benzema",
  "Didier Drogba",
  "Samuel Eto'o",
  "George Best",
  "Michel Platini",
];

export function emptyXi(): AllTimeXi {
  return {
    formation: "4-3-3",
    slots: FORMATION_433.map((s) => ({ ...s })),
  };
}

export function parseXi(raw: unknown): AllTimeXi | null {
  try {
    if (!raw) return null;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || !Array.isArray(data.slots) || data.slots.length !== 11)
      return null;
    return data as AllTimeXi;
  } catch {
    return null;
  }
}

function avatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name,
  )}&background=1f2937&color=f5f5f5&bold=true&size=128`;
}

const PITCH_POS: { x: number; y: number }[] = [
  { x: 50, y: 88 },
  { x: 15, y: 68 },
  { x: 35, y: 72 },
  { x: 65, y: 72 },
  { x: 85, y: 68 },
  { x: 25, y: 48 },
  { x: 50, y: 52 },
  { x: 75, y: 48 },
  { x: 18, y: 22 },
  { x: 50, y: 18 },
  { x: 82, y: 22 },
];

export function AllTimeXiView({
  xi,
  editable,
  onChange,
}: {
  xi: AllTimeXi | null;
  editable?: boolean;
  onChange?: (next: AllTimeXi) => void;
}) {
  const data = xi ?? emptyXi();
  const [pickIdx, setPickIdx] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return LEGEND_PLAYERS;
    return LEGEND_PLAYERS.filter((p) => p.toLowerCase().includes(s));
  }, [q]);

  const setPlayer = (idx: number, name: string | null) => {
    if (!onChange) return;
    const next = {
      ...data,
      slots: data.slots.map((s, i) => (i === idx ? { ...s, name } : s)),
    };
    onChange(next);
    setPickIdx(null);
    setQ("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shirt className="h-4 w-4 text-brand-glow" />
          <h3 className="text-sm font-semibold">All-Time Football XI</h3>
          <span className="text-[11px] text-muted-foreground">
            {data.formation}
          </span>
        </div>
        {editable && (
          <span className="text-[11px] text-muted-foreground">
            Tap a slot to pick
          </span>
        )}
      </div>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-500/20 bg-[linear-gradient(180deg,#14532d_0%,#166534_40%,#15803d_100%)] shadow-inner">
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-white/20" />

        {data.slots.map((slot, i) => {
          const p = PITCH_POS[i];
          return (
            <button
              key={i}
              type="button"
              disabled={!editable}
              onClick={() => editable && setPickIdx(i)}
              className={cn(
                "absolute flex w-[72px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5",
                editable && "cursor-pointer",
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 bg-black/40 text-[10px] font-bold text-white shadow-lg",
                  slot.name
                    ? "border-white/40"
                    : "border-dashed border-white/30",
                )}
              >
                {slot.name ? (
                  <img
                    src={avatarUrl(slot.name)}
                    alt={slot.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  slot.label
                )}
              </div>
              <span className="max-w-[70px] truncate rounded bg-black/50 px-1 text-[9px] font-medium text-white">
                {slot.name ?? slot.label}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog
        open={pickIdx != null}
        onOpenChange={(o) => {
          if (!o) {
            setPickIdx(null);
            setQ("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Pick player — {pickIdx != null ? data.slots[pickIdx]?.label : ""}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search legends…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {pickIdx != null && data.slots[pickIdx]?.name && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-rose-400"
                onClick={() => setPlayer(pickIdx, null)}
              >
                <X className="mr-2 h-3.5 w-3.5" /> Clear slot
              </Button>
            )}
            {filtered.map((name) => (
              <button
                key={name}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5"
                onClick={() => pickIdx != null && setPlayer(pickIdx, name)}
              >
                <img
                  src={avatarUrl(name)}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
                {name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
