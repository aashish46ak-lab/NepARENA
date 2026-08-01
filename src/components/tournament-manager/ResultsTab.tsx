import { useState } from "react";
import { supabase, type Match, type Tournament } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { matchdayName, playerName, type TournamentData } from "./shared";

export function ResultsTab({ tournament, data }: { tournament: Tournament; data: TournamentData }) {
  const groups = new Map<string, Match[]>();
  for (const m of data.matches) {
    const key = matchdayName(data.matchdays, m);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  const ready = data.matches.filter((m) => m.home_id && m.away_id);

  if (data.matches.length === 0) {
    return (
      <div className="pt-4">
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Generate fixtures first to enter results.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <p className="text-xs text-muted-foreground">
        {ready.length} of {data.matches.length} matches have both participants assigned. Standings update automatically when a result is saved.
      </p>
      {[...groups.entries()].map(([name, matches]) => (
        <div key={name} className="glass rounded-2xl p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{name}</h3>
          {matches.map((m) => (
            <ResultRow
              key={m.id}
              match={m}
              home={playerName(data.players, m.home_id)}
              away={playerName(data.players, m.away_id)}
              disabled={!m.home_id || !m.away_id}
              onSaved={() => {
                void logActivity("result.save", { tournament: tournament.name, match: m.id });
                data.reload();
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ResultRow({
  match, home, away, disabled, onSaved,
}: {
  match: Match;
  home: string;
  away: string;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [hs, setHs] = useState(match.home_score?.toString() ?? "");
  const [as, setAs] = useState(match.away_score?.toString() ?? "");
  const [ph, setPh] = useState(match.penalty_home?.toString() ?? "");
  const [pa, setPa] = useState(match.penalty_away?.toString() ?? "");
  const [et, setEt] = useState(match.extra_time ?? "");
  const [notes, setNotes] = useState(match.notes ?? "");
  const [status, setStatus] = useState(match.status ?? "scheduled");
  const [expanded, setExpanded] = useState(false);

  const save = async () => {
    const played = hs !== "" && as !== "";
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: hs === "" ? null : Number(hs),
        away_score: as === "" ? null : Number(as),
        penalty_home: ph === "" ? null : Number(ph),
        penalty_away: pa === "" ? null : Number(pa),
        extra_time: et || null,
        notes: notes || null,
        status,
        played: played || status === "finished",
      })
      .eq("id", match.id);
    if (error) return toast.error(error.message);
    toast.success("Result saved — standings updated");
    onSaved();
  };

  const clear = async () => {
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: null, away_score: null,
        penalty_home: null, penalty_away: null,
        extra_time: null, notes: null,
        status: "scheduled", played: false,
      })
      .eq("id", match.id);
    if (error) return toast.error(error.message);
    toast.success("Result cleared");
    onSaved();
  };

  return (
    <div className={`rounded-xl border border-border/60 p-3 space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="flex-1 min-w-0 truncate text-right text-sm font-medium">{home}</span>
        <Input className="w-14 h-8 text-center" inputMode="numeric" placeholder="-" value={hs}
          onChange={(e) => setHs(e.target.value)} disabled={disabled} />
        <span className="text-muted-foreground">-</span>
        <Input className="w-14 h-8 text-center" inputMode="numeric" placeholder="-" value={as}
          onChange={(e) => setAs(e.target.value)} disabled={disabled} />
        <span className="flex-1 min-w-0 truncate text-sm font-medium">{away}</span>
        {match.played && <Badge className="bg-emerald-500/20 text-emerald-300 shrink-0">played</Badge>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus} disabled={disabled}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="finished">Finished</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setExpanded((v) => !v)} disabled={disabled}>
          {expanded ? "Hide details" : "Pens / ET / notes"}
        </Button>
        <div className="ml-auto flex gap-1.5">
          {match.played && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clear} title="Clear result">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" className="h-8 bg-gradient-brand text-primary-foreground" onClick={save} disabled={disabled}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="grid gap-2 sm:grid-cols-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Pens</span>
            <Input className="h-8 w-14 text-center" inputMode="numeric" value={ph} onChange={(e) => setPh(e.target.value)} />
            <span className="text-muted-foreground">-</span>
            <Input className="h-8 w-14 text-center" inputMode="numeric" value={pa} onChange={(e) => setPa(e.target.value)} />
          </div>
          <Input className="h-8 text-xs" placeholder="Extra time (e.g. 3 - 1 AET)" value={et} onChange={(e) => setEt(e.target.value)} />
          <Input className="h-8 text-xs" placeholder="Match notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      )}
    </div>
  );
}