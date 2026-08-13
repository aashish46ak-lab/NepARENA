import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SocialFeed } from "@/components/SocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";
import { buildSeoHead } from "@/lib/seo";

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
  const { user } = useAuth();
  const [tab, setTab] = useState<"for_you" | "following">("for_you");
  const [forceComposer, setForceComposer] = useState(false);

  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-xl px-3 pb-24 pt-4">
        <div className="sticky top-[calc(var(--header-h,3.5rem)+2.75rem)] z-20 -mx-3 mb-4 border-b border-white/10 bg-background/90 px-3 backdrop-blur-md">
          <div className="flex">
            <button
              type="button"
              onClick={() => setTab("for_you")}
              className={cn(
                "flex-1 py-3 text-center text-sm font-semibold transition",
                tab === "for_you"
                  ? "border-b-2 border-sky-400 text-white"
                  : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              For You
            </button>
            <button
              type="button"
              onClick={() => setTab("following")}
              className={cn(
                "flex-1 py-3 text-center text-sm font-semibold transition",
                tab === "following"
                  ? "border-b-2 border-sky-400 text-white"
                  : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              Following
            </button>
          </div>
        </div>

        <SocialFeed mode={tab} hideComposer={!user && !forceComposer} />

        {user && (
          <button
            type="button"
            onClick={() => {
              setForceComposer(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 active:scale-95 sm:bottom-8"
            aria-label="Create post"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>
    </PageShell>
  );
}
