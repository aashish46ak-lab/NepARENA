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

/**
 * Pending matches for a player:
 * - approved in tournament
 * - tournament status live/ongoing
 * - match not played
 * - matchday is_published === true  (admin Publish switch ON)
 */
export async function loadPendingMatches(
  userId: string,
): Promise<PendingMatch[]> {
  const parts = await loadMyParticipants(userId);
  if (parts.length === 0) return [];

  const partIds = parts.map((p) => p.id);
  const byId = new Map(parts.map((p) => [p.id, p]));
  const myTourIds = [...new Set(parts.map((p) => p.tournament_id))];

  const { data: tours, error: tourErr } = await supabase
    .from("tournaments")
    .select("id, name, status")
    .in("id", myTourIds);

  if (tourErr) throw tourErr;

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

  let list = ((matches ?? []) as Match[]).filter((m) =>
    liveIds.has(m.tournament_id),
  );
  if (list.length === 0) return [];

  // Only PUBLISHED matchdays (admin Publish switch ON)
  const matchdayIds = [
    ...new Set(
      list.map((m) => m.matchday_id).filter(Boolean) as string[],
    ),
  ];

  let publishedSet = new Set<string>();
  let mdMap = new Map<string, string>();

  if (matchdayIds.length > 0) {
    const { data: mds, error: mdErr } = await supabase
      .from("matchdays")
      .select("id, name, is_published")
      .in("id", matchdayIds);

    if (mdErr) throw mdErr;

    for (const d of (mds ?? []) as {
      id: string;
      name: string;
      is_published?: boolean;
    }[]) {
      mdMap.set(d.id, d.name);
      if (d.is_published) publishedSet.add(d.id);
    }

    list = list.filter(
      (m) => m.matchday_id != null && publishedSet.has(m.matchday_id),
    );
  } else {
    // No matchday linked → do not show as pending
    list = [];
  }

  if (list.length === 0) return [];

  const allPartIds = [
    ...new Set(
      list.flatMap((m) =>
        [m.home_id, m.away_id].filter(Boolean),
      ) as string[],
    ),
  ];

  const { data: allParts } = await supabase
    .from("tournament_participants")
    .select("id, player_name, club")
    .in("id", allPartIds);

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

/** All approved players in a tournament */
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

/** Both sides of a finished match */
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

/**
 * Publish switch helper (optional if FixturesTab has its own).
 * Sets matchday is_published + notifies players with matches that day.
 */
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
    .in("id", partIds)
    .eq("status", "approved");

  const userIds = [
    ...new Set(
      ((parts ?? []) as { user_id: string | null }[])
        .map((p) => p.user_id)
        .filter(Boolean) as string[],
    ),
  ];

  const n = await notifyUsers(
    userIds,
    "Fixtures published",
    tournamentName +
      " — " +
      matchdayName +
      " is live. Check pending matches on your home page.",
    "/#pending-matches",
  );

  await supabase
    .from("matchdays")
    .update({ is_published: true, notify_enabled: true })
    .eq("id", matchdayId);

  return n;
    }
