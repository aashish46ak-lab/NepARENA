import { supabase } from "@/lib/supabase";
import { computeBrPoints, type BrScoringConfig } from "./index";

export async function listBrMatches(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_br_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createBrMatch(params: {
  tournamentId: string;
  roundNumber: number;
  matchNumber?: number;
  title?: string;
  lobbyId?: string;
  lobbyPassword?: string;
  scheduledAt?: string | null;
}) {
  const { data, error } = await supabase
    .from("tournament_br_matches")
    .insert({
      tournament_id: params.tournamentId,
      round_number: params.roundNumber,
      match_number: params.matchNumber ?? 1,
      title: params.title ?? `Round ${params.roundNumber}`,
      lobby_id: params.lobbyId ?? null,
      lobby_password: params.lobbyPassword ?? null,
      scheduled_at: params.scheduledAt ?? null,
      status: "scheduled",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function submitBrResult(params: {
  matchId: string;
  tournamentId: string;
  participantId: string;
  placement: number;
  kills: number;
  scoring?: BrScoringConfig | null;
  evidenceUrl?: string | null;
  submittedBy?: string | null;
}) {
  const pts = computeBrPoints(params.placement, params.kills, params.scoring);
  const { data, error } = await supabase
    .from("tournament_br_results")
    .upsert(
      {
        match_id: params.matchId,
        tournament_id: params.tournamentId,
        participant_id: params.participantId,
        placement: params.placement,
        kills: params.kills,
        placement_points: pts.placementPoints,
        kill_points: pts.killPoints,
        total_points: pts.total,
        evidence_url: params.evidenceUrl ?? null,
        submitted_by: params.submittedBy ?? null,
        status: "submitted",
      },
      { onConflict: "match_id,participant_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function verifyBrResult(
  resultId: string,
  verifiedBy: string,
  status: "verified" | "rejected" | "published" = "verified",
) {
  const { error } = await supabase
    .from("tournament_br_results")
    .update({ status, verified_by: verifiedBy })
    .eq("id", resultId);
  if (error) throw error;
}
