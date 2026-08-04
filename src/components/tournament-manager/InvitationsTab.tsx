import { useState } from "react";
import { supabase, type Profile, type Tournament } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { TournamentData } from "./shared";

export function InvitationsTab({ tournament, data }: { tournament: Tournament; data: TournamentData }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const participantIds = new Set(data.players.map((p) => p.user_id).filter(Boolean));

  const search = async (needle: string) => {
    setQ(needle);
    if (!needle.trim()) return setResults([]);
    setSearching(true);
    const { data: rows } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${needle}%,full_name.ilike.%${needle}%,favourite_club.ilike.%${needle}%`)
      .eq("is_suspended", false)
      .limit(10);
    setResults(((rows ?? []) as Profile[]).filter((p) => !participantIds.has(p.id)));
    setSearching(false);
  };

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Direct add — no invitation, no email, straight into the tournament as approved.
  const addSelected = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    const chosen = results.filter((r) => selected.has(r.id));
    const payload = chosen.map((p) => ({
      tournament_id: tournament.id,
      user_id: p.id,
      player_name: p.full_name || p.username || "Player",
      club: p.favourite_club,
      photo_url: p.avatar_url,
      status: "approved" as const,
    }));
    const { error } = await supabase.from("tournament_participants").insert(payload);
    setAdding(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "One or more are already participants" : error.message);
    toast.success(`${payload.length} player${payload.length > 1 ? "s" : ""} added`);
    void logActivity("players.add_direct", { tournament: tournament.name, count: payload.length });
    setSelected(new Set());
    setResults((r) => r.filter((p) => !selected.has(p.id)));
    setQ("");
    data.reload();
  };

  const addOne = async (p: Profile) => {
    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournament.id,
      user_id: p.id,
      player_name: p.full_name || p.username || "Player",
      club: p.favourite_club,
      photo_url: p.avatar_url,
      status: "approved",
    });
    if (error) return toast.error(error.message.includes("duplicate") ? "Already a participant" : error.message);
    toast.success(`${p.full_name || p.username} added`);
    void logActivity("players.add_direct", { tournament: tournament.name, count: 1 });
    setResults((r) => r.filter((x) => x.id !== p.id));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(p.id);
      return next;
    });
    data.reload();
  };

  return (
    <div className="space-y-5 pt-4">
      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserPlus className="h-4 w-4" /> Add registered players directly
        </h3>
        <p className="text-xs text-muted-foreground">
          Search and add — players are added straight into the tournament as approved. No invitation link is sent.
        </p>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Search by username, name or club" className="pl-9" />
        </div>
        {searching && <Loader2 className="h-4 w-4 animate-spin" />}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={selected.size === results.length && results.length > 0}
                onCheckedChange={(v) => setSelected(v ? new Set(results.map((r) => r.id)) : new Set())}
              />
              Select all ({results.length})
            </div>
            {results.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5">
                <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m.id)} />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-brand text-primary-foreground text-[10px]">
                    {(m.favourite_club || m.full_name || m.username || "P").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{m.full_name ?? m.username}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.username ? `@${m.username}` : ""} {m.favourite_club ? `· ${m.favourite_club}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => addOne(m)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            ))}
            <Button onClick={addSelected} disabled={adding || selected.size === 0} className="bg-gradient-brand text-primary-foreground">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1.5" /> Add {selected.size || ""} selected player{selected.size === 1 ? "" : "s"}</>}
            </Button>
          </div>
        )}
        {q && !searching && results.length === 0 && (
          <p className="text-xs text-muted-foreground">No matching members, or they're already in this tournament.</p>
        )}
      </div>
    </div>
  );
}
