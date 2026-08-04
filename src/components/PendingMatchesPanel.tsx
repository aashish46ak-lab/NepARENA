import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  loadPendingMatches,
  type PendingMatch,
} from "@/lib/matches-pending";
import { recomputeStandings } from "@/components/tournament-manager/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords, Send } from "lucide-react";
import { toast } from "sonner";

export function PendingMatchesPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItems(await loadPendingMatches(user.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user?.id]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your matches…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No pending matches right now.
      </p>
    );
  }

  return (
    <div id="pending-matches" className="space-y-3">
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-brand-glow" />
        <h2 className="text-lg font-bold">
          Pending matches ({items.length})
        </h2>
      </div>
      <div className="space-y-3">
        {items.map((pm) => (
          <PendingMatchCard key={pm.match.id} pm={pm} onDone={reload} />
        ))}
      </div>
    </div>
  );
}

function PendingMatchCard({
  pm,
  onDone,
}: {
  pm: PendingMatch;
  onDone: () => void;
}) {
  const [hs, setHs] = useState("");
  const [ascore, setAscore] = useState("");
  const [proof, setProof] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (hs === "" || ascore === "") {
      toast.error("Enter both scores");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: Number(hs),
        away_score: Number(ascore),
        played: true,
        status: "finished",
        proof_url: proof.trim() || null,
      })
      .eq("id", pm.match.id);

    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    try {
      await recomputeStandings(pm.tournamentId);
      toast.success("Result submitted");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Standings failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3 border border-amber-500/20">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-amber-500/20 text-amber-300">Pending</Badge>
        <span className="text-xs text-muted-foreground">
          {pm.tournamentName} · {pm.matchdayName}
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 text-sm font-semibold">
        <span className="truncate max-w-[40%] text-right">{pm.homeLabel}</span>
        <span className="text-muted-foreground text-xs">vs</span>
        <span className="truncate max-w-[40%]">{pm.awayLabel}</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Input
          className="w-14 h-9 text-center"
          inputMode="numeric"
          placeholder="H"
          value={hs}
          onChange={(e) => setHs(e.target.value.replace(/[^0-9]/g, ""))}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          className="w-14 h-9 text-center"
          inputMode="numeric"
          placeholder="A"
          value={ascore}
          onChange={(e) => setAscore(e.target.value.replace(/[^0-9]/g, ""))}
        />
      </div>
      <Input
        placeholder="Proof image URL (optional)"
        value={proof}
        onChange={(e) => setProof(e.target.value)}
      />
      <div className="flex flex-wrap gap-2 justify-end">
        <Button asChild size="sm" variant="outline">
          <Link to="/tournaments/$id" params={{ id: pm.tournamentId }}>
            Tournament
          </Link>
        </Button>
        <Button
          size="sm"
          className="bg-gradient-brand text-primary-foreground"
          disabled={busy}
          onClick={submit}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5 mr-1" /> Submit result
            </>
          )}
        </Button>
      </div>
    </div>
  );
            }
