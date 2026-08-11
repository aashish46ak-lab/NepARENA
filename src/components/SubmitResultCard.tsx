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
 * Starts collapsed — expands only when user taps Submit Result.
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

  // Always start collapsed; user expands via "Submit Result"
  const [open, setOpen] = useState(false);
  const [hs, setHs] = useState(
    submission?.home_score != null ? String(submission.home_score) : "",
  );
  const [ascore, setAscore] = useState(
    submission?.away_score != null ? String(submission.away_score) : "",
  );
  const [note, setNote] = useState(submission?.note ?? "");
  const [proofUrl, setProofUrl] = useState(submission?.proof_url ?? "");
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!user || !participantId) {
      toast.error("Sign in required");
      return;
    }
    const home_score = Number(hs);
    const away_score = Number(ascore);
    if (Number.isNaN(home_score) || Number.isNaN(away_score)) {
      toast.error("Enter both scores");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        match_id: matchId,
        user_id: user.id,
        participant_id: participantId,
        home_score,
        away_score,
        note: note.trim() || null,
        proof_url: proofUrl || null,
        status: "pending" as const,
      };
      const { error } = await supabase.from("match_submissions").upsert(payload, {
        onConflict: "match_id,user_id",
      });
      if (error) throw error;
      try {
        await notifyAdmins(
          "Result submitted",
          `${homeLabel} ${home_score}-${away_score} ${awayLabel}`,
          `/tournaments`,
        );
      } catch {
        /* ignore */
      }
      toast.success("Sent for approval");
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-white/[0.03]"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar className="h-9 w-9 shrink-0">
          {homePhoto ? <AvatarImage src={homePhoto} /> : null}
          <AvatarFallback className="text-[10px]">{homeLabel.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <span className="truncate max-w-[40%]">{homeLabel}</span>
            <span className="text-xs text-muted-foreground">vs</span>
            <span className="truncate max-w-[40%]">{awayLabel}</span>
          </div>
          {meta && (
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{meta}</p>
          )}
          {status === "pending" && (
            <Badge className="mt-1 bg-amber-500/20 text-amber-300 text-[10px]">
              <Clock className="mr-1 h-3 w-3" /> In review
            </Badge>
          )}
          {status === "approved" && (
            <Badge className="mt-1 bg-emerald-500/20 text-emerald-300 text-[10px]">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
            </Badge>
          )}
          {status === "rejected" && (
            <Badge className="mt-1 bg-rose-500/20 text-rose-300 text-[10px]">
              <XCircle className="mr-1 h-3 w-3" /> Rejected — retry
            </Badge>
          )}
        </div>
        <Avatar className="h-9 w-9 shrink-0">
          {awayPhoto ? <AvatarImage src={awayPhoto} /> : null}
          <AvatarFallback className="text-[10px]">{awayLabel.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border/50 px-3 py-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Submit Result</p>
          <div className="flex items-center justify-center gap-2">
            <Input
              inputMode="numeric"
              className="h-11 w-16 text-center text-lg font-bold"
              placeholder="0"
              value={hs}
              onChange={(e) => setHs(e.target.value)}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              inputMode="numeric"
              className="h-11 w-16 text-center text-lg font-bold"
              placeholder="0"
              value={ascore}
              onChange={(e) => setAscore(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="mr-1 h-3.5 w-3.5" />
              )}
              Screenshot
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
            {proofUrl && (
              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-glow underline self-center"
              >
                View proof
              </a>
            )}
          </div>
          <Textarea
            rows={2}
            placeholder="Optional note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            className="w-full bg-gradient-brand text-primary-foreground"
            disabled={busy || status === "pending"}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {status === "pending" ? "Already submitted" : "Send for Approval"}
          </Button>
        </div>
      )}
    </div>
  );
}
