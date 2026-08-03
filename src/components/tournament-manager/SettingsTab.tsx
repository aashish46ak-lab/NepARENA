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
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const STATUSES: { value: TournamentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "check_in", label: "Check-in" },
  { value: "live", label: "Live" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed (auto-archives to history & hall of fame)" },
  { value: "archived", label: "Archived" },
];

export function SettingsTab({
  tournament, onPatched,
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

  const save = async () => {
    setSaving(true);
    const patch = {
      status,
      registration_open: regOpen || status === "registration_open",
      is_published: published,
      is_featured: featured,
      bracket_type: bracket,
      max_players: maxPlayers === "" ? null : Number(maxPlayers),
      registration_deadline: deadline ? new Date(deadline).toISOString() : null,
      rules_text: rulesText.trim() || null,
      rules_url: rulesUrl.trim() || null,
    };
    const { data: row, error } = await supabase
      .from("tournaments")
      .update(patch)
      .eq("id", tournament.id)
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === "completed" ? "Completed — archived to history & hall of fame" : "Settings saved");
    void logActivity("tournament.settings", { tournament: tournament.name, ...patch });
    qc.invalidateQueries({ queryKey: ["tournaments"] });
    if (row) onPatched(row as Tournament);
  };

  return (
    <div className="pt-4 max-w-2xl space-y-5">
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as TournamentStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tournament format</label>
            <Select value={bracket} onValueChange={setBracket}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRACKET_TYPES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Max players</label>
            <Input type="number" min={0} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} placeholder="Unlimited" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Registration deadline</label>
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Visibility</h3>
        {[
          { label: "Registration open", desc: "Members can request to join", value: regOpen, set: setRegOpen },
          { label: "Published", desc: "Visible on the public tournaments page", value: published, set: setPublished },
          { label: "Featured", desc: "Pinned to the top of public listings", value: featured, set: setFeatured },
        ].map((s) => (
          <label key={s.label} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-3 cursor-pointer">
            <span>
              <span className="block text-sm font-medium">{s.label}</span>
              <span className="block text-xs text-muted-foreground">{s.desc}</span>
            </span>
            <Switch checked={s.value} onCheckedChange={s.set} />
          </label>
        ))}
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rules</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Rules text</label>
          <Textarea
            rows={8}
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder="Write the tournament rules here (shown on the public Rules tab)…"
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
          <p className="text-xs text-muted-foreground">
            Optional link to a full rules PDF/Google Doc. Public page shows text and/or this link.
          </p>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save settings</>}
      </Button>
    </div>
  );
            }
