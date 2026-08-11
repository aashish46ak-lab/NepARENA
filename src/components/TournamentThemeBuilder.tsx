import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, Save, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export type TournamentTheme = {
  mode: "solid" | "gradient";
  start: string;
  end: string;
  angle: number;
  opacity: number;
  accent: string;
};

export const DEFAULT_TOURNAMENT_THEME: TournamentTheme = {
  mode: "gradient",
  start: "#0a0a0a",
  end: "#1f1f1f",
  angle: 135,
  opacity: 1,
  accent: "#f5f5f5",
};

const PRESETS: { label: string; theme: TournamentTheme }[] = [
  {
    label: "Midnight",
    theme: {
      mode: "gradient",
      start: "#020617",
      end: "#1e3a8a",
      angle: 135,
      opacity: 1,
      accent: "#60a5fa",
    },
  },
  {
    label: "Emerald",
    theme: {
      mode: "gradient",
      start: "#022c22",
      end: "#047857",
      angle: 135,
      opacity: 1,
      accent: "#34d399",
    },
  },
  {
    label: "Crimson",
    theme: {
      mode: "gradient",
      start: "#450a0a",
      end: "#b91c1c",
      angle: 135,
      opacity: 1,
      accent: "#f87171",
    },
  },
  {
    label: "Gold",
    theme: {
      mode: "gradient",
      start: "#1c1917",
      end: "#a16207",
      angle: 135,
      opacity: 1,
      accent: "#fbbf24",
    },
  },
  {
    label: "Violet",
    theme: {
      mode: "gradient",
      start: "#2e1065",
      end: "#6d28d9",
      angle: 135,
      opacity: 1,
      accent: "#a78bfa",
    },
  },
  {
    label: "Slate",
    theme: {
      mode: "gradient",
      start: "#0f172a",
      end: "#334155",
      angle: 135,
      opacity: 1,
      accent: "#94a3b8",
    },
  },
];

export function parseTournamentTheme(
  raw: string | null | undefined,
): TournamentTheme {
  if (!raw) return { ...DEFAULT_TOURNAMENT_THEME };
  try {
    if (raw.startsWith("{")) {
      const j = JSON.parse(raw) as Partial<TournamentTheme>;
      return { ...DEFAULT_TOURNAMENT_THEME, ...j };
    }
    if (raw.startsWith("#")) {
      return {
        ...DEFAULT_TOURNAMENT_THEME,
        mode: "solid",
        start: raw,
        end: raw,
        accent: raw,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_TOURNAMENT_THEME };
}

export function themeToCss(t: TournamentTheme): {
  background: string;
  accent: string;
  border: string;
} {
  const bg =
    t.mode === "solid"
      ? t.start
      : `linear-gradient(${t.angle}deg, ${t.start}, ${t.end})`;
  return {
    background: bg,
    accent: t.accent,
    border: `${t.accent}33`,
  };
}

export function serializeTheme(t: TournamentTheme): string {
  return JSON.stringify(t);
}

export function TournamentThemeBuilder({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: TournamentTheme;
  onChange: (t: TournamentTheme) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  const css = themeToCss(value);

  return (
    <div className="glass space-y-5 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Theme Builder
        </h3>
      </div>

      <div
        className="overflow-hidden rounded-2xl border p-4 transition-all"
        style={{
          background: css.background,
          borderColor: css.border,
          opacity: value.opacity,
        }}
      >
        <p className="text-xs font-medium" style={{ color: value.accent }}>
          Live preview
        </p>
        <div
          className="mt-3 rounded-xl border p-3"
          style={{ borderColor: css.border, background: "rgba(0,0,0,0.35)" }}
        >
          <p className="text-sm font-semibold text-white">Tournament card</p>
          <button
            type="button"
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-black"
            style={{ background: value.accent }}
          >
            Sample button
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["gradient", "solid"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ ...value, mode: m })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium capitalize",
              value.mode === m
                ? "bg-neutral-100 text-black"
                : "bg-white/5 text-muted-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Start color</span>
          <div className="flex gap-2">
            <Input
              type="color"
              value={value.start}
              onChange={(e) => onChange({ ...value, start: e.target.value })}
              className="h-10 w-14 cursor-pointer p-1"
            />
            <Input
              value={value.start}
              onChange={(e) => onChange({ ...value, start: e.target.value })}
              className="font-mono text-xs"
            />
          </div>
        </label>
        {value.mode === "gradient" && (
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">End color</span>
            <div className="flex gap-2">
              <Input
                type="color"
                value={value.end}
                onChange={(e) => onChange({ ...value, end: e.target.value })}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input
                value={value.end}
                onChange={(e) => onChange({ ...value, end: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
          </label>
        )}
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Accent</span>
          <div className="flex gap-2">
            <Input
              type="color"
              value={value.accent}
              onChange={(e) => onChange({ ...value, accent: e.target.value })}
              className="h-10 w-14 cursor-pointer p-1"
            />
            <Input
              value={value.accent}
              onChange={(e) => onChange({ ...value, accent: e.target.value })}
              className="font-mono text-xs"
            />
          </div>
        </label>
        {value.mode === "gradient" && (
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Angle ({value.angle}°)</span>
            <Input
              type="range"
              min={0}
              max={360}
              value={value.angle}
              onChange={(e) =>
                onChange({ ...value, angle: Number(e.target.value) })
              }
            />
          </label>
        )}
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">
            Opacity ({Math.round(value.opacity * 100)}%)
          </span>
          <Input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={value.opacity}
            onChange={(e) =>
              onChange({ ...value, opacity: Number(e.target.value) })
            }
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Preset gradients
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ ...p.theme })}
              className="h-9 w-9 rounded-full border border-white/20 ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-white/40"
              style={{
                background: `linear-gradient(${p.theme.angle}deg, ${p.theme.start}, ${p.theme.end})`,
              }}
              title={p.label}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...DEFAULT_TOURNAMENT_THEME })}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
        <Button
          size="sm"
          className="bg-gradient-brand text-primary-foreground"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save theme
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
