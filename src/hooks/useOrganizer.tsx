/**
 * Provides current organizer scope for the reusable organizer dashboard.
 * Does NOT redesign the dashboard — panels can read organizerId and filter queries.
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
  DEFAULT_ORGANIZER_SLUG,
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
      const preferred =
        slug ||
        (typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY) || undefined
          : undefined) ||
        DEFAULT_ORGANIZER_SLUG;

      let org = await getOrganizerBySlug(preferred);
      if (!org) org = await getDefaultOrganizer();

      // If user is an organizer member of something else and no default, pick first membership
      if (!org && user) {
        const memberships = await listOrganizerMemberships(user.id);
        if (memberships[0]) {
          const { data } = await import("@/lib/supabase").then((m) =>
            m.supabase
              .from("organizers")
              .select("*")
              .eq("id", memberships[0].organizer_id)
              .maybeSingle(),
          );
          org = (data as Organizer) ?? null;
        }
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
