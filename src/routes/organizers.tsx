/**
 * Organizers directory
 * Search | Become (or View Status if applied) — premium styling
 * Sort: followed first, then highest followers
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { OrganizerCard } from "@/components/OrganizerCard";
import {
  listActiveOrganizers,
  listFollowedOrganizerIds,
  DEFAULT_ORGANIZER_SLUG,
  PLATFORM_NAME,
  type Organizer,
} from "@/lib/organizers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Building2, Search, Star, FileText } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/organizers")({
  head: () => ({
    ...buildSeoHead({
      title: "Organizers",
      description:
        "Browse verified tournament organizers on NepARENA — Nepal's multi-organizer esports platform.",
      path: "/organizers",
    }),
  }),
  component: OrganizersPage,
});

function OrganizersPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["active_organizers_page"],
    queryFn: listActiveOrganizers,
  });

  const { data: followedIds = [] } = useQuery({
    queryKey: ["followed_org_ids", user?.id],
    enabled: !!user?.id,
    queryFn: () => listFollowedOrganizerIds(user!.id),
  });

  const { data: followerCounts = {} } = useQuery({
    queryKey: ["org_follower_counts"],
    queryFn: async () => {
      const { data } = await supabase.from("organizer_followers").select("organizer_id");
      const map: Record<string, number> = {};
      for (const r of data ?? []) {
        const id = (r as { organizer_id: string }).organizer_id;
        map[id] = (map[id] ?? 0) + 1;
      }
      return map;
    },
    staleTime: 60_000,
  });

  const { data: hasApplication = false } = useQuery({
    queryKey: ["org_app_exists", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizer_applications")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      return !!data;
    },
  });

  const list = useMemo(() => {
    const base: Organizer[] =
      organizers.length > 0
        ? organizers
        : [
            {
              id: "seed-efn",
              slug: DEFAULT_ORGANIZER_SLUG,
              name: "eFootball Nepal",
              description:
                "Tournaments, standings, fixtures and community — the first organizer on NepARENA.",
              logo_url: null,
              cover_url: null,
              is_verified: true,
              status: "active" as const,
              created_at: "",
            } as Organizer,
          ];

    const followed = new Set(followedIds);
    const scored = base.map((o) => ({
      org: o,
      following: followed.has(o.id) ? 1 : 0,
      followers: followerCounts[o.id] ?? (o as { follower_count?: number }).follower_count ?? 0,
    }));
    scored.sort((a, b) => {
      if (b.following !== a.following) return b.following - a.following;
      if (b.followers !== a.followers) return b.followers - a.followers;
      return a.org.name.localeCompare(b.org.name);
    });
    let out = scored.map((s) => s.org);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter(
        (o) =>
          o.name.toLowerCase().includes(s) ||
          (o.description ?? "").toLowerCase().includes(s) ||
          (o.slug ?? "").toLowerCase().includes(s),
      );
    }
    return out;
  }, [organizers, followedIds, followerCounts, q]);

  const followingList = list.filter((o) => followedIds.includes(o.id));
  const rest = list.filter((o) => !followedIds.includes(o.id));

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo={false} pageTitle="Organizers" />
      <div className="max-w-3xl px-3 pb-28 pt-3 sm:px-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-neutral-400" />
          <h1 className="text-lg font-semibold text-white">Organizers</h1>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <div className="relative w-1/2 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search organizers…"
              className="h-10 rounded-xl border-white/10 bg-white/[0.05] pl-9 text-sm"
            />
          </div>
          {hasApplication ? (
            <Link
              to="/become-organizer"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-400/40 bg-gradient-to-br from-sky-500/25 via-sky-600/15 to-violet-600/20 px-2 text-xs font-semibold text-sky-50 sm:text-sm"
            >
              <FileText className="h-3.5 w-3.5 text-sky-300" />
              View Status
            </Link>
          ) : (
            <Link
              to="/become-organizer"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-rose-500/15 px-2 text-xs font-semibold text-amber-50 sm:text-sm"
            >
              <Star className="h-3.5 w-3.5 fill-amber-300/80 text-amber-300" />
              Become Organizer
            </Link>
          )}
        </div>

        <p className="mb-3 text-[11px] text-neutral-500">
          Following first, then by community size on {PLATFORM_NAME}.
        </p>

        {isLoading && (
          <div className="flex w-full max-w-xl flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[2/1] animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
            ))}
          </div>
        )}

        {!isLoading && followingList.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Following
            </h2>
            <div className="flex w-full max-w-xl flex-col gap-2.5">
              {followingList.map((o) => (
                <OrganizerCard key={o.id} organizer={o} queryKeyPrefix="org_page_f" />
              ))}
            </div>
          </section>
        )}

        {!isLoading && (
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              {followingList.length > 0 ? "All organizers" : "Organizers"}
            </h2>
            <div className="flex w-full max-w-xl flex-col gap-2.5">
              {rest.map((o) => (
                <OrganizerCard key={o.id} organizer={o} queryKeyPrefix="org_page_r" />
              ))}
            </div>
            {list.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-neutral-500">
                No organizers match your search.
              </p>
            )}
          </section>
        )}
      </div>
    </PageShell>
  );
}
