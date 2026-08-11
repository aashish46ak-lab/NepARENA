/**
 * NepARENA Super Admin route
 */
import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_NAME } from "@/lib/organizers";
import { SuperAdminPanel } from "@/components/platform/SuperAdminPanel";

export const Route = createFileRoute("/platform")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `${PLATFORM_NAME} — Super Admin` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminPanel,
});
