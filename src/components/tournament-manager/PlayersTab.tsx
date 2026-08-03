import { useState } from "react";
import { supabase, type Profile, type Tournament, type TournamentParticipant } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Check, Loader2, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import type { TournamentData } from "./shared";

interface Props {
  tournament: Tournament;
  data: TournamentData;
}

export function PlayersTab({ tournament, data }: Props) {
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const statsOf = (id: string) => data.standings.find((s) => s.participant_id === id);

  const setStatus = async (p: TournamentParticipant, status: "approved" | "rejected") => {
    const { error } = await supabase.from("tournament_participants").update({ status }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? `\( {p.player_name} approved` : ` \){p.player_name} rejected`);
    void logActivity(`player.${status}`, { tournament: tournament.name, player: p.player_name });
    data.reload();
  };

  const remove = async (p: TournamentParticipant) => {
    if (!confirm(`Remove ${p.player_name} from this tournament?`)) return;
    const { error } = await supabase.from("tournament_participants").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Player removed");
    data.reload();
  };

  const filtered = data.players.filter((p) => {
    const club = p.club ?? "";
    return !q || `${p.player_name} ${club}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by club or player name" className="pl-9" />
        </div>
        <Button className="bg-gradient-brand text-primary-foreground" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Add player
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No players yet. Add players manually or invite registered members.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const prof = p.user_id ? data.profiles.get(p.user_id) : undefined;
            const avatar = p.photo_url ?? prof?.avatar_url ?? null;
            const club = p.club ?? prof?.favourite_club ?? null;
            const playerName = p.player_name;
            const st = statsOf(p.id);

            return (
              <div key={p.id} className="glass rounded-xl p-3 flex flex-wrap items-center gap-3">
                {/* (Logo) Club name + Player name */}
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={avatar ?? undefined} />
                  <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xs">
                    {(club || playerName).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-brand-glow truncate">
                    {club || "No club"}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {playerName}
                  </div>
                </div>

                <Badge
                  variant={p.status === "approved" ? "default" : "outline"}
                  className={
                    p.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : p.status === "rejected"
                        ? "text-destructive border-destructive/40"
                        : "text-amber-300 border-amber-500/40"
                  }
                >
                  {p.status}
                </Badge>

                {st && (
                  <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>P{st.played}</span>
                    <span className="text-emerald-300">W{st.won}</span>
                    <span>D{st.drawn}</span>
                    <span className="text-rose-300">L{st.lost}</span>
                    <span className="font-bold text-foreground">{st.points} pts</span>
                  </div>
                )}

                <div className="flex gap-1.5 ml-auto">
                  {p.status === "pending" && (
                    <>
                      <Button size="sm" className="bg-emerald-600/80 hover:bg-emerald-600" onClick={() => setStatus(p, "approved")}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(p, "rejected")}>
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {p.status === "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(p, "approved")}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddPlayerDialog open={addOpen} onOpenChange={setAddOpen} tournament={tournament} data={data} />
    </div>
  );
}

function AddPlayerDialog({
  open, onOpenChange, tournament, data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tournament: Tournament;
  data: TournamentData;
}) {
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
  const [busy, setBusy] = useState(false);
  const [memberQ, setMemberQ] = useState("");
  const [members, setMembers] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const participantIds = new Set(data.players.map((p) => p.user_id).filter(Boolean));

  const addManual = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournament.id,
      player_name: name.trim(),
      club: club.trim() || null,
      status: "approved",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${name} added`);
    setName("");
    setClub("");
    data.reload();
  };

  const searchMembers = async (needle: string) => {
    setMemberQ(needle);
    setSearching(true);
    const { data: rows } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%\( {needle}%,full_name.ilike.% \){needle}%,favourite_club.ilike.%${needle}%`)
      .eq("is_suspended", false)
      .limit(8);
    setMembers(((rows ?? []) as Profile[]).filter((p) => !participantIds.has(p.id)));
    setSearching(false);
  };

  const addMember = async (p: Profile) => {
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
    setMembers((m) => m.filter((x) => x.id !== p.id));
    data.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add player</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manual entry</p>
          <div className="flex gap-2">
            <Input placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Club name" value={club} onChange={(e) => setClub(e.target.value)} />
          </div>
          <Button size="sm" onClick={addManual} disabled={busy || !name.trim()} className="bg-gradient-brand text-primary-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1.5" /> Add manually</>}
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Add registered member
          </p>
          <Input
            placeholder="Search by name, username or club"
            value={memberQ}
            onChange={(e) => searchMembers(e.target.value)}
          />
          {searching && <Loader2 className="h-4 w-4 animate-spin" />}
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-brand text-primary-foreground text-[10px]">
                    {(m.favourite_club || m.full_name || m.username || "P").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-brand-glow truncate">{m.favourite_club || "No club"}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.full_name || m.username}</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => addMember(m)}>Add</Button>
              </div>
            ))}
            {memberQ && !searching && members.length === 0 && (
              <p className="text-xs text-muted-foreground">No matching members.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
                      }
