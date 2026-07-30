import { useCallback, useEffect, useState } from "react";
import { supabase, type Tournament, type TournamentParticipant, type Match } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X, Loader2, Shuffle, Save, Trash2, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Standing {
  participant_id: string; player_name: string; club: string | null;
  played: number; won: number; drawn: number; lost: number;
  goals_for: number; goals_against: number; goal_diff: number; points: number;
}

export function TournamentManager({ tournament, open, onOpenChange, tab = "participants" }: {
  tournament: Tournament; open: boolean; onOpenChange: (v: boolean) => void; tab?: string;
}) {
  const qc = useQueryClient();
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClub, setNewClub] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [p, m, s] = await Promise.all([
      supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id).order("created_at"),
      supabase.from("matches").select("*").eq("tournament_id", tournament.id).order("round").order("position"),
      supabase.from("tournament_standings").select("*").eq("tournament_id", tournament.id),
    ]);
    setParticipants((p.data ?? []) as TournamentParticipant[]);
    setMatches((m.data ?? []) as Match[]);
    const rows = ((s.data ?? []) as Standing[]).sort(
      (a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for || a.player_name.localeCompare(b.player_name),
    );
    setStandings(rows);
    setLoading(false);
  }, [tournament.id]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const nameOf = (id: string | null) => participants.find((p) => p.id === id)?.player_name ?? "TBD";
  const approved = participants.filter((p) => p.status === "approved");
  const anyPlayed = matches.some((m) => m.played);

  const setStatus = async (id: string, status: TournamentParticipant["status"]) => {
    const { error } = await supabase.from("tournament_participants").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tournaments"] });
    load();
  };
  const removeParticipant = async (id: string) => {
    const { error } = await supabase.from("tournament_participants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tournaments"] });
    load();
  };
  const addParticipant = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournament.id, player_name: newName.trim(), club: newClub.trim() || null, status: "approved",
    });
    if (error) return toast.error(error.message);
    setNewName(""); setNewClub("");
    qc.invalidateQueries({ queryKey: ["tournaments"] });
    load();
  };

  const generateFixtures = async () => {
    if (approved.length < 2) return toast.error("Approve at least two players first.");
    if (anyPlayed && !confirm("Some results are already recorded. Regenerating deletes every fixture and result. Continue?")) return;
    setBusy(true);
    await supabase.from("matches").delete().eq("tournament_id", tournament.id);

    // single round-robin (circle method)
    const ids: (string | null)[] = approved.map((p) => p.id);
    if (ids.length % 2 === 1) ids.push(null); // bye
    const n = ids.length;
    const rounds: { home: string | null; away: string | null }[][] = [];
    let arr = [...ids];
    for (let r = 0; r < n - 1; r++) {
      const pairs: { home: string | null; away: string | null }[] = [];
      for (let i = 0; i < n / 2; i++) {
        const home = arr[i], away = arr[n - 1 - i];
        if (home && away) pairs.push(r % 2 === 0 ? { home, away } : { home: away, away: home });
      }
      rounds.push(pairs);
      arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
    }

    const payload = rounds.flatMap((pairs, ri) =>
      pairs.map((p, pi) => ({
        tournament_id: tournament.id, round: ri + 1, position: pi + 1,
        home_id: p.home, away_id: p.away,
      })),
    );
    const { error } = await supabase.from("matches").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${payload.length} fixtures generated`);
    load();
  };

  const saveResult = async (m: Match, home: string, away: string) => {
    const hs = home === "" ? null : Number(home);
    const as = away === "" ? null : Number(away);
    const { error } = await supabase.from("matches")
      .update({ home_score: hs, away_score: as, played: hs !== null && as !== null })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Result saved");
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Manage · {tournament.name}</DialogTitle></DialogHeader>
        {loading ? <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <Tabs defaultValue={tab}>
            <TabsList className="glass">
              <TabsTrigger value="participants">Players ({participants.length})</TabsTrigger>
              <TabsTrigger value="fixtures">Fixtures ({matches.length})</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="standings">Standings</TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input className="max-w-[200px]" placeholder="Player name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Input className="max-w-[180px]" placeholder="Club (optional)" value={newClub} onChange={(e) => setNewClub(e.target.value)} />
                <Button className="bg-gradient-brand text-primary-foreground" onClick={addParticipant}><UserPlus className="h-4 w-4 mr-1.5" /> Add</Button>
              </div>
              {participants.length === 0 ? <div className="text-sm text-muted-foreground">No registrations yet.</div> : (
                <div className="rounded-lg border border-border/60 overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Player</TableHead><TableHead>Club</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {participants.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.player_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.club ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={p.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : p.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-muted"}>{p.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {p.status !== "approved" && <Button size="icon" variant="ghost" className="h-8 w-8" title="Approve" onClick={() => setStatus(p.id, "approved")}><Check className="h-4 w-4 text-emerald-400" /></Button>}
                            {p.status !== "rejected" && <Button size="icon" variant="ghost" className="h-8 w-8" title="Reject" onClick={() => setStatus(p.id, "rejected")}><X className="h-4 w-4" /></Button>}
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Remove" onClick={() => removeParticipant(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fixtures" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-muted-foreground">Single round-robin across {approved.length} approved players.</div>
                <Button className="bg-gradient-brand text-primary-foreground" onClick={generateFixtures} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shuffle className="h-4 w-4 mr-1.5" /> {matches.length ? "Regenerate fixtures" : "Generate fixtures"}</>}
                </Button>
              </div>
              {matches.length === 0 ? <div className="text-sm text-muted-foreground">No fixtures yet.</div> : (
                <div className="space-y-4">
                  {[...new Set(matches.map((m) => m.round))].map((r) => (
                    <div key={r}>
                      <div className="text-xs uppercase tracking-widest text-brand-glow mb-2">Round {r}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {matches.filter((m) => m.round === r).map((m) => (
                          <div key={m.id} className="rounded-lg border border-border/60 p-2.5 text-sm flex items-center justify-between gap-2">
                            <span className="truncate">{nameOf(m.home_id)}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{m.played ? `${m.home_score} - ${m.away_score}` : "vs"}</span>
                            <span className="truncate text-right">{nameOf(m.away_id)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="mt-4 space-y-2">
              {matches.length === 0 ? <div className="text-sm text-muted-foreground">Generate fixtures first.</div> :
                matches.map((m) => <ResultRow key={m.id} match={m} nameOf={nameOf} onSave={saveResult} />)}
            </TabsContent>

            <TabsContent value="standings" className="mt-4">
              {standings.length === 0 ? <div className="text-sm text-muted-foreground">No approved players yet.</div> : (
                <div className="rounded-lg border border-border/60 overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="hover:bg-transparent">
                      <TableHead className="w-8">#</TableHead><TableHead>Player</TableHead>
                      <TableHead className="text-center">P</TableHead><TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">D</TableHead><TableHead className="text-center">L</TableHead>
                      <TableHead className="text-center">GD</TableHead><TableHead className="text-center">Pts</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {standings.map((s, i) => (
                        <TableRow key={s.participant_id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.player_name}{s.club ? <span className="text-xs text-muted-foreground"> · {s.club}</span> : null}</TableCell>
                          <TableCell className="text-center">{s.played}</TableCell>
                          <TableCell className="text-center">{s.won}</TableCell>
                          <TableCell className="text-center">{s.drawn}</TableCell>
                          <TableCell className="text-center">{s.lost}</TableCell>
                          <TableCell className="text-center">{s.goal_diff}</TableCell>
                          <TableCell className="text-center font-bold text-brand-glow">{s.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-3 text-xs text-muted-foreground">
                    Marking this tournament <strong>Completed</strong> archives the top three into Tournament History and the Hall of Fame automatically.
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({ match, nameOf, onSave }: {
  match: Match; nameOf: (id: string | null) => string;
  onSave: (m: Match, home: string, away: string) => Promise<void>;
}) {
  const [home, setHome] = useState(match.home_score?.toString() ?? "");
  const [away, setAway] = useState(match.away_score?.toString() ?? "");
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5">
      <div className="text-[10px] text-muted-foreground w-8 shrink-0">R{match.round}</div>
      <div className="flex-1 truncate text-sm text-right">{nameOf(match.home_id)}</div>
      <Input className="w-14 text-center" inputMode="numeric" value={home} onChange={(e) => setHome(e.target.value)} />
      <span className="text-muted-foreground">-</span>
      <Input className="w-14 text-center" inputMode="numeric" value={away} onChange={(e) => setAway(e.target.value)} />
      <div className="flex-1 truncate text-sm">{nameOf(match.away_id)}</div>
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Save result" onClick={() => onSave(match, home, away)}>
        <Save className="h-4 w-4" />
      </Button>
    </div>
  );
}