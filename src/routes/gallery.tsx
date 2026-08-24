import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { OrganizerSubnav } from "@/components/OrganizerSubnav";
import { useGallery } from "@/hooks/useContent";
import { SmartImage } from "@/components/SmartImage";
import { GallerySkeleton } from "@/components/PageSkeletons";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    ...buildSeoHead({
      title: "Gallery",
      description: "Photos and moments from NepARENA events.",
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
          <p className="mt-1 text-sm text-neutral-400">Event photos and highlights.</p>
          {isLoading && <GallerySkeleton />}
          {!isLoading && list.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-white/12 p-8 text-center text-sm text-neutral-500">
              No photos yet.
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {list.map((g: any) => (
              <div key={g.id} className="aspect-square overflow-hidden rounded-xl border border-white/10">
                <SmartImage src={g.image_url || g.url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  },
});
