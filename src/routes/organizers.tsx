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
              "flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-3.5 text-sm font-semibold text-neutral-100 transition hover:border-sky-400/40 hover:bg-sky-500/10 active:scale-[0.98]",
              searchOpen && "border-sky-400/40 bg-sky-500/10",
            )}
          >
            <Search className="h-4 w-4 text-sky-400" />
            Search Organizers
          </button>

          {hasApplication ? (
            <Link
              to="/become-organizer"
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-sky-400/40 bg-gradient-to-br from-sky-500/25 via-sky-600/15 to-violet-600/20 px-3 py-3.5 text-sm font-semibold text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.15)] transition hover:border-sky-300/50 hover:shadow-[0_0_32px_rgba(56,189,248,0.25)] active:scale-[0.98]"
            >
              <FileText className="relative z-10 h-4 w-4 text-sky-300" />
              <span className="relative z-10">View Status</span>
            </Link>
          ) : (
            <Link
              to="/become-organizer"
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-rose-500/15 px-3 py-3.5 text-sm font-semibold text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.2)] transition hover:border-amber-300/55 hover:shadow-[0_0_36px_rgba(251,191,36,0.35)] active:scale-[0.98]"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent to-white/10 opacity-0 transition group-hover:opacity-100" />
              <Star className="relative z-10 h-4 w-4 fill-amber-300/80 text-amber-300" />
              <span className="relative z-10">Become Organizer</span>
            </Link>
          )}
        </div>

        <div className="mt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search organizers by name…"
              className="h-11 rounded-2xl border-white/10 bg-white/[0.05] pl-10"
            />
          </div>
        </div>

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
