import { createFileRoute } from "@tanstack/react-router";
import { TournamentDetailPage } from "@/components/TournamentDetailPage";
import { buildSeoHead } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/tournaments/$id")({
  loader: async ({ params }) => {
    const { data: tour } = await supabase
      .from("tournaments")
      .select("id, name, description, status, organizer_id")
      .eq("id", params.id)
      .maybeSingle();

    let org: { name?: string; logo_url?: string | null; slug?: string } | null = null;
    const orgId = tour?.organizer_id as string | null | undefined;
    if (orgId) {
      const { data: o } = await supabase
        .from("organizers")
        .select("name, logo_url, slug")
        .eq("id", orgId)
        .maybeSingle();
      org = o;
    }
    if (!org) {
      const { data: def } = await supabase
        .from("organizers")
        .select("name, logo_url, slug")
        .eq("slug", "efootball-nepal")
        .maybeSingle();
      org = def;
    }

    return {
      tournament: tour as {
        id?: string;
        name?: string;
        description?: string | null;
        status?: string | null;
      } | null,
      organizer: org,
    };
  },
  head: ({ params, loaderData }) => {
    const tour = loaderData?.tournament;
    const org = loaderData?.organizer;
    const name = tour?.name?.trim() || "Tournament";
    const orgName = org?.name?.trim();
    const desc =
      tour?.description?.trim() ||
      (orgName
        ? `${name} by ${orgName} on NepARENA — fixtures, standings, and results.`
        : `${name} on NepARENA — fixtures, standings, and results.`);
    const image = org?.logo_url || null;
    return {
      ...buildSeoHead({
        title: orgName ? `${name} · ${orgName}` : name,
        description: String(desc).slice(0, 200),
        path: `/tournaments/${params.id}`,
        image,
        type: "website",
      }),
    };
  },
  component: TournamentDetailPage,
});
