import { useCallback, useEffect, useState } from "react";
import {
  supabase,
  type Match,
  type Matchday,
  type Profile,
  type Tournament,
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

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goal_diff - a.goal_diff ||
      b.goals_for - a.goals_for ||
      (a.player_name ?? "").localeCompare(b.player_name ?? ""),
  );
}

/** Rebuild standings from finished matches. */
export async function recomputeStandings(tournamentId: string): Promise<void> {
  const [{ data: players }, { data: matches }] = await Promise.all([
    supabase
      .from("tournament_participants")
      .select("id, player_name, club, status")
      .eq("tournament_id", tournamentId)
      .eq("status", "approved"),
    supabase
      .from("matches")
      .select("home_id, away_id, home_score, away_score, played")
      .eq("tournament_id", tournamentId)
      .eq("played", true),
  ]);

  const approved = (players ?? []) as {
    id: string;
    player_name: string;
    club: string | null;
  }[];
  const fins = (matches ?? []) as {
    home_id: string | null;
    away_id: string | null;
    home_score: number | null;
    away_score: number | null;
  }[];

  type Acc = StandingRow;
  const map = new Map<string, Acc>();

  for (const p of approved) {
    map.set(p.id, {
      participant_id: p.id,
      tournament_id: tournamentId,
      player_name: p.player_name,
      club: p.club,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_diff: 0,
      points: 0,
    });
  }

  for (const m of fins) {
    if (
      !m.home_id ||
      !m.away_id ||
      m.home_score == null ||
      m.away_score == null
    )
      continue;
    const home = map.get(m.home_id);
    const away = map.get(m.away_id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goals_for += m.home_score;
    home.goals_against += m.away_score;
    away.goals_for += m.away_score;
    away.goals_against += m.home_score;

    if (m.home_score > m.away_score) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.home_score < m.away_score) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of map.values()) {
    row.goal_diff = row.goals_for - row.goals_against;
  }

  await supabase
    .from("tournament_standings")
    .delete()
    .eq("tournament_id", tournamentId);

  const rows = [...map.values()];
  if (rows.length > 0) {
    const { error } = await supabase.from("tournament_standings").insert(rows);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("tournaments")
    .update({ participants_count: approved.length })
    .eq("id", tournamentId);
}

const PLACE_LABELS = ["Champion (1st)", "Runner-up (2nd)", "3rd Place"];

/** End tournament → History + Hall of Fame (top 3). */
export async function archiveTournamentToHistory(
  tournament: Tournament,
): Promise<{ winner: string; count: number }> {
  await recomputeStandings(tournament.id);

  const [{ data: standingsRaw }, { data: playersRaw }] = await Promise.all([
    supabase
      .from("tournament_standings")
      .select("*")
      .eq("tournament_id", tournament.id),
    supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournament.id),
  ]);

  const standings = sortStandings((standingsRaw ?? []) as StandingRow[]);
  const players = (playersRaw ?? []) as TournamentParticipant[];
  const top3 = standings.slice(0, 3);

  if (top3.length === 0) {
    throw new Error(
      "No standings found. Enter results first, then end the tournament.",
    );
  }

  const year = new Date().getFullYear();
  const display = (row: StandingRow) => {
    const p = players.find((x) => x.id === row.participant_id);
    const club = (row.club || p?.club || "").trim();
    return club || row.player_name || "Unknown";
  };
  const photoOf = (row: StandingRow) => {
    const p = players.find((x) => x.id === row.participant_id);
    return p?.photo_url || p?.club_logo_url || null;
  };

  const winner = display(top3[0]);
  const runnerUp = top3[1] ? display(top3[1]) : null;
  const third = top3[2] ? display(top3[2]) : null;

  await supabase
    .from("tournament_history")
    .delete()
    .eq("tournament_name", tournament.name)
    .eq("year", year);

  const { error: histErr } = await supabase.from("tournament_history").insert({
    tournament_name: tournament.name,
    winner,
    runner_up: runnerUp,
    third_place: third,
    year,
    banner_url: tournament.banner_url,
    prize_pool: tournament.prize_pool,
    sort_order: 0,
  });
  if (histErr) throw new Error("History save failed: " + histErr.message);

  await supabase
    .from("hall_of_fame")
    .delete()
    .eq("tournament", tournament.name);

  const hofRows = top3.map((row, i) => ({
    player_name: display(row),
    achievement: PLACE_LABELS[i] || i + 1 + "th Place",
    tournament: tournament.name,
    photo_url: photoOf(row),
    year,
    sort_order: i,
  }));

  const { error: hofErr } = await supabase.from("hall_of_fame").insert(hofRows);
  if (hofErr) throw new Error("Hall of Fame save failed: " + hofErr.message);

  return { winner, count: top3.length };
}

export function useTournamentData(tournamentId: string, active: boolean) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<TournamentParticipant[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [invitations, setInvitations] = useState<TournamentInvitation[]>([]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
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
      const { data: profs } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids);
      setProfiles(
        new Map(((profs ?? []) as Profile[]).map((pr) => [pr.id, pr])),
      );
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
    // Publish / save पछि tab नखोस्
    reload: () => load({ silent: true }),
  };
}

export type TournamentData = ReturnType<typeof useTournamentData>;

export function matchdayName(matchdays: Matchday[], m: Match): string {
  return (
    matchdays.find((d) => d.id === m.matchday_id)?.name ?? "Round " + m.round
  );
}

export function playerName(
  players: TournamentParticipant[],
  id: string | null,
): string {
  if (!id) return "TBD";
  return players.find((p) => p.id === id)?.player_name ?? "TBD";
                           }
