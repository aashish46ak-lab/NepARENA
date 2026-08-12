/**
 * Separate Organizers directory — not the platform homepage.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { OrganizerCard } from "@/components/OrganizerCard";
import {
  listActiveOrganizers,
  DEFAULT_ORGANIZER_SLUG,
  PLATFORM_NAME,
} from "@/lib/organizers";
import { Building2 } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";

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
            <OrganizerCard key={o.id} organizer={o} queryKeyPrefix="org_extra_page" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
