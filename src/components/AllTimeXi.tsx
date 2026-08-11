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
import { Shirt, X, Users } from "lucide-react";

export type XiSlot = {
  pos: string;
  label: string;
  name: string | null;
  overall?: number | null;
};

export type AllTimeXi = {
  formation: string;
  slots: XiSlot[];
  coach?: string | null;
  bench?: (string | null)[];
};

type PlayerDef = {
  name: string;
  positions: string[];
  overall: number;
  color: string;
};

const POS_FILTER: Record<string, string[]> = {
  GK: ["GK"],
  CB: ["CB"],
  LB: ["LB", "LWB"],
  RB: ["RB", "RWB"],
  DMF: ["DMF", "DM", "CDM"],
  CMF: ["CMF", "CM"],
  AMF: ["AMF", "AM", "CAM"],
  LWF: ["LWF", "LW", "LM"],
  RWF: ["RWF", "RW", "RM"],
  SS: ["SS"],
  CF: ["CF", "ST"],
  SUB: ["GK", "CB", "LB", "RB", "DMF", "CMF", "AMF", "LWF", "RWF", "SS", "CF"],
};

function matchesPos(player: PlayerDef, slotPos: string): boolean {
  const allowed = POS_FILTER[slotPos] ?? [slotPos];
  return player.positions.some((p) =>
    allowed.some((a) => p.toUpperCase() === a.toUpperCase()),
  );
}

const FORMATION_433: XiSlot[] = [
  { pos: "GK", label: "GK", name: null },
  { pos: "LB", label: "LB", name: null },
  { pos: "CB", label: "CB", name: null },
  { pos: "CB", label: "CB", name: null },
  { pos: "RB", label: "RB", name: null },
  { pos: "DMF", label: "DMF", name: null },
  { pos: "CMF", label: "CMF", name: null },
  { pos: "CMF", label: "CMF", name: null },
  { pos: "LWF", label: "LWF", name: null },
  { pos: "CF", label: "CF", name: null },
  { pos: "RWF", label: "RWF", name: null },
];

