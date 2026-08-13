import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SocialFeed } from "@/components/SocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";
import { buildSeoHead } from "@/lib/seo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PLATFORM_NAME } from "@/lib/organizers";

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
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"for_you" | "following">("for_you");
  const [composerOpen, setComposerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const initials = (profile?.username ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Social top bar — not homepage nav */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-3">
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <img
                src="/neparena-logo.png"
                alt=""
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/20"
                onError={(e) => {
                  e.currentTarget.src = "/pwa-192x192.png";
                }}
              />
              <span className="text-base font-semibold tracking-tight text-white">
                {PLATFORM_NAME}
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/"
                className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 hover:bg-white/5 hover:text-white"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Link>
              {user ? (
                <Link
                  to="/members/$id"
                  params={{ id: user.id }}
                  className="rounded-full ring-1 ring-white/15"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-black"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
          <div className="mx-auto flex max-w-xl border-t border-white/5">
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
        </header>

        <div className="mx-auto max-w-xl px-3 pb-28 pt-4">
          <SocialFeed
            key={`${tab}-${refreshKey}`}
            mode={tab}
            hideComposer
            forceComposer={composerOpen}
            onComposerClose={() => setComposerOpen(false)}
            onPosted={() => {
              setComposerOpen(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        </div>

        {user && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
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
