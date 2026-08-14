/**
 * Members directory — separate page with search.
 * Uses real profiles columns: full_name, login_streak.
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
import { Search, Users, Loader2, BadgeCheck } from "lucide-react";
import { InlineStreak } from "@/components/StreakBadge";
import { isSuperAdminEmail } from "@/lib/organizers";

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
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  favourite_club: string | null;
  login_streak?: number | null;
  current_streak?: number | null;
  is_verified?: boolean | null;
  email?: string | null;
};

function MembersIndexPage() {
  const [q, setQ] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members_directory"],
    queryFn: async () => {
      const trySelect = async (table: string) => {
        const { data, error } = await supabase
          .from(table)
          .select("id, full_name, username, avatar_url, favourite_club, login_streak")
          .order("created_at", { ascending: false })
          .limit(300);
        if (error) {
          console.warn(table, error.message);
          return null;
        }
        return (data ?? []) as MemberRow[];
      };

      let rows = await trySelect("profiles");
      if (!rows || rows.length === 0) {
        rows = (await trySelect("public_members")) ?? [];
      }
      return rows.sort((a, b) => {
        const an = (a.full_name || a.username || "").toLowerCase();
        const bn = (b.full_name || b.username || "").toLowerCase();
        return an.localeCompare(bn);
      });
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return members;
    const s = q.toLowerCase();
    return members.filter(
      (m) =>
        (m.full_name ?? "").toLowerCase().includes(s) ||
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
            {q.trim() ? "No members match your search." : "No registered users yet."}
          </p>
        )}

        <ul className="mt-4 space-y-1">
          {filtered.map((m) => {
            const name = m.full_name || m.username || "Player";
            const streak = Number(m.login_streak ?? m.current_streak ?? 0);
            const verified = !!m.is_verified || isSuperAdminEmail(m.email);
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
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-white">{name}</p>
                      {verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                      {streak > 0 && <InlineStreak streak={streak} />}
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
