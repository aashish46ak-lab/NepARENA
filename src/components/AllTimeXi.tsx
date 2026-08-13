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
import { playerPhotoUrl } from "@/lib/player-photos";

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

export const FORMATIONS: Record<string, XiSlot[]> = {
  "4-3-3": FORMATION_433,
  "4-2-3-1": [
    { pos: "GK", label: "GK", name: null },
    { pos: "LB", label: "LB", name: null },
    { pos: "CB", label: "CB", name: null },
    { pos: "CB", label: "CB", name: null },
    { pos: "RB", label: "RB", name: null },
    { pos: "DMF", label: "DMF", name: null },
    { pos: "DMF", label: "DMF", name: null },
    { pos: "AMF", label: "AMF", name: null },
    { pos: "LWF", label: "LWF", name: null },
    { pos: "CF", label: "CF", name: null },
    { pos: "RWF", label: "RWF", name: null },
  ],
  "4-4-2": [
    { pos: "GK", label: "GK", name: null },
    { pos: "LB", label: "LB", name: null },
    { pos: "CB", label: "CB", name: null },
    { pos: "CB", label: "CB", name: null },
    { pos: "RB", label: "RB", name: null },
    { pos: "LWF", label: "LM", name: null },
    { pos: "CMF", label: "CMF", name: null },
    { pos: "CMF", label: "CMF", name: null },
    { pos: "RWF", label: "RM", name: null },
    { pos: "CF", label: "CF", name: null },
    { pos: "CF", label: "CF", name: null },
  ],
  "3-5-2": [
    { pos: "GK", label: "GK", name: null },
    { pos: "CB", label: "CB", name: null },
    { pos: "CB", label: "CB", name: null },
    { pos: "CB", label: "CB", name: null },
    { pos: "LB", label: "LWB", name: null },
    { pos: "CMF", label: "CMF", name: null },
    { pos: "DMF", label: "DMF", name: null },
    { pos: "CMF", label: "CMF", name: null },
    { pos: "RB", label: "RWB", name: null },
    { pos: "CF", label: "CF", name: null },
    { pos: "CF", label: "SS", name: null },
  ],
};

export const FORMATION_IDS = Object.keys(FORMATIONS);

