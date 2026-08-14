/**
 * NepARENA platform homepage
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_NAME } from "@/lib/organizers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { GamesHub } from "@/components/GamesHub";
import { StreakAssistant } from "@/components/StreakAssistant";
import { HomeStreakBadge } from "@/components/HomeStreakBadge";
import { CheckCircle2, ArrowRight, Calendar } from "lucide-react";

export function PlatformHomePage() {
  const { user } = useAuth();
  const { data: stats } = useQuery({
    queryKey: ["platform_home_stats"],
    queryFn: async () => {
      const [users, organizers, tournaments] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("organizers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tournaments").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count ?? 0,
        organizers: organizers.count ?? 0,
        tournaments: tournaments.count ?? 0,
      };
    },
    staleTime: 120_000,
  });

  return (
    <PageShell force="platform">
      <StreakAssistant />
      <section className="relative overflow-hidden">
        <div className="relative h-44 overflow-hidden bg-white sm:h-56">
          <img
            src="/neparena-cover.png"
            alt="NepARENA cover"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/neparena-cover.svg";
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 pb-10">
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            className="-mt-14 h-28 w-28 rounded-3xl bg-black p-1 object-contain shadow-2xl ring-4 ring-[#0a0a0a] sm:h-32 sm:w-32"
            onError={(e) => {
              e.currentTarget.src = "/pwa-192x192.png";
            }}
          />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{PLATFORM_NAME}</h1>
            <HomeStreakBadge />
            <Badge className="gap-1 bg-sky-500/20 text-sky-300 hover:bg-sky-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500">@neparena · Platform</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-400">
            <Link to="/users" className="hover:text-neutral-200">
              <strong className="text-neutral-100">{stats?.users?.toLocaleString() ?? "—"}</strong> Registered users
            </Link>
            <Link to="/organizers" className="hover:text-neutral-200">
              <strong className="text-neutral-100">{stats?.organizers?.toLocaleString() ?? "—"}</strong> Organizers
            </Link>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined 2026
            </span>
          </div>
          <p className="mt-6 text-base leading-relaxed text-neutral-300">
            Worldwide multi-organizer esports platform where verified tournament organizers build and manage their own communities.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white"
            >
              About Us <ArrowRight className="h-4 w-4 text-neutral-500" />
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/25 hover:text-white"
            >
              Go to Feed <ArrowRight className="h-4 w-4 text-sky-300" />
            </Link>
            <Link
              to="/messages"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-sky-500/30 hover:bg-sky-500/10"
            >
              Messages
            </Link>
            <Link
              to="/games"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-sky-500/30 hover:bg-sky-500/10"
            >
              Games
            </Link>
          </div>
        </div>
      </section>
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Play Games</h2>
          <GamesHub />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Link to="/organizers" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-medium text-neutral-200 hover:border-white/25">Organizers</Link>
            <Link to="/users" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-medium text-neutral-200 hover:border-white/25">Users</Link>
            <Link to="/tournaments" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-medium text-neutral-200 hover:border-white/25">Tournaments</Link>
            <Link to="/vote/goat" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-medium text-neutral-200 hover:border-white/25">GOAT Vote</Link>
            <Link to="/ownership" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-medium text-neutral-200 hover:border-white/25">Ownership</Link>
            <Link to="/about" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-medium text-neutral-200 hover:border-white/25">About</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
