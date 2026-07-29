import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useMemberCount } from "@/hooks/useContent";
import { useEffect, useState } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const PAGE = 12;

export const Route = createFileRoute("/members")({
  head: () => ({ meta: [{ title: "Members — eFootball Nepal" }, { name: "description", content: "Meet the eFootball Nepal community." }] }),
  component: MembersPage,
});

function MembersPage() {
  const { data: count = 0 } = useMemberCount();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const load = async (from: number) => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    const rows = (data ?? []) as Profile[];
    setMembers((prev) => (from === 0 ? rows : [...prev, ...rows]));
    if (rows.length < PAGE) setDone(true);
    setLoading(false);
  };

  useEffect(() => { load(0); }, []);

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="text-6xl md:text-7xl font-bold text-gradient-brand">{count}</div>
          <div className="text-muted-foreground mt-2">registered members and counting</div>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m) => (
            <div key={m.id} className="glass rounded-xl p-4 flex items-center gap-3">
              <Avatar className="h-12 w-12"><AvatarImage src={m.avatar_url ?? undefined} /><AvatarFallback className="bg-gradient-brand text-primary-foreground text-xs">{(m.username ?? "U").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <div className="font-medium truncate">{m.username ?? "Player"}</div>
                <div className="text-xs text-muted-foreground truncate">{m.favourite_club ?? "—"}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">joined {new Date(m.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
        {!done && (
          <div className="mt-8 text-center">
            <Button variant="outline" className="border-brand/40" onClick={() => load(members.length)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "View more"}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}