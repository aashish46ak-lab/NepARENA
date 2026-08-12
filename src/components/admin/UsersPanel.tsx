import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AdminSection } from "./AdminUI";
import { supabase, type Profile, type Role } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Loader2, Search, MoreVertical, ShieldPlus, ShieldMinus, Trash2, Crown,
  Ban, CircleCheck, User as UserIcon, ExternalLink,
} from "lucide-react";
import { getDefaultOrganizer } from "@/lib/organizers";

interface Row extends Profile { roles: Role[] }
type Filter = "all" | "owners" | "moderators" | "members" | "suspended";

export function UsersPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [orgLabel, setOrgLabel] = useState("this organizer");

  const load = async () => {
    setLoading(true);
    try {
      const org = await getDefaultOrganizer();
      if (org) setOrgLabel(org.name);

      // Players = people who FOLLOWED this organizer (not all platform users)
      let profileIds: string[] = [];
      if (org?.id) {
        const { data: follows } = await supabase
          .from("organizer_followers")
          .select("user_id")
          .eq("organizer_id", org.id)
          .limit(500);
        profileIds = (follows ?? []).map((f: { user_id: string }) => f.user_id);
      }

      let profiles: Profile[] = [];
      if (profileIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .in("id", profileIds)
          .order("created_at", { ascending: false });
        profiles = (data ?? []) as Profile[];
      }

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const map = new Map<string, Role[]>();
      (roles ?? []).forEach((r: { user_id: string; role: Role }) => {
        map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]);
      });
      setRows(profiles.map((p) => ({ ...p, roles: map.get(p.id) ?? [] })));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const grant = async (u: Row, role: Role) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success(`${nameOf(u)} is now ${role === "owner" ? "an Owner" : role === "moderator" ? "a Moderator" : "a Member"} — applies at their next login`);
    void logActivity("role.grant", { user: nameOf(u), role });
    void load();
  };
  const revoke = async (u: Row, role: Role) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}`);
    void logActivity("role.revoke", { user: nameOf(u), role });
    void load();
  };
  const setMember = async (u: Row) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "moderator");
    if (error) return toast.error(error.message);
    toast.success(`${nameOf(u)} is now a regular member`);
    void logActivity("role.set_member", { user: nameOf(u) });
    void load();
  };
  const setSuspended = async (u: Row, suspended: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: suspended }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success(suspended ? "Member suspended — they are signed out and hidden" : "Member reactivated");
    void logActivity(suspended ? "user.suspend" : "user.reactivate", { user: nameOf(u) });
    void load();
  };
  const deleteUser = async (u: Row) => {
    if (!confirm(`Permanently delete ${nameOf(u)}? This removes their account and all their data.`)) return;
    const { error } = await supabase.rpc("admin_delete_user", { _user_id: u.id });
    if (error) return toast.error(error.message);
    toast.success("Account deleted");
    void logActivity("user.delete", { user: nameOf(u) });
    void load();
  };

  const filtered = rows.filter((r) => {
    if (q) {
      const needle = q.toLowerCase();
      const hay = [r.username, r.full_name, r.favourite_club].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    switch (filter) {
      case "owners": return r.roles.includes("owner");
      case "moderators": return r.roles.includes("moderator") && !r.roles.includes("owner");
      case "members": return r.roles.length === 0;
      case "suspended": return !!r.is_suspended;
      default: return true;
    }
  });

  return (
    <AdminSection title="Players (followers)"
      description={`Only users who followed ${orgLabel}. Platform-wide users are not mixed in.`}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or club" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="owners">Owners</SelectItem>
            <SelectItem value="moderators">Moderators</SelectItem>
            <SelectItem value="members">Members</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground self-center">{filtered.length} of {rows.length}</div>
      </div>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
        <div className="rounded-xl border border-border/60 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Player</TableHead>
                <TableHead className="hidden md:table-cell">Favourite club</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[52px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isOwnerRow = u.roles.includes("owner");
                const isMod = u.roles.includes("moderator");
                const name = nameOf(u);
                return (
                  <TableRow key={u.id} className={u.is_suspended ? "opacity-55" : undefined}>
                    <TableCell>
                      <Link to="/members/$id" params={{ id: u.id }} className="flex items-center gap-3 min-w-0 hover:opacity-90">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xs">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate flex items-center gap-1">
                            {u.full_name ?? name}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{u.username ? `@${u.username}` : "no username"}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.favourite_club ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {isOwnerRow ? <Badge className="bg-brand/25 text-brand-glow"><Crown className="h-3 w-3 mr-1" /> Owner</Badge>
                        : isMod ? <Badge className="bg-brand/20 text-brand-glow">Moderator</Badge>
                        : <span className="text-muted-foreground text-xs">Follower</span>}
                    </TableCell>
                    <TableCell>
                      {u.is_suspended
                        ? <Badge className="bg-destructive/20 text-destructive">Suspended</Badge>
                        : <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">Active</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-auto min-w-0 whitespace-nowrap">
                          {!isOwnerRow && (<>
                            {isMod
                              ? <DropdownMenuItem onClick={() => void revoke(u, "moderator")}><ShieldMinus className="h-4 w-4 mr-2" /> Remove moderator</DropdownMenuItem>
                              : <DropdownMenuItem onClick={() => void grant(u, "moderator")}><ShieldPlus className="h-4 w-4 mr-2" /> Make moderator</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => void grant(u, "owner")}><Crown className="h-4 w-4 mr-2" /> Make owner</DropdownMenuItem>
                            {isMod && (
                              <DropdownMenuItem onClick={() => void setMember(u)}>
                                <UserIcon className="h-4 w-4 mr-2" /> Set as member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {u.is_suspended
                              ? <DropdownMenuItem onClick={() => void setSuspended(u, false)}><CircleCheck className="h-4 w-4 mr-2 text-emerald-400" /> Reactivate</DropdownMenuItem>
                              : <DropdownMenuItem onClick={() => void setSuspended(u, true)}><Ban className="h-4 w-4 mr-2 text-amber-400" /> Suspend</DropdownMenuItem>}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void deleteUser(u)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete account
                            </DropdownMenuItem>
                          </>)}
                          {isOwnerRow && <DropdownMenuItem disabled>Owner account — protected</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No followers yet for this organizer.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>}
    </AdminSection>
  );
}

function nameOf(u: Profile): string {
  return u.username ?? u.full_name ?? "unnamed";
}
