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
      <div id="pending-matches" className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <h2 className="text-base font-bold text-red-400">
            Pending matches ({items.length})
          </h2>
        </div>

        <div className="space-y-2 max-w-lg">
          {items.map((it) => (
            <PendingMatchCard
              key={it.pm.match.id}
              item={it}
              onDone={reload}
            />
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
      const url = await uploadPublicImage(file, "efn-public", {
        folder: "match-proofs",
      });
      setProofUrl(url);
      toast.success("Screenshot uploaded");
    } catch (e) {
      // fallback bucket
      try {
        const url = await uploadPublicImage(file, "avatars", {
          folder: "match-proofs",
        });
        setProofUrl(url);
        toast.success("Screenshot uploaded");
      } catch (e2) {
        toast.error(e2 instanceof Error ? e2.message : "Upload failed");
      }
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
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-3 text-left"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>

        <div className="flex flex-1 items-center justify-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={pm.homePhoto ?? undefined} />
            <AvatarFallback className="bg-secondary text-[10px]">
              {pm.homeLabel.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold truncate max-w-[28%] text-right">
            {pm.homeLabel}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">vs</span>
          <span className="text-sm font-semibold truncate max-w-[28%]">
            {pm.awayLabel}
          </span>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={pm.awayPhoto ?? undefined} />
            <AvatarFallback className="bg-secondary text-[10px]">
              {pm.awayLabel.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
            "h-4 w-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Expanded: logo home [ ]-[ ] away logo + SS */}
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3">
          <p className="text-[10px] text-muted-foreground text-center">
            {pm.tournamentName} · {pm.matchdayName}
          </p>

          {status === "pending" ? (
            <p className="text-xs text-center text-amber-300/90 py-2">
              Waiting for admin verification. Result not live yet.
            </p>
          ) : (
            <>
              {/* Score row: logo name [H] - [A] name logo */}
              <div className="flex items-center gap-2 justify-center">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={pm.homePhoto ?? undefined} />
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {pm.homeLabel.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold truncate max-w-[72px] text-right hidden xs:inline">
                  {pm.homeLabel}
                </span>

                <Input
                  className="w-12 h-10 text-center font-bold text-base shrink-0"
                  inputMode="numeric"
                  placeholder="0"
                  value={hs}
                  onChange={(e) =>
                    setHs(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
                <span className="font-bold text-muted-foreground shrink-0">
                  -
                </span>
                <Input
                  className="w-12 h-10 text-center font-bold text-base shrink-0"
                  inputMode="numeric"
                  placeholder="0"
                  value={ascore}
                  onChange={(e) =>
                    setAscore(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />

                <span className="text-xs font-semibold truncate max-w-[72px] hidden xs:inline">
                  {pm.awayLabel}
                </span>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={pm.awayPhoto ?? undefined} />
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {pm.awayLabel.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Labels under scores on very small screens */}
              <div className="flex justify-between text-[10px] text-muted-foreground px-1 sm:hidden">
                <span className="truncate max-w-[45%]">{pm.homeLabel}</span>
                <span className="truncate max-w-[45%] text-right">
                  {pm.awayLabel}
                </span>
              </div>

              {/* Screenshot */}
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
                {proofUrl ? "Change screenshot (SS)" : "Upload result SS"}
              </Button>
              {proofUrl && (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-emerald-400 text-center truncate"
                >
                  <CheckCircle2 className="inline h-3 w-3 mr-1" />
                  Screenshot ready — tap to view
                </a>
              )}

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
