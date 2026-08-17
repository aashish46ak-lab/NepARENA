/**
 * Organizer posts — "{name} posts", latest → oldest.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getOrganizerBySlug } from "@/lib/organizers";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { SocialFeed } from "@/components/SocialFeed";

export const Route = createFileRoute("/o/$slug/posts")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: `Posts — ${params.slug}`,
      description: "Organizer posts",
      path: `/o/${params.slug}/posts`,
    }),
  }),
  component: OrgPostsPage,
});

function OrgPostsPage() {
  const { slug } = Route.useParams();
  const { data: organizer, isLoading } = useQuery({
    queryKey: ["organizer", slug],
    queryFn: () => getOrganizerBySlug(slug),
  });

  if (isLoading) {
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
        <div className="mb-5 flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="rounded-full -ml-2">
            <Link to="/o/$slug" params={{ slug }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {organizer.name} posts
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Latest first</p>
        <div className="mt-5">
          <SocialFeed
            organizerId={organizer.id}
            organizerMeta={{
              name: organizer.name,
              logo_url: organizer.logo_url,
              slug: organizer.slug,
            }}
            hideComposer
            emptyLabel={`${organizer.name} is yet to post`}
          />
        </div>
      </div>
    </PageShell>
  );
}
