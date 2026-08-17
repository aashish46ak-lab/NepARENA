/**
 * Provides current organizer scope for the reusable organizer dashboard.
 * Does NOT force eFootball onto other organizers.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getDefaultOrganizer,
  getOrganizerBySlug,
  listOrganizerMemberships,
  type Organizer,
} from "@/lib/organizers";
import { useAuth } from "@/hooks/useAuth";

interface OrganizerContextValue {
  organizer: Organizer | null;
  organizerId: string | null;
  loading: boolean;
  setOrganizerSlug: (slug: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const OrganizerContext = createContext<OrganizerContextValue | undefined>(undefined);

const STORAGE_KEY = "neparena-active-organizer-slug";

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (slug?: string) => {
    setLoading(true);
    try {
      // Prefer: explicit slug → stored slug → first membership → guest default only
      const preferred =
        slug ||
        (typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY) || undefined
          : undefined);

      let org: Organizer | null = null;
      if (preferred) org = await getOrganizerBySlug(preferred);

      if (user) {
        const memberships = await listOrganizerMemberships(user.id);
        const memberIds = new Set(memberships.map((m) => m.organizer_id));
        // If stored org is not one of the user's workspaces, switch to first membership
        if (org && memberIds.size && !memberIds.has(org.id) && !slug) {
          org = memberships[0]?.organizer ?? null;
          if (!org && memberships[0]) {
            const { data } = await import("@/lib/supabase").then((m) =>
              m.supabase.from("organizers").select("*").eq("id", memberships[0].organizer_id).maybeSingle(),
            );
            org = (data as Organizer) ?? null;
          }
        }
        if (!org && memberships[0]) {
          org = memberships[0].organizer ?? null;
          if (!org) {
            const { data } = await import("@/lib/supabase").then((m) =>
              m.supabase.from("organizers").select("*").eq("id", memberships[0].organizer_id).maybeSingle(),
            );
            org = (data as Organizer) ?? null;
          }
        }
      }

      if (!org && !user) {
        org = await getDefaultOrganizer();
      }

      setOrganizer(org);
      if (org && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, org.slug);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const setOrganizerSlug = useCallback(async (slug: string) => {
    await load(slug);
  }, [load]);

  const value = useMemo(
    () => ({
      organizer,
      organizerId: organizer?.id ?? null,
      loading,
      setOrganizerSlug,
      refresh: () => load(),
    }),
    [organizer, loading, setOrganizerSlug, load],
  );

  return (
    <OrganizerContext.Provider value={value}>{children}</OrganizerContext.Provider>
  );
}

export function useOrganizer() {
  const ctx = useContext(OrganizerContext);
  if (!ctx) {
    return {
      organizer: null,
      organizerId: null,
      loading: false,
      setOrganizerSlug: async () => {},
      refresh: async () => {},
    } satisfies OrganizerContextValue;
  }
  return ctx;
}