export const LEGEND_PLAYERS: PlayerDef[] = [
  { name: "Lionel Messi", positions: ["RWF", "SS", "AMF", "CF"], overall: 98, color: "from-sky-600 to-blue-900" },
  { name: "Cristiano Ronaldo", positions: ["CF", "LWF", "SS"], overall: 97, color: "from-red-600 to-red-950" },
  { name: "Pelé", positions: ["CF", "SS", "AMF"], overall: 98, color: "from-yellow-500 to-emerald-800" },
  { name: "Diego Maradona", positions: ["AMF", "SS", "LWF"], overall: 97, color: "from-sky-500 to-indigo-900" },
  { name: "Zinedine Zidane", positions: ["AMF", "CMF"], overall: 96, color: "from-white/40 to-slate-800" },
  { name: "Ronaldinho", positions: ["AMF", "LWF", "SS"], overall: 95, color: "from-yellow-400 to-emerald-900" },
  { name: "Ronaldo Nazário", positions: ["CF", "SS"], overall: 96, color: "from-yellow-400 to-blue-900" },
  { name: "Johan Cruyff", positions: ["CF", "SS", "AMF"], overall: 96, color: "from-orange-500 to-red-900" },
  { name: "Franz Beckenbauer", positions: ["CB", "DMF", "CMF"], overall: 95, color: "from-red-500 to-white/20" },
  { name: "Paolo Maldini", positions: ["CB", "LB"], overall: 95, color: "from-red-700 to-black" },
  { name: "Franco Baresi", positions: ["CB"], overall: 94, color: "from-red-700 to-black" },
  { name: "Cafu", positions: ["RB", "RWB"], overall: 93, color: "from-yellow-400 to-emerald-800" },
  { name: "Roberto Carlos", positions: ["LB", "LWB"], overall: 93, color: "from-white/30 to-slate-800" },
  { name: "Andrea Pirlo", positions: ["DMF", "CMF", "AMF"], overall: 94, color: "from-black to-white/20" },
  { name: "Xavi Hernández", positions: ["CMF", "DMF"], overall: 94, color: "from-sky-500 to-red-700" },
  { name: "Andrés Iniesta", positions: ["CMF", "AMF", "LWF"], overall: 94, color: "from-sky-500 to-red-700" },
  { name: "Luka Modrić", positions: ["CMF", "AMF"], overall: 93, color: "from-white/40 to-slate-800" },
  { name: "Kevin De Bruyne", positions: ["AMF", "CMF", "RWF"], overall: 93, color: "from-sky-400 to-slate-800" },
  { name: "Thierry Henry", positions: ["CF", "LWF", "SS"], overall: 94, color: "from-red-600 to-white/20" },
  { name: "Kylian Mbappé", positions: ["CF", "LWF", "RWF"], overall: 94, color: "from-blue-600 to-red-700" },
  { name: "Neymar Jr", positions: ["LWF", "SS", "AMF"], overall: 93, color: "from-yellow-400 to-emerald-800" },
  { name: "Mohamed Salah", positions: ["RWF", "CF"], overall: 92, color: "from-red-600 to-red-950" },
  { name: "Robert Lewandowski", positions: ["CF"], overall: 93, color: "from-red-600 to-white/20" },
  { name: "Manuel Neuer", positions: ["GK"], overall: 94, color: "from-red-600 to-white/20" },
  { name: "Gianluigi Buffon", positions: ["GK"], overall: 94, color: "from-black to-white/20" },
  { name: "Iker Casillas", positions: ["GK"], overall: 93, color: "from-white/40 to-slate-800" },
  { name: "Sergio Ramos", positions: ["CB"], overall: 93, color: "from-white/40 to-slate-800" },
  { name: "Virgil van Dijk", positions: ["CB"], overall: 92, color: "from-red-600 to-red-950" },
  { name: "Kaká", positions: ["AMF", "CMF", "SS"], overall: 93, color: "from-red-700 to-black" },
  { name: "Steven Gerrard", positions: ["CMF", "DMF", "AMF"], overall: 92, color: "from-red-600 to-red-950" },
  { name: "Frank Lampard", positions: ["CMF", "AMF"], overall: 91, color: "from-blue-600 to-slate-900" },
  { name: "Patrick Vieira", positions: ["DMF", "CMF"], overall: 92, color: "from-red-600 to-white/20" },
  { name: "Claude Makélélé", positions: ["DMF"], overall: 91, color: "from-blue-600 to-slate-900" },
  { name: "Gareth Bale", positions: ["RWF", "LWF", "CF"], overall: 91, color: "from-white/40 to-slate-800" },
  { name: "Luis Suárez", positions: ["CF", "SS"], overall: 92, color: "from-sky-500 to-red-700" },
  { name: "Karim Benzema", positions: ["CF", "SS"], overall: 92, color: "from-white/40 to-slate-800" },
  { name: "Didier Drogba", positions: ["CF"], overall: 91, color: "from-blue-600 to-slate-900" },
  { name: "Samuel Eto'o", positions: ["CF", "RWF"], overall: 91, color: "from-sky-500 to-red-700" },
  { name: "George Best", positions: ["RWF", "LWF", "SS"], overall: 93, color: "from-red-600 to-yellow-600" },
  { name: "Michel Platini", positions: ["AMF", "CMF", "SS"], overall: 94, color: "from-blue-500 to-white/20" },
  { name: "Lev Yashin", positions: ["GK"], overall: 95, color: "from-red-700 to-slate-900" },
  { name: "Alessandro Nesta", positions: ["CB"], overall: 93, color: "from-black to-red-800" },
  { name: "Fabio Cannavaro", positions: ["CB"], overall: 93, color: "from-sky-500 to-emerald-800" },
  { name: "Philipp Lahm", positions: ["RB", "LB", "DMF"], overall: 92, color: "from-red-600 to-white/20" },
  { name: "Marcelo", positions: ["LB"], overall: 90, color: "from-white/40 to-slate-800" },
  { name: "Dani Alves", positions: ["RB"], overall: 90, color: "from-sky-500 to-red-700" },
  { name: "Sergio Busquets", positions: ["DMF", "CMF"], overall: 91, color: "from-sky-500 to-red-700" },
  { name: "Toni Kroos", positions: ["CMF", "DMF"], overall: 91, color: "from-white/40 to-slate-800" },
  { name: "Zlatan Ibrahimović", positions: ["CF", "SS"], overall: 92, color: "from-red-700 to-black" },
  { name: "Wayne Rooney", positions: ["CF", "SS", "AMF"], overall: 91, color: "from-red-600 to-yellow-600" },
];

