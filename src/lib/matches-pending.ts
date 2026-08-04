import {
  supabase,
  type Match,
  type Matchday,
  type TournamentParticipant,
} from "@/lib/supabase";

export type PendingMatch = {
  match: Match;
  matchdayName: string;
  tournamentId: string;
  tournamentName: string;
  homeLabel: string;
  awayLabel: string;
  isHome: boolean;
};

export async function loadMyParticipants(userId: string) {
  const { data, error } = await supabase
    .from("tournament_participants")
    .select("id, tournament_id, player_name, club, status, user_id")
    .eq("user_id", userId)
    .eq("status", "approved");
  if (error) throw error;
  return (data ?? []) as TournamentParticipant[];
}

export async function loadPendingMatches(
  userId: string,
): Promise<PendingMatch[]> {
  const parts = await loadMyParticipants(userId);
  if (parts.length === 0) return [];

  const partIds = parts.map((p) => p.id);
  const byId = new Map(parts.map((p) => [p.id, p]));

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("played", false)
    .or(`home_id.in.(\( {partIds.join(",")}),away_id.in.( \){partIds.join(",")})`)
    .order("round")
    .order("position");

  if (error) throw error;
  const list = (matches ?? []) as Match[];
  if (list.length === 0) return [];

  const tournamentIds = [...new Set(list.map((m) => m.tournament_id))];
  const matchdayIds = [
    ...new Set(
      list.map((m) => m.matchday_id).filter(Boolean) as string[],
    ),
  ];

  const [{ data: tours }, { data: mds }, { data: allParts }] =
    await Promise.all([
      supabase.from("tournaments").select("id, name").in("id", tournamentIds),
      matchdayIds.length
        ? supabase.from("matchdays").select("id, name").in("id", matchdayIds)
        : Promise.resolve({ data: [] as Matchday[] }),
      supabase
        .from("tournament_participants")
        .select("id, player_name, club")
        .in(
          "id",
          [
            ...new Set(
              list.flatMap((m) =>
                [m.home_id, m.away_id].filter(Boolean),
              ) as string[],
            ),
          ],
        ),
    ]);

  const tourMap = new Map(
    ((tours ?? []) as { id: string; name: string }[]).map((t) => [
      t.id,
      t.name,
    ]),
  );
  const mdMap = new Map(
    ((mds ?? []) as { id: string; name: string }[]).map((d) => [d.id, d.name]),
  );
  const labelMap = new Map(
    (
      (allParts ?? []) as {
        id: string;
        player_name: string;
        club: string | null;
      }[]
    ).map((p) => [p.id, (p.club?.trim() || p.player_name) as string]),
  );

  return list.map((m) => ({
    match: m,
    matchdayName:
      (m.matchday_id && mdMap.get(m.matchday_id)) || "Round " + m.round,
    tournamentId: m.tournament_id,
    tournamentName: tourMap.get(m.tournament_id) ?? "Tournament",
    homeLabel: m.home_id ? (labelMap.get(m.home_id) ?? "TBD") : "TBD",
    awayLabel: m.away_id ? (labelMap.get(m.away_id) ?? "TBD") : "TBD",
    isHome: !!(m.home_id && byId.has(m.home_id)),
  }));
}

export async function notifyMatchdayPlayers(
  tournamentId: string,
  matchdayId: string,
  matchdayName: string,
  tournamentName: string,
) {
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_id, away_id, played")
    .eq("tournament_id", tournamentId)
    .eq("matchday_id", matchdayId)
    .eq("played", false);

  const rows = matches ?? [];
  const partIds = [
    ...new Set(
      rows.flatMap((m) =>
        [m.home_id, m.away_id].filter(Boolean),
      ) as string[],
    ),
  ];
  if (partIds.length === 0) return 0;

  const { data: parts } = await supabase
    .from("tournament_participants")
    .select("id, user_id")
    .in("id", partIds);

  const userIds = [
    ...new Set(
      ((parts ?? []) as { user_id: string | null }[])
        .map((p) => p.user_id)
        .filter(Boolean) as string[],
    ),
  ];
  if (userIds.length === 0) return 0;

  const payload = userIds.map((user_id) => ({
    user_id,
    title: "Match pending",
    body:
      tournamentName +
      " — " +
      matchdayName +
      ": your match is still pending. Play and submit the result.",
    type: "match",
    link: "/#pending-matches",
  }));

  const { error } = await supabase.from("notifications").insert(payload);
  if (error) throw error;

  await supabase
    .from("matchdays")
    .update({ notify_enabled: true })
    .eq("id", matchdayId);

  return payload.length;
        }
