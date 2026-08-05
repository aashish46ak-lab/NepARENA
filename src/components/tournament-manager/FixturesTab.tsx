import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Bell,
  Plus,
  Trash2,
  Edit2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TournamentParticipant {
  id: string;
  player_name: string;
  club?: string;
  avatar_url?: string;
}

interface Match {
  id: string;
  tournament_id: string;
  matchday_name: string;
  home_team: string;
  away_team: string;
  home_score?: number | null;
  away_score?: number | null;
  is_published?: boolean;
  status?: string;
  scheduled_at?: string | null;
}

interface FixturesTabProps {
  tournamentId: string;
  participants?: TournamentParticipant[];
}

export function FixturesTab({ tournamentId, participants = [] }: FixturesTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchdays, setMatchdays] = useState<string[]>([]);

  // 🔒 Selected Matchday Lock (Reset हुनबाट रोक्न)
  const [selectedMatchday, setSelectedMatchday] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modals / States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [newMatchdayName, setNewMatchdayName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [generatingCanvas, setGeneratingCanvas] = useState(false);

  // 1. Initial Load Only (Zero Reload Loop)
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Failed to load fixtures");
      } else if (data && isMounted) {
        // Safe mapping with strict Default OFF logic
        const formattedData = data.map((m) => ({
          ...m,
          is_published: m.is_published ?? false,
        }));
        setMatches(formattedData);

        const uniqueMDs = Array.from(
          new Set(formattedData.map((m: Match) => m.matchday_name || "Matchday 1"))
        );
        setMatchdays(uniqueMDs);

        // Keep current selected matchday if valid
        setSelectedMatchday((prev) => {
          if (prev && uniqueMDs.includes(prev)) return prev;
          return uniqueMDs[0] || "Matchday 1";
        });
      }
      if (isMounted) setLoading(false);
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  // Current Matchday Filter
  const filteredMatches = matches.filter(
    (m) => (m.matchday_name || "Matchday 1") === selectedMatchday
  );

  // Single Merged Switch Logic (All matches must be published to be ON)
  const isCurrentMatchdayPublished =
    filteredMatches.length > 0 && filteredMatches.every((m) => Boolean(m.is_published));

  // 2. 🔔 Combined Single Switch (Publish + Notification + NO RELOAD)
  const handleTogglePublish = async (targetStatus: boolean) => {
    if (!selectedMatchday || filteredMatches.length === 0) return;
    setUpdating(true);

    try {
      // Step A: Update Supabase DB
      const { error: matchError } = await supabase
        .from("matches")
        .update({ is_published: targetStatus })
        .eq("tournament_id", tournamentId)
        .eq("matchday_name", selectedMatchday);

      if (matchError) throw matchError;

      // Step B: Send Notification when Turned ON
      if (targetStatus) {
        await supabase.from("notifications").insert({
          tournament_id: tournamentId,
          title: `Matches Published! ⚽`,
          message: `${selectedMatchday} fixtures are live now. Check your schedule!`,
          type: "matchday_published",
          created_at: new Date().toISOString(),
        });
      }

      // Step C: OPTIMISTIC STATE UPDATE (NO Page Reload / NO Matchday Reset)
      setMatches((prev) =>
        prev.map((m) =>
          (m.matchday_name || "Matchday 1") === selectedMatchday
            ? { ...m, is_published: targetStatus }
            : m
        )
      );

      toast.success(
        targetStatus
          ? `${selectedMatchday} is LIVE & Notification Sent! 🔔`
          : `${selectedMatchday} set to Draft (Off)`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update switch");
    } finally {
      setUpdating(false);
    }
  };

  // 3. Add Match (Guaranteed Default OFF)
  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam) {
      toast.error("Please fill both team names");
      return;
    }
    setSubmitting(true);

    const mdToUse = newMatchdayName.trim() || selectedMatchday || "Matchday 1";

    const newMatchPayload = {
      tournament_id: tournamentId,
      matchday_name: mdToUse,
      home_team: homeTeam,
      away_team: awayTeam,
      scheduled_at: scheduledAt || null,
      is_published: false, // 🔒 ALWAYS DEFAULT OFF
      status: "scheduled",
    };

    const { data, error } = await supabase
      .from("matches")
      .insert([newMatchPayload])
      .select();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      const createdMatch = { ...data[0], is_published: false };
      setMatches((prev) => [...prev, createdMatch]);

      if (!matchdays.includes(mdToUse)) {
        setMatchdays((prev) => [...prev, mdToUse]);
      }
      setSelectedMatchday(mdToUse); // STAY ON CURRENT MATCHDAY
      resetForm();
      setIsAddOpen(false);
      toast.success("Match created (Default: Draft OFF)");
    }
    setSubmitting(false);
  };

  // 4. Edit Match
  const handleEditMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setSubmitting(true);

    const updatedPayload = {
      home_team: homeTeam,
      away_team: awayTeam,
      scheduled_at: scheduledAt || null,
      matchday_name: newMatchdayName.trim() || selectedMatchday,
    };

    const { error } = await supabase
      .from("matches")
      .update(updatedPayload)
      .eq("id", editingMatch.id);

    if (error) {
      toast.error(error.message);
    } else {
      setMatches((prev) =>
        prev.map((m) => (m.id === editingMatch.id ? { ...m, ...updatedPayload } : m))
      );
      resetForm();
      setEditingMatch(null);
      toast.success("Match updated!");
    }
    setSubmitting(false);
  };

  // 5. Delete Match
  const handleDeleteMatch = async (matchId: string) => {
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) {
      toast.error(error.message);
    } else {
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      toast.success("Match deleted");
    }
  };

  const startEdit = (match: Match) => {
    setEditingMatch(match);
    setHomeTeam(match.home_team);
    setAwayTeam(match.away_team);
    setNewMatchdayName(match.matchday_name);
    setScheduledAt(match.scheduled_at || "");
  };

  const resetForm = () => {
    setHomeTeam("");
    setAwayTeam("");
    setNewMatchdayName("");
    setScheduledAt("");
  };

  // Canvas Image Download
  const generateBracketImage = async () => {
    if (!canvasRef.current || filteredMatches.length === 0) return;
    setGeneratingCanvas(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 1080;
      const cardHeight = 120;
      const padding = 40;
      const headerHeight = 180;
      const totalHeight = headerHeight + filteredMatches.length * (cardHeight + 20) + padding;

      canvas.width = width;
      canvas.height = totalHeight;

      const bgGradient = ctx.createLinearGradient(0, 0, 0, totalHeight);
      bgGradient.addColorStop(0, "#090d16");
      bgGradient.addColorStop(1, "#111827");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, totalHeight);

      ctx.fillStyle = "#6366f1";
      ctx.font = "bold 36px system-ui, sans-serif";
      ctx.fillText(selectedMatchday.toUpperCase(), padding, 70);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "20px system-ui, sans-serif";
      ctx.fillText("Official Tournament Fixtures", padding, 110);

      let startY = headerHeight;
      for (const m of filteredMatches) {
        roundRect(ctx, padding, startY, width - padding * 2, cardHeight, 16);
        ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(m.home_team, padding + 30, startY + 70);

        ctx.fillStyle = "#818cf8";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VS", width / 2, startY + 70);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(m.away_team, width - padding - 30, startY + 70);

        startY += cardHeight + 20;
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${selectedMatchday}-Fixtures.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Fixtures Image downloaded!");
    } catch {
      toast.error("Failed to generate image");
    } finally {
      setGeneratingCanvas(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-indigo-500" /> Loading fixtures...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* 🟢 TOP BAR: MERGED SINGLE SWITCH & ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass rounded-xl border border-border/40 bg-card/40">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-400" />
            Publish & Notify ({selectedMatchday})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Default: OFF (Draft)। switch ON गरेपछि मात्र पब्लिस हुन्छ र नोटीफिकेसन जान्छ।
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Download Graphic */}
          <Button
            size="sm"
            variant="outline"
            onClick={generateBracketImage}
            disabled={generatingCanvas || filteredMatches.length === 0}
            className="gap-1.5 border-indigo-500/30"
          >
            {generatingCanvas ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            ) : (
              <Download className="h-4 w-4 text-indigo-400" />
            )}
            Download Graphic
          </Button>

          {/* Add Match Dialog */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 border-indigo-500/30">
                <Plus className="h-4 w-4 text-indigo-400" /> Add Match
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Match</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddMatch} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-medium">Matchday Name (Optional)</label>
                  <Input
                    placeholder={selectedMatchday || "e.g. Matchday 1"}
                    value={newMatchdayName}
                    onChange={(e) => setNewMatchdayName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Home Team / Player</label>
                    {participants.length > 0 ? (
                      <SideSelect
                        value={homeTeam}
                        players={participants}
                        onChange={(v) => setHomeTeam(v)}
                        className="mt-1"
                      />
                    ) : (
                      <Input
                        placeholder="Player 1"
                        value={homeTeam}
                        onChange={(e) => setHomeTeam(e.target.value)}
                        className="mt-1"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium">Away Team / Player</label>
                    {participants.length > 0 ? (
                      <SideSelect
                        value={awayTeam}
                        players={participants}
                        onChange={(v) => setAwayTeam(v)}
                        className="mt-1"
                      />
                    ) : (
                      <Input
                        placeholder="Player 2"
                        value={awayTeam}
                        onChange={(e) => setAwayTeam(e.target.value)}
                        className="mt-1"
                        required
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Scheduled Time (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Match (Default: OFF)"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* ⚡ THE ONLY SINGLE MERGED SWITCH */}
          <div className="flex items-center gap-3 pl-3 border-l border-border/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isCurrentMatchdayPublished ? "Live (ON)" : "Draft (OFF)"}
            </span>
            {updating ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            ) : (
              <Switch
                checked={isCurrentMatchdayPublished}
                onCheckedChange={(checked) => handleTogglePublish(checked)}
                disabled={filteredMatches.length === 0}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit Match Modal */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditMatch} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium">Matchday Name</label>
              <Input
                value={newMatchdayName}
                onChange={(e) => setNewMatchdayName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Home Team</label>
                <Input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium">Away Team</label>
                <Input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Scheduled Time</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Match"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MATCHDAY NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
        {matchdays.map((md) => {
          const isActive = selectedMatchday === md;
          return (
            <button
              key={md}
              type="button"
              onClick={() => setSelectedMatchday(md)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md font-semibold"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {md}
            </button>
          );
        })}
      </div>

      {/* FIXTURES LIST */}
      <div className="space-y-3">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl border-border/60">
            <p className="text-sm text-muted-foreground">No matches found for {selectedMatchday}.</p>
          </div>
        ) : (
          filteredMatches.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-4 glass rounded-xl border border-border/40 hover:border-border/80 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{m.home_team}</span>
                  <span className="text-xs font-mono text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10">
                    {m.home_score ?? "-"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-bold font-mono">VS</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10">
                    {m.away_score ?? "-"}
                  </span>
                  <span className="font-semibold text-sm">{m.away_team}</span>
                </div>
              </div>
<div className="flex items-center gap-3">
                <Badge variant={m.is_published ? "default" : "outline"}>
                  {m.is_published ? "Published" : "Draft (OFF)"}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                  onClick={() => startEdit(m)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleDeleteMatch(m.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// 🛠️ UTILS & HELPER COMPONENTS
// ==========================================

function SideSelect({
  value,
  players,
  onChange,
  className,
}: {
  value: string | null;
  players: TournamentParticipant[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Select value={value ?? "tbd"} onValueChange={onChange}>
      <SelectTrigger className={cn("h-8 text-xs", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tbd">TBD</SelectItem>
        {players.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.club?.trim() || p.player_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
              
