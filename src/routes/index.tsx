/**
 * NepARENA homepage route — page body in PlatformHomePage.
 */
import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PlatformHomePage } from "@/components/PlatformHomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    ...buildSeoHead({
      title: "NepARENA – Worldwide Multi Organizer Esports Platform",
      description:
        "NepARENA is a worldwide multi-organizer esports platform where tournament organizers manage competitions, members, communities and events.",
      path: "/",
    }),
  }),
  component: PlatformHomePage,
});
