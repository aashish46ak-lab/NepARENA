import { useEffect, useState } from "react";
import {
  supabase,
  type MatchSubmission,
  type Tournament,
  type TournamentParticipant,
} from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recomputeStandings, type TournamentData } from "./shared";
import { notifyMatchResult } from "@/lib/matches-pending";

function getPlayer(data: TournamentData, id: string | null): TournamentParticipant | undefined {
  if (!id) return undefined;
  return data.players.find((p) => p.id === id);
}
function sideLabel(p: TournamentParticipant | undefined): string {
  if (!p) return "TBD";
  return p.club?.trim() || p.player_name;
}

/** Results tab — enter scores on Fixtures; review player submissions here. */
export function ResultsTab({ tournament, data }: { tournament: Tournament; data: TournamentData }) {
  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Enter results on the <strong>Fixtures</strong> tab (score boxes on each match + Save matchday).
      </p>
      <SubmissionsReview tournament={tournament} data={data} />
    </div>
  );
}

export function SubmissionsReview({
  tournament,
  data,
}: {
  tournament: Tournament;
  data: TournamentData;
}) {
  const [subs, setSubs] = useState<MatchSubmission[]>([]);
  useEffect(() => {
    const ids = data.matches.map((m) => m.id);
    if (!ids.length) {
      setSubs([]);
      return;
    }
    void supabase
      .from("match_submissions")
      .select("*")
      .in("match_id", ids)
      .eq("status", "pending")
      .order("created_at")
      .then(({ data: rows }) => setSubs((rows ?? []) as MatchSubmission[]));
  }, [data.matches]);
  if (subs.length === 0) return null;
  return (
    <div className="glass mx-auto w-full max-w-[420px] space-y-3 rounded-2xl border border-amber-500/30 p-4">
      <h3 className="text-sm font-semibold text-amber-300">
        Player submissions awaiting review ({subs.length})
      </h3>
      {subs.map((s) => (
        <SubmissionCard
          key={s.id}
          sub={s}
          tournament={tournament}
          data={data}
          onDone={() => {
            setSubs((cur) => cur.filter((x) => x.id !== s.id));
            data.reload();
          }}
        />
      ))}
    </div>
  );
}

function SubmissionCard({
  sub,
  tournament,
  data,
  onDone,
}: {
  sub: MatchSubmission;
  tournament: Tournament;
  data: TournamentData;
  onDone: () => void;
}) {
  const match = data.matches.find((m) => m.id === sub.match_id);
  const homeLabel = sideLabel(getPlayer(data, match?.home_id ?? null));
  const awayLabel = sideLabel(getPlayer(data, match?.away_id ?? null));
  const byName =
    data.players.find((p) => p.id === sub.participant_id)?.player_name ?? "Player";
  const [hs, setHs] = useState(sub.home_score != null ? String(sub.home_score) : "");
  const [ascore, setAscore] = useState(sub.away_score != null ? String(sub.away_score) : "");
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    const homeNum = hs === "" ? null : Number(hs);
    const awayNum = ascore === "" ? null : Number(ascore);
    if (homeNum == null || awayNum == null) return toast.error("Set both scores before approving");
    setBusy(true);
    const { error: mErr } = await supabase
      .from("matches")
      .update({
        home_score: homeNum,
        away_score: awayNum,
        played: true,
        status: "finished",
        proof_url: sub.screenshot_url,
      })
      .eq("id", sub.match_id);
    if (mErr) {
      setBusy(false);
      return toast.error(mErr.message);
    }
    await supabase.from("match_submissions").update({ status: "approved" }).eq("id", sub.id);
    try {
      await recomputeStandings(tournament.id);
    } catch {
      /* ignore */
    }
    try {
      await notifyMatchResult(
        tournament.id,
        tournament.name,
        match?.home_id ?? null,
        match?.away_id ?? null,
        homeNum,
        awayNum,
        homeLabel,
        awayLabel,
      );
    } catch {
      /* ignore */
    }
    void logActivity("submission.approve", { tournament: tournament.name, match: sub.match_id });
    setBusy(false);
    toast.success("Submission approved — standings updated");
    onDone();
  };

  const reject = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("match_submissions")
      .update({ status: "rejected" })
      .eq("id", sub.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Rejected — the player can submit again");
    onDone();
  };

  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-semibold">
          {homeLabel} vs {awayLabel}
        </span>
        <span className="shrink-0 text-muted-foreground">by {byName}</span>
      </div>
      {sub.screenshot_url && (
        <a href={sub.screenshot_url} target="_blank" rel="noreferrer">
          <img src={sub.screenshot_url} alt="Proof" loading="lazy" className="max-h-28 rounded-lg border border-border/60" />
        </a>
      )}
      {sub.note && <p className="text-xs text-muted-foreground">&ldquo;{sub.note}&rdquo;</p>}
      <div className="flex items-center gap-2">
        <Input className="h-8 w-12 px-0 text-center text-sm font-bold" inputMode="numeric" value={hs} onChange={(e) => setHs(e.target.value.replace(/[^0-9]/g, ""))} />
        <span className="text-xs font-bold text-muted-foreground">-</span>
        <Input className="h-8 w-12 px-0 text-center text-sm font-bold" inputMode="numeric" value={ascore} onChange={(e) => setAscore(e.target.value.replace(/[^0-9]/g, ""))} />
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={busy} onClick={reject}>
            <X className="mr-1 h-3 w-3" /> Reject
          </Button>
          <Button size="sm" className="h-7 bg-gradient-brand px-2.5 text-xs text-primary-foreground" disabled={busy} onClick={approve}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="mr-1 h-3 w-3" /> Approve</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
