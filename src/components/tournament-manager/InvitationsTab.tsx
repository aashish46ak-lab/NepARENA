import { useState } from "react";
import { supabase, type Profile, type Tournament } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MailPlus, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { TournamentData } from "./shared";

const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-300 border-amber-500/40",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  rejected: "text-destructive border-destructive/40",
  expired: "text-muted-foreground",
};

export function InvitationsTab({ tournament, data }: { tournament: Tournament; data: TournamentData }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const participantIds = new Set(data.players.map((p) => p.user_id).filter(Boolean));
  const invitedIds = new Set(data.invitations.filter((i) => i.status === "pending").map((i) => i.user_id));

  const search = async (needle: string) => {
    setQ(needle);
    if (!needle.trim()) return setResults([]);
    setSearching(true);
    const { data: rows } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${needle}%,full_name.ilike.%${needle}%`)
      .eq("is_suspended", false)
      .limit(10);
    setResults(((rows ?? []) as Profile[]).filter((p) => !participantIds.has(p.id) && !invitedIds.has(p.id)));
    setSearching(false);
  };

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (selected.size === 0) return;
    setSending(true);
    const payload = [...selected].map((uid) => ({
      tournament_id: tournament.id,
      user_id: uid,
      invited_by: user?.id ?? null,
      status: "pending" as const,
    }));
    const { error } = await supabase.from("tournament_invitations").upsert(payload, {
      onConflict: "tournament_id,user_id",
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`${payload.length} invitation${payload.length > 1 ? "s" : ""} sent`);
    void logActivity("invitations.send", { tournament: tournament.name, count: payload.length });
    setSelected(new Set());
    setResults([]);
    setQ("");
    data.reload();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("tournament_invitations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Invitation cancelled");
    data.reload();
  };

  return (
    <div className="space-y-5 pt-4">
      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MailPlus className="h-4 w-4" /> Invite registered members
        </h3>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Search by username or name" className="pl-9" />
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
              <label key={m.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5 cursor-pointer hover:bg-white/5">
                <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m.id)} />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-brand text-primary-foreground text-[10px]">
                    {(m.username ?? "P").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{m.full_name ?? m.username}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.username ? `@${m.username}` : ""} {m.favourite_club ? `· ${m.favourite_club}` : ""}</div>
                </div>
              </label>
            ))}
            <Button onClick={send} disabled={sending || selected.size === 0} className="bg-gradient-brand text-primary-foreground">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><MailPlus className="h-4 w-4 mr-1.5" /> Send {selected.size || ""} invitation{selected.size === 1 ? "" : "s"}</>}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sent invitations ({data.invitations.length})
        </h3>
        {data.invitations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            No invitations sent yet.
          </div>
        ) : (
          data.invitations.map((inv) => {
            const prof = data.profiles.get(inv.user_id);
            return (
              <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={prof?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xs">
                    {(prof?.username ?? "P").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{prof?.full_name ?? prof?.username ?? "Member"}</div>
                  <div className="text-xs text-muted-foreground">
                    {prof?.username ? `@${prof.username} · ` : ""}{new Date(inv.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_STYLE[inv.status]}>{inv.status}</Badge>
                {inv.status === "pending" && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => cancel(inv.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}