import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { notifyAdmins, type MatchSubmission } from "@/lib/matches-pending";
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
  ScanLine,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SubmitResultCardProps {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  homePhoto: string | null;
  awayPhoto: string | null;
  /** e.g. "Tournament · Matchday 3" */
  meta?: string;
  /** The signed-in player's participant row id for this match */
  participantId: string | null;
  submission: MatchSubmission | null;
  onDone: () => void;
}

/**
 * Expandable match card: Logo | Home vs Away | Logo + Submit Result.
 * Expanded view has score inputs, screenshot upload (with OCR pre-fill)
 * and Send for Approval. Shared by the home Pending Matches widget and
 * the tournament "My Matches" section.
 */
export function SubmitResultCard({
  matchId,
  homeLabel,
  awayLabel,
  homePhoto,
  awayPhoto,
  meta,
  participantId,
  submission,
  onDone,
}: SubmitResultCardProps) {
  const { user } = useAuth();
  const status = submission?.status;

  const [open, setOpen] = useState(
    !submission || submission.status === "rejected",
  );
  const [hs, setHs] = useState(
    submission?.home_score != null ? String(submission.home_score) : "",
  );
  const [ascore, setAscore] = useState(
    submission?.away_score != null ? String(submission.away_score) : "",
  );
  const [note, setNote] = useState(submission?.note ?? "");
  const [proofUrl, setProofUrl] = useState(
    submission?.proof_url ?? submission?.screenshot_url ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
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
    } catch {
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

    // OCR pre-fill (best effort — never blocks the flow)
    setScanning(true);
    try {
      const { detectScoreFromImage } = await import("@/lib/ocr");
      const hit = await detectScoreFromImage(file);
      if (hit) {
        setHs(String(hit.home));
        setAscore(String(hit.away));
        toast.success("Score detected from screenshot: " + hit.raw);
      }
    } catch {
      // OCR is optional — ignore failures
    } finally {
      setScanning(false);
    }
  };

  const submit = async () => {
    if (!user) return;
    if (!participantId) {
      toast.error("Could not find your player entry for this match");
      return;
    }
    if (hs === "" || ascore === "") {
      toast.error("Enter both scores");
      return;
    }
    if (!proofUrl) {
      toast.error("Upload result screenshot (SS)");
      return;
    }

    setBusy(true);
    const payload = {
      home_score: Number(hs),
      away_score: Number(ascore),
      proof_url: proofUrl,
      note: note.trim() || null,
      status: "pending" as const,
      reviewed_at: null,
    };
    // Resubmission updates the existing row; first time inserts a new one.
    const res = submission
      ? await supabase
          .from("match_submissions")
          .update(payload)
          .eq("id", submission.id)
      : await supabase.from("match_submissions").insert({
          ...payload,
          match_id: matchId,
          participant_id: participantId,
          user_id: user.id,
        });
    setBusy(false);

    if (res.error) return toast.error(res.error.message);
    toast.success("Sent for admin verification");
    void notifyAdmins(
      "Result submitted",
      homeLabel + " vs " + awayLabel + ": " + hs + "-" + ascore + " awaiting review",
      null,
    ).catch(() => {});
    setOpen(false);
    onDone();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Collapsed row: Logo | Home vs Away | Logo + action */}
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
            <AvatarImage src={homePhoto ?? undefined} />
            <AvatarFallback className="bg-secondary text-[10px]">
              {homeLabel.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold truncate max-w-[28%] text-right">
            {homeLabel}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">vs</span>
          <span className="text-sm font-semibold truncate max-w-[28%]">
            {awayLabel}
          </span>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={awayPhoto ?? undefined} />
            <AvatarFallback className="bg-secondary text-[10px]">
              {awayLabel.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {status === "pending" ? (
          <Badge className="bg-amber-500/20 text-amber-300 shrink-0 text-[10px]">
            <Clock className="h-3 w-3 mr-0.5" /> In Review
          </Badge>
        ) : status === "rejected" ? (
          <Badge className="bg-red-500/20 text-red-300 shrink-0 text-[10px]">
            <XCircle className="h-3 w-3 mr-0.5" /> Retry
          </Badge>
        ) : (
          !open && (
            <Badge className="bg-gradient-brand text-primary-foreground shrink-0 text-[10px] border-0">
              Submit Result
            </Badge>
          )
        )}

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3">
          {meta && (
            <p className="text-[10px] text-muted-foreground text-center">
              {meta}
            </p>
          )}

          {status === "pending" ? (
            <p className="text-xs text-center text-amber-300/90 py-2">
              In Review — waiting for admin verification. Result not live yet.
            </p>
          ) : (
            <>
              {/* Score row: logo name [H] - [A] name logo */}
              <div className="flex items-center gap-2 justify-center">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={homePhoto ?? undefined} />
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {homeLabel.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold truncate max-w-[72px] text-right hidden xs:inline">
                  {homeLabel}
                </span>

                <Input
                  className="w-12 h-10 text-center font-bold text-base shrink-0"
                  inputMode="numeric"
                  placeholder="0"
                  value={hs}
                  onChange={(e) => setHs(e.target.value.replace(/[^0-9]/g, ""))}
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
                  {awayLabel}
                </span>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={awayPhoto ?? undefined} />
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {awayLabel.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Screenshot upload */}
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
                ) : scanning ? (
                  <ScanLine className="h-4 w-4 mr-1 animate-pulse" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-1" />
                )}
                {scanning
                  ? "Reading scoreboard…"
                  : proofUrl
                    ? "Change screenshot (SS)"
                    : "Upload result SS"}
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
                <Button
                  size="sm"
                  className="bg-gradient-brand text-primary-foreground"
                  disabled={busy || uploading || scanning}
                  onClick={submit}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1" /> Send for Approval
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