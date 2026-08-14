import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { OrganizerSubnav } from "@/components/OrganizerSubnav";
import { useHallOfFame } from "@/hooks/useContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/hall-of-fame")({
  head: () => ({
    ...buildSeoHead({
      title: "Hall of Fame",
      description: "Champions and legends from tournaments on NepARENA.",
      path: "/hall-of-fame",
    }),
  }),
  component: () => {
    const { data: list = [], isLoading } = useHallOfFame();
    return (
      <PageShell force="organizer" hideChrome>
        <OrganizerSubnav title="Hall of Fame" />
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-2">
          <h1 className="text-2xl font-bold text-white">Hall of Fame</h1>
          <p className="mt-1 text-sm text-neutral-400">Champions and legends.</p>
          {isLoading && <div className="mt-8 text-neutral-500">Loading…</div>}
          {!isLoading && list.length === 0 && (
            <div className="mt-8 rounded-xl border border-white/10 p-8 text-center text-neutral-500">
              No champions listed yet.
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {list.map((h) => (
              <div
                key={h.id}
                className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
              >
                <Avatar className="h-20 w-20 ring-2 ring-sky-500/30">
                  <AvatarImage src={h.photo_url ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {h.player_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="mt-3 text-base font-bold text-white">{h.player_name}</h3>
                <div className="mt-1 text-sm text-sky-300">{h.achievement}</div>
                {h.tournament && (
                  <div className="mt-1 text-xs text-neutral-500">
                    {h.tournament}
                    {h.year ? ` · ${h.year}` : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  },
});
