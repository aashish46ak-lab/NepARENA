/**
 * Homepage — phone: single column; tablet/desktop: wider + side rail.
 */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { GlobalSearchBar } from "@/components/GlobalSearch";
import { SocialFeed } from "@/components/SocialFeed";
import { StreakAssistant } from "@/components/StreakAssistant";
import { CreatePostModal } from "@/components/CreatePostModal";
import { Newspaper, Sparkles, ArrowRight } from "lucide-react";
import { StoriesRow } from "@/components/StoriesRow";
import { cn } from "@/lib/utils";
import { HomeTournamentStrip } from "@/components/HomeTournamentStrip";
import { PendingMatchesPanel } from "@/components/PendingMatchesPanel";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Shared content width ramp by breakpoint */
const shell =
  "mx-auto w-full max-w-md px-3 sm:max-w-2xl sm:px-4 md:max-w-3xl lg:max-w-5xl lg:px-6";

export function PlatformHomePage() {
  const { user } = useAuth();
  const [postOpen, setPostOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [feedMode, setFeedMode] = useState<"for_you" | "following">("for_you");

  const { data: stats } = useQuery({
    queryKey: ["home_quick_stats"],
    queryFn: async () => {
      const [t, p, o] = await Promise.all([
        supabase.from("tournaments").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("organizers")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);
      return {
        tournaments: t.count ?? 0,
        players: p.count ?? 0,
        organizers: o.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo onCreatePost={user ? () => setPostOpen(true) : undefined} />
      {user && <StreakAssistant />}

      <div className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0a0a]/90 py-2.5 backdrop-blur-xl sm:py-3">
        <div className={shell}>
          <GlobalSearchBar />
        </div>
      </div>

      {!user && (
        <section className="relative overflow-hidden border-b border-white/8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_55%)]" />
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div className={cn(shell, "relative pb-6 pt-5 text-center sm:pb-8 sm:pt-8 md:pb-10 md:pt-10")}>
            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-300 sm:text-xs">
              <Sparkles className="h-3 w-3" /> Multi-organizer esports for everyone
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
              Compete. Follow.{" "}
              <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
                Win together.
              </span>
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-400 sm:max-w-md sm:text-base md:max-w-lg">
              Join tournaments, follow organizers, message players, and play skill games — all in one
              place.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-center">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:from-sky-400 hover:to-violet-400 sm:px-8 sm:py-3.5 sm:text-base"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/organizers"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-sky-500/10 sm:px-8 sm:py-3.5 sm:text-base"
              >
                Explore organizers
              </Link>
            </div>
            {stats?.tournaments || stats?.players || stats?.organizers ? (
              <div className="mt-5 flex justify-center gap-4 text-center sm:mt-8 sm:gap-8">
                <div>
                  <p className="text-lg font-bold text-white sm:text-2xl">{stats?.organizers ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 sm:text-xs">
                    Organizers
                  </p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-lg font-bold text-white sm:text-2xl">{stats?.tournaments ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 sm:text-xs">
                    Tournaments
                  </p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-lg font-bold text-white sm:text-2xl">{stats?.players ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 sm:text-xs">
                    Players
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Main grid: phone 1 col · lg+ feed + rail */}
      <div className={cn(shell, "pb-8 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:pt-5")}>
        <div className="min-w-0">
          {user && (
            <div className="mb-3">
              <StoriesRow />
            </div>
          )}

          <div className="lg:hidden" data-onboard="tournament-strip">
            <HomeTournamentStrip />
          </div>

          {user && <PendingMatchesPanel />}

          <section className="border-b border-white/5 lg:border-0" data-onboard="feed">
            <div className="pb-4 pt-4 lg:pt-0">
              <div className="mb-3 flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-sky-400" />
                <h2 className="text-sm font-semibold text-white sm:text-base">Feed</h2>
                <Link
                  to="/feed"
                  className="ml-auto text-xs font-medium text-sky-400 hover:underline sm:text-sm"
                >
                  Open full feed
                </Link>
              </div>

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
                    onClick={() => {
                      setFeedMode(id);
                      setFeedKey((k) => k + 1);
                    }}
                    className={cn(
                      "flex-1 rounded-full py-2 text-xs font-semibold transition sm:py-2.5 sm:text-sm",
                      feedMode === id
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-300",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <SocialFeed key={feedKey} mode={feedMode} hideComposer />
            </div>
          </section>

          {!user && (
            <div className="py-8 text-center lg:hidden">
              <p className="text-sm font-semibold text-white">Ready to compete?</p>
              <p className="mt-1 text-xs text-neutral-500">
                Sign up free — follow organizers, join cups, message players.
              </p>
              <Link
                to="/auth"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-neutral-100"
              >
                Join NepARENA
              </Link>
            </div>
          )}
        </div>

        {/* Desktop / large tablet rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-5">
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              data-onboard="tournament-strip"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Cups
              </p>
              <HomeTournamentStrip />
            </div>
            {!user && (
              <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-b from-sky-500/10 to-transparent p-5 text-center">
                <p className="text-sm font-semibold text-white">Ready to compete?</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Free account — cups, DMs, organizers.
                </p>
                <Link
                  to="/auth"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-neutral-100"
                >
                  Join NepARENA
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {user && (
        <CreatePostModal
          open={postOpen}
          onOpenChange={setPostOpen}
          onPosted={() => {
            setPostOpen(false);
            setFeedKey((k) => k + 1);
          }}
        />
      )}
    </PageShell>
  );
}
