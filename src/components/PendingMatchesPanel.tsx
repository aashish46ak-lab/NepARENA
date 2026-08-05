import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase, type MatchSubmission } from "@/lib/supabase";
import {
  loadMySubmissions,
  loadPendingMatches,
  type PendingMatch,
} from "@/lib/matches-pending";
import { uploadPublicImage } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2, ChevronDown, Clock, ImagePlus, Loader2, Send, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Item {
  pm: PendingMatch;
  submission: MatchSubmission | null;
}

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
      const subs = await loadMySubmissions(user.id, pms.map((p) => p.match.id));
      setItems(
        pms.map((pm) => ({ pm, submission: subs.get(pm.match.id) ?? null })),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user || loading || items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-8">
      <div id="pending-matches" className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <h2 className="text-lg font-bold text-red-400">
            Pending matches ({items.length})
          </h2>
        </div>
        <div className="space-y-2">
          {items.map((it) => (
            <PendingMatchCard key={it.pm.match.id} item={it} onDone={reload} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SideAvatar({ label, photo }: { label: string; photo: string | null }) {
  return (
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={photo ?? undefined} />
      <AvatarFallback className="bg-secondary text-[10px]">
        {label.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
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
  const [open, setOpen] = useState(false);
  const [hs, setHs] = useState("");
  const [ascore, setAscore] = useState("");
  const [note, setNote] = useState("");
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const status = submission?.status ?? null;

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadPublicImage(file, "proofs");
      setShot(url);
      toast.success("Screenshot uploaded successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!user) return;
    if (hs === "" || ascore === "") {
      toast.error("Enter the final score first");
      return;
    }
    if (!shot) {
      toast.error("Attach a scoreboard screenshot as proof");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("match_submissions").insert({
      match_id: pm.match.id,
      participant_id: pm.myParticipantId,
      user_id: user.id,
      home_score: Number(hs),
      away_score: Number(ascore),
      screenshot_url: shot,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505" || error.message.includes("match_submissions_active_uq")) {
        toast.error("You already have a submission under review for this match.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Result submitted — waiting for admin approval");
    onDone();
  };

  return (
    <div className="glass rounded-2xl border border-red-500/30 overflow-hidden">
      {/* Compact header — tap to expand */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/20 transition"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SideAvatar label={pm.homeLabel} photo={pm.homePhoto} />
          <span className="truncate text-sm font-semibold">{pm.homeLabel}</span>
          <span className="shrink-0 text-xs text-muted-foreground">vs</span>
          <SideAvatar label={pm.awayLabel} photo={pm.awayPhoto} />
          <span className="truncate text-sm font-semibold">{pm.awayLabel}</span>
        </div>
        {status === "pending" && (
          <Badge className="shrink-0 bg-amber-500/20 text-amber-300 border-amber-500/40">
            <Clock className="h-3 w-3 mr-1" /> In review
          </Badge>
        )}
        {status === "approved" && (
          <Badge className="shrink-0 bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        )}
        {status === "rejected" && (
          <Badge className="shrink-0 bg-red-500/20 text-red-300 border-red-500/40">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/40 px-4 py-4 animate-fade-in">
          <p className="text-xs text-muted-foreground">
            {pm.tournamentName} · {pm.matchdayName}
          </p>

          {status === "pending" && submission ? (
            <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-sm font-medium text-amber-300">
                Submitted {submission.home_score} - {submission.away_score} — waiting for admin review.
              </p>
              {submission.screenshot_url && (
                <a href={submission.screenshot_url} target="_blank" rel="noreferrer">
                  <img
                    src={submission.screenshot_url}
                    alt="Submitted proof"
                    className="max-h-32 rounded-lg border border-border/60"
                  />
                </a>
              )}
              <p className="text-xs text-muted-foreground">
                You can submit again only if the admin rejects this submission.
              </p>
            </div>
          ) : (
            <>
              {status === "rejected" && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                  Your previous submission was rejected. Please submit the correct result with a clear screenshot.
                </p>
              )}

              {/* Direct Screenshot Upload */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  hidden
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-1.5" />
                  )}
                  {uploading ? "Uploading..." : shot ? "Replace screenshot" : "Upload screenshot"}
                </Button>
                {shot && (
                  <div className="flex items-center gap-2">
                    <a href={shot} target="_blank" rel="noreferrer">
                      <img
                        src={shot}
                        alt="Scoreboard proof"
                        className="h-12 rounded-lg border border-border/60 object-cover"
                      />
                    </a>
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                    </span>
                  </div>
                )}
              </div>

              {/* Manual Scores Input */}
              <div className="flex items-center justify-center gap-2">
                <div className="flex-1 text-right text-xs text-muted-foreground truncate font-medium">
                  {pm.homeLabel}
                </div>
                <Input
                  className="w-14 h-9 text-center shrink-0"
                  inputMode="numeric"
                  placeholder="H"
                  value={hs}
                  onChange={(e) => setHs(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <span className="text-muted-foreground font-bold">-</span>
                <Input
                  className="w-14 h-9 text-center shrink-0"
                  inputMode="numeric"
                  placeholder="A"
                  value={ascore}
                  onChange={(e) => setAscore(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <div className="flex-1 text-xs text-muted-foreground truncate font-medium">
                  {pm.awayLabel}
                </div>
              </div>

              <Textarea
                rows={2}
                placeholder="Note for the admin (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
