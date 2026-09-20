import { createFileRoute } from "@tanstack/react-router";
import {
  absUrl,
  buildSeoHead,
  entityKeywords,
  organizerJsonLd,
} from "@/lib/seo";
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
    const name = (o?.name || params.slug || "Organizer").trim();
    const slug = o?.slug || params.slug;
    const path = `/o/${params.slug}`;
    const desc = String(
      o?.tagline ||
        o?.bio ||
        o?.description ||
        `${name} — esports tournament organizer on NepARENA. Follow for live cups, results, standings, and community updates.`,
    ).slice(0, 200);
    const image = o?.logo_url || null;
    const seo = buildSeoHead({
      // brandTitle → "1234 · NepARENA"
      title: `${name} | Esports Organizer`,
      description: desc,
      path,
      image,
      type: "profile",
      keywords: entityKeywords(name, [
        slug,
        "organizer",
        "tournament host",
        "efootball organizer",
        `${name} NepARENA`,
      ]),
    });
    return {
      ...seo,
      scripts: [
        {
          type: "application/ld+json",
          children: organizerJsonLd({
            name,
            url: absUrl(path),
            description: desc,
            logo: image,
            slug,
          }),
        },
      ],
    };
  },
  component: OrganizerPublicPage,
});
