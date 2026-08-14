import { useQuery } from "@tanstack/react-query";
import { supabase, type Tournament } from "@/lib/supabase";

export interface DayPoint {
  day: string;
  count: number;
}

export interface DashboardData {
  loading: boolean;
  totalMembers: number;
  newMembers7d: number;
  totalTournaments: number;
  liveTournaments: number;
  totalMatches: number;
  playedMatches: number;
  totalGoals: number;
  pendingReports: number;
  totalPlayers: number;
  memberGrowth: DayPoint[];
  registrations: DayPoint[];
  goalsPerMatchday: { md: string; goals: number }[];
  statusSplit: { name: string; value: number }[];
  tournaments: Tournament[];
  activity: { id: string; action: string; created_at: string }[];
  totalPosts: number;
  posts7d: number;
  totalLikes: number;
  totalComments: number;
  postGrowth: DayPoint[];
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function last14Days(): string[] {
  const out: string[] = [];
  for (let i = 13; i >= 0; i--) {
    out.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

function perDay(rows: { created_at: string }[], cumulative: boolean): DayPoint[] {
  const days = last14Days();
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = dayKey(r.created_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const before = rows.filter((r) => dayKey(r.created_at) < days[0]!).length;
  let run = cumulative ? before : 0;
  return days.map((d) => {
    run += counts.get(d) ?? 0;
    return {
      day: new Date(d + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      count: cumulative ? run : (counts.get(d) ?? 0),
    };
  });
}

export function useDashboardStats(): DashboardData {
  const query = useQuery({
    queryKey: ["admin_dashboard_stats_followers_v2"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: defaultOrg } = await supabase
        .from("organizers")
        .select("id")
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const organizerId =
        (defaultOrg?.id as string | undefined) ??
        "00000000-0000-0000-0000-000000000000";

      const [followers, tournaments, matches, matchdays, participants, reports, activity, posts, likes, comments] =
        await Promise.all([
          supabase
            .from("organizer_followers")
            .select("user_id, created_at")
            .eq("organizer_id", organizerId),
          supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
          supabase
            .from("matches")
            .select("id, tournament_id, matchday_id, played, home_score, away_score"),
          supabase.from("matchdays").select("id, tournament_id, name, sort_order"),
          supabase
            .from("tournament_participants")
            .select("id, tournament_id, status, created_at"),
          supabase.from("reports").select("id, status, created_at"),
          supabase
            .from("activity_logs")
            .select("id, action, created_at")
            .order("created_at", { ascending: false })
            .limit(8),
          supabase.from("posts").select("id, created_at").order("created_at", { ascending: false }).limit(2000),
          supabase.from("post_likes").select("id", { count: "exact", head: true }),
          supabase.from("post_comments").select("id", { count: "exact", head: true }),
        ]);

      const profs = (followers.data ?? []) as { user_id?: string; created_at: string }[];
      const tours = (tournaments.data ?? []) as Tournament[];
      const ms = matches.data ?? [];
      const mds = matchdays.data ?? [];
      const parts = participants.data ?? [];
      const reps = reports.data ?? [];

      const played = ms.filter((m) => m.played);
      const goals = played.reduce(
        (s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0),
        0,
      );
      const weekAgo = Date.now() - 7 * 86400000;

      const mdName = new Map(mds.map((d) => [d.id, d.name]));
      const goalsByMd = new Map<string, number>();
      for (const m of played) {
        if (!m.matchday_id) continue;
        const name = mdName.get(m.matchday_id) ?? "Round";
        goalsByMd.set(
          name,
          (goalsByMd.get(name) ?? 0) + (m.home_score ?? 0) + (m.away_score ?? 0),
        );
      }
      const goalsPerMatchday = [...goalsByMd.entries()]
        .map(([md, g]) => ({ md, goals: g }))
        .slice(0, 12);

      const statusCounts = new Map<string, number>();
      for (const t of tours) {
        const s = t.status || "unknown";
        statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
      }
      const statusSplit = [...statusCounts.entries()].map(([name, value]) => ({
        name,
        value,
      }));

      return {
        tours,
        activity: activity.data ?? [],
        computed: {
          totalMembers: profs.length,
          newMembers7d: profs.filter(
            (p) => new Date(p.created_at).getTime() >= weekAgo,
          ).length,
          totalTournaments: tours.length,
          liveTournaments: tours.filter((t) =>
            ["live", "ongoing", "check_in"].includes(t.status),
          ).length,
          totalMatches: ms.length,
          playedMatches: played.length,
          totalGoals: goals,
          pendingReports: reps.filter(
            (r) => r.status === "pending" || r.status === "in_review",
          ).length,
          totalPlayers: parts.filter((p) => p.status === "approved").length,
          memberGrowth: perDay(profs, true),
          registrations: perDay(parts, false),
          goalsPerMatchday,
          statusSplit,
          totalPosts: ((posts.data ?? []) as { id: string }[]).length,
          posts7d: ((posts.data ?? []) as { created_at: string }[]).filter(
            (p) => new Date(p.created_at).getTime() >= weekAgo,
          ).length,
          totalLikes: likes.count ?? 0,
          totalComments: comments.count ?? 0,
          postGrowth: perDay((posts.data ?? []) as { created_at: string }[], false),
        },
      };
    },
  });

  const d = query.data;
  const c = d?.computed;
  return {
    loading: query.isLoading,
    totalMembers: c?.totalMembers ?? 0,
    newMembers7d: c?.newMembers7d ?? 0,
    totalTournaments: c?.totalTournaments ?? 0,
    liveTournaments: c?.liveTournaments ?? 0,
    totalMatches: c?.totalMatches ?? 0,
    playedMatches: c?.playedMatches ?? 0,
    totalGoals: c?.totalGoals ?? 0,
    pendingReports: c?.pendingReports ?? 0,
    totalPlayers: c?.totalPlayers ?? 0,
    memberGrowth: c?.memberGrowth ?? [],
    registrations: c?.registrations ?? [],
    goalsPerMatchday: c?.goalsPerMatchday ?? [],
    statusSplit: c?.statusSplit ?? [],
    tournaments: d?.tours ?? [],
    activity: (d?.activity ?? []) as { id: string; action: string; created_at: string }[],
    totalPosts: c?.totalPosts ?? 0,
    posts7d: c?.posts7d ?? 0,
    totalLikes: c?.totalLikes ?? 0,
    totalComments: c?.totalComments ?? 0,
    postGrowth: c?.postGrowth ?? [],
  };
}

/** Scoped stats for a single tournament (used by the selector). */
export function useTournamentScopedStats(tournamentId: string | null) {
  return useQuery({
    queryKey: ["admin_tournament_scoped", tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const [parts, matches] = await Promise.all([
        supabase
          .from("tournament_participants")
          .select("id, status")
          .eq("tournament_id", tournamentId!),
        supabase
          .from("matches")
          .select("id, played, home_score, away_score")
          .eq("tournament_id", tournamentId!),
      ]);
      const ps = parts.data ?? [];
      const ms = matches.data ?? [];
      const played = ms.filter((m) => m.played);
      const goals = played.reduce(
        (s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0),
        0,
      );
      return {
        approved: ps.filter((p) => p.status === "approved").length,
        pending: ps.filter((p) => p.status === "pending").length,
        matches: ms.length,
        played: played.length,
        goals,
        avgGoals: played.length ? (goals / played.length).toFixed(2) : "0.00",
        completion: ms.length ? Math.round((played.length / ms.length) * 100) : 0,
      };
    },
  });
}
