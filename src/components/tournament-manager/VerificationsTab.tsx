import { useEffect, useState } from "react";
import { supabase, type Tournament } from "@/lib/supabase";
import { recomputeStandings, type TournamentData } from "./shared";
import { notifyMatchResult } from "@/lib/matches-pending";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  proof_url: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

export function VerificationsTab({
  tournament,
  data,
}: {
  tournament: Tournament;
  data: TournamentData;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const matchIds = data.matches.map((m) => m.id);
    if (matchIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: subs, error } = await supabase
      .from("match_submissions")
      .select("*")
      .in("match_id", matchIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) toast.error(error.message);
    setRows((subs ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [data.matches]);

  const labelOf = (partId: string | null) => {
    if (!partId) return "TBD";
    const p = data.players.find((x) => x.id === partId);
    return p ? p.club?.trim() || p.player_name : "TBD";
  };

  const approve = async (row: Row) => {
    const match = data.matches.find((m) => m.id === row.match_id);
    if (!match) return toast.error("Match not found");

    setBusyId(row.id);
    const { error: mErr } = await supabase
      .from("matches")
      .update({
        home_score: row.home_score,
        away_score: row.away_score,
        played: true,
        status: "finished",
        proof_url: row.proof_url,
      })
      .eq("id", row.match_id);

    if (mErr) {
      setBusyId(null);
      return toast.error(mErr.message);
    }

    await supabase
      .from("match_submissions")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    // Reject other pending for same match
    await supabase
      .from("match_submissions")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("match_id", row.match_id)
      .eq("status", "pending")
      .neq("id", row.id);

    try {
      await recomputeStandings(tournament.id);
      await notifyMatchResult(
        tournament.id,
        tournament.name,
        match.home_id,
        match.away_id,
        row.home_score,
        row.away_score,
        labelOf(match.home_id),
        labelOf(match.away_id),
      );
    } catch {
      // non-blocking
    }

    toast.success("Result approved — standings updated");
    setBusyId(null);
    data.reload();
    void load();
  };

  const reject = async (row: Row) => {
    setBusyId(row.id);
    await supabase
      .from("match_submissions")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    toast.message("Submission rejected");
    setBusyId(null);
    void load();
  };

  if (loading) {
    return (
      <div className="py-16 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No pending result submissions.
      </p>
    );
  }

  return (
    <div className="space-y-3 pt-4 max-w-xl">
      {rows.map((row) => {
        const match = data.matches.find((m) => m.id === row.match_id);
        const home = labelOf(match?.home_id ?? null);
        const away = labelOf(match?.away_id ?? null);
        return (
          <div
            key={row.id}
            className="glass rounded-2xl p-4 space-y-3 border border-amber-500/20"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-amber-500/20 text-amber-300">Pending</Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </span>
            </div>
            <div className="text-center text-sm font-semibold">
              {home}{" "}
              <span className="text-brand-glow mx-1">
                {row.home_score}-{row.away_score}
              </span>{" "}
              {away}
            </div>
            {row.note && (
              <p className="text-xs text-muted-foreground">Note: {row.note}</p>
            )}
            {row.proof_url && (
              <a
                href={row.proof_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-glow"
              >
                <ExternalLink className="h-3 w-3" /> View screenshot
              </a>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={() => reject(row)}
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-600/90 text-white"
                disabled={busyId === row.id}
                onClick={() => approve(row)}
              >
                {busyId === row.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
    }
