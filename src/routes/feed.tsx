/** Dedicated Feed — no create post (home only). */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { SocialFeed } from "@/components/SocialFeed";
import { buildSeoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  validateSearch: (s: Record<string, unknown>): { post?: string } => ({
    post: typeof s.post === "string" ? s.post : undefined,
  }),
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
  const [tab, setTab] = useState<"for_you" | "following">("for_you");
  const { post: focusPostId } = Route.useSearch();

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo={false} pageTitle="Feed" />
      <div className="mx-auto max-w-md px-3 pb-28 pt-3">
        <div className="mb-4 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(
            [
              ["for_you", "For You"],
              ["following", "Following"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition",
                tab === id
                  ? "bg-white/10 text-white"
                  : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <SocialFeed mode={tab} hideComposer focusPostId={focusPostId} />
      </div>
    </PageShell>
  );
}
