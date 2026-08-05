import { supabase } from "./supabase";

export interface PendingMatch {
  match: {
    id: string;
  };
  myParticipantId: string;
  homeLabel: string;
  awayLabel: string;
  homePhoto: string | null;
  awayPhoto: string | null;
  tournamentId: string;
  tournamentName: string;
  matchdayName: string;
}

export interface MatchSubmission {
  id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  screenshot_url: string;
  status: "pending" | "approved" | "rejected";
  note?: string | null;
}

/**
 * Single batch query to load pending matches and the current user's submissions
 */
export async function loadPendingMatches(userId: string): Promise<PendingMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(`
      id,
      tournament_id,
      matchday_name,
      home_participant_id,
      away_participant_id,
      home_participant:participants!home_participant_id ( id, name, avatar_url ),
      away_participant:participants!away_participant_id ( id, name, avatar_url ),
      tournaments ( id, name )
    `)
    .eq("status", "pending")
    .or(`home_participant_id.eq.${userId},away_participant_id.eq.${userId}`);

  if (error) {
    console.error("Error loading pending matches:", error);
    throw error;
  }

  if (!data) return [];

  return data.map((m: any) => ({
    match: { id: m.id },
    myParticipantId: userId,
    homeLabel: m.home_participant?.name || "Home Team",
    awayLabel: m.away_participant?.name || "Away Team",
    homePhoto: m.home_participant?.avatar_url || null,
    awayPhoto: m.away_participant?.avatar_url || null,
    tournamentId: m.tournament_id,
    tournamentName: m.tournaments?.name || "Tournament",
    matchdayName: m.matchday_name || "Matchday",
  }));
}

/**
 * Single batch query to fetch all my submissions for given match IDs
 */
export async function loadMySubmissions(
  userId: string,
  matchIds: string[]
): Promise<Map<string, MatchSubmission>> {
  const submissionsMap = new Map<string, MatchSubmission>();

  if (matchIds.length === 0) return submissionsMap;

  const { data, error } = await supabase
    .from("match_submissions")
    .select("*")
    .eq("user_id", userId)
    .in("match_id", matchIds);

  if (error) {
    console.error("Error loading my submissions:", error);
    return submissionsMap;
  }

  if (data) {
    data.forEach((sub: MatchSubmission) => {
      submissionsMap.set(sub.match_id, sub);
    });
  }

  return submissionsMap;
}
