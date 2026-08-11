/** Organizer theme presets — applied on public organizer pages */

export type ThemeId =
  | "black-silver"
  | "midnight-blue"
  | "emerald"
  | "crimson"
  | "royal-gold"
  | "violet"
  | "slate";

export type ThemePreset = {
  id: ThemeId;
  label: string;
  cover: string;
  pageBg: string;
  accent: string;
  nameShadow: string;
  swatch: [string, string];
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "black-silver",
    label: "Black & Silver",
    cover: "linear-gradient(135deg,#0a0a0a 0%,#2a2a2a 50%,#525252 100%)",
    pageBg: "radial-gradient(ellipse at top, rgba(212,212,212,0.08), transparent 55%)",
    accent: "#d4d4d4",
    nameShadow: "0 2px 12px rgba(0,0,0,0.85)",
    swatch: ["#0a0a0a", "#d4d4d4"],
  },
  {
    id: "midnight-blue",
    label: "Midnight Blue",
    cover: "linear-gradient(135deg,#020617 0%,#1e3a8a 55%,#3b82f6 100%)",
    pageBg: "radial-gradient(ellipse at top, rgba(59,130,246,0.12), transparent 55%)",
    accent: "#60a5fa",
    nameShadow: "0 2px 12px rgba(0,0,0,0.9)",
    swatch: ["#1e3a8a", "#60a5fa"],
  },
  {
    id: "emerald",
    label: "Emerald",
    cover: "linear-gradient(135deg,#022c22 0%,#047857 55%,#34d399 100%)",
    pageBg: "radial-gradient(ellipse at top, rgba(16,185,129,0.12), transparent 55%)",
    accent: "#34d399",
    nameShadow: "0 2px 12px rgba(0,0,0,0.85)",
    swatch: ["#047857", "#34d399"],
  },
  {
    id: "crimson",
    label: "Crimson",
    cover: "linear-gradient(135deg,#450a0a 0%,#b91c1c 55%,#f87171 100%)",
    pageBg: "radial-gradient(ellipse at top, rgba(239,68,68,0.12), transparent 55%)",
    accent: "#f87171",
    nameShadow: "0 2px 12px rgba(0,0,0,0.9)",
    swatch: ["#b91c1c", "#f87171"],
  },
  {
    id: "royal-gold",
    label: "Royal Gold",
    cover: "linear-gradient(135deg,#1c1917 0%,#a16207 50%,#fbbf24 100%)",
    pageBg: "radial-gradient(ellipse at top, rgba(251,191,36,0.1), transparent 55%)",
    accent: "#fbbf24",
    nameShadow: "0 2px 14px rgba(0,0,0,0.9)",
    swatch: ["#a16207", "#fbbf24"],
  },
  {
    id: "violet",
    label: "Violet",
    cover: "linear-gradient(135deg,#2e1065 0%,#6d28d9 55%,#c4b5fd 100%)",
    pageBg: "radial-gradient(ellipse at top, rgba(139,92,246,0.12), transparent 55%)",
    accent: "#a78bfa",
    nameShadow: "0 2px 12px rgba(0,0,0,0.9)",
    swatch: ["#6d28d9", "#a78bfa"],
  },
  {
    id: "slate",
    label: "Slate",
    cover: "linear-gradient(135deg,#0f172a 0%,#334155 55%,#94a3b8 100%)",
    pageBg: "radial-gradient(ellipse at top, rgba(148,163,184,0.1), transparent 55%)",
    accent: "#94a3b8",
    nameShadow: "0 2px 12px rgba(0,0,0,0.85)",
    swatch: ["#334155", "#94a3b8"],
  },
];

export function getTheme(id: string | null | undefined): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}
