import { useQuery } from "@tanstack/react-query";
import { supabase, type Tournament, type Announcement, type HallOfFameEntry, type TournamentHistoryEntry, type GalleryItem, type Sponsor, type CommunityLink, type OwnerInfo, type Moderator, type Profile } from "@/lib/supabase";

export function useTournaments(limit?: number) {
  return useQuery({
    queryKey: ["tournaments", limit ?? "all"],
    queryFn: async () => {
      let q = supabase.from("tournaments").select("*").order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data } = await q;
      return (data ?? []) as Tournament[];
    },
  });
}

export function useLatestAnnouncement() {
  return useQuery({
    queryKey: ["announcement_latest"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return (data as Announcement | null) ?? null;
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      return (data ?? []) as Announcement[];
    },
  });
}

export function useHallOfFame(limit?: number) {
  return useQuery({
    queryKey: ["hall_of_fame", limit ?? "all"],
    queryFn: async () => {
      let q = supabase.from("hall_of_fame").select("*").order("sort_order", { ascending: true });
      if (limit) q = q.limit(limit);
      const { data } = await q;
      return (data ?? []) as HallOfFameEntry[];
    },
  });
}

export function useTournamentHistory(limit?: number) {
  return useQuery({
    queryKey: ["tournament_history", limit ?? "all"],
    queryFn: async () => {
      let q = supabase.from("tournament_history").select("*").order("year", { ascending: false }).order("sort_order", { ascending: true });
      if (limit) q = q.limit(limit);
      const { data } = await q;
      return (data ?? []) as TournamentHistoryEntry[];
    },
  });
}

export function useGallery(limit?: number) {
  return useQuery({
    queryKey: ["gallery", limit ?? "all"],
    queryFn: async () => {
      let q = supabase.from("gallery").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data } = await q;
      return (data ?? []) as GalleryItem[];
    },
  });
}

export function useSponsors() {
  return useQuery({
    queryKey: ["sponsors"],
    queryFn: async () => {
      const { data } = await supabase.from("sponsors").select("*").order("sort_order", { ascending: true });
      return (data ?? []) as Sponsor[];
    },
  });
}

export function useCommunityLinks() {
  const { data } = useQuery({
    queryKey: ["community_links"],
    queryFn: async () => {
      const { data } = await supabase.from("community_links").select("*").order("sort_order", { ascending: true });
      return (data ?? []) as CommunityLink[];
    },
  });
  return data ?? null;
}

export function useOwnerInfo() {
  return useQuery({
    queryKey: ["owner_info"],
    queryFn: async () => {
      const { data } = await supabase.from("owner_info").select("*").limit(1).maybeSingle();
      return (data as OwnerInfo | null) ?? null;
    },
  });
}

export function useModerators() {
  return useQuery({
    queryKey: ["moderators"],
    queryFn: async () => {
      const { data } = await supabase.from("moderators").select("*").order("sort_order", { ascending: true });
      return (data ?? []) as Moderator[];
    },
  });
}

export function useMemberCount() {
  return useQuery({
    queryKey: ["member_count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

export function useLatestMembers(limit = 5) {
  return useQuery({
    queryKey: ["latest_members", limit],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(limit);
      return (data ?? []) as Profile[];
    },
  });
}