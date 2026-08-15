/**
 * Search users and toggle blue-tick verification (platform super admin).
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  created_at?: string;
};

export async function adminSetProfileVerified(userId: string, verified: boolean) {
  const rpc = await supabase.rpc("admin_set_profile_verified", {
    p_user_id: userId,
    p_verified: verified,
  });
  if (!rpc.error) return rpc;
  return supabase.from("profiles").update({ is_verified: verified }).eq("id", userId);
}

export function UserVerificationPanel() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_user_verify_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, is_verified, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.warn(error.message);
        return [] as Row[];
      }
      return (data ?? []) as Row[];
    },
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(s) ||
        (u.username ?? "").toLowerCase().includes(s) ||
        u.id.toLowerCase().includes(s),
    );
  }, [users, q]);

  const toggle = async (u: Row) => {
    setBusyId(u.id);
    const next = !u.is_verified;
    try {
      const res = await adminSetProfileVerified(u.id, next);
      if ((res as { error?: { message?: string } }).error) {
        throw new Error((res as { error: { message: string } }).error.message);
      }
      toast.success(next ? "Verified" : "Verification removed");
      void qc.invalidateQueries({ queryKey: ["admin_user_verify_list"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update verification");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          className="pl-9"
          placeholder="Search by name, username…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {filtered.map((u) => {
          const name = u.full_name || u.username || "User";
          return (
            <div
              key={u.id}
              className="flex flex-col gap-3 border-b border-white/5 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link
                to="/members/$id"
                params={{ id: u.id }}
                className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium text-white">{name}</p>
                    {u.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-400" />}
                  </div>
                  <p className="truncate text-xs text-neutral-500">
                    {u.username ? `@${u.username}` : u.id.slice(0, 8)}
                  </p>
                </div>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-white/15"
                disabled={busyId === u.id}
                onClick={() => void toggle(u)}
              >
                {busyId === u.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                    {u.is_verified ? "Unverify" : "Verify"}
                  </>
                )}
              </Button>
            </div>
          );
        })}
        {!isLoading && !filtered.length && (
          <p className="p-6 text-sm text-neutral-500">No users match.</p>
        )}
      </div>
    </div>
  );
}
