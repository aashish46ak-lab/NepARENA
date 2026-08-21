/**
 * NepARENA platform homepage — guest-clear hero + discovery + feed.
 */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { GlobalSearchBar } from "@/components/GlobalSearch";
import { SocialFeed } from "@/components/SocialFeed";
import { StreakAssistant } from "@/components/StreakAssistant";
import { CreatePostModal } from "@/components/CreatePostModal";
import {
  Newspaper,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { StoriesRow } from "@/components/StoriesRow";
import { cn } from "@/lib/utils";
import { HomeTournamentStrip } from "@/components/HomeTournamentStrip";
import { HomeInfoGrid } from "@/components/HomeInfoGrid";
import { PendingMatchesPanel } from "@/components/PendingMatchesPanel";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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
        supabase.from("organizers").select("id", { count: "exact", head: true }).eq("status", "active"),
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

      <div className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0a0a]/90 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <GlobalSearchBar />
        </div>
      </div>

      {!user && (
        <section className="relative overflow-hidden border-b border-white/8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_55%)]" />
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-md px-4 pb-6 pt-5 text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
              <Sparkles className="h-3 w-3" /> Multi-organizer esports for everyone
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Compete. Follow.{" "}
              <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
                Win together.
              </span>
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
              Join tournaments, follow organizers, message players, and play skill games — all in one place.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:from-sky-400 hover:to-violet-400"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/organizers"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-sky-500/10"
              >
                Explore organizers
              </Link>
            </div>
            {(stats?.tournaments || stats?.players || stats?.organizers) ? (
              <div className="mt-5 flex justify-center gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{stats?.organizers ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">Organizers</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-lg font-bold text-white">{stats?.tournaments ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">Tournaments</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-lg font-bold text-white">{stats?.players ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">Players</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {user && (
        <div className="mx-auto max-w-md px-3 pt-2">
          <StoriesRow />
        </div>
      )}

      <div className="mx-auto max-w-md px-3 pt-3" data-onboard="tournament-strip">
        <HomeTournamentStrip />
      </div>

      {user && <PendingMatchesPanel />}

      <HomeInfoGrid />

      <section className="border-b border-white/5" data-onboard="feed">
        <div className="mx-auto max-w-md px-3 pb-8 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Feed</h2>
            <Link to="/feed" className="ml-auto text-xs font-medium text-sky-400 hover:underline">
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
                  "flex-1 rounded-full py-2 text-xs font-semibold transition",
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
        <div className="mx-auto max-w-md px-4 py-8 text-center">
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
