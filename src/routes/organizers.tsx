/**
 * Separate Organizers directory — not the platform homepage.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listActiveOrganizers,
  getFollowerCount,
  DEFAULT_ORGANIZER_SLUG,
  PLATFORM_NAME,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Building2, Shield, Users, Trophy, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/organizers")({
  head: () => ({
    meta: [
      { title: `Organizers — ${PLATFORM_NAME}` },
      {
        name: "description",
        content: "Browse verified tournament organizers on NepARENA.",
      },
    ],
  }),
  component: OrganizersPage,
});

async function organizerExtra(organizerId: string) {
  const [members, tournaments, followers] = await Promise.all([
    supabase
      .from("organizer_members")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId),
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId),
    getFollowerCount(organizerId),
  ]);
  let tCount = tournaments.count ?? 0;
  if (tCount === 0) {
    const { count } = await supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true });
    tCount = count ?? 0;
  }
  return {
    members: members.count ?? 0,
    tournaments: tCount,
    followers,
  };
}

function OrganizersPage() {
  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["active_organizers_page"],
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
            description:
              "Tournaments, standings, fixtures and community — the first organizer on NepARENA.",
            logo_url: null,
            banner_url: null,
            is_verified: true,
          },
        ];

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
          {PLATFORM_NAME}
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold">
          <Building2 className="h-7 w-7 text-neutral-300" /> Organizers
        </h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Each organizer has an independent profile, theme and dashboard. Opening
          eFootball Nepal shows their existing public site — not the platform home.
        </p>

        {isLoading && (
          <p className="mt-10 text-sm text-neutral-500">Loading organizers…</p>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {list.map((o) => (
            <OrganizerCard key={o.id} organizer={o} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function OrganizerCard({
  organizer,
}: {
  organizer: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    description?: string | null;
    logo_url: string | null;
    banner_url: string | null;
    is_verified: boolean;
  };
}) {
  const { data: extra } = useQuery({
    queryKey: ["org_extra_page", organizer.id],
    enabled: organizer.id !== "seed-efn",
    queryFn: () => organizerExtra(organizer.id),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="aspect-[21/9] bg-neutral-900">
        {organizer.banner_url ? (
          <img
            src={organizer.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-neutral-600">
            <Shield className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex gap-3">
          {organizer.logo_url ? (
            <img
              src={organizer.logo_url}
              alt=""
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-neutral-800">
              <Trophy className="h-6 w-6 text-neutral-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold">{organizer.name}</h2>
              {organizer.is_verified && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
              {organizer.tagline || organizer.description || "Organizer"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {extra?.followers ?? 0} followers
          </span>
          <span>{extra?.members ?? "—"} members</span>
          <span>{extra?.tournaments ?? "—"} tournaments</span>
          {organizer.is_verified && (
            <Badge variant="secondary" className="text-[10px]">
              Verified
            </Badge>
          )}
        </div>
        <Button asChild className="mt-5 w-full bg-neutral-100 text-black hover:bg-white">
          <Link to="/o/$slug" params={{ slug: organizer.slug }}>
            Open profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
