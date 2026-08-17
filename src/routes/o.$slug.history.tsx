/**
 * Full tournament history for an organizer — latest completed first.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getOrganizerBySlug, DEFAULT_ORGANIZER_SLUG } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History, Loader2, Trophy } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/o/$slug/history")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: `History — ${params.slug}`,
      description: "Tournament history",
      path: `/o/${params.slug}/history`,
    }),
  }),
  component: OrgHistoryPage,
});

function OrgHistoryPage() {
  const { slug } = Route.useParams();
  const { data: organizer, isLoading: orgLoading } = useQuery({
    queryKey: ["organizer", slug],
    queryFn: () => getOrganizerBySlug(slug),
  });
  const isDefault =
    !!organizer &&
    (organizer.slug === DEFAULT_ORGANIZER_SLUG || /efootball/i.test(organizer.name));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["org_history_page", organizer?.id, isDefault],
    enabled: !!organizer?.id,
    queryFn: async () => {
      let q = supabase
        .from("tournaments")
        .select("id, name, status, starts_at, ends_at, game, participants_count")
        .eq("organizer_id", organizer!.id)
        .in("status", ["completed", "archived"])
        .order("ends_at", { ascending: false })
        .limit(80);
      const { data } = await q;
      let list = data ?? [];
      if (!list.length && isDefault) {
        const { data: all } = await supabase
          .from("tournaments")
          .select("id, name, status, starts_at, ends_at, game, participants_count")
          .in("status", ["completed", "archived"])
          .order("ends_at", { ascending: false })
          .limit(80);
        list = all ?? [];
      }
      return list;
    },
  });

  if (orgLoading || isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 py-4 pb-20">
        <div className="mb-5 flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="-ml-2 rounded-full">
            <Link to="/o/$slug" params={{ slug }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <History className="h-5 w-5 text-neutral-400" />
          Tournament history
        </h1>
        <p className="mt-1 text-xs text-neutral-500">{organizer?.name} · latest first</p>

        <div className="mt-5 space-y-2">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-neutral-500">
              This organizer is yet to complete a tournament.
            </p>
          ) : (
            rows.map((t: any) => (
              <Link
                key={t.id}
                to="/tournaments/$id"
                params={{ id: t.id }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-sky-400/30"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5">
                  <Trophy className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{t.name}</p>
                  <p className="text-[11px] text-neutral-500">
                    {t.game ? `${t.game} · ` : ""}
                    {t.ends_at
                      ? new Date(t.ends_at).toLocaleDateString()
                      : t.starts_at
                        ? new Date(t.starts_at).toLocaleDateString()
                        : "—"}
                    {t.participants_count != null ? ` · ${t.participants_count} players` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-300">
                  Done
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