const COACHES = [
  "Pep Guardiola",
  "Carlo Ancelotti",
  "José Mourinho",
  "Sir Alex Ferguson",
  "Jürgen Klopp",
  "Zinedine Zidane",
  "Arrigo Sacchi",
  "Johan Cruyff",
];

export function emptyXi(): AllTimeXi {
  return {
    formation: "4-3-3",
    slots: FORMATION_433.map((s) => ({ ...s })),
    coach: null,
    bench: [null, null, null, null, null, null, null],
  };
}

export function parseXi(raw: unknown): AllTimeXi | null {
  try {
    if (!raw) return null;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || !Array.isArray(data.slots) || data.slots.length < 11) return null;
    return {
      formation: data.formation ?? "4-3-3",
      slots: data.slots.slice(0, 11),
      coach: data.coach ?? null,
      bench: Array.isArray(data.bench)
        ? [...data.bench, ...Array(7).fill(null)].slice(0, 7)
        : [null, null, null, null, null, null, null],
    };
  } catch {
    return null;
  }
}

function cardGradient(name: string | null): string {
  if (!name) return "from-neutral-800 to-neutral-950";
  const p = LEGEND_PLAYERS.find((x) => x.name === name);
  return p?.color ?? "from-amber-600/80 to-amber-950";
}

function overallOf(name: string | null): number | null {
  if (!name) return null;
  return LEGEND_PLAYERS.find((x) => x.name === name)?.overall ?? null;
}

function PlayerCard({
  name,
  label,
  size = "md",
  onClick,
  disabled,
}: {
  name: string | null;
  label: string;
  size?: "sm" | "md";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ovr = overallOf(name);
  const h = size === "sm" ? "h-[72px] w-[52px]" : "h-[88px] w-[64px]";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-lg border border-white/25 bg-gradient-to-b shadow-lg transition",
        h,
        cardGradient(name),
        !disabled && "cursor-pointer hover:scale-105 hover:border-white/50",
        disabled && "cursor-default",
      )}
    >
      <div className="flex items-start justify-between px-1 pt-1">
        <span className="rounded bg-black/50 px-1 text-[8px] font-bold text-white">
          {label}
        </span>
        {ovr != null && (
          <span className="text-[10px] font-black text-amber-200 drop-shadow">
            {ovr}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-end px-0.5 pb-1.5">
        <div
          className={cn(
            "mb-0.5 grid place-items-center rounded-full bg-black/35 text-[9px] font-bold text-white ring-1 ring-white/30",
            size === "sm" ? "h-6 w-6" : "h-8 w-8",
          )}
        >
          {(name ?? label).slice(0, 2).toUpperCase()}
        </div>
        <span className="w-full truncate text-center text-[8px] font-semibold leading-tight text-white drop-shadow">
          {name ?? "Empty"}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />
    </button>
  );
}

