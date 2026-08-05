import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase, PUBLIC_BUCKET } from "@/lib/supabase";
import {
  loadPendingMatches,
  loadMySubmissions,
  type PendingMatch,
  type MatchSubmission,
} from "@/lib/matches-pending";
import { uploadPublicImage } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  ImagePlus,
  Loader2,
  Send,
  Swords,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Item = { pm: PendingMatch; submission: MatchSubmission | null };

export function PendingMatchesPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const reload = async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const pms = await loadPendingMatches(user.id);
      const subs = await loadMySubmissions(
        user.id,
        pms.map((p) => p.match.id),
      );
      setItems(
        pms.map((pm) => ({
          pm,
          submission: subs.get(pm.match.id) ?? null,
        })),
      );
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user?.id]);

  if (!user || loading || items.length === 0) return null;

  const waitingReview = items.filter(
    (i) => i.submission?.status === "pending",
  ).length;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-4 relative z-20">
      <div id="pending-matches" className="flex flex-col items-center gap-3">
        {/* Dynamic island — tap to expand list */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-full border shadow-lg transition-all",
            "bg-black/80 backdrop-blur-xl border-red-500/40 text-white",
            "px-4 py-2.5 hover:border-red-400/60 hover:scale-[1.02]",
            expanded && "ring-2 ring-red-500/30",
          )}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <Swords className="h-4 w-4 text-red-300 shrink-0" />
          <span className="text-sm font-semibold whitespace-nowrap">
            Pending matches
          </span>
          <span className="rounded-full bg-red-500 text-[11px] font-bold px-2 py-0.5 min-w-[1.25rem] text-center">
            {items.length}
          </span>
          {waitingReview > 0 && (
            <span className="hidden sm:inline text-[10px] text-amber-300">
              {waitingReview} in review
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-white/70 transition",
              expanded && "rotate-180",
            )}
          />
        </button>

        {expanded && (
          <div className="w-full max-w-md space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {items.map((it) => (
              <PendingMatchCard
                key={it.pm.match.id}
                item={it}
                onDone={reload}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PendingMatchCard({
  item,
  onDone,
}: {
  item: Item;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const { pm, submission } = item;
  const status = submission?.status;
  const [open, setOpen] = useState(
    !submission || submission.status === "rejected",
  );
  const [hs, setHs] = useState(
    submission ? String(submission.home_score) : "",
  );
  const [ascore, setAscore] = useState(
    submission ? String(submission.away_score) : "",
  );
  const [note, setNote] = useState(submission?.note ?? "");
  const [proofUrl, setProofUrl] = useState(submission?.proof_url ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPublicImage(file, PUBLIC_BUCKET || "efn-public", {
        folder: "match-proofs",
      });
      setProofUrl(url);
      toast.success("Screenshot uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!user) return;
    if (hs === "" || ascore === "") {
      toast.error("Enter both scores");
      return;
    }
    if (!proofUrl) {
      toast.error("Upload result screenshot (SS)");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("match_submissions").upsert(
      {
        match_id: pm.match.id,
        user_id: user.id,
        home_score: Number(hs),
        away_score: Number(ascore),
        proof_url: proofUrl,
        note: note.trim() || null,
        status: "pending",
        reviewed_at: null,
      },
      { onConflict: "match_id,user_id" },
    );
    setBusy(false);

    if (error) return toast.error(error.message);
    toast.success("Sent for admin verification");
    setOpen(false);
    onDone();
  };

  return (
    <div className="glass rounded-2xl border border-red-500/25 overflow-hidden shadow-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-3 text-left"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-[10px] text-muted-foreground truncate">
            {pm.tournamentName} · {pm.matchdayName}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={pm.homePhoto ?? undefined} />
              <AvatarFallback className="text-[9px] bg-secondary">
                {pm.homeLabel.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[30%] text-right">
              {pm.homeLabel}
            </span>
            <span className="text-xs text-muted-foreground">vs</span>
            <span className="truncate max-w-[30%]">{pm.awayLabel}</span>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={pm.awayPhoto ?? undefined} />
              <AvatarFallback className="text-[9px] bg-secondary">
                {pm.awayLabel.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        {status === "pending" && (
          <Badge className="bg-amber-500/20 text-amber-300 shrink-0 text-[10px]">
            <Clock className="h-3 w-3 mr-0.5" /> Review
          </Badge>
        )}
        {status === "rejected" && (
          <Badge className="bg-red-500/20 text-red-300 shrink-0 text-[10px]">
            <XCircle className="h-3 w-3 mr-0.5" /> Retry
          </Badge>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-3">
          {status === "pending" ? (
            <p className="text-xs text-center text-amber-300/90 py-2">
              Waiting for admin. Result not live on standings yet.
            </p>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-1" />
                )}
                {proofUrl ? "Change screenshot" : "Upload result SS"}
              </Button>
              {proofUrl && (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-emerald-400 truncate"
                >
                  <CheckCircle2 className="inline h-3 w-3 mr-1" />
                  Screenshot ready — tap to view
                </a>
              )}

              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] text-muted-foreground w-12 text-right truncate">
                  {pm.homeLabel}
                </span>
                <Input
                  className="w-14 h-9 text-center font-bold"
                  inputMode="numeric"
                  placeholder="H"
                  value={hs}
                  onChange={(e) =>
                    setHs(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
                <span className="font-bold text-muted-foreground">-</span>
                <Input
                  className="w-14 h-9 text-center font-bold"
                  inputMode="numeric"
                  placeholder="A"
                  value={ascore}
                  onChange={(e) =>
                    setAscore(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
                <span className="text-[10px] text-muted-foreground w-12 truncate">
                  {pm.awayLabel}
                </span>
              </div>

              <Textarea
                rows={2}
                placeholder="Note for admin (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <div className="flex gap-2 justify-end">
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/tournaments/$id"
                    params={{ id: pm.tournamentId }}
                  >
                    Tournament
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-brand text-primary-foreground"
                  disabled={busy || uploading}
                  onClick={submit}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1" /> Submit for review
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
