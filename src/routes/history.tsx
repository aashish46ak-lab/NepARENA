import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { OrganizerSubnav } from "@/components/OrganizerSubnav";
import { useTournamentHistory } from "@/hooks/useContent";
import { Trophy } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";

export const Route = createFileRoute("/history")({
  head: () => ({
    ...buildSeoHead({
      title: "History",
      description: "Past seasons and tournament history on NepARENA.",
      path: "/history",
    }),
  }),
  component: () => {
    const { data: list = [], isLoading } = useTournamentHistory();
    return (
      <PageShell force="organizer" hideChrome>
        <OrganizerSubnav title="History" />
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-2">
          <h1 className="text-2xl font-bold text-white">Tournament History</h1>
          <p className="mt-1 text-sm text-neutral-400">Past seasons and champions.</p>
          {isLoading && <div className="mt-8 text-neutral-500">Loading…</div>}
          {!isLoading && list.length === 0 && (
            <div className="mt-8 rounded-xl border border-white/10 p-8 text-center text-neutral-500">
              No history yet.
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {list.map((h) => (
              <div key={h.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <SmartImage
                  src={h.banner_url}
                  alt={h.tournament_name}
                  ratio="aspect-video"
                  fallback={
                    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-sky-900/40 to-violet-950/40">
                      <Trophy className="h-12 w-12 text-sky-400/60" />
                    </div>
                  }
                />
                <div className="p-4">
                  <div className="text-xs font-medium text-sky-400">{h.year}</div>
                  <h3 className="mt-1 font-bold text-white">{h.tournament_name}</h3>
                  <div className="mt-2 text-sm text-neutral-200">🏆 {h.winner}</div>
                  {h.runner_up && <div className="text-xs text-neutral-500">🥈 {h.runner_up}</div>}
                  {h.third_place && <div className="text-xs text-neutral-500">🥉 {h.third_place}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  },
});
