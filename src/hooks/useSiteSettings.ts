import { useQuery } from "@tanstack/react-query";
import { supabase, type SiteSettings } from "@/lib/supabase";

export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").maybeSingle();
      return (data as SiteSettings | null) ?? null;
    },
    staleTime: 60_000,
  });
  return data ?? null;
}