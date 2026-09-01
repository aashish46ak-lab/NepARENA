/**
 * Organizer posts page — logo, name, recent posts.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getOrganizerBySlug } from "@/lib/organizers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import { SocialFeed } from "@/components/SocialFeed";

export const Route = createFileRoute("/o/$slug/posts")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("organizers")
      .select("name, slug, logo_url, bio, description, tagline")
      .eq("slug", params.slug)
      .maybeSingle();
    return { organizer: data };
  },
  head: ({ params, loaderData }) => {
    const o = loaderData?.organizer as {
      name?: string;
      logo_url?: string | null;
      bio?: string | null;
      description?: string | null;
      tagline?: string | null;
    } | null | undefined;
    const name = o?.name || params.slug;
    const desc =
      o?.tagline ||
      o?.bio ||
      o?.description ||
      `Posts and updates — ${name} on NepARENA.`;
    return {
      ...buildSeoHead({
        title: `${name} · Posts`,
        description: String(desc).slice(0, 200),
        path: `/o/${params.slug}/posts`,
        image: o?.logo_url || null,
        type: "profile",
      }),
    };
  },
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
        <Button asChild size="sm" variant="ghost" className="-ml-2 mb-4 rounded-full">
          <Link to="/o/$slug" params={{ slug }}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>

        <div className="mb-5 flex items-center gap-3">
          <Avatar className="h-12 w-12 rounded-xl">
            <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-xl object-cover" />
            <AvatarFallback className="rounded-xl">{organizer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400/90">
              Recent posts
            </p>
            <h1 className="text-xl font-bold text-white">{organizer.name}</h1>
          </div>
        </div>

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
    </PageShell>
  );
}
