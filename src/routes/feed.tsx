import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SocialFeed } from "@/components/SocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { buildSeoHead } from "@/lib/seo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const initials = (profile?.username ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-screen bg-[#0a0a0a]">
        <PlatformTopBar onCreatePost={() => setComposerOpen(true)} />

        <div className="sticky top-12 z-30 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex h-11 max-w-md items-center gap-2 px-3">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 hover:bg-white/5 hover:text-white"
              aria-label="Search feed"
              data-tour="search"
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="mx-auto flex flex-1 max-w-xs border-b-0">
              <button
                type="button"
                onClick={() => setTab("for_you")}
                className={cn(
                  "flex-1 py-2.5 text-center text-sm font-semibold transition",
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
                  "flex-1 py-2.5 text-center text-sm font-semibold transition",
                  tab === "following"
                    ? "border-b-2 border-sky-400 text-white"
                    : "text-neutral-500 hover:text-neutral-300",
                )}
              >
                Following
              </button>
            </div>
            {user ? (
              <Link
                to="/members/$id"
                params={{ id: user.id }}
                className="rounded-full ring-1 ring-white/15"
                data-tour="profile"
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
          {searchOpen && (
            <div className="mx-auto flex max-w-md items-center gap-2 border-t border-white/5 px-3 py-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts by text…"
                className="border-white/10 bg-black/30"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mx-auto max-w-md px-3 pb-28 pt-4">
          {query.trim() && (
            <p className="mb-3 text-xs text-neutral-500">
              Filtering posts containing “{query.trim()}”
            </p>
          )}
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
            filterQuery={query}
          />
        </div>
      </div>
    </PageShell>
  );
}
