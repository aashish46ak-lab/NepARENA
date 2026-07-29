import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useGallery } from "@/hooks/useContent";

export const Route = createFileRoute("/gallery")({
  head: () => ({ meta: [{ title: "Gallery — eFootball Nepal" }, { name: "description", content: "Moments from eFootball Nepal tournaments and community events." }] }),
  component: () => {
    const { data: list = [], isLoading } = useGallery();
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Gallery</h1>
          <p className="text-muted-foreground mt-2">Moments from the community.</p>
          {isLoading && <div className="mt-8 text-muted-foreground">Loading…</div>}
          {!isLoading && list.length === 0 && <div className="mt-8 glass rounded-xl p-8 text-center text-muted-foreground">No photos yet.</div>}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map((g) => (
              <div key={g.id} className="glass rounded-xl overflow-hidden aspect-square">
                <img src={g.image_url} alt={g.caption ?? ""} className="h-full w-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  },
});