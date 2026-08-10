/**
 * Following — organizers as mini profile cards.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import {
  PLATFORM_NAME,
  listActiveOrganizers,
  DEFAULT_ORGANIZER_SLUG,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Building2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/following")({
  head: () => ({
    meta: [{ title: `Following — ${PLATFORM_NAME}` }],
  }),
  component: FollowingPage,
});

function FollowingPage() {
  const { user } = useAuth();

  const { data: followedIds = [] } = useQuery({
    queryKey: ["my_following_ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizer_follows")
        .select("organizer_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((r: { organizer_id: string }) => r.organizer_id);
    },
  });

  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["active_organizers_following_page"],
    queryFn: listActiveOrganizers,
  });

  const list =
    organizers.length > 0
      ? organizers
      : [
          {
            id: "seed-efn",
            slug: DEFAULT_ORGANIZER_SLUG,
            name: "eFootball Nepal",
            tagline: "Competitive eFootball community in Nepal",
            description: "First organizer on NepARENA.",
            logo_url: null as string | null,
            banner_url: null as string | null,
            is_verified: true,
          },
        ];

  const sorted = [...list].sort((a, b) => {
    const af = followedIds.includes(a.id) ? 0 : 1;
    const bf = followedIds.includes(b.id) ? 0 : 1;
    return af - bf;
  });

  const shown =
    user && followedIds.length > 0
      ? sorted.filter((o) => followedIds.includes(o.id))
      : sorted;

  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="h-6 w-6" /> Following
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {user && followedIds.length > 0
            ? "Organizers you follow"
            : `Organizers on ${PLATFORM_NAME}`}
        </p>

        {isLoading && (
          <p className="mt-8 text-sm text-neutral-500">Loading…</p>
        )}

        <div className="mt-8 space-y-4">
          {shown.map((o) => (
            <Link
              key={o.id}
              to="/o/$slug"
              params={{ slug: o.slug }}
              className="block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="relative h-20 bg-gradient-to-r from-neutral-800 to-neutral-900">
                {o.banner_url && (
                  <img
                    src={o.banner_url}
                    alt=""
                    className="h-full w-full object-cover opacity-70"
                  />
                )}
              </div>
              <div className="flex gap-3 px-4 pb-4">
                <div className="-mt-8 shrink-0">
                  {o.logo_url ? (
                    <img
                      src={o.logo_url}
                      alt=""
                      className="h-16 w-16 rounded-2xl object-cover ring-4 ring-[#0a0a0a]"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-500 text-lg font-bold text-black ring-4 ring-[#0a0a0a]">
                      {o.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="truncate font-semibold text-neutral-100">{o.name}</h2>
                    {o.is_verified && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
                    )}
                  </div>
                  <p className="truncate text-xs text-neutral-500">@{o.slug}</p>
                  {(o.tagline || o.description) && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
                      {o.tagline || o.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {shown.length === 0 && !isLoading && (
            <p className="text-sm text-neutral-500">
              No organizers followed yet. Browse{" "}
              <Link to="/organizers" className="text-neutral-200 underline">
                Organizers
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