// NOTE: LEGEND_PLAYERS restored in follow-up if truncated — critical export
export const LEGEND_PLAYERS: PlayerDef[] = [
  { name: "Lionel Messi", positions: ["RWF", "SS", "AMF", "CF"], overall: 98, color: "from-sky-600 to-blue-900" },
  { name: "Cristiano Ronaldo", positions: ["CF", "LWF", "SS"], overall: 97, color: "from-red-600 to-red-950" },
  { name: "Pelé", positions: ["CF", "SS", "AMF"], overall: 98, color: "from-yellow-500 to-emerald-800" },
  { name: "Diego Maradona", positions: ["AMF", "SS", "LWF"], overall: 97, color: "from-sky-500 to-indigo-900" },
  { name: "Zinedine Zidane", positions: ["AMF", "CMF"], overall: 96, color: "from-white/40 to-slate-800" },
  { name: "Johan Cruyff", positions: ["CF", "SS", "AMF"], overall: 96, color: "from-orange-500 to-red-900" },
  { name: "Ronaldo Nazário", positions: ["CF", "SS"], overall: 96, color: "from-yellow-400 to-blue-900" },
  { name: "Ronaldinho", positions: ["AMF", "LWF", "SS"], overall: 95, color: "from-yellow-400 to-emerald-900" },
  { name: "Franz Beckenbauer", positions: ["CB", "DMF", "CMF"], overall: 95, color: "from-red-500 to-white/20" },
  { name: "Paolo Maldini", positions: ["CB", "LB"], overall: 95, color: "from-red-700 to-black" },
  { name: "Lev Yashin", positions: ["GK"], overall: 95, color: "from-red-700 to-slate-900" },
  { name: "Manuel Neuer", positions: ["GK"], overall: 94, color: "from-red-600 to-white/20" },
  { name: "Gianluigi Buffon", positions: ["GK"], overall: 94, color: "from-black to-white/20" },
  { name: "Iker Casillas", positions: ["GK"], overall: 93, color: "from-white/40 to-slate-800" },
  { name: "Thierry Henry", positions: ["CF", "LWF", "SS"], overall: 94, color: "from-red-600 to-white/20" },
  { name: "Andrea Pirlo", positions: ["DMF", "CMF", "AMF"], overall: 94, color: "from-black to-white/20" },
  { name: "Xavi Hernández", positions: ["CMF", "DMF"], overall: 94, color: "from-sky-500 to-red-700" },
  { name: "Andrés Iniesta", positions: ["CMF", "AMF", "LWF"], overall: 94, color: "from-sky-500 to-red-700" },
  { name: "Kaká", positions: ["AMF", "CMF", "SS"], overall: 93, color: "from-red-700 to-black" },
  { name: "Luka Modrić", positions: ["CMF", "AMF"], overall: 93, color: "from-white/40 to-slate-800" },
  { name: "Kevin De Bruyne", positions: ["AMF", "CMF", "RWF"], overall: 93, color: "from-sky-400 to-slate-800" },
  { name: "Sergio Ramos", positions: ["CB"], overall: 93, color: "from-white/40 to-slate-800" },
  { name: "Cafu", positions: ["RB", "RWB"], overall: 93, color: "from-yellow-400 to-emerald-800" },
  { name: "Roberto Carlos", positions: ["LB", "LWB"], overall: 93, color: "from-white/30 to-slate-800" },
  { name: "Neymar Jr", positions: ["LWF", "SS", "AMF"], overall: 93, color: "from-yellow-400 to-emerald-800" },
  { name: "Kylian Mbappé", positions: ["CF", "LWF", "RWF"], overall: 94, color: "from-blue-600 to-red-700" },
  { name: "Erling Haaland", positions: ["CF"], overall: 93, color: "from-sky-400 to-slate-900" },
  { name: "Robert Lewandowski", positions: ["CF"], overall: 93, color: "from-red-600 to-white/20" },
  { name: "Mohamed Salah", positions: ["RWF", "CF"], overall: 92, color: "from-red-600 to-red-950" },
  { name: "Virgil van Dijk", positions: ["CB"], overall: 92, color: "from-red-600 to-red-950" },
  { name: "Karim Benzema", positions: ["CF", "SS"], overall: 92, color: "from-white/40 to-slate-800" },
  { name: "Steven Gerrard", positions: ["CMF", "DMF", "AMF"], overall: 92, color: "from-red-600 to-red-950" },
  { name: "Patrick Vieira", positions: ["DMF", "CMF"], overall: 92, color: "from-red-600 to-white/20" },
  { name: "Franco Baresi", positions: ["CB"], overall: 94, color: "from-red-700 to-black" },
  { name: "Alessandro Nesta", positions: ["CB"], overall: 93, color: "from-black to-red-800" },
  { name: "Philipp Lahm", positions: ["RB", "LB", "DMF"], overall: 92, color: "from-red-600 to-white/20" },
  { name: "Sergio Busquets", positions: ["DMF", "CMF"], overall: 91, color: "from-sky-500 to-red-700" },
  { name: "N'Golo Kanté", positions: ["DMF", "CMF"], overall: 90, color: "from-blue-600 to-slate-900" },
  { name: "Jude Bellingham", positions: ["CMF", "AMF"], overall: 91, color: "from-white/40 to-slate-800" },
  { name: "Vinícius Jr", positions: ["LWF", "CF"], overall: 91, color: "from-white/40 to-slate-800" },
  { name: "Harry Kane", positions: ["CF"], overall: 91, color: "from-white/30 to-slate-800" },
  { name: "Zlatan Ibrahimović", positions: ["CF", "SS"], overall: 92, color: "from-red-700 to-black" },
  { name: "Wayne Rooney", positions: ["CF", "SS", "AMF"], overall: 91, color: "from-red-600 to-yellow-600" },
  { name: "Didier Drogba", positions: ["CF"], overall: 91, color: "from-blue-600 to-slate-900" },
  { name: "Marco van Basten", positions: ["CF"], overall: 95, color: "from-red-600 to-black" },
  { name: "Romário", positions: ["CF"], overall: 94, color: "from-yellow-400 to-emerald-800" },
  { name: "Roberto Baggio", positions: ["SS", "AMF", "CF"], overall: 93, color: "from-sky-500 to-black" },
  { name: "George Best", positions: ["RWF", "LWF", "SS"], overall: 93, color: "from-red-600 to-yellow-600" },
  { name: "Garrincha", positions: ["RWF"], overall: 94, color: "from-yellow-400 to-emerald-800" },
  { name: "Zico", positions: ["AMF", "SS"], overall: 94, color: "from-yellow-400 to-emerald-800" },
  { name: "Michel Platini", positions: ["AMF", "CMF", "SS"], overall: 94, color: "from-blue-500 to-white/20" },
  { name: "Eusébio", positions: ["CF"], overall: 95, color: "from-red-600 to-emerald-800" },
  { name: "Gerd Müller", positions: ["CF"], overall: 95, color: "from-red-600 to-white/20" },
  { name: "Alfredo Di Stéfano", positions: ["CF", "AMF"], overall: 96, color: "from-white/40 to-slate-800" },
  { name: "Ferenc Puskás", positions: ["CF", "AMF"], overall: 95, color: "from-red-600 to-emerald-800" },
  { name: "Bobby Charlton", positions: ["AMF", "CMF"], overall: 94, color: "from-red-600 to-yellow-600" },
  { name: "Oliver Kahn", positions: ["GK"], overall: 92, color: "from-red-600 to-white/20" },
  { name: "Thibaut Courtois", positions: ["GK"], overall: 91, color: "from-white/40 to-slate-800" },
  { name: "Alisson Becker", positions: ["GK"], overall: 91, color: "from-red-600 to-red-950" },
  { name: "Rodri", positions: ["DMF", "CMF"], overall: 91, color: "from-sky-400 to-slate-800" },
  { name: "Casemiro", positions: ["DMF"], overall: 90, color: "from-white/40 to-slate-800" },
  { name: "Toni Kroos", positions: ["CMF", "DMF"], overall: 91, color: "from-white/40 to-slate-800" },
  { name: "Sadio Mané", positions: ["LWF", "CF"], overall: 90, color: "from-red-600 to-red-950" },
  { name: "Son Heung-min", positions: ["LWF", "CF", "RWF"], overall: 90, color: "from-white/30 to-slate-800" },
  { name: "Eden Hazard", positions: ["LWF", "AMF", "CF"], overall: 91, color: "from-blue-600 to-slate-900" },
  { name: "Gareth Bale", positions: ["RWF", "LWF", "CF"], overall: 91, color: "from-white/40 to-slate-800" },
  { name: "Luis Suárez", positions: ["CF", "SS"], overall: 92, color: "from-sky-500 to-red-700" },
  { name: "Sergio Agüero", positions: ["CF", "SS"], overall: 91, color: "from-sky-400 to-slate-800" },
  { name: "Dani Alves", positions: ["RB"], overall: 90, color: "from-sky-500 to-red-700" },
  { name: "Marcelo", positions: ["LB"], overall: 90, color: "from-white/40 to-slate-800" },
  { name: "Carles Puyol", positions: ["CB"], overall: 91, color: "from-sky-500 to-red-700" },
  { name: "Fabio Cannavaro", positions: ["CB"], overall: 93, color: "from-sky-500 to-emerald-800" },
  { name: "Lothar Matthäus", positions: ["DMF", "CMF", "CB"], overall: 93, color: "from-red-600 to-white/20" },
  { name: "Ruud Gullit", positions: ["AMF", "CMF", "CF"], overall: 93, color: "from-orange-500 to-red-900" },
  { name: "Frank Lampard", positions: ["CMF", "AMF"], overall: 91, color: "from-blue-600 to-slate-900" },
  { name: "Paul Scholes", positions: ["CMF", "AMF"], overall: 91, color: "from-red-600 to-yellow-600" },
  { name: "David Beckham", positions: ["RMF", "CMF", "RWF"], overall: 90, color: "from-red-600 to-yellow-600" },
  { name: "Arjen Robben", positions: ["RWF", "LWF"], overall: 91, color: "from-red-600 to-white/20" },
  { name: "Franck Ribéry", positions: ["LWF", "AMF"], overall: 90, color: "from-red-600 to-white/20" },
  { name: "Xabi Alonso", positions: ["DMF", "CMF"], overall: 90, color: "from-red-600 to-white/20" },
  { name: "Claude Makélélé", positions: ["DMF"], overall: 91, color: "from-blue-600 to-slate-900" },
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
  "Luis Enrique",
  "Diego Simeone",
  "Antonio Conte",
];

