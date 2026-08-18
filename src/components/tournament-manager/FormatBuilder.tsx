import { useMemo, useState } from "react";
import {
  PRESET_OPTIONS,
  type FormatConfig,
  type FormatPreset,
  type StageDefinition,
  type StageType,
  type TieBreaker,
  buildPresetStages,
  defaultFormatConfig,
  stageId,
  validateFormatConfig,
} from "@/lib/tournament-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";

const TIE_OPTIONS: { value: TieBreaker; label: string }[] = [
  { value: "points", label: "Points" },
  { value: "goal_diff", label: "Goal difference" },
  { value: "goals_for", label: "Goals scored" },
  { value: "head_to_head", label: "Head-to-head" },
  { value: "head_to_head_gd", label: "Head-to-head GD" },
  { value: "playoff", label: "Playoff / manual" },
];

function emptyStage(type: StageType, order: number): StageDefinition {
  const id = stageId(type.slice(0, 2));
  const base: StageDefinition = {
    id,
    name:
      type === "league"
        ? "League"
        : type === "group"
          ? "Group Stage"
          : type === "final"
            ? "Final"
            : type === "third_place"
              ? "Third Place"
              : "Knockout",
    type,
    order,
  };
  if (type === "league") {
    base.league = { legs: 1, homeAway: true };
  } else if (type === "group") {
    base.group = { groupCount: 4, legs: 1, qualifyPerGroup: 2 };
  } else {
    base.knockout = {
      legs: 1,
      extraTime: true,
      penalties: true,
      awayGoals: false,
      drawMode: "random",
      seeded: false,
      thirdPlace: type === "knockout",
    };
  }
  return base;
}

