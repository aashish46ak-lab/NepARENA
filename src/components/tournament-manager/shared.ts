import { useCallback, useEffect, useState } from "react";
import {
  supabase,
  type Match,
  type Matchday,
  type Profile,
  type TournamentInvitation,
  type TournamentParticipant,
} from "@/lib/supabase";

export interface StandingRow {
  participant_id: string;
  tournament_id: string;
  player_name: string;
  club: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}

/** Tie-break order: points, goal difference, goals scored, name. */
export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goal_diff - a.goal_diff ||
      b.goals_for - a.goals_for ||
      a.player_name.localeCompare(b.player_name),
  );
}

export function useTournamentData(tournamentId: string, active: boolean) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<TournamentParticipant[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [invitations, setInvitations] = useState<TournamentInvitation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, m, md, s, inv] = await Promise.all([
      supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at"),
      supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round")
        .order("position"),
      supabase
        .from("matchdays")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("sort_order"),
      supabase
        .from("tournament_standings")
        .select("*")
        .eq("tournament_id", tournamentId),
      supabase
        .from("tournament_invitations")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false }),
    ]);
    const parts = (p.data ?? []) as TournamentParticipant[];
    const invs = (inv.data ?? []) as TournamentInvitation[];
    setPlayers(parts);
    setMatches((m.data ?? []) as Match[]);
    setMatchdays((md.data ?? []) as Matchday[]);
    setStandings((s.data ?? []) as StandingRow[]);
    setInvitations(invs);

    const ids = [
      ...new Set(
        [...parts.map((x) => x.user_id), ...invs.map((x) => x.user_id)].filter(
          (x): x is string => !!x,
        ),
      ),
    ];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      setProfiles(new Map(((profs ?? []) as Profile[]).map((pr) => [pr.id, pr])));
    } else {
      setProfiles(new Map());
    }
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  return {
    loading,
    players,
    profiles,
    matches,
    matchdays,
    standings,
    invitations,
    reload: load,
  };
}

export type TournamentData = ReturnType<typeof useTournamentData>;

export function matchdayName(matchdays: Matchday[], m: Match): string {
  return matchdays.find((d) => d.id === m.matchday_id)?.name ?? `Round ${m.round}`;
}

export function playerName(players: TournamentParticipant[], id: string | null): string {
  if (!id) return "TBD";
  return players.find((p) => p.id === id)?.player_name ?? "TBD";
}