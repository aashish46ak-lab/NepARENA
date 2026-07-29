import { useEffect, useState } from "react";
import { AdminSection } from "./AdminUI";
import { supabase, type Profile, type Role } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

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

  const filtered = rows.filter((r) => !q || (r.username ?? "").toLowerCase().includes(q.toLowerCase()) || (r.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminSection title="Users &amp; roles" description="Only the Owner can grant or revoke moderator access.">
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username or name" className="pl-9" />
      </div>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
        <div className="grid gap-2">
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <Avatar className="h-10 w-10"><AvatarImage src={u.avatar_url ?? undefined} /><AvatarFallback className="bg-gradient-brand text-primary-foreground text-xs">{(u.username ?? "U").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{u.username ?? "unnamed"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.full_name ?? ""}</div>
                <div className="mt-1 flex gap-1 flex-wrap">
                  {u.roles.length === 0 && <Badge variant="outline" className="text-xs">member</Badge>}
                  {u.roles.map((r) => <Badge key={r} className="bg-brand/25 text-brand-glow capitalize">{r}</Badge>)}
                </div>
              </div>
              <div className="flex gap-1">
                {u.roles.includes("moderator")
                  ? <Button size="sm" variant="outline" onClick={() => revoke(u.id, "moderator")}>Revoke mod</Button>
                  : <Button size="sm" className="bg-gradient-brand text-primary-foreground" onClick={() => grant(u.id, "moderator")}>Make mod</Button>}
              </div>
            </div>
          ))}
        </div>}
    </AdminSection>
  );
}