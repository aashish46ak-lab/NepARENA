/**
 * Soft isolation: players who arrive via an organizer share link
 * stay inside that organizer's portal context.
 */
const KEY = "neparena_org_context";

export type OrgContext = {
  slug: string;
  id?: string;
  name?: string;
  logo_url?: string | null;
};

export function setOrganizerContext(ctx: OrgContext) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function getOrganizerContext(): OrgContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrgContext;
  } catch {
    return null;
  }
}

export function clearOrganizerContext() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function organizerShareUrl(slug: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/o/${slug}`;
  }
  return `https://neparena.xyz/o/${slug}`;
}
