/**
 * About — full page: who they are, created date, who manages.
 * Applies to every organizer.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getOrganizerBySlug, listOrganizerTeam } from "@/lib/organizers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BadgeCheck, Calendar, Loader2, Shield } from "lucide-react";
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

  const createdLabel = organizer.created_at
    ? new Date(organizer.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const managers = team.filter((m) => m.role === "owner" || m.role === "admin");
  const mods = team.filter((m) => m.role === "moderator");

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 py-4 pb-20">
        <div className="mb-5 flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="rounded-full -ml-2">
            <Link to="/o/$slug" params={{ slug }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">About</h1>
        <p className="mt-1 text-sm text-neutral-500">Organizer profile & team</p>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Avatar className="h-16 w-16 rounded-2xl ring-2 ring-white/10">
            <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-2xl object-cover" />
            <AvatarFallback className="rounded-2xl text-lg">
              {organizer.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-1.5 text-lg font-bold text-white">
              <span className="break-words">{organizer.name}</span>
              {organizer.is_verified && <BadgeCheck className="h-5 w-5 shrink-0 text-sky-400" />}
            </h2>
            <p className="break-all text-sm text-neutral-500">@{organizer.slug}</p>
          </div>
        </div>

        {organizer.description && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">What we do</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
              {organizer.description}
            </p>
          </div>
        )}

        {createdLabel && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <div>
              <p className="text-xs font-semibold text-neutral-400">Account created</p>
              <p className="mt-0.5 text-sm text-white">{createdLabel}</p>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <Shield className="h-3.5 w-3.5" /> Who manages this
          </h3>
          {managers.length === 0 && mods.length === 0 ? (
            <p className="text-sm text-neutral-500">No public team members listed yet.</p>
          ) : (
            <div className="space-y-2">
              {[...managers, ...mods].map((m) => {
                const name = m.full_name?.trim() || m.username?.trim() || "Member";
                return (
                  <Link
                    key={`${m.user_id}-${m.role}`}
                    to="/members/$id"
                    params={{ id: m.user_id }}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.05]"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{name}</p>
                      <p className="text-[11px] capitalize text-neutral-500">
                        {m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : "Moderator"}
                      </p>
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
