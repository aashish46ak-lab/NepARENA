/**
 * Organizers directory
 * Title → Search | Become (50/50) → View Status → Following → Remaining
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
import { Building2, Search, Star, ClipboardList } from "lucide-react";
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
  const [searchOpen, setSearchOpen] = useState(false);

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

  const list = useMemo(() => {
    const base: Organizer[] =
      organizers.length > 0
        ? organizers
        : [
            {
              id: "seed-efn",
              slug: DEFAULT_ORGANIZER_SLUG,
              name: "eFootball Nepal",
              tagline: "Competitive eFootball community in Nepal",
              description:
                "Tournaments, standings, fixtures and community — the first organizer on NepARENA.",
              logo_url: null,
              banner_url: null,
              is_verified: true,
              status: "active",
              primary_color: null,
              secondary_color: null,
              owner_user_id: null,
              website_url: null,
              contact_email: null,
              created_at: "",
              updated_at: "",
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
          (o.tagline ?? "").toLowerCase().includes(s) ||
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
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-neutral-400" />
          <h1 className="text-lg font-semibold text-white">Organizers</h1>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-3.5 text-sm font-semibold text-neutral-100 transition hover:border-sky-400/40 hover:bg-sky-500/10",
              searchOpen && "border-sky-400/40 bg-sky-500/10",
            )}
          >
            <Search className="h-4 w-4 text-sky-400" />
            Search Organizers
          </button>
          <Link
            to="/become-organizer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-3.5 text-sm font-semibold text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-500/20"
          >
            <Star className="h-4 w-4 text-amber-400" />
            Become Organizer
          </Link>
        </div>

        {searchOpen && (
          <div className="mt-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
              className="h-11 rounded-2xl border-white/10 bg-white/[0.05]"
              autoFocus
            />
          </div>
        )}

        <Link
          to="/become-organizer"
          search={{ status: true } as never}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-medium text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <ClipboardList className="h-4 w-4 text-neutral-400" />
          View Application Status
        </Link>

        <p className="mt-5 text-xs text-neutral-500">
          Following first, then by community size on {PLATFORM_NAME}.
        </p>

        {isLoading && (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
            ))}
          </div>
        )}

        {!isLoading && followingList.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Following Organizers
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {followingList.map((o) => (
                <OrganizerCard key={o.id} organizer={o} queryKeyPrefix="org_page_f" />
              ))}
            </div>
          </section>
        )}

        {!isLoading && (
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {followingList.length > 0 ? "Remaining Organizers" : "Organizers"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
