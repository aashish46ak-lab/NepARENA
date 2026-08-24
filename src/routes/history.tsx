import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { OrganizerSubnav } from "@/components/OrganizerSubnav";
import { useTournamentHistory } from "@/hooks/useContent";
import { Trophy } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { HistoryListSkeleton } from "@/components/PageSkeletons";

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
          <h1 className="text-2xl font-bold text-white">History</h1>
          <p className="mt-1 text-sm text-neutral-400">Past seasons and champions.</p>
          {isLoading && <HistoryListSkeleton />}
          {!isLoading && list.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-white/12 p-8 text-center text-sm text-neutral-500">
              No history yet.
            </div>
          )}
          <div className="mt-6 space-y-3">
            {list.map((h: any) => (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-white/5">
                  {h.photo_url || h.banner_url ? (
                    <SmartImage src={h.photo_url || h.banner_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Trophy className="h-5 w-5 text-amber-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{h.tournament || h.title || "Tournament"}</p>
                  <p className="text-xs text-neutral-400">
                    {[h.winner || h.player_name, h.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  },
});
