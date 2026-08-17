/**
 * Tournament history — ended tournaments, latest first.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getOrganizerBySlug, DEFAULT_ORGANIZER_SLUG } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Trophy, Compass } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/o/$slug/history")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: `Tournaments — ${params.slug}`,
      description: "Tournament history",
      path: `/o/${params.slug}/history`,
    }),
  }),
  component: OrgHistoryPage,
});

function OrgHistoryPage() {
  const { slug } = Route.useParams();
  const { data: organizer, isLoading } = useQuery({
    queryKey: ["organizer", slug],
    queryFn: () => getOrganizerBySlug(slug),
  });

  const isDefault =
    !!organizer &&
    (organizer.slug === DEFAULT_ORGANIZER_SLUG || /efootball/i.test(organizer.name));

  const { data: ended = [], isLoading: loadingT } = useQuery({
    queryKey: ["org_history_ended", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const cols = "id, name, status, starts_at, ends_at, game, banner_url, organizer_id";
      const { data } = await supabase
        .from("tournaments")
        .select(cols)
        .eq("organizer_id", organizer!.id)
        .in("status", ["completed", "archived"])
        .order("ends_at", { ascending: false })
        .limit(40);
      let rows = data ?? [];
      if (!rows.length && isDefault) {
        const { data: all } = await supabase
          .from("tournaments")
          .select(cols)
          .in("status", ["completed", "archived"])
          .order("ends_at", { ascending: false })
          .limit(40);
        rows = all ?? [];
      }
      return rows as {
        id: string;
        name: string;
        status: string;
        starts_at: string | null;
        ends_at: string | null;
        game?: string | null;
        banner_url?: string | null;
      }[];
    },
  });

  if (isLoading || loadingT) {
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
        <Button asChild size="sm" variant="ghost" className="-ml-2 mb-4 rounded-full">
          <Link to="/o/$slug" params={{ slug }}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>

        <div className="mb-5 flex items-center gap-3">
          <Avatar className="h-12 w-12 rounded-xl">
            <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-xl object-cover" />
            <AvatarFallback className="rounded-xl">{organizer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Recent tournaments by
            </p>
            <h1 className="text-xl font-bold text-white">{organizer.name}</h1>
          </div>
        </div>

        {ended.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-12 text-center">
            <Trophy className="mx-auto h-10 w-10 text-neutral-600" />
            <p className="mt-3 text-sm font-semibold text-white">
              {organizer.name} is new to the platform
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              No completed tournaments yet. Check back after their first event ends.
            </p>
            <Button asChild className="mt-5 rounded-full bg-sky-500 text-white hover:bg-sky-400">
              <Link to="/organizers">
                <Compass className="mr-1.5 h-4 w-4" /> Explore more
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ended.map((t) => (
              <Link
                key={t.id}
                to="/tournaments/$id"
                params={{ id: t.id }}
                className="flex gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-sky-400/30"
              >
                <div
                  className="h-20 w-20 shrink-0 bg-cover bg-center sm:w-24"
                  style={{
                    backgroundImage: t.banner_url
                      ? `url(${t.banner_url})`
                      : "linear-gradient(135deg,#1e293b,#0a0a0a)",
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-3">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{t.name}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {t.game ? `${t.game} · ` : ""}
                    {t.ends_at
                      ? new Date(t.ends_at).toLocaleDateString()
                      : t.starts_at
                        ? new Date(t.starts_at).toLocaleDateString()
                        : "Ended"}
                  </p>
                  <span className="mt-1 w-fit rounded-full bg-neutral-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-300">
                    {t.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
