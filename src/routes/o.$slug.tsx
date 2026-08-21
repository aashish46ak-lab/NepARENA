import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { OrganizerPublicPage } from "@/components/OrganizerPublicPage";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/o/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("organizers")
      .select("name, slug, logo_url, bio, description, tagline")
      .eq("slug", params.slug)
      .maybeSingle();
    return {
      organizer: data as {
        name?: string;
        slug?: string;
        logo_url?: string | null;
        bio?: string | null;
        description?: string | null;
        tagline?: string | null;
      } | null,
    };
  },
  head: ({ params, loaderData }) => {
    const o = loaderData?.organizer;
    const name = o?.name || params.slug;
    const desc =
      o?.tagline ||
      o?.bio ||
      o?.description ||
      `${name} — esports organizer on NepARENA. Follow for tournaments, results, and community.`;
    const image = o?.logo_url || null;
    return {
      ...buildSeoHead({
        title: `${name} — NepARENA`,
        description: String(desc).slice(0, 200),
        path: `/o/${params.slug}`,
        image,
        type: "profile",
      }),
    };
  },
  component: OrganizerPublicPage,
});
