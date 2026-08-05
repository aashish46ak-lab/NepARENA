import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
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
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Item = { pm: PendingMatch; submission: MatchSubmission | null };

export function PendingMatchesPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <section className="max-w-7xl mx-auto px-4 pt-6">
      <div id="pending-matches" className="space-y-2">
        {/* Dynamic island style header */}
        <div className="mx-auto w-fit max-w-full rounded-full bg-red-500/15 border border-red-500/30 px-4 py-1.5 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-sm font-semibold text-red-300">
            Pending · {items.length} match{items.length > 1 ? "es" : ""}
          </span>
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          {items.map((it) => (
            <PendingMatchCard key={it.pm.match.id} item={it} onDone={reload} />
          ))}
        </div>
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
  const [open, setOpen] = useState(!submission || submission.status === "rejected");
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
      const url = await uploadPublicImage(file, "match-proofs");
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
      toast.error("Upload result screenshot");
      return;
    }

    setBusy(true);
    const payload = {
      match_id: pm.match.id,
      user_id: user.id,
      home_score: Number(hs),
      away_score: Number(ascore),
      proof_url: proofUrl,
      note: note.trim() || null,
      status: "pending" as const,
      reviewed_at: null,
    };

    const { error } = await supabase.from("match_submissions").upsert(payload, {
      onConflict: "match_id,user_id",
    });

    setBusy(false);
    if (error) return toast.error(error.message);

    toast.success("Submitted for admin verification");
    onDone();
  };

  const status = submission?.status;

  return (
    <div className="glass rounded-2xl border border-red-500/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground truncate">
            {pm.tournamentName} · {pm.matchdayName}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={pm.homePhoto ?? undefined} />
              <AvatarFallback className="text-[9px] bg-secondary">
                {pm.homeLabel.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[28%] text-right">{pm.homeLabel}</span>
            <span className="text-xs text-muted-foreground">vs</span>
            <span className="truncate max-w-[28%]">{pm.awayLabel}</span>
            <Avatar className="h-7 w-7 shrink-0">
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
        {status === "approved" && (
          <Badge className="bg-emerald-500/20 text-emerald-300 shrink-0 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-0.5" /> OK
          </Badge>
        )}
        {status === "rejected" && (
          <Badge className="bg-red-500/20 text-red-300 shrink-0 text-[10px]">
            <XCircle className="h-3 w-3 mr-0.5" /> Rejected
          </Badge>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-3">
          {status === "pending" ? (
            <p className="text-xs text-amber-300/90 text-center">
              Waiting for admin verification. Scores are not live yet.
            </p>
          ) : (
            <>
              <div>
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
                  {proofUrl ? "Change screenshot" : "Upload result screenshot"}
                </Button>
                {proofUrl && (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs text-emerald-400 truncate"
                  >
                    <CheckCircle2 className="inline h-3 w-3 mr-1" />
                    Screenshot ready
                  </a>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <Input
                  className="w-14 h-9 text-center"
                  inputMode="numeric"
                  placeholder="H"
                  value={hs}
                  onChange={(e) =>
                    setHs(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
                <span className="text-muted-foreground font-bold">-</span>
                <Input
                  className="w-14 h-9 text-center"
                  inputMode="numeric"
                  placeholder="A"
                  value={ascore}
                  onChange={(e) =>
                    setAscore(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </div>

              <Textarea
                rows={2}
                placeholder="Note for admin (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <div className="flex flex-wrap gap-2 justify-end">
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
