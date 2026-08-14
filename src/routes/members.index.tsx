/**
 * Members directory — separate page with search.
 * Clicking a user opens their profile (/members/$id).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { buildSeoHead } from "@/lib/seo";
import { Search, Users, Loader2 } from "lucide-react";
import { InlineStreak } from "@/components/StreakBadge";

export const Route = createFileRoute("/members/")({
  head: () => ({
    ...buildSeoHead({
      title: "Members — NepARENA",
      description: "Browse registered players on NepARENA.",
      path: "/members",
    }),
  }),
  component: MembersIndexPage,
});

type MemberRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  favourite_club: string | null;
  current_streak?: number | null;
};

function MembersIndexPage() {
  const [q, setQ] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members_directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, favourite_club, current_streak")
        .order("display_name", { ascending: true })
        .limit(200);
      if (error) {
        console.warn("members list", error.message);
        return [] as MemberRow[];
      }
      return (data ?? []) as MemberRow[];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return members;
    const s = q.toLowerCase();
    return members.filter(
      (m) =>
        (m.display_name ?? "").toLowerCase().includes(s) ||
        (m.username ?? "").toLowerCase().includes(s) ||
        (m.favourite_club ?? "").toLowerCase().includes(s),
    );
  }, [members, q]);

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo={false} pageTitle="Members" />
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by username or display name…"
            className="h-12 rounded-2xl border-white/10 bg-white/[0.05] pl-10"
            autoFocus
          />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Users className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-white">
            Registered users
            {!isLoading && (
              <span className="ml-2 font-normal text-neutral-500">({filtered.length})</span>
            )}
          </h2>
        </div>

        {isLoading && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-neutral-500">
            No members match your search.
          </p>
        )}

        <ul className="mt-4 space-y-1">
          {filtered.map((m) => {
            const name = m.display_name || m.username || "Player";
            return (
              <li key={m.id}>
                <Link
                  to="/members/$id"
                  params={{ id: m.id }}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/[0.05]"
                >
                  <Avatar className="h-12 w-12 ring-1 ring-white/10">
                    <AvatarImage src={m.avatar_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-sky-600 to-violet-700 text-sm font-semibold text-white">
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{name}</p>
                      {m.current_streak != null && m.current_streak > 0 && (
                        <InlineStreak streak={m.current_streak} className="text-xs" />
                      )}
                    </div>
                    <p className="truncate text-xs text-neutral-500">
                      {m.username ? `@${m.username}` : ""}
                      {m.username && m.favourite_club ? " · " : ""}
                      {m.favourite_club ?? ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </PageShell>
  );
}
