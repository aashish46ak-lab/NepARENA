/**
 * Soft isolation: players who arrive via an organizer share link
 * stay inside that organizer's portal context.
 * Uses localStorage so it survives app reopen / PWA launch.
 */
const KEY = "neparena_org_context";

export type OrgContext = {
  slug: string;
  id?: string;
  name?: string;
  logo_url?: string | null;
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

export function clearOrganizerContext() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function organizerShareUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/o/${slug}`;
  }
  return `https://neparena.xyz/o/${slug}`;
}
