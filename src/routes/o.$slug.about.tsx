/**
 * About organizer — logo, bio, team/roles.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getOrganizerBySlug, listOrganizerTeam } from "@/lib/organizers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BadgeCheck, Loader2, Shield } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/o/$slug/about")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: `About — ${params.slug}`,
      description: "About this organizer",
      path: `/o/${params.slug}/about`,
    }),
  }),
  component: OrgAboutPage,
});

function OrgAboutPage() {
  const { slug } = Route.useParams();
  const { data: organizer, isLoading } = useQuery({
    queryKey: ["organizer", slug],
    queryFn: () => getOrganizerBySlug(slug),
  });

  const { data: team = [] } = useQuery({
    queryKey: ["org_team", organizer?.id],
    queryFn: () => listOrganizerTeam(organizer!.id),
    enabled: !!organizer?.id,
  });

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
        </div>
      </PageShell>
    );
  }

  if (!organizer) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="px-4 py-16 text-center text-neutral-400">Organizer not found</div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 py-4 pb-20">
        <div className="mb-4 flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link to="/o/$slug" params={{ slug }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 rounded-2xl ring-2 ring-white/10">
            <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-2xl object-cover" />
            <AvatarFallback className="rounded-2xl text-xl">
              {organizer.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-1.5 text-xl font-bold text-white">
              {organizer.name}
              {organizer.is_verified && <BadgeCheck className="h-5 w-5 text-sky-400" />}
            </h1>
            <p className="text-xs text-neutral-500">@{organizer.slug}</p>
          </div>
        </div>

        {organizer.description && (
          <div className="mt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
              {organizer.description}
            </p>
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <Shield className="h-3.5 w-3.5" /> Team
          </h2>
          {team.length === 0 ? (
            <p className="text-sm text-neutral-500">No public team members listed.</p>
          ) : (
            <div className="space-y-2">
              {team.map((m) => {
                const name = m.full_name?.trim() || m.username?.trim() || "Member";
                return (
                  <Link
                    key={`${m.user_id}-${m.role}`}
                    to="/members/$id"
                    params={{ id: m.user_id }}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.05]"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{name}</p>
                      <p className="text-[11px] capitalize text-neutral-500">{m.role}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