export function emptyXi(formation = "4-3-3"): AllTimeXi {
  const base = FORMATIONS[formation] ?? FORMATION_433;
  return {
    formation,
    slots: base.map((s) => ({ ...s })),
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

function overallOf(name: string | null): number | null {
  if (!name) return null;
  return LEGEND_PLAYERS.find((x) => x.name === name)?.overall ?? null;
}

function cardGradient(name: string | null): string {
  if (!name) return "from-neutral-800 to-neutral-950";
  const p = LEGEND_PLAYERS.find((x) => x.name === name);
  return p?.color ?? "from-amber-600/80 to-amber-950";
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
  const photo = name ? playerPhotoUrl(name) : null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-lg border border-white/25 bg-gradient-to-b shadow-lg transition",
        h,
        !photo && cardGradient(name),
        !disabled && "cursor-pointer hover:scale-105 hover:border-white/50",
        disabled && "cursor-default",
      )}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      <div className="relative z-[1] flex items-start justify-between px-1 pt-1">
        <span className="rounded bg-black/55 px-1 text-[8px] font-bold text-white">{label}</span>
        {ovr != null && (
          <span className="rounded bg-black/55 px-0.5 text-[10px] font-black text-amber-200">{ovr}</span>
        )}
      </div>
      <div className="relative z-[1] mt-auto bg-gradient-to-t from-black/80 to-transparent px-0.5 pb-1.5 pt-4">
        <span className="block w-full truncate text-center text-[8px] font-semibold leading-tight text-white">
          {name ?? "Empty"}
        </span>
      </div>
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
  showDownload,
}: {
  xi: AllTimeXi | null;
  editable?: boolean;
  onChange?: (next: AllTimeXi) => void;
  showDownload?: boolean;
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

  const downloadXi = async () => {
    try {
      const W = 900;
      const H = 1200;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0f3d24");
      g.addColorStop(0.5, "#166534");
      g.addColorStop(1, "#0a1f12");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 24, W - 48, H - 48);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 36px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("ALL-TIME XI", W / 2, 70);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "20px system-ui";
      ctx.fillText(`NepARENA · ${data.formation}`, W / 2, 100);
      const load = (src: string) =>
        new Promise<HTMLImageElement | null>((res) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = src;
        });
      const cardW = 96;
      const cardH = 128;
      const pitchTop = 150;
      const pitchH = H - 280;
      const pitchW = W - 80;
      for (let i = 0; i < 11; i++) {
        const p = PITCH_POS[i]!;
        const slot = data.slots[i];
        const x = 40 + (p.x / 100) * pitchW - cardW / 2;
        const y = pitchTop + (p.y / 100) * pitchH - cardH / 2;
        const name = slot?.name;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(x, y, cardW, cardH);
        if (name) {
          const img = await load(playerPhotoUrl(name));
          if (img) ctx.drawImage(img, x, y, cardW, cardH);
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px system-ui";
        ctx.fillText(slot?.label ?? "", x + cardW / 2, y + cardH - 8);
        if (name) {
          ctx.font = "10px system-ui";
          const short = name.length > 14 ? name.split(" ").slice(-1)[0]! : name;
          ctx.fillText(short, x + cardW / 2, y + cardH + 14);
        }
      }
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px system-ui";
      ctx.fillText("neparena.xyz", W / 2, H - 40);
      const ael = document.createElement("a");
      ael.href = canvas.toDataURL("image/png");
      ael.download = `neparena-all-time-xi-${Date.now()}.png`;
      ael.click();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Shirt className="h-4 w-4 text-brand-glow" />
          <h3 className="text-sm font-semibold">All-Time eFootball XI</h3>
          {editable && onChange ? (
            <select
              className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-neutral-200"
              value={data.formation}
              onChange={(e) => {
                const f = e.target.value;
                const template = FORMATIONS[f] ?? FORMATION_433;
                const slots = template.map((s, i) => ({
                  ...s,
                  name: data.slots[i]?.name ?? null,
                  overall: data.slots[i]?.overall ?? null,
                }));
                onChange({ ...data, formation: f, slots });
              }}
            >
              {FORMATION_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] text-muted-foreground">{data.formation}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showDownload && (
            <button
              type="button"
              onClick={() => void downloadXi()}
              className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-neutral-200 hover:bg-white/10"
            >
              Download squad
            </button>
          )}
          {editable && (
            <span className="text-[11px] text-muted-foreground">Tap card to pick</span>
          )}
        </div>
      </div>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/25 bg-[linear-gradient(180deg,#0f3d24_0%,#166534_45%,#15803d_100%)] shadow-inner">
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-white/20" />
        {data.slots.map((slot, i) => {
          const p = PITCH_POS[i]!;
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
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Substitutes</p>
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
                ? `Pick ${data.slots[pickIdx]?.label}`
                : "Pick substitute"}
            </DialogTitle>
          </DialogHeader>
          <Input placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {(pickIdx != null && data.slots[pickIdx]?.name) ||
            (pickBench != null && data.bench?.[pickBench]) ? (
              <Button variant="ghost" size="sm" className="w-full justify-start text-rose-400" onClick={() => setPlayer(null)}>
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
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md border border-white/20 bg-neutral-900">
                  <img src={playerPhotoUrl(p.name)} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                  <span className="absolute right-0.5 top-0.5 rounded bg-black/60 px-0.5 text-[9px] font-black text-amber-200">{p.overall}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.positions.join(" · ")}</p>
                </div>
              </button>
            ))}
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
              <Button variant="ghost" size="sm" className="w-full justify-start text-rose-400" onClick={() => setCoach(null)}>
                <X className="mr-2 h-3.5 w-3.5" /> Clear
              </Button>
            )}
            {COACHES.map((c) => (
              <button key={c} type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5" onClick={() => setCoach(c)}>
                {c}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
