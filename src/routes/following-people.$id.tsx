import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { listFollowingUsers } from "@/lib/user-follows";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { InlineStreak } from "@/components/StreakBadge";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/following-people/$id")({
  head: () => ({
    ...buildSeoHead({
      title: "Following — NepARENA",
      description: "People this player follows",
      path: "/following-people",
    }),
  }),
  component: FollowingPeoplePage,
});

function FollowingPeoplePage() {
  const { id } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["following_people_header", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", id)
        .maybeSingle();
      return data as { username: string | null; full_name: string | null } | null;
    },
  });

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["following_people_list", id],
    queryFn: () => listFollowingUsers(id, 100),
  });

  const name =
    profile?.full_name?.trim() || profile?.username?.trim() || "Player";

  const { data: streaks = {} } = useQuery({
    queryKey: ["following_streaks", id, people.map((p) => p.id).join(",")],
    enabled: people.length > 0,
    queryFn: async () => {
      const ids = people.map((p) => p.id);
      const { data } = await supabase
        .from("profiles")
        .select("id, login_streak")
        .in("id", ids);
      const map: Record<string, number> = {};
      for (const r of (data ?? []) as { id: string; login_streak?: number }[]) {
        map[r.id] = Number(r.login_streak ?? 0);
      }
      return map;
    },
  });

  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-neutral-400">
          <Link to="/members/$id" params={{ id }}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Profile
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <Users className="h-5 w-5 text-neutral-400" />
          Following
        </h1>
        <p className="mt-1 text-sm text-neutral-500">People {name} follows</p>

        <div className="mt-6 space-y-1 rounded-2xl border border-white/10 bg-white/[0.02]">
          {isLoading && (
            <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>
          )}
          {!isLoading && people.length === 0 && (
            <p className="p-6 text-center text-sm text-neutral-500">Not following anyone yet</p>
          )}
          {people.map((u) => (
            <Link
              key={u.id}
              to="/members/$id"
              params={{ id: u.id }}
              className="flex items-center gap-3 px-3 py-3 transition hover:bg-white/[0.04]"
            >
              <Avatar className="h-11 w-11">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback>
                  {(u.full_name || u.username || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                  {u.full_name || u.username || "Player"}
                  <InlineStreak streak={streaks[u.id]} />
                </p>
                {u.username && (
                  <p className="truncate text-xs text-neutral-500">@{u.username}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
