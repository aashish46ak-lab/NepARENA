import {
  supabase,
  type Match,
  type Matchday,
  type TournamentParticipant,
} from "@/lib/supabase";

const LIVE_STATUSES = new Set(["live", "ongoing"]);

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

/** Only pending matches in LIVE / ONGOING tournaments where user is approved. */
export async function loadPendingMatches(
  userId: string,
): Promise<PendingMatch[]> {
  const parts = await loadMyParticipants(userId);
  if (parts.length === 0) return [];

  const partIds = parts.map((p) => p.id);
  const byId = new Map(parts.map((p) => [p.id, p]));
  const myTourIds = [...new Set(parts.map((p) => p.tournament_id))];

  // Only live/ongoing tournaments
  const { data: tours } = await supabase
    .from("tournaments")
    .select("id, name, status")
    .in("id", myTourIds);

  const liveTours = (
    (tours ?? []) as { id: string; name: string; status: string }[]
  ).filter((t) => LIVE_STATUSES.has(t.status));

  if (liveTours.length === 0) return [];

  const liveIds = new Set(liveTours.map((t) => t.id));
  const tourMap = new Map(liveTours.map((t) => [t.id, t.name]));

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("played", false)
    .in("tournament_id", [...liveIds])
    .or(`home_id.in.(\( {partIds.join(",")}),away_id.in.( \){partIds.join(",")})`)
    .order("round")
    .order("position");

  if (error) throw error;
  const list = ((matches ?? []) as Match[]).filter((m) =>
    liveIds.has(m.tournament_id),
  );
  if (list.length === 0) return [];

  const matchdayIds = [
    ...new Set(
      list.map((m) => m.matchday_id).filter(Boolean) as string[],
    ),
  ];

  const [{ data: mds }, { data: allParts }] = await Promise.all([
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

export async function notifyUsers(
  userIds: string[],
  title: string,
  body: string,
  link: string | null = null,
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return 0;
  const payload = unique.map((user_id) => ({
    user_id,
    title,
    body,
    type: "match",
    link,
  }));
  const { error } = await supabase.from("notifications").insert(payload);
  if (error) throw error;
  return payload.length;
}

/** All approved registered players in a tournament */
export async function notifyTournamentPlayers(
  tournamentId: string,
  title: string,
  body: string,
  link?: string | null,
) {
  const { data: parts } = await supabase
    .from("tournament_participants")
    .select("user_id")
    .eq("tournament_id", tournamentId)
    .eq("status", "approved");

  const ids = [
    ...new Set(
      ((parts ?? []) as { user_id: string | null }[])
        .map((p) => p.user_id)
        .filter(Boolean) as string[],
    ),
  ];
  return notifyUsers(
    ids,
    title,
    body,
    link ?? "/tournaments/" + tournamentId,
  );
}

/** Notify both sides of a match (registered users only) */
export async function notifyMatchResult(
  tournamentId: string,
  tournamentName: string,
  homeId: string | null,
  awayId: string | null,
  homeScore: number,
  awayScore: number,
  homeLabel: string,
  awayLabel: string,
) {
  const ids = [homeId, awayId].filter(Boolean) as string[];
  if (ids.length === 0) return 0;

  const { data: parts } = await supabase
    .from("tournament_participants")
    .select("id, user_id")
    .in("id", ids);

  const userIds = [
    ...new Set(
      ((parts ?? []) as { user_id: string | null }[])
        .map((p) => p.user_id)
        .filter(Boolean) as string[],
    ),
  ];

  return notifyUsers(
    userIds,
    "Result updated",
    tournamentName +
      ": " +
      homeLabel +
      " " +
      homeScore +
      "-" +
      awayScore +
      " " +
      awayLabel,
    "/tournaments/" + tournamentId,
  );
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

  const n = await notifyUsers(
    userIds,
    "Match pending",
    tournamentName +
      " — " +
      matchdayName +
      ": your match is still pending. Play and submit the result.",
    "/#pending-matches",
  );

  await supabase
    .from("matchdays")
    .update({ notify_enabled: true })
    .eq("id", matchdayId);

  return n;
                         }
