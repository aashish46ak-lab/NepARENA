/** Organizer theme presets — applied on public organizer pages */

export type ThemeId =
  | "black-silver"
  | "midnight-blue"
  | "emerald"
  | "crimson"
  | "royal-gold"
  | "violet"
  | "slate"
  | "custom";

export type ThemePreset = {
  id: ThemeId;
  label: string;
  cover: string;
  pageBg: string;
  accent: string;
  nameShadow: string;
  swatch: [string, string];
};

export function buildCover(start: string, end: string, angle = 135): string {
  return `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)`;
}

export function buildPageBg(accentHex: string): string {
  // soft radial using accent
  return `radial-gradient(ellipse at top, ${accentHex}22, transparent 55%)`;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "black-silver",
    label: "Black & Silver",
    cover: buildCover("#0a0a0a", "#525252"),
    pageBg: buildPageBg("#d4d4d4"),
    accent: "#d4d4d4",
    nameShadow: "0 2px 12px rgba(0,0,0,0.85)",
    swatch: ["#0a0a0a", "#d4d4d4"],
  },
  {
    id: "midnight-blue",
    label: "Midnight Blue",
    cover: buildCover("#020617", "#3b82f6"),
    pageBg: buildPageBg("#3b82f6"),
    accent: "#60a5fa",
    nameShadow: "0 2px 12px rgba(0,0,0,0.9)",
    swatch: ["#1e3a8a", "#60a5fa"],
  },
  {
    id: "emerald",
    label: "Emerald",
    cover: buildCover("#022c22", "#34d399"),
    pageBg: buildPageBg("#10b981"),
    accent: "#34d399",
    nameShadow: "0 2px 12px rgba(0,0,0,0.85)",
    swatch: ["#047857", "#34d399"],
  },
  {
    id: "crimson",
    label: "Crimson",
    cover: buildCover("#450a0a", "#f87171"),
    pageBg: buildPageBg("#ef4444"),
    accent: "#f87171",
    nameShadow: "0 2px 12px rgba(0,0,0,0.9)",
    swatch: ["#b91c1c", "#f87171"],
  },
  {
    id: "royal-gold",
    label: "Royal Gold",
    cover: buildCover("#1c1917", "#fbbf24"),
    pageBg: buildPageBg("#fbbf24"),
    accent: "#fbbf24",
    nameShadow: "0 2px 14px rgba(0,0,0,0.9)",
    swatch: ["#a16207", "#fbbf24"],
  },
  {
    id: "violet",
    label: "Violet",
    cover: buildCover("#2e1065", "#c4b5fd"),
    pageBg: buildPageBg("#8b5cf6"),
    accent: "#a78bfa",
    nameShadow: "0 2px 12px rgba(0,0,0,0.9)",
    swatch: ["#6d28d9", "#a78bfa"],
  },
  {
    id: "slate",
    label: "Slate",
    cover: buildCover("#0f172a", "#94a3b8"),
    pageBg: buildPageBg("#94a3b8"),
    accent: "#94a3b8",
    nameShadow: "0 2px 12px rgba(0,0,0,0.85)",
    swatch: ["#334155", "#94a3b8"],
  },
];

export function getTheme(
  id: string | null | undefined,
  custom?: { start?: string | null; end?: string | null; accent?: string | null },
): ThemePreset {
  const base = THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0]!;
  if (custom?.start && custom?.end) {
    const accent = custom.accent || custom.end;
    return {
      ...base,
      id: id === "custom" ? "custom" : base.id,
      label: id === "custom" ? "Custom" : base.label,
      cover: buildCover(custom.start, custom.end),
      pageBg: buildPageBg(accent),
      accent,
      swatch: [custom.start, custom.end],
    };
  }
  return base;
}
