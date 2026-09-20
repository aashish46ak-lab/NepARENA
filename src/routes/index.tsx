/**
 * Home route — feed-first PlatformHomePage.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PlatformHomePage } from "@/components/PlatformHomePage";
import { buildSeoHead, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...buildSeoHead({
      title:
        "NepARENA – Online Tournament Hosting for eFootball & Esports",
      description: SITE_DESCRIPTION,
      path: "/",
      keywords: SITE_KEYWORDS,
    }),
  }),
  component: PlatformHomePage,
});
