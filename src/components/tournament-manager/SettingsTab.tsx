import { useState } from "react";
import {
  supabase,
  type Tournament,
  type TournamentStatus,
} from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Trophy } from "lucide-react";
import { toast } from "sonner";
import { archiveTournamentToHistory } from "./shared";
import { notifyTournamentPlayers } from "@/lib/matches-pending";
import {
  parseFormatConfig,
  bracketTypeFromPreset,
  type FormatConfig,
} from "@/lib/tournament-format";
import { FormatBuilder } from "./FormatBuilder";

const STATUSES: { value: TournamentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "check_in", label: "Check-in" },
  { value: "live", label: "Live" },
  { value: "ongoing", label: "Ongoing" },
  {
    value: "completed",
    label: "Completed (saves History + Hall of Fame)",
  },
  { value: "archived", label: "Archived" },
];

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
  const [format, setFormat] = useState<FormatConfig>(() =>
    parseFormatConfig(tournament.format_config, tournament.bracket_type),
  );
  const [maxPlayers, setMaxPlayers] = useState(
    tournament.max_players?.toString() ?? "",
  );
  const [deadline, setDeadline] = useState(
    tournament.registration_deadline?.slice(0, 16) ?? "",
  );
  const [rulesText, setRulesText] = useState(tournament.rules_text ?? "");
  const [rulesUrl, setRulesUrl] = useState(tournament.rules_url ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (status === "completed" && tournament.status !== "completed") {
        const result = await archiveTournamentToHistory(tournament);
        if (result.warning) {
          toast.warning(
            "Tournament ended. " + result.warning + " Winner: " + result.winner,
          );
        } else {
          toast.success(
            "Tournament ended. Winner: " +
              result.winner +
              " (" +
              result.count +
              " on podium → History + Hall of Fame)",
          );
        }
      }

      const nextRegOpen =
        status === "completed" || status === "archived"
          ? false
          : regOpen || status === "registration_open";

      const patch = {
        status,
        registration_open: nextRegOpen,
        is_published: published,
        is_featured:
          status === "completed" || status === "archived" ? false : featured,
        bracket_type: bracketTypeFromPreset(format.preset),
        format_config: format as unknown as Record<string, unknown>,
        max_players: maxPlayers === "" ? null : Number(maxPlayers),
        registration_deadline: deadline
          ? new Date(deadline).toISOString()
          : null,
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

      const link = "/tournaments/" + tournament.id;

      if (nextRegOpen && !tournament.registration_open) {
        try {
          await notifyTournamentPlayers(
            tournament.id,
            "Registration open",
            tournament.name + " — registration is now open. Request to join!",
            link,
          );
        } catch {
          /* ignore */
        }
      }

      if (tournament.registration_open && !nextRegOpen) {
        try {
          await notifyTournamentPlayers(
            tournament.id,
            "Registration closed",
            tournament.name + " — registration has been closed.",
            link,
          );
        } catch {
          /* ignore */
        }
      }

      if (
        (status === "live" || status === "ongoing") &&
        tournament.status !== "live" &&
        tournament.status !== "ongoing"
      ) {
        try {
          await notifyTournamentPlayers(
            tournament.id,
            "Tournament is live",
            tournament.name +
              " is now live. Check your fixtures and pending matches!",
            link,
          );
        } catch {
          /* ignore */
        }
      }

      if (status === "completed" && tournament.status !== "completed") {
        try {
          await notifyTournamentPlayers(
            tournament.id,
            "Tournament ended",
            tournament.name +
              " has ended. Check standings, history and Hall of Fame.",
            link,
          );
        } catch {
          /* ignore */
        }
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
      toast.error(
        e instanceof Error ? e.message : "Failed to end tournament",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-4 max-w-2xl space-y-5">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-100/90">
        <p className="font-semibold text-sky-200">Quick setup</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-neutral-300">
          <li>Set <strong>Tournament status</strong> (e.g. Registration Open)</li>
          <li>Pick a simple format below (or leave default)</li>
          <li>Save — then generate fixtures on the Fixtures tab</li>
        </ol>
      </div>
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Competition format
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Start simple: Groups + Knockout is fine for most events. Advanced options stay optional.
        </p>
        <FormatBuilder value={format} onChange={setFormat} />
        <p className="text-[11px] text-muted-foreground">
          Existing fixtures are not changed until you regenerate them on the
          Fixtures tab. League formats stay fully supported.
        </p>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Lifecycle
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tournament status</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as TournamentStatus)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Choose status…" />
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
                Saving will write top 3 from standings into History and Hall of
                Fame.
              </p>
            )}
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
              <span className="block text-xs text-muted-foreground">
                {s.desc}
              </span>
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
          <label className="text-sm font-medium">
            Rules document URL (optional)
          </label>
          <Input
            type="url"
            value={rulesUrl}
            onChange={(e) => setRulesUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <Button
        onClick={save}
        disabled={saving}
        className="bg-gradient-brand text-primary-foreground"
      >
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
