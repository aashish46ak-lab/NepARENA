import { useEffect, useState } from "react";
import { AdminSection } from "./AdminUI";
import { supabase, type Profile, type Role } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Search, MoreVertical, ShieldPlus, ShieldMinus, Trash2, Crown } from "lucide-react";

interface Row extends Profile { roles: Role[] }

export function UsersPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, Role[]>();
    (roles ?? []).forEach((r: { user_id: string; role: Role }) => {
      map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]);
    });
    setRows(((profiles ?? []) as Profile[]).map((p) => ({ ...p, roles: map.get(p.id) ?? [] })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grant = async (userId: string, role: Role) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success(`Granted ${role}`); load();
  };
  const revoke = async (userId: string, role: Role) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}`); load();
  };
  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`Permanently delete ${name}? This removes their account and all their data.`)) return;
    const { error } = await supabase.rpc("admin_delete_user", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Account deleted"); load();
  };

  const filtered = rows.filter((r) => !q || (r.username ?? "").toLowerCase().includes(q.toLowerCase()) || (r.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminSection title="Users &amp; roles" description="Only the Owner can grant or revoke moderator access and delete accounts.">
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username or name" className="pl-9" />
      </div>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
        <div className="rounded-xl border border-border/60 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead className="hidden md:table-cell">Favourite club</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[52px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isOwnerRow = u.roles.includes("owner");
                const isMod = u.roles.includes("moderator");
                const name = u.username ?? u.full_name ?? "unnamed";
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xs">{name.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{name}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.full_name ?? ""}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.favourite_club ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {isOwnerRow ? <Badge className="bg-brand/25 text-brand-glow"><Crown className="h-3 w-3 mr-1" /> Owner</Badge>
                        : isMod ? <Badge className="bg-brand/20 text-brand-glow">Moderator</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-auto min-w-0">
                          {!isOwnerRow && (isMod
                            ? <DropdownMenuItem onClick={() => revoke(u.id, "moderator")}><ShieldMinus className="h-4 w-4 mr-2" /> Remove moderator</DropdownMenuItem>
                            : <DropdownMenuItem onClick={() => grant(u.id, "moderator")}><ShieldPlus className="h-4 w-4 mr-2" /> Make moderator</DropdownMenuItem>)}
                          {!isOwnerRow && <DropdownMenuSeparator />}
                          {!isOwnerRow && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteUser(u.id, name)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete account
                            </DropdownMenuItem>
                          )}
                          {isOwnerRow && <DropdownMenuItem disabled>Owner account</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>}
    </AdminSection>
  );
}