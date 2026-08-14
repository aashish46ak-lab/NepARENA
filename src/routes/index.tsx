/**
 * Home route — feed-first PlatformHomePage.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PlatformHomePage } from "@/components/PlatformHomePage";
import { buildSeoHead } from "@/lib/seo";
import { PLATFORM_NAME } from "@/lib/organizers";

export const Route = createFileRoute("/")({
  head: () => ({
    ...buildSeoHead({
      title: `${PLATFORM_NAME} — Esports Platform`,
      description:
        "NepARENA — multi-organizer esports platform. Feed, tournaments, games, and community.",
      path: "/",
    }),
  }),
  component: PlatformHomePage,
});
