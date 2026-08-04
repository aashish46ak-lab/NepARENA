import { useState } from "react";
import { supabase, type Tournament, type TournamentStatus } from "@/lib/supabase";
import { BRACKET_TYPES } from "@/lib/brackets";
import { logActivity } from "@/lib/activity";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Trophy } from "lucide-react";
import { toast } from "sonner";
import { sortStandings, type StandingRow } from "./shared";

const STATUSES: { value: TournamentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "check_in", label: "Check-in" },
  { value: "live", label: "Live" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed (saves History + Hall of Fame)" },
  { value: "archived", label: "Archived" },
];

const PLACE_LABELS = ["Champion (1st)", "Runner-up (2nd)", "3rd Place"];

export function SettingsTab({
  tournament,
  onPatched,
}: {
  tournament: Tournament;
  onPatched: (t: Tournament) => void;
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<TournamentStatus>(tournament.status);
  const [regOpen, setRegOpen] = useState(tournament.registration_open);
  const [published, setPublished] = useState(tournament.is_published);
  const [featured, setFeatured] = useState(tournament.is_featured);
  const [bracket, setBracket] = useState(tournament.bracket_type ?? "round_robin");
  const [maxPlayers, setMaxPlayers] = useState(tournament.max_players?.toString() ?? "");
  const [deadline, setDeadline] = useState(tournament.registration_deadline?.slice(0, 16) ?? "");
  const [rulesText, setRulesText] = useState(tournament.rules_text ?? "");
  const [rulesUrl, setRulesUrl] = useState(tournament.rules_url ?? "");
  const [saving, setSaving] = useState(false);

  /** Load standings + players, compute top 3, write history + hall of fame */
  const archiveTournament = async () => {
    const [{ data: standingsRaw }, { data: playersRaw }] = await Promise.all([
      supabase.from("tournament_standings").select("*").eq("tournament_id", tournament.id),
      supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id),
    ]);

    const standings = sortStandings((standingsRaw ?? []) as StandingRow[]);
    const players = playersRaw ?? [];

    const top3 = standings.slice(0, 3);
    if (top3.length === 0) {
      throw new Error(
        "No standings found. Enter match results first so standings exist, then end the tournament.",
      );
    }

    const year = new Date().getFullYear();
    const display = (row: StandingRow) => {
      const p = players.find((x: { id: string }) => x.id === row.participant_id);
      const club = (row.club || p?.club || "").trim();
      return club || row.player_name || "Unknown";
    };
    const photoOf = (row: StandingRow) => {
      const p = players.find((x: { id: string }) => x.id === row.participant_id);
      return p?.photo_url || p?.club_logo_url || null;
    };

    const winner = display(top3[0]);
    const runnerUp = top3[1] ? display(top3[1]) : null;
    const third = top3[2] ? display(top3[2]) : null;

    // Avoid duplicate history for same tournament name + year
    await supabase
      .from("tournament_history")
      .delete()
      .eq("tournament_name", tournament.name)
      .eq("year", year);

    const { error: histErr } = await supabase.from("tournament_history").insert({
      tournament_name: tournament.name,
      winner,
      runner_up: runnerUp,
      third_place: third,
      year,
      banner_url: tournament.banner_url,
      prize_pool: tournament.prize_pool,
      sort_order: 0,
    });
    if (histErr) throw new Error("History save failed: " + histErr.message);

    // Remove old HoF rows for this tournament name (re-end safe)
    await supabase.from("hall_of_fame").delete().eq("tournament", tournament.name);

    const hofRows = top3.map((row, i) => ({
      player_name: display(row),
      achievement: PLACE_LABELS[i] || `${i + 1}th Place`,
      tournament: tournament.name,
      photo_url: photoOf(row),
      year,
      sort_order: i,
    }));

    const { error: hofErr } = await supabase.from("hall_of_fame").insert(hofRows);
    if (hofErr) throw new Error("Hall of Fame save failed: " + hofErr.message);

    return { winner, runnerUp, third, count: top3.length };
  };

  const save = async () => {
    setSaving(true);
    try {
      // When marking completed → archive first
      if (status === "completed" && tournament.status !== "completed") {
        const result = await archiveTournament();
        toast.success(
          `Tournament ended. History + Hall of Fame updated (${result.count} players). Winner: ${result.winner}`,
        );
      }

      const patch = {
        status,
        registration_open: status === "completed" || status === "archived" ? false : regOpen || status === "registration_open",
        is_published: published,
        is_featured: status === "completed" || status === "archived" ? false : featured,
        bracket_type: bracket,
        max_players: maxPlayers === "" ? null : Number(maxPlayers),
        registration_deadline: deadline ? new Date(deadline).toISOString() : null,
        rules_text: rulesText.trim() || null,
        rules_url: rulesUrl.trim() || null,
        ends_at:
          status === "completed" || status === "archived"
            ? new Date().toISOString()
            : tournament.ends_at,
      };

      const { data: row, error } = await supabase
        .from("tournaments")
        .update(patch)
        .eq("id", tournament.id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        return;
      }

      if (status !== "completed" || tournament.status === "completed") {
        toast.success("Settings saved");
      }

      void logActivity("tournament.settings", {
        tournament: tournament.name,
        status,
        archived: status === "completed",
      });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      qc.invalidateQueries({ queryKey: ["tournament_history"] });
      qc.invalidateQueries({ queryKey: ["hall_of_fame"] });
      if (row) onPatched(row as Tournament);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to end tournament");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-4 max-w-2xl space-y-5">
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Lifecycle
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as TournamentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {status === "completed" && tournament.status !== "completed" && (
              <p className="text-xs text-amber-300 flex items-start gap-1.5 mt-1">
                <Trophy className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Saving will write top 3 from standings into History and Hall of Fame.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tournament format</label>
            <Select value={bracket} onValueChange={setBracket}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRACKET_TYPES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Max players</label>
            <Input
              type="number"
              min={0}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Registration deadline</label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Visibility
        </h3>
        {[
          {
            label: "Registration open",
            desc: "Members can request to join",
            value: regOpen,
            set: setRegOpen,
          },
          {
            label: "Published",
            desc: "Visible on the public tournaments page",
            value: published,
            set: setPublished,
          },
          {
            label: "Featured",
            desc: "Pinned to the top of public listings",
            value: featured,
            set: setFeatured,
          },
        ].map((s) => (
          <label
            key={s.label}
            className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-3 cursor-pointer"
          >
            <span>
              <span className="block text-sm font-medium">{s.label}</span>
              <span className="block text-xs text-muted-foreground">{s.desc}</span>
            </span>
            <Switch checked={s.value} onCheckedChange={s.set} />
          </label>
        ))}
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Rules
        </h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Rules text</label>
          <Textarea
            rows={8}
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder="Write the tournament rules here…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Rules document URL (optional)</label>
          <Input
            type="url"
            value={rulesUrl}
            onChange={(e) => setRulesUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Save className="h-4 w-4 mr-1.5" />
            {status === "completed" && tournament.status !== "completed"
              ? "End tournament & save"
              : "Save settings"}
          </>
        )}
      </Button>
    </div>
  );
      }
