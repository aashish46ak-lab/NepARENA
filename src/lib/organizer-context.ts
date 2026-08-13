/**
 * Soft isolation: players who arrive via an organizer share link
 * stay inside that organizer's portal context.
 * Uses localStorage so it survives app reopen / PWA launch.
 */
const KEY = "neparena_org_context";
const THEME_KEY = "neparena_org_theme";

export type OrgContext = {
  slug: string;
  id?: string;
  name?: string;
  logo_url?: string | null;
};

export type OrgThemeContext = {
  theme_id?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  slug?: string;
};

function store() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function setOrganizerContext(ctx: OrgContext) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function getOrganizerContext(): OrgContext | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrgContext;
  } catch {
    return null;
  }
}

export function setOrganizerThemeContext(theme: OrgThemeContext) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(THEME_KEY, JSON.stringify(theme));
    applyOrganizerThemeVars(theme);
  } catch {
    /* ignore */
  }
}

export function getOrganizerThemeContext(): OrgThemeContext | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(THEME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrgThemeContext;
  } catch {
    return null;
  }
}

/** Apply CSS variables so organizer shell pages pick up theme instantly */
export function applyOrganizerThemeVars(theme?: OrgThemeContext | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const t = theme ?? getOrganizerThemeContext();
  if (!t?.primary_color && !t?.secondary_color) {
    root.style.removeProperty("--org-primary");
    root.style.removeProperty("--org-secondary");
    root.style.removeProperty("--org-accent");
    root.style.removeProperty("--org-cover");
    root.style.removeProperty("--org-page-bg");
    return;
  }
  const primary = t.primary_color || "#0a0a0a";
  const secondary = t.secondary_color || "#525252";
  const accent = secondary || primary;
  root.style.setProperty("--org-primary", primary);
  root.style.setProperty("--org-secondary", secondary);
  root.style.setProperty("--org-accent", accent);
  root.style.setProperty(
    "--org-cover",
    `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
  );
  root.style.setProperty(
    "--org-page-bg",
    `radial-gradient(ellipse at top, ${accent}22, transparent 55%)`,
  );
}

export function clearOrganizerContext() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY);
    s.removeItem(THEME_KEY);
  } catch {
    /* ignore */
  }
  applyOrganizerThemeVars(null);
}

export function organizerShareUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/o/${slug}`;
  }
  return `https://neparena.xyz/o/${slug}`;
}
