import { useState } from "react";
import { supabase, type Match, type Tournament } from "@/lib/supabase";
import { generateFixtures, bracketLabel } from "@/lib/brackets";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { matchdayName, type TournamentData } from "./shared";

interface Props {
  tournament: Tournament;
  data: TournamentData;
}

export function FixturesTab({ tournament, data }: Props) {
  const [busy, setBusy] = useState(false);
  const approved = data.players.filter((p) => p.status === "approved");

  const generate = async () => {
    if (approved.length < 2) return toast.error("Need at least 2 approved players");
    if (data.matches.length > 0 && !confirm("Regenerating clears all existing fixtures and results. Continue?")) return;
    setBusy(true);

    await supabase.from("matches").delete().eq("tournament_id", tournament.id);
    await supabase.from("matchdays").delete().eq("tournament_id", tournament.id);

    const specs = generateFixtures(tournament.bracket_type ?? "round_robin", approved.map((p) => p.id));

    // Persist matchdays first so matches can reference them
    const names = [...new Set(specs.map((s) => s.matchday))];
    const { data: mdRows, error: mdErr } = await supabase
      .from("matchdays")
      .insert(names.map((name, i) => ({ tournament_id: tournament.id, name, sort_order: i, is_published: true })))
      .select();
    if (mdErr) {
      setBusy(false);
      return toast.error(mdErr.message);
    }
    const mdId = new Map((mdRows ?? []).map((r: { id: string; name: string }) => [r.name, r.id]));

    const payload = specs.map((s, i) => ({
      tournament_id: tournament.id,
      matchday_id: mdId.get(s.matchday) ?? null,
      round: s.round,
      position: s.position ?? i + 1,
      home_id: s.home_id,
      away_id: s.away_id,
      played: false,
      status: "scheduled",
    }));
    const { error } = await supabase.from("matches").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${payload.length} fixtures generated (${bracketLabel(tournament.bracket_type)})`);
    void logActivity("fixtures.generate", { tournament: tournament.name, matches: payload.length });
    data.reload();
  };

  const setSide = async (m: Match, side: "home_id" | "away_id", value: string) => {
    const { error } = await supabase
      .from("matches")
      .update({ [side]: value === "tbd" ? null : value })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    data.reload();
  };

  const removeMatch = async (m: Match) => {
    const { error } = await supabase.from("matches").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    data.reload();
  };

  const addMatch = async () => {
    const maxRound = Math.max(0, ...data.matches.map((m) => m.round));
    const { error } = await supabase.from("matches").insert({
      tournament_id: tournament.id,
      round: maxRound || 1,
      position: data.matches.filter((m) => m.round === (maxRound || 1)).length + 1,
      home_id: null,
      away_id: null,
      played: false,
      status: "scheduled",
    });
    if (error) return toast.error(error.message);
    data.reload();
  };

  // Group matches by matchday (or round when no matchday)
  const groups = new Map<string, Match[]>();
  for (const m of data.matches) {
    const key = matchdayName(data.matchdays, m);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate} disabled={busy} className="bg-gradient-brand text-primary-foreground">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4 mr-1.5" />}
          {data.matches.length ? "Regenerate fixtures" : "Generate fixtures"}
        </Button>
        <Button variant="secondary" onClick={addMatch}>
          <Plus className="h-4 w-4 mr-1.5" /> Add match
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Format: {bracketLabel(tournament.bracket_type)} · {approved.length} players
        </span>
      </div>

      {data.matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No fixtures yet. Generate them automatically or add matches manually.
        </div>
      ) : (
        [...groups.entries()].map(([name, matches]) => (
          <div key={name} className="glass rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{name}</h3>
            {matches.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-xl border border-border/60 p-2">
                <span className="text-[10px] text-muted-foreground w-6 shrink-0">#{m.position}</span>
                <SideSelect value={m.home_id} players={approved} onChange={(v) => setSide(m, "home_id", v)} />
                <span className="text-xs text-muted-foreground shrink-0">
                  {m.played ? `${m.home_score} - ${m.away_score}` : "vs"}
                </span>
                <SideSelect value={m.away_id} players={approved} onChange={(v) => setSide(m, "away_id", v)} />
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => removeMatch(m)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function SideSelect({
  value, players, onChange,
}: {
  value: string | null;
  players: { id: string; player_name: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value ?? "tbd"} onValueChange={onChange}>
      <SelectTrigger className="h-8 flex-1 min-w-0 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tbd">TBD</SelectItem>
        {players.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.player_name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}