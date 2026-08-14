import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { OrganizerSubnav } from "@/components/OrganizerSubnav";
import { useGallery } from "@/hooks/useContent";
import { SmartImage } from "@/components/SmartImage";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    ...buildSeoHead({
      title: "Gallery",
      description: "Photos and highlights from NepARENA organizers and tournaments.",
      path: "/gallery",
    }),
  }),
  component: () => {
    const { data: list = [], isLoading } = useGallery();
    return (
      <PageShell force="organizer" hideChrome>
        <OrganizerSubnav title="Gallery" />
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-2">
          <h1 className="text-2xl font-bold text-white">Gallery</h1>
          <p className="mt-1 text-sm text-neutral-400">Moments from the community.</p>
          {isLoading && <div className="mt-8 text-neutral-500">Loading…</div>}
          {!isLoading && list.length === 0 && (
            <div className="mt-8 rounded-xl border border-white/10 p-8 text-center text-neutral-500">
              No photos yet.
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((g) => (
              <SmartImage
                key={g.id}
                src={g.image_url}
                alt={g.caption ?? ""}
                ratio="aspect-square"
                className="rounded-xl border border-white/10"
              />
            ))}
          </div>
        </div>
      </PageShell>
    );
  },
});
