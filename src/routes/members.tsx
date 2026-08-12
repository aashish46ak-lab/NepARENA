import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useEffect, useState } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { getOrganizerContext } from "@/lib/organizer-context";
import { getDefaultOrganizer } from "@/lib/organizers";

const PAGE = 20;

export const Route = createFileRoute("/members")({
  head: () => ({
    ...buildSeoHead({
      title: "Members",
      description: "Players who follow this organizer on NepARENA.",
      path: "/members",
    }),
  }),
  component: MembersPage,
});

function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const load = async (from: number) => {
    setLoading(true);
    try {
      const ctx = getOrganizerContext();
      let organizerId = ctx?.id ?? null;
      if (!organizerId) {
        const def = await getDefaultOrganizer();
        organizerId = def?.id ?? null;
        if (def) setOrgName(def.name);
      } else if (ctx?.name) {
        setOrgName(ctx.name);
      }

      if (!organizerId) {
        setMembers([]);
        setDone(true);
        return;
      }

      // Only followers of THIS organizer — not every platform user
      const { data: follows, count } = await supabase
        .from("organizer_followers")
        .select("user_id", { count: "exact" })
        .eq("organizer_id", organizerId)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

      if (from === 0) setTotal(count ?? 0);

      const ids = (follows ?? []).map((f: { user_id: string }) => f.user_id);
      if (ids.length === 0) {
        if (from === 0) setMembers([]);
        setDone(true);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, favourite_club, bio, created_at")
        .in("id", ids);

      const map = new Map(
        ((profiles ?? []) as Profile[]).map((p) => [p.id, p]),
      );
      const rows = ids
        .map((id) => map.get(id))
        .filter(Boolean) as Profile[];

      setMembers((prev) => (from === 0 ? rows : [...prev, ...rows]));
      if (ids.length < PAGE) setDone(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(0);
  }, []);

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-10 text-center">
          <div className="text-5xl font-bold text-gradient-brand md:text-6xl">
            {total || members.length}
          </div>
          <div className="mt-2 text-muted-foreground">
            {orgName ? `${orgName} followers` : "Organizer followers"}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Only people who follow this organizer appear here
          </p>
        </div>

        <ol className="space-y-2">
          {members.map((m, index) => {
            const name = m.full_name?.trim() || m.username?.trim() || "Player";
            return (
              <li key={m.id}>
                <Link
                  to="/members/$id"
                  params={{ id: m.id }}
                  className="glass flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-accent/25 sm:px-4 sm:py-3"
                >
                  <span className="w-7 shrink-0 text-right text-sm font-bold tabular-nums text-muted-foreground">
                    {index + 1}.
                  </span>
                  <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border/50">
                    <AvatarImage
                      src={m.avatar_url ?? undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-brand text-xs text-primary-foreground">
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{name}</div>
                    {m.favourite_club && (
                      <div className="truncate text-xs text-muted-foreground">
                        {m.favourite_club}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>

        {members.length === 0 && !loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No followers yet. Share the organizer page so players can follow.
          </p>
        )}

        {!done && members.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => void load(members.length)}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}

        {loading && members.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </PageShell>
  );
}
