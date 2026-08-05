import {
  supabase,
  type Match,
  type TournamentParticipant,
} from "@/lib/supabase";

/** Active tournaments where fixtures can be pending */
const ACTIVE_STATUSES = new Set([
  "live",
  "ongoing",
  "registration_closed",
  "check_in",
]);

export type MatchSubmission = {
  id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  proof_url: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

export type PendingMatch = {
  match: Match;
  matchdayName: string;
  tournamentId: string;
  tournamentName: string;
  homeLabel: string;
  awayLabel: string;
  homePhoto: string | null;
  awayPhoto: string | null;
  isHome: boolean;
};

export async function loadMyParticipants(userId: string) {
  const { data, error } = await supabase
    .from("tournament_participants")
    .select("id, tournament_id, player_name, club, status, user_id, photo_url")
    .eq("user_id", userId)
    .eq("status", "approved");
  if (error) throw error;
  return (data ?? []) as TournamentParticipant[];
}

/**
 * Home pending = published matchday + unplayed + I am home/away + tournament active
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

  const activeTours = (
    (tours ?? []) as { id: string; name: string; status: string }[]
  ).filter((t) => ACTIVE_STATUSES.has(t.status));

  if (activeTours.length === 0) return [];

  const activeIds = new Set(activeTours.map((t) => t.id));
  const tourMap = new Map(activeTours.map((t) => [t.id, t.name]));

  // FIXED or() filter
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("played", false)
    .in("tournament_id", [...activeIds])
    .or(
      `home_id.in.(\( {partIds.join(",")}),away_id.in.( \){partIds.join(",")})`,
    )
    .order("round")
    .order("position");

  if (error) throw error;

  let list = ((matches ?? []) as Match[]).filter((m) =>
    activeIds.has(m.tournament_id),
  );
  if (list.length === 0) return [];

  const matchdayIds = [
    ...new Set(
      list.map((m) => m.matchday_id).filter(Boolean) as string[],
    ),
  ];

  const mdMap = new Map<string, string>();
  const publishedSet = new Set<string>();

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
      if (d.is_published === true) publishedSet.add(d.id);
    }

    // Only admin-published matchdays
    list = list.filter(
      (m) => m.matchday_id != null && publishedSet.has(m.matchday_id),
    );
  } else {
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
    .select("id, player_name, club, photo_url")
    .in("id", allPartIds);

  const labelMap = new Map<string, string>();
  const photoMap = new Map<string, string | null>();
  for (const p of (allParts ?? []) as {
    id: string;
    player_name: string;
    club: string | null;
    photo_url: string | null;
  }[]) {
    labelMap.set(p.id, p.club?.trim() || p.player_name);
    photoMap.set(p.id, p.photo_url);
  }

  return list.map((m) => ({
    match: m,
    matchdayName:
      (m.matchday_id && mdMap.get(m.matchday_id)) || "Round " + m.round,
    tournamentId: m.tournament_id,
    tournamentName: tourMap.get(m.tournament_id) ?? "Tournament",
    homeLabel: m.home_id ? (labelMap.get(m.home_id) ?? "TBD") : "TBD",
    awayLabel: m.away_id ? (labelMap.get(m.away_id) ?? "TBD") : "TBD",
    homePhoto: m.home_id ? (photoMap.get(m.home_id) ?? null) : null,
    awayPhoto: m.away_id ? (photoMap.get(m.away_id) ?? null) : null,
    isHome: !!(m.home_id && byId.has(m.home_id)),
  }));
}

export async function loadMySubmissions(
  userId: string,
  matchIds: string[],
): Promise<Map<string, MatchSubmission>> {
  const map = new Map<string, MatchSubmission>();
  if (matchIds.length === 0) return map;

  const { data, error } = await supabase
    .from("match_submissions")
    .select("*")
    .eq("user_id", userId)
    .in("match_id", matchIds);

  if (error) {
    console.error("loadMySubmissions", error);
    return map;
  }

  for (const row of (data ?? []) as MatchSubmission[]) {
    map.set(row.match_id, row);
  }
  return map;
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
