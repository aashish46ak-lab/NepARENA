/**
 * NepARENA platform homepage body.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_NAME } from "@/lib/organizers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { GamesHub } from "@/components/GamesHub";
import { StreakAssistant } from "@/components/StreakAssistant";
import { HomeStreakBadge } from "@/components/HomeStreakBadge";
import { OrganizerCard } from "@/components/OrganizerCard";
import {
  Users,
  Building2,
  Trophy,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Mail,
} from "lucide-react";

const GoatVoteBooth = lazy(() =>
  import("@/components/GoatVoteBooth").then((m) => ({ default: m.GoatVoteBooth })),
);
const ThisOrThatBooth = lazy(() =>
  import("@/components/ThisOrThatBooth").then((m) => ({ default: m.ThisOrThatBooth })),
);
const BeAnOrganizer = lazy(() =>
  import("@/components/BeAnOrganizer").then((m) => ({ default: m.BeAnOrganizer })),
);

async function platformStats() {
  const [users, organizers, tournaments] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("organizers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("tournaments").select("id", { count: "exact", head: true }),
  ]);
  return {
    users: users.count ?? 0,
    organizers: organizers.count ?? 0,
    communities: organizers.count ?? 0,
    tournaments: tournaments.count ?? 0,
  };
}

function SectionFallback() {
  return (
    <div className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
  );
}

export function PlatformHomePage() {
  const { user } = useAuth();
  const { data: stats } = useQuery({
    queryKey: ["platform_home_stats"],
    queryFn: platformStats,
    staleTime: 120_000,
  });

  const { data: followingOrgs = [] } = useQuery({
    queryKey: ["home_following_orgs", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: follows } = await supabase
        .from("organizer_followers")
        .select("organizer_id")
        .eq("user_id", user!.id);
      const ids = (follows ?? []).map((f: { organizer_id: string }) => f.organizer_id);
      if (ids.length === 0) return [];
      const { data: orgs } = await supabase
        .from("organizers")
        .select("id, name, slug, logo_url, banner_url, tagline, is_verified, status")
        .in("id", ids)
        .eq("status", "active");
      const { data: site } = await supabase
        .from("site_settings")
        .select("logo_url, hero_image_url, tagline")
        .limit(1)
        .maybeSingle();
      const brandLogo = (site as { logo_url?: string | null } | null)?.logo_url ?? null;
      const brandBanner = (site as { hero_image_url?: string | null } | null)?.hero_image_url ?? null;
      const brandTag = (site as { tagline?: string | null } | null)?.tagline ?? null;
      return ((orgs ?? []) as {
        id: string; name: string; slug: string; logo_url: string | null;
        banner_url: string | null; tagline: string | null; is_verified: boolean;
      }[]).map((o) => ({
        ...o,
        logo_url: o.logo_url || brandLogo,
        banner_url: o.banner_url || brandBanner,
        tagline: o.tagline || brandTag,
      }));
    },
  });

  const { data: followedTournaments = [] } = useQuery({
    queryKey: ["home_followed_tournaments", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("tournament_participants")
        .select("tournament_id, status")
        .eq("user_id", user!.id)
        .in("status", ["approved", "registered", "pending"]);
      const ids = [...new Set((parts ?? []).map((p: { tournament_id: string }) => p.tournament_id))];
      if (ids.length === 0) return [];
      const { data: tours } = await supabase
        .from("tournaments")
        .select("id, name, status, banner_url, is_published")
        .in("id", ids)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(12);
      return (tours ?? []) as { id: string; name: string; status: string | null; banner_url: string | null }[];
    },
  });

  return (
    <PageShell force="platform">
      <StreakAssistant />
      <section className="relative overflow-hidden">
        <div className="relative h-44 overflow-hidden bg-white sm:h-56">
          <img
            src="/neparena-cover.png"
            alt="NepARENA cover"
            width={1600}
            height={640}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
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
            width={128}
            height={128}
            fetchPriority="high"
            decoding="async"
            className="-mt-14 h-28 w-28 rounded-3xl object-contain bg-black p-1 shadow-2xl ring-4 ring-[#0a0a0a] sm:h-32 sm:w-32"
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
              <strong className="text-neutral-100">{stats?.users?.toLocaleString() ?? "—"}</strong>{" "}
              Registered users
            </Link>
            <Link to="/organizers" className="hover:text-neutral-200">
              <strong className="text-neutral-100">{stats?.organizers?.toLocaleString() ?? "—"}</strong>{" "}
              Organizers
            </Link>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined 2026
            </span>
          </div>

          <p className="mt-6 text-base leading-relaxed text-neutral-300">
            Worldwide multi-organizer esports platform where verified tournament
            organizers build and manage their own communities.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white"
            >
              About Us
              <ArrowRight className="h-4 w-4 text-neutral-500" />
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/25 hover:text-white"
            >
              Go to Feed
              <ArrowRight className="h-4 w-4 text-sky-300" />
            </Link>
          </div>
        </div>
      </section>

      {user && followedTournaments.length > 0 && (
        <section className="border-t border-white/5">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Followed tournaments</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {followedTournaments.map((tour) => (
                <Link
                  key={tour.id}
                  to="/tournaments/$id"
                  params={{ id: tour.id }}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25"
                >
                  {tour.banner_url ? (
                    <img src={tour.banner_url} alt="" width={640} height={160} loading="lazy" decoding="async" className="h-24 w-full object-cover" />
                  ) : (
                    <div className="h-24 w-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
                  )}
                  <div className="p-3">
                    <p className="truncate font-medium text-neutral-100">{tour.name}</p>
                    <p className="text-xs capitalize text-neutral-500">{(tour.status ?? "").replaceAll("_", " ")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {followingOrgs.length > 0 && (
        <section className="border-t border-white/5">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Following organizers</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {followingOrgs.map((o) => (
                <OrganizerCard key={o.id} organizer={o} queryKeyPrefix="home_org_extra" />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-8 text-center">
            <h2 className="text-xl font-semibold text-neutral-100">Explore organizers</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
              Organizers are separate communities on this platform.
            </p>
            <Button asChild size="lg" className="mt-6 bg-gradient-to-r from-neutral-100 to-neutral-400 text-black hover:opacity-90">
              <Link to="/organizers">
                View All Organizers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Vote your GOAT</h2>
            <div className="mt-4">
              <Suspense fallback={<SectionFallback />}>
                <GoatVoteBooth />
              </Suspense>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">This or That</h2>
            <div className="mt-4">
              <Suspense fallback={<SectionFallback />}>
                <ThisOrThatBooth />
              </Suspense>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Play Games</h2>
            <p className="mt-1 text-xs text-neutral-500">Tap the console to open the game list</p>
            <div className="mt-4"><GamesHub /></div>
          </div>
        </div>
      </section>

      <Suspense fallback={<SectionFallback />}>
        <BeAnOrganizer />
      </Suspense>

      <section className="border-t border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">Vision behind NepARENA</p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-100">Founders</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FounderCard initials="AK" role="Founder" name="Ashish Khadka" email="aashish46ak@gmail.com" focus="Platform Vision & Product Architecture" href="/ownership" />
            <FounderCard initials="AB" role="Co-Founder" name="Ashish Baral" email="baralk851@gmail.com" focus="Strategic Planning & Community Growth" href="/ownership" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href="mailto:neparena2083@gmail.com" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-neutral-200">
              <Mail className="h-4 w-4" /> Email
            </a>
            <a href="https://www.facebook.com/share/14jrmfHn22r/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-neutral-200">
              Facebook
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Platform statistics</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Registered users", value: stats?.users, icon: Users },
              { label: "Registered organizers", value: stats?.organizers, icon: Building2 },
              { label: "Tournaments hosted", value: stats?.tournaments, icon: Trophy },
              { label: "Communities", value: stats?.communities, icon: Sparkles },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <s.icon className="mb-2 h-4 w-4 text-neutral-400" />
                <p className="text-2xl font-bold tabular-nums text-neutral-100">
                  {s.value == null ? "—" : s.value.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function FounderCard({
  initials, role, name, email, focus, href,
}: {
  initials: string; role: string; name: string; email: string; focus: string; href: string;
}) {
  return (
    <Link to={href} className="group rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent p-5 transition hover:border-white/25">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-400 text-lg font-bold text-black">{initials}</div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-neutral-500">{role}</p>
      <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-white">{name}</h3>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-neutral-400">
        <Mail className="h-3.5 w-3.5" />
        {email}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{focus}</p>
    </Link>
  );
}
