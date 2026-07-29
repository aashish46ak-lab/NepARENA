import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useHallOfFame } from "@/hooks/useContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/hall-of-fame")({
  head: () => ({ meta: [{ title: "Hall of Fame — eFootball Nepal" }, { name: "description", content: "Legendary champions of eFootball Nepal." }] }),
  component: () => {
    const { data: list = [], isLoading } = useHallOfFame();
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Hall of Fame</h1>
          <p className="text-muted-foreground mt-2">Champions who wrote their name in eFootball Nepal history.</p>
          {isLoading && <div className="mt-8 text-muted-foreground">Loading…</div>}
          {!isLoading && list.length === 0 && <div className="mt-8 glass rounded-xl p-8 text-center text-muted-foreground">Champions coming soon.</div>}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((h) => (
              <div key={h.id} className="glass rounded-2xl p-6 flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 ring-2 ring-brand/40">
                  <AvatarImage src={h.photo_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-brand text-primary-foreground text-lg">{h.player_name.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="mt-4 text-lg font-bold">{h.player_name}</h3>
                <div className="text-sm text-brand-glow mt-1">{h.achievement}</div>
                {h.tournament && <div className="text-xs text-muted-foreground mt-2">{h.tournament}{h.year ? ` · ${h.year}` : ""}</div>}
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  },
});