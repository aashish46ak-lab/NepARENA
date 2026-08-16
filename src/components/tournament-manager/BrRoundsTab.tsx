import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tournament } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { createBrMatch, listBrMatches, submitBrResult } from "@/lib/games/br";
import { getGame, resolveBrScoring, type BrScoringConfig } from "@/lib/games";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { BrLeaderboard } from "@/components/tournaments/games/BrLeaderboard";

export function BrRoundsTab({ tournament }: { tournament: Tournament }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const game = getGame(tournament.game);
  const scoring = resolveBrScoring(
    (tournament.game_config as { br_scoring?: BrScoringConfig } | null)?.br_scoring,
  );

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["br_matches", tournament.id],
    queryFn: () => listBrMatches(tournament.id),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["br_participants", tournament.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_participants")
        .select("id, player_name, team_name, status")
        .eq("tournament_id", tournament.id)
        .eq("status", "approved");
      return data ?? [];
    },
  });

  const [round, setRound] = useState(1);
  const [busy, setBusy] = useState(false);
  const [placement, setPlacement] = useState("1");
  const [kills, setKills] = useState("0");
  const [participantId, setParticipantId] = useState("");
  const [matchId, setMatchId] = useState("");

  const addRound = async () => {
    setBusy(true);
    try {
      await createBrMatch({
        tournamentId: tournament.id,
        roundNumber: round,
        title: `Round ${round}`,
      });
      toast.success("Round created");
      void qc.invalidateQueries({ queryKey: ["br_matches", tournament.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!matchId || !participantId) {
      toast.error("Select match and participant");
      return;
    }
    setBusy(true);
    try {
      await submitBrResult({
        matchId,
        tournamentId: tournament.id,
        participantId,
        placement: Number(placement) || 1,
        kills: Number(kills) || 0,
        scoring,
        submittedBy: user?.id,
      });
      toast.success("Result submitted");
      void qc.invalidateQueries({ queryKey: ["br_leaderboard", tournament.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-white">{game.shortName} rounds</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Scoring: {scoring.label} (kill = {scoring.kill_points} pt)
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[11px] text-neutral-500">Round #</label>
            <Input
              type="number"
              min={1}
              className="w-24"
              value={round}
              onChange={(e) => setRound(Number(e.target.value) || 1)}
            />
          </div>
          <Button size="sm" disabled={busy} onClick={() => void addRound()}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add round
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {matches.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"
            >
              <span className="text-neutral-200">
                {m.title || `R${m.round_number}`} · {m.status}
              </span>
              <Button
                size="sm"
                variant={matchId === m.id ? "default" : "outline"}
                onClick={() => setMatchId(m.id)}
              >
                Select
              </Button>
            </li>
          ))}
          {!matches.length && <p className="text-xs text-neutral-500">No rounds yet.</p>}
        </ul>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-white">Submit result</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
          >
            <option value="">Participant…</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {(p as { team_name?: string }).team_name || p.player_name}
              </option>
            ))}
          </select>
          <Input type="number" placeholder="Placement" value={placement} onChange={(e) => setPlacement(e.target.value)} />
          <Input type="number" placeholder="Kills" value={kills} onChange={(e) => setKills(e.target.value)} />
          <Button disabled={busy || !matchId} onClick={() => void submit()}>
            Submit
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white">Leaderboard</h3>
        <BrLeaderboard tournamentId={tournament.id} />
      </div>
    </div>
  );
}
