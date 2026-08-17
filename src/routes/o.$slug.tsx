import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { OrganizerPublicPage } from "@/components/OrganizerPublicPage";

export const Route = createFileRoute("/o/$slug")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: `${params.slug} — NepARENA`,
      description: "Tournament organizer on NepARENA",
      path: `/o/${params.slug}`,
    }),
  }),
  component: OrganizerPublicPage,
});
