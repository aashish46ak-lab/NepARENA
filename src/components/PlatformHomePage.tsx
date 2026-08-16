/**
 * NepARENA platform homepage — guest-clear hero + discovery + feed.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { SocialFeed } from "@/components/SocialFeed";
import { StreakAssistant } from "@/components/StreakAssistant";
import { CreatePostModal } from "@/components/CreatePostModal";
import {
  Newspaper,
  Info,
  Users,
  Swords,
  Gamepad2,
  Sparkles,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";
import { StoriesRow } from "@/components/StoriesRow";
import { cn } from "@/lib/utils";
import { HomeTournamentStrip } from "@/components/HomeTournamentStrip";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { listActiveOrganizers } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";

export function PlatformHomePage() {
  const { user } = useAuth();
  const [pillsVisible, setPillsVisible] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [feedMode, setFeedMode] = useState<"for_you" | "following">("for_you");
  const lastY = useRef(0);

  const { data: organizers = [] } = useQuery({
    queryKey: ["home_organizers_preview"],
    queryFn: () => listActiveOrganizers(),
    staleTime: 60_000,
  });

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

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      if (y < 40) setPillsVisible(true);
      else if (y > lastY.current + 8) setPillsVisible(false);
      else if (y < lastY.current - 8) setPillsVisible(true);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const topOrgs = organizers.slice(0, 4);

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo onCreatePost={user ? () => setPostOpen(true) : undefined} />
      {user && <StreakAssistant />}

      {!user && (
        <section className="relative overflow-hidden border-b border-white/8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_55%)]" />
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-md px-4 pb-6 pt-5 text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
              <Sparkles className="h-3 w-3" /> Nepal’s multi-organizer esports hub
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

      <div className="mx-auto max-w-md px-3 pt-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          Explore
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/tournaments"
            data-onboard="tournaments"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/15 to-transparent p-3.5 transition hover:border-sky-400/40"
          >
            <Swords className="h-5 w-5 text-sky-400" />
            <p className="mt-2 text-sm font-bold text-white">Live Tournaments</p>
            <p className="text-[11px] text-neutral-400">Live & upcoming cups</p>
          </Link>
          <Link
            to="/organizers"
            data-onboard="organizers"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-transparent p-3.5 transition hover:border-violet-400/40"
          >
            <Users className="h-5 w-5 text-violet-300" />
            <p className="mt-2 text-sm font-bold text-white">Organizers</p>
            <p className="text-[11px] text-neutral-400">Communities & brands</p>
          </Link>
          <Link
            to="/games"
            data-onboard="games"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 to-transparent p-3.5 transition hover:border-emerald-400/40"
          >
            <Gamepad2 className="h-5 w-5 text-emerald-300" />
            <p className="mt-2 text-sm font-bold text-white">Games</p>
            <p className="text-[11px] text-neutral-400">Quiz, penalty & more</p>
          </Link>
          <Link
            to="/members"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/15 to-transparent p-3.5 transition hover:border-amber-400/40"
          >
            <BadgeCheck className="h-5 w-5 text-amber-300" />
            <p className="mt-2 text-sm font-bold text-white">Players</p>
            <p className="text-[11px] text-neutral-400">Find & message</p>
          </Link>
        </div>
      </div>

      {topOrgs.length > 0 && (
        <div className="mx-auto max-w-md px-3 pt-4" data-onboard="organizers">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-xs font-semibold text-white">Organizers</span>
            <Link to="/organizers" className="ml-auto text-[11px] font-medium text-sky-400 hover:underline">
              See all
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {topOrgs.map((o) => (
              <Link
                key={o.id}
                to="/o/$slug"
                params={{ slug: o.slug }}
                className="w-40 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-sky-400/30 hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold">
                    {o.logo_url ? (
                      <img src={o.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      o.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{o.name}</p>
                    {o.is_verified && (
                      <span className="text-[10px] text-sky-400">Verified</span>
                    )}
                  </div>
                </div>
                {o.description && (
                  <p className="mt-1.5 line-clamp-2 text-[10px] text-neutral-500">{o.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          "sticky top-12 z-30 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur-md transition-all duration-300",
          pillsVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
        )}
        data-tour="about-members"
      >
        <div className="mx-auto flex max-w-3xl gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
          <Link
            to="/games"
            data-onboard="games-pill"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            <Gamepad2 className="h-3.5 w-3.5 text-emerald-400" />
            Games
          </Link>
          <Link
            to="/tournaments"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            <Swords className="h-3.5 w-3.5 text-sky-400" />
            Cups
          </Link>
          <Link
            to="/organizers"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            <Info className="h-3.5 w-3.5 text-sky-400" />
            Organizers
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-md px-3 pt-3" data-onboard="tournament-strip">
        <HomeTournamentStrip />
      </div>

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