const PITCH_POS: { x: number; y: number }[] = [
  { x: 50, y: 90 },
  { x: 12, y: 70 },
  { x: 35, y: 74 },
  { x: 65, y: 74 },
  { x: 88, y: 70 },
  { x: 28, y: 50 },
  { x: 50, y: 54 },
  { x: 72, y: 50 },
  { x: 15, y: 24 },
  { x: 50, y: 16 },
  { x: 85, y: 24 },
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
  const data: AllTimeXi = {
    ...emptyXi(),
    ...(xi ?? {}),
    slots: xi?.slots?.length === 11 ? xi.slots : emptyXi().slots,
    bench: xi?.bench ?? emptyXi().bench,
  };
  const [pickIdx, setPickIdx] = useState<number | null>(null);
  const [pickBench, setPickBench] = useState<number | null>(null);
  const [pickCoach, setPickCoach] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = LEGEND_PLAYERS;
    if (pickIdx != null) {
      list = list.filter((p) => matchesPos(p, data.slots[pickIdx]!.pos));
    }
    if (s) list = list.filter((p) => p.name.toLowerCase().includes(s));
    return list;
  }, [q, pickIdx, data.slots]);

  const setPlayer = (name: string | null) => {
    if (!onChange) return;
    if (pickIdx != null) {
      onChange({
        ...data,
        slots: data.slots.map((s, i) =>
          i === pickIdx ? { ...s, name, overall: overallOf(name) } : s,
        ),
      });
    } else if (pickBench != null) {
      const bench = [...(data.bench ?? emptyXi().bench!)];
      bench[pickBench] = name;
      onChange({ ...data, bench });
    }
    setPickIdx(null);
    setPickBench(null);
    setQ("");
  };

  const setCoach = (name: string | null) => {
    if (!onChange) return;
    onChange({ ...data, coach: name });
    setPickCoach(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shirt className="h-4 w-4 text-brand-glow" />
          <h3 className="text-sm font-semibold">All-Time eFootball XI</h3>
          <span className="text-[11px] text-muted-foreground">{data.formation}</span>
        </div>
        {editable && (
          <span className="text-[11px] text-muted-foreground">Tap card to pick</span>
        )}
      </div>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/25 bg-[linear-gradient(180deg,#0f3d24_0%,#166534_45%,#15803d_100%)] shadow-inner">
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-white/20" />

        {data.slots.map((slot, i) => {
          const p = PITCH_POS[i];
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <PlayerCard
                name={slot.name}
                label={slot.label}
                size="sm"
                disabled={!editable}
                onClick={() => editable && setPickIdx(i)}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/20 p-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Coach</p>
          <p className="truncate text-sm font-medium">{data.coach ?? "Not selected"}</p>
        </div>
        {editable && (
          <Button size="sm" variant="outline" onClick={() => setPickCoach(true)}>
            {data.coach ? "Change" : "Select"}
          </Button>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Substitutes
        </p>
        <div className="flex flex-wrap gap-2">
          {(data.bench ?? emptyXi().bench!).map((name, i) => (
            <PlayerCard
              key={i}
              name={name}
              label={`S${i + 1}`}
              size="sm"
              disabled={!editable}
              onClick={() => editable && setPickBench(i)}
            />
          ))}
        </div>
      </div>

      <Dialog
        open={pickIdx != null || pickBench != null}
        onOpenChange={(o) => {
          if (!o) {
            setPickIdx(null);
            setPickBench(null);
            setQ("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pickIdx != null
                ? `Pick ${data.slots[pickIdx]?.label} — position filter`
                : `Pick substitute`}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search players…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {(pickIdx != null && data.slots[pickIdx]?.name) ||
            (pickBench != null && data.bench?.[pickBench]) ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-rose-400"
                onClick={() => setPlayer(null)}
              >
                <X className="mr-2 h-3.5 w-3.5" /> Clear slot
              </Button>
            ) : null}
            {filtered.map((p) => (
              <button
                key={p.name}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-border/40 px-2 py-2 text-left hover:bg-white/5"
                onClick={() => setPlayer(p.name)}
              >
                <div
                  className={cn(
                    "relative h-14 w-10 shrink-0 overflow-hidden rounded-md border border-white/20 bg-gradient-to-b",
                    p.color,
                  )}
                >
                  <span className="absolute right-0.5 top-0.5 text-[9px] font-black text-amber-200">
                    {p.overall}
                  </span>
                  <span className="absolute bottom-0.5 left-0 right-0 truncate px-0.5 text-center text-[7px] font-semibold text-white">
                    {p.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.positions.join(" · ")}
                  </p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No players for this position
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pickCoach} onOpenChange={setPickCoach}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select coach</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {data.coach && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-rose-400"
                onClick={() => setCoach(null)}
              >
                <X className="mr-2 h-3.5 w-3.5" /> Clear
              </Button>
            )}
            {COACHES.map((c) => (
              <button
                key={c}
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                onClick={() => setCoach(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
