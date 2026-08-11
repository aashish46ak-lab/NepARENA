import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, type Tournament, type TournamentParticipant } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { uploadPublicImage } from "@/lib/upload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_SCREENSHOTS = 3;

export function ReportForm({
  tournament,
  players,
}: {
  tournament: Tournament;
  players: TournamentParticipant[];
}) {
  const { user } = useAuth();
  const [player, setPlayer] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [myReports, setMyReports] = useState<
    {
      id: string;
      reason: string;
      description: string | null;
      player_name: string | null;
      status: string;
      created_at: string;
      screenshot_url: string | string[] | null;
    }[]
  >([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const loadMyReports = useCallback(async () => {
    if (!user) return;
    setLoadingReports(true);
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id, reason, description, player_name, status, created_at, screenshot_url",
      )
      .eq("reporter_id", user.id)
      .eq("tournament_id", tournament.id)
      .order("created_at", { ascending: false });
    setLoadingReports(false);
    if (error) {
      console.error(error);
      return;
    }
    setMyReports(data ?? []);
  }, [user, tournament.id]);

  useEffect(() => {
    void loadMyReports();
  }, [loadMyReports]);

  useEffect(() => {
    const urls = screenshots.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [screenshots]);

  if (!user) {
    return (
      <div className="py-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to submit a report and track status.
        </p>
      </div>
    );
  }

  const isPlayer = players.some((p) => p.user_id === user.id);
  if (!isPlayer) {
    return (
      <div className="py-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Only players registered in this tournament can submit a report.
        </p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setScreenshots((prev) => [...prev, ...files].slice(0, MAX_SCREENSHOTS));
    e.target.value = "";
  };

  const removeScreenshot = (i: number) => {
    setScreenshots((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 4) {
      toast.error("Please describe the reason for the report.");
      return;
    }
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of screenshots) {
        urls.push(await uploadPublicImage(file, "reports"));
      }
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        type: "tournament",
        tournament_id: tournament.id,
        player_name: player.trim() || null,
        reason: trimmedReason.slice(0, 200),
        description: details.trim() ? details.trim().slice(0, 2000) : null,
        screenshot_url: urls.length > 0 ? JSON.stringify(urls) : null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Report submitted — the admins will review it.");
      setPlayer("");
      setReason("");
      setDetails("");
      setScreenshots([]);
      await loadMyReports();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit report.",
      );
    } finally {
      setBusy(false);
    }
  };

  const screenshotList = (raw: string | string[] | null): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((u) => typeof u === "string")
        : [raw];
    } catch {
      return [raw];
    }
  };

  const statusColor = (status: string) =>
    status === "resolved"
      ? "bg-emerald-500/20 text-emerald-300"
      : status === "dismissed"
        ? "bg-secondary text-muted-foreground"
        : status === "in_review"
          ? "bg-brand/25 text-brand-glow"
          : "bg-amber-500/20 text-amber-300";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-xl font-bold">Report an issue</h2>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">
            Player involved (optional)
          </label>
          <Select value={player} onValueChange={setPlayer}>
            <SelectTrigger>
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              {players.map((p) => (
                <SelectItem key={p.id} value={p.player_name}>
                  {p.player_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Reason</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Opponent inactive / toxic"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Details</label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder="Explain what happened..."
            maxLength={2000}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">
            Screenshots (optional, max {MAX_SCREENSHOTS})
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground transition hover:bg-accent/40">
            <ImagePlus className="h-4 w-4" /> Add images
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt=""
                    className="h-16 w-16 rounded-lg border border-border/60 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(i)}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" disabled={busy} className="bg-gradient-brand">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit report
        </Button>
      </form>

      <div>
        <h2 className="mb-4 text-xl font-bold">Your reports</h2>
        {loadingReports ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : myReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet.</p>
        ) : (
          <div className="space-y-3">
            {myReports.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{r.reason}</span>
                  <Badge className={cn("capitalize", statusColor(r.status))}>
                    {r.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {r.player_name && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    vs {r.player_name}
                  </p>
                )}
                {r.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.description}
                  </p>
                )}
                {screenshotList(r.screenshot_url).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {screenshotList(r.screenshot_url).map((u) => (
                      <img
                        key={u}
                        src={u}
                        alt="Report screenshot"
                        className="h-14 w-14 rounded-lg border border-border/60 object-cover"
                      />
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
