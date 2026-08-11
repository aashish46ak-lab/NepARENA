import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { useTournamentHistory } from "@/hooks/useContent";
import { Trophy } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";

export const Route = createFileRoute("/history")({
  head: () => ({
    ...buildSeoHead({
      title: "History",
      description:
        "Past seasons and tournament history on NepARENA.",
      path: "/history",
    }),
  }),
  component: () => {
    const { data: list = [], isLoading } = useTournamentHistory();
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Tournament History</h1>
          <p className="text-muted-foreground mt-2">Every past season and its champions.</p>
          {isLoading && <div className="mt-8 text-muted-foreground">Loading…</div>}
          {!isLoading && list.length === 0 && <div className="mt-8 glass rounded-xl p-8 text-center text-muted-foreground">History coming soon.</div>}
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((h) => (
              <div key={h.id} className="glass rounded-2xl overflow-hidden">
                <SmartImage src={h.banner_url} alt={h.tournament_name} ratio="aspect-video"
                  fallback={<div className="absolute inset-0 bg-gradient-brand opacity-15 grid place-items-center"><Trophy className="h-14 w-14 text-brand" /></div>} />
                <div className="p-5">
                  <div className="text-xs text-brand-glow font-medium">{h.year}</div>
                  <h3 className="mt-1 font-bold">{h.tournament_name}</h3>
                  <div className="mt-2 text-sm">🏆 <span className="text-foreground">{h.winner}</span></div>
                  {h.runner_up && <div className="text-xs text-muted-foreground">🥈 {h.runner_up}</div>}
                  {h.third_place && <div className="text-xs text-muted-foreground">🥉 {h.third_place}</div>}
                  {h.prize_pool && <div className="mt-2 text-xs text-muted-foreground">Prize: {h.prize_pool}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  },
});
