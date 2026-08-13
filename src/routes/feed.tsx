import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { SocialFeed } from "@/components/SocialFeed";
import { buildSeoHead } from "@/lib/seo";
import { Newspaper } from "lucide-react";

export const Route = createFileRoute("/feed")({
  head: () => ({
    ...buildSeoHead({
      title: "Feed — NepARENA",
      description: "Community posts, announcements, and updates on NepARENA.",
      path: "/feed",
    }),
  }),
  component: FeedPage,
});

function FeedPage() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-xl px-3 py-6 sm:px-4">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Feed</h1>
            <p className="text-xs text-neutral-500">Newest posts from players & organizers</p>
          </div>
        </div>
        <SocialFeed />
      </div>
    </PageShell>
  );
}
