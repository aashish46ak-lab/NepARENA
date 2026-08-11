import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Swords } from "lucide-react";
import { supabase, type Tournament, type TournamentParticipant, type Match, type Matchday } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { SubmitResultCard } from "@/components/SubmitResultCard";
import { loadMySubmissions } from "@/lib/matches-pending";

export function MyMatches({ tournament, matches, matchdays, allParticipants, players }: {
  tournament: Tournament; matches: Match[]; matchdays: Matchday[];
  allParticipants: TournamentParticipant[]; players: TournamentParticipant[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const mine = user ? allParticipants.find((p) => p.user_id === user.id && p.status === "approved") : undefined;
  const myMatches = useMemo(() => {
    if (!mine) return [] as Match[];
    return matches.filter((m) => m.home_id === mine.id || m.away_id === mine.id);
  }, [matches, mine]);

  const { data: subs } = useQuery({
    queryKey: ["my_match_subs", user?.id, tournament.id],
    enabled: !!user && !!mine && myMatches.length > 0,
    queryFn: async () => loadMySubmissions(user!.id, myMatches.map((m) => m.id)),
  });

  useEffect(() => {
    if (!user || !mine) return;
    const ch = supabase.channel("my-matches-" + tournament.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_submissions", filter: "user_id=eq." + user.id },
        () => qc.invalidateQueries({ queryKey: ["my_match_subs"] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id, mine?.id, tournament.id, qc]);

  if (!mine || myMatches.length === 0) return null;

  const mdPublished = new Map(matchdays.map((d) => [d.id, d.is_published === true]));
  const isPending = (m: Match) => !m.played && !!m.home_id && !!m.away_id && !!m.matchday_id && mdPublished.get(m.matchday_id) === true;
  const pending = myMatches.filter(isPending);
  const played = myMatches.filter((m) => m.played);

  const labelOf = (pid: string | null) => {
    if (!pid) return "TBD";
    const p = players.find((x) => x.id === pid);
    return p?.club?.trim() || p?.player_name || "TBD";
  };
  const photoOf = (pid: string | null) => pid ? (players.find((x) => x.id === pid)?.photo_url ?? null) : null;

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Swords className="h-4 w-4 text-brand-glow" />
        <h2 className="text-base font-bold">My Matches</h2>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2 max-w-lg">
          <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            Pending — submit your result
          </p>
          {pending.map((m) => (
            <SubmitResultCard key={m.id} matchId={m.id}
              homeLabel={labelOf(m.home_id)} awayLabel={labelOf(m.away_id)}
              homePhoto={photoOf(m.home_id)} awayPhoto={photoOf(m.away_id)}
              meta={tournament.name + (m.matchday_id ? " · " + (matchdays.find((d) => d.id === m.matchday_id)?.name ?? "") : "")}
              participantId={mine.id} submission={subs?.get(m.id) ?? null}
              onDone={() => qc.invalidateQueries({ queryKey: ["my_match_subs"] })} />
          ))}
        </div>
      )}

      {played.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Played</p>
          {played.map((m) => (
            <div key={m.id} className="flex items-center justify-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
              <span className="truncate font-medium">{labelOf(m.home_id)}</span>
              <span className="font-bold text-brand-glow">
                {m.home_score != null && m.away_score != null ? String(m.home_score) + " - " + String(m.away_score) : "vs"}
              </span>
              <span className="truncate font-medium">{labelOf(m.away_id)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