export function FormatBuilder({
  value,
  onChange,
  participantCount = 0,
}: {
  value: FormatConfig;
  onChange: (next: FormatConfig) => void;
  participantCount?: number;
}) {
  const [advanced, setAdvanced] = useState(false);
  const issues = useMemo(
    () => validateFormatConfig(value, participantCount),
    [value, participantCount],
  );

  const setPreset = (preset: FormatPreset) => {
    const next = defaultFormatConfig(preset);
    next.points = value.points;
    next.tieBreakers = value.tieBreakers;
    onChange(next);
  };

  const updateStage = (id: string, patch: Partial<StageDefinition>) => {
    onChange({
      ...value,
      stages: value.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const moveStage = (id: string, dir: -1 | 1) => {
    const sorted = [...value.stages].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[j];
    const stages = value.stages.map((s) => {
      if (s.id === a.id) return { ...s, order: b.order };
      if (s.id === b.id) return { ...s, order: a.order };
      return s;
    });
    onChange({ ...value, stages });
  };

  const removeStage = (id: string) => {
    onChange({
      ...value,
      stages: value.stages
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i })),
    });
  };

  const addStage = (type: StageType) => {
    const order = value.stages.length;
    onChange({
      ...value,
      preset: "custom",
      stages: [...value.stages, emptyStage(type, order)],
    });
  };

  const sorted = [...value.stages].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">How should this tournament work?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESET_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition",
                value.preset === p.value
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
              )}
            >
              <div className="text-sm font-semibold">{p.label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Stages</p>
          {value.preset === "custom" && (
            <div className="flex flex-wrap gap-1">
              {(["league", "group", "knockout", "final"] as StageType[]).map(
                (t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => addStage(t)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {t === "group" ? "Groups" : t[0].toUpperCase() + t.slice(1)}
                  </Button>
                ),
              )}
            </div>
          )}
        </div>

        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No stages yet. Pick a format above or add stages in Custom.
          </p>
        )}

        {sorted.map((stage, i) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={i}
            total={sorted.length}
            showQualify={value.preset === "league_knockout"}
            leagueQualifyCount={value.leagueQualifyCount}
            onLeagueQualify={(n) =>
              onChange({ ...value, leagueQualifyCount: n })
            }
            onChange={(patch) => updateStage(stage.id, patch)}
            onMove={(d) => moveStage(stage.id, d)}
            onRemove={() => removeStage(stage.id)}
            canRemove={value.preset === "custom" || sorted.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setAdvanced((v) => !v)}
      >
        {advanced ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        Advanced settings (points & tie-breakers)
      </button>

      {advanced && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="grid grid-cols-3 gap-2">
            {(["win", "draw", "loss"] as const).map((k) => (
              <label key={k} className="text-xs">
                <span className="text-muted-foreground capitalize">{k} pts</span>
                <Input
                  type="number"
                  className="mt-1 h-8"
                  value={value.points[k]}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      points: {
                        ...value.points,
                        [k]: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              Tie-breaker order (top = highest priority)
            </p>
            <div className="flex flex-wrap gap-1">
              {TIE_OPTIONS.map((t) => {
                const on = value.tieBreakers.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      const tb = on
                        ? value.tieBreakers.filter((x) => x !== t.value)
                        : [...value.tieBreakers, t.value];
                      onChange({ ...value, tieBreakers: tb });
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      on
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 text-muted-foreground",
                    )}
                  >
                    {on
                      ? `${value.tieBreakers.indexOf(t.value) + 1}. ${t.label}`
                      : t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          {issues.map((iss, i) => (
            <li key={i} className="flex gap-2">
              {iss.level === "error" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
              )}
              <span>{iss.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StageCard({
  stage,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  canRemove,
  showQualify,
  leagueQualifyCount,
  onLeagueQualify,
}: {
  stage: StageDefinition;
  index: number;
  total: number;
  onChange: (p: Partial<StageDefinition>) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  canRemove: boolean;
  showQualify?: boolean;
  leagueQualifyCount?: number;
  onLeagueQualify?: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">
          {index + 1}
        </span>
        <Input
          className="h-8 flex-1"
          value={stage.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {stage.type}
        </span>
        <div className="flex gap-0.5">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={index >= total - 1} onClick={() => onMove(1)}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          {canRemove && (
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-rose-400" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {stage.type === "league" && stage.league && (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs">
            <span className="text-muted-foreground">Rounds (1 = single RR)</span>
            <Select value={String(stage.league.legs)} onValueChange={(v) => onChange({ league: { ...stage.league!, legs: Number(v) } })}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (single)</SelectItem>
                <SelectItem value="2">2 (double / H&A)</SelectItem>
                <SelectItem value="3">3</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-xs sm:mt-5">
            <Switch checked={!!stage.league.homeAway} onCheckedChange={(c) => onChange({ league: { ...stage.league!, homeAway: c } })} />
            Home / away reverse
          </label>
          {showQualify && (
            <label className="text-xs">
              <span className="text-muted-foreground">Qualify to knockout</span>
              <Input type="number" min={2} className="mt-1 h-8" value={leagueQualifyCount ?? 8} onChange={(e) => onLeagueQualify?.(Math.max(2, Number(e.target.value) || 2))} />
            </label>
          )}
        </div>
      )}

      {stage.type === "group" && stage.group && (
        <div className="grid gap-2 sm:grid-cols-4">
          <label className="text-xs">
            <span className="text-muted-foreground">Groups</span>
            <Input type="number" min={1} className="mt-1 h-8" value={stage.group.groupCount} onChange={(e) => onChange({ group: { ...stage.group!, groupCount: Math.max(1, Number(e.target.value) || 1) } })} />
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">RR legs</span>
            <Select value={String(stage.group.legs)} onValueChange={(v) => onChange({ group: { ...stage.group!, legs: Number(v) as 1 | 2 } })}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Single</SelectItem>
                <SelectItem value="2">Double</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Qualify / group</span>
            <Input type="number" min={0} className="mt-1 h-8" value={stage.group.qualifyPerGroup} onChange={(e) => onChange({ group: { ...stage.group!, qualifyPerGroup: Math.max(0, Number(e.target.value) || 0) } })} />
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Best thirds</span>
            <Input type="number" min={0} className="mt-1 h-8" value={stage.group.bestThirds ?? 0} onChange={(e) => onChange({ group: { ...stage.group!, bestThirds: Math.max(0, Number(e.target.value) || 0) } })} />
          </label>
        </div>
      )}

      {(stage.type === "knockout" || stage.type === "final") && stage.knockout && (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs">
            <span className="text-muted-foreground">Legs</span>
            <Select value={String(stage.knockout.legs)} onValueChange={(v) => onChange({ knockout: { ...stage.knockout!, legs: Number(v) as 1 | 2 } })}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 leg</SelectItem>
                <SelectItem value="2">2 legs (aggregate)</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Draw</span>
            <Select value={stage.knockout.drawMode} onValueChange={(v) => onChange({ knockout: { ...stage.knockout!, drawMode: v as "random" | "seeded" | "manual" } })}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="seeded">Seeded</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:mt-5">
            <label className="flex items-center gap-1.5">
              <Switch checked={stage.knockout.extraTime} onCheckedChange={(c) => onChange({ knockout: { ...stage.knockout!, extraTime: c } })} />
              ET
            </label>
            <label className="flex items-center gap-1.5">
              <Switch checked={stage.knockout.penalties} onCheckedChange={(c) => onChange({ knockout: { ...stage.knockout!, penalties: c } })} />
              Pens
            </label>
            {stage.knockout.legs === 2 && (
              <label className="flex items-center gap-1.5">
                <Switch checked={stage.knockout.awayGoals} onCheckedChange={(c) => onChange({ knockout: { ...stage.knockout!, awayGoals: c } })} />
                Away goals
              </label>
            )}
            {stage.type === "knockout" && (
              <label className="flex items-center gap-1.5">
                <Switch checked={stage.knockout.thirdPlace} onCheckedChange={(c) => onChange({ knockout: { ...stage.knockout!, thirdPlace: c } })} />
                3rd place
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ensureStages(cfg: FormatConfig): FormatConfig {
  if (cfg.stages.length) return cfg;
  return { ...cfg, stages: buildPresetStages(cfg.preset) };
}
