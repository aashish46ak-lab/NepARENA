/**
 * About — full page with back, logo, details, team roles.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getOrganizerBySlug, listOrganizerTeam } from "@/lib/organizers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BadgeCheck, Calendar, Loader2, Shield, Users } from "lucide-react";
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

  const aboutText = organizer?.description?.trim() || null;

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

  const createdLabel = organizer.created_at
    ? new Date(organizer.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const roleOrder: Record<string, number> = { owner: 0, admin: 1, moderator: 2 };
  const sortedTeam = [...team].sort(
    (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9),
  );

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 py-4 pb-20">
        <Button asChild size="sm" variant="ghost" className="-ml-2 mb-4 rounded-full">
          <Link to="/o/$slug" params={{ slug }}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300/90">
          More about
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{organizer.name}</h1>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02]">
          <div className="flex items-center gap-4 p-4">
            <Avatar className="h-16 w-16 rounded-2xl ring-2 ring-white/10">
              <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-2xl object-cover" />
              <AvatarFallback className="rounded-2xl text-lg">
                {organizer.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-lg font-semibold text-white">
                {organizer.name}
                {organizer.is_verified && <BadgeCheck className="h-5 w-5 text-sky-400" />}
              </p>
              <p className="text-sm text-neutral-500">@{organizer.slug}</p>
            </div>
          </div>

          {aboutText && (
            <div className="border-t border-white/8 px-4 py-3">
              <p className="text-sm leading-relaxed text-neutral-300">{aboutText}</p>
            </div>
          )}

          {createdLabel && (
            <div className="flex items-center gap-2 border-t border-white/8 px-4 py-3 text-xs text-neutral-400">
              <Calendar className="h-3.5 w-3.5 text-neutral-500" />
              On NepARENA since {createdLabel}
            </div>
          )}
        </div>

        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4 text-violet-300" /> Team
          </h2>
          {sortedTeam.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-neutral-500">
              Team details not listed yet
            </p>
          ) : (
            <div className="space-y-2">
              {sortedTeam.map((m) => {
                const name = m.full_name || m.username || "Member";
                return (
                  <Link
                    key={m.user_id}
                    to="/members/$id"
                    params={{ id: m.user_id }}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-violet-400/30"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{name}</p>
                      {m.username && <p className="text-[11px] text-neutral-500">@{m.username}</p>}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-300">
                      {(m.role === "owner" || m.role === "admin") && <Shield className="h-3 w-3 text-amber-400" />}
                      {m.role}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
