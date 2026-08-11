/**
 * NepARENA = PLATFORM PROFILE homepage.
 * Root URL always stays here — shared org links never replace `/`.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_NAME } from "@/lib/organizers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { AdminChatFab } from "@/components/AdminChatFab";
import { buildSeoHead } from "@/lib/seo";
import {
  Users,
  Building2,
  Trophy,
  Sparkles,
  Target,
  Eye,
  Rocket,
  CheckCircle2,
  ArrowRight,
  Calendar,
  ChevronDown,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    ...buildSeoHead({
      title: "NepARENA – Nepal's Multi Organizer Esports Platform",
      description:
        "NepARENA is Nepal's multi-organizer esports platform where tournament organizers manage competitions, members, communities and events.",
      path: "/",
    }),
  }),
  component: PlatformProfilePage,
});

async function platformStats() {
  const [users, organizers, tournaments] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("organizers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("tournaments").select("id", { count: "exact", head: true }),
  ]);
  return {
    users: users.count ?? 0,
    organizers: organizers.count ?? 0,
    communities: organizers.count ?? 0,
    tournaments: tournaments.count ?? 0,
  };
}

const ABOUT_BLOCKS = [
  {
    title: "About NepARENA",
    icon: Sparkles,
    body: "NepARENA is a multi-organizer esports platform that empowers communities, connects players, and elevates Nepal's esports scene to the next level. One Platform. Endless Arenas.",
  },
  {
    title: "Mission",
    icon: Target,
    body: "Empower independent organizers with professional tools for tournaments, members, results, and community growth — without forcing every league under one brand name.",
  },
  {
    title: "Vision",
    icon: Eye,
    body: "Become the standard multi-organizer infrastructure for competitive esports across Nepal, from local cups to national seasons.",
  },
  {
    title: "Why NepARENA exists",
    icon: Rocket,
    body: "Organizers were rebuilding the same tournament tools again and again. NepARENA exists so every community can run professionally on shared, reliable infrastructure.",
  },
  {
    title: "Why choose NepARENA",
    icon: CheckCircle2,
    body: "Multi Organizer · Trusted & Secure · Community Driven · Built for Esports — multi-tenant dashboards, verified organizers, shared player identity, and result verification without mixing brands.",
  },
  {
    title: "Future goals",
    icon: Trophy,
    body: "National organizer network, better discovery, mobile-first PWA, and tools that scale from neighborhood cups to long competitive seasons. Let's grow together and build the future of esports in Nepal.",
  },
];

function PlatformProfilePage() {
  const { user } = useAuth();
  const [aboutOpen, setAboutOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["platform_home_stats"],
    queryFn: platformStats,
  });

  const { data: followingOrgs = [] } = useQuery({
    queryKey: ["home_following_orgs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: follows } = await supabase
        .from("organizer_follows")
        .select("organizer_id")
        .eq("user_id", user!.id);
      const ids = (follows ?? []).map(
        (f: { organizer_id: string }) => f.organizer_id,
      );
      if (ids.length === 0) return [];
      const { data: orgs } = await supabase
        .from("organizers")
        .select("id, name, slug, logo_url, is_verified, status")
        .in("id", ids)
        .eq("status", "active");
      return (orgs ?? []) as {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
        is_verified: boolean;
      }[];
    },
  });

  const previewBlocks = ABOUT_BLOCKS.slice(0, 2);
  const restBlocks = ABOUT_BLOCKS.slice(2);

  return (
    <PageShell force="platform">
      <section className="relative overflow-hidden">
        <div className="relative h-40 sm:h-52 overflow-hidden">
          <img
            src="/neparena-cover.jpg"
            alt="NepARENA cover"
            className="absolute inset-0 h-full w-full object-cover object-center"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.classList.add(
                "bg-[linear-gradient(135deg,#0a0a0a_0%,#1f1f1f_50%,#2a2a2a_100%)]",
              );
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 pb-10">
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            className="-mt-14 h-28 w-28 rounded-3xl object-cover shadow-2xl ring-4 ring-[#0a0a0a] sm:h-32 sm:w-32"
            onError={(e) => {
              e.currentTarget.src = "/pwa-192x192.png";
            }}
          />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {PLATFORM_NAME}
            </h1>
            <Badge className="gap-1 bg-sky-500/20 text-sky-300 hover:bg-sky-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </Badge>
          </div>

          <p className="mt-1 text-sm text-neutral-500">@neparena · Platform</p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-400">
            <Link to="/users" className="hover:text-neutral-200">
              <strong className="text-neutral-100">
                {stats?.users?.toLocaleString() ?? "—"}
              </strong>{" "}
              Followers
            </Link>
            <Link to="/following" className="hover:text-neutral-200">
              <strong className="text-neutral-100">
                {stats?.organizers?.toLocaleString() ?? "—"}
              </strong>{" "}
              Following
            </Link>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined 2026
            </span>
          </div>

          <p className="mt-6 text-base leading-relaxed text-neutral-300">
            Nepal's Multi-Organizer eFootball Platform where verified
            tournament organizers build and manage their own esports communities —
            each with independent branding, members, and tournaments.
          </p>

          <div className="relative mt-6">
            <div className="space-y-4">
              {previewBlocks.slice(0, 1).map((b) => (
                <ProfileBlock key={b.title} title={b.title} icon={b.icon}>
                  {b.body}
                </ProfileBlock>
              ))}
            </div>

            {!aboutOpen && (
              <div className="relative mt-3 max-h-[4.5rem] overflow-hidden">
                <div className="space-y-4 opacity-70">
                  {previewBlocks.slice(1, 2).map((b) => (
                    <ProfileBlock key={b.title} title={b.title} icon={b.icon}>
                      {b.body}
                    </ProfileBlock>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
              </div>
            )}

            {aboutOpen && (
              <div className="mt-4 space-y-4">
                {previewBlocks.slice(1).map((b) => (
                  <ProfileBlock key={b.title} title={b.title} icon={b.icon}>
                    {b.body}
                  </ProfileBlock>
                ))}
                {restBlocks.map((b) => (
                  <ProfileBlock key={b.title} title={b.title} icon={b.icon}>
                    {b.body}
                  </ProfileBlock>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setAboutOpen((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-300 hover:text-white"
            >
              {aboutOpen ? "Show less" : "View more"}
              <ChevronDown
                className={
                  aboutOpen
                    ? "h-4 w-4 rotate-180 transition"
                    : "h-4 w-4 transition"
                }
              />
            </button>
          </div>
        </div>
      </section>

      {followingOrgs.length > 0 && (
        <section className="border-t border-white/5">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
              Following organizers
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {followingOrgs.map((o) => (
                <Link
                  key={o.id}
                  to="/o/$slug"
                  params={{ slug: o.slug }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  {o.logo_url ? (
                    <img
                      src={o.logo_url}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-700 text-sm font-bold">
                      {o.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-100">
                      {o.name}
                    </p>
                    {o.is_verified && (
                      <span className="text-[11px] text-sky-400">Verified</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-8 text-center">
            <h2 className="text-xl font-semibold text-neutral-100">
              Explore organizers
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
              Organizers are separate communities on this platform. Browse
              verified organizers and open their pages.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 bg-gradient-to-r from-neutral-100 to-neutral-400 text-black hover:opacity-90"
            >
              <Link to="/organizers">
                View All Organizers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
            Vision behind NepARENA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-100">
            Founders
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FounderCard
              initials="AK"
              role="Founder"
              name="Ashish Khadka"
              email="aashish46ak@gmail.com"
              focus="Platform Vision & Product Architecture"
              href="/ownership"
            />
            <FounderCard
              initials="AB"
              role="Co-Founder"
              name="Ashish Baral"
              email="baralk851@gmail.com"
              focus="Strategic Planning & Community Growth"
              href="/ownership"
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:neparena2083@gmail.com"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-white/30 hover:bg-white/[0.1]"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
            <a
              href="https://www.facebook.com/share/14jrmfHn22r/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-white/30 hover:bg-white/[0.1]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.93-1.956 1.886v2.26h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
              </svg>
              Facebook
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Platform statistics
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Registered users", value: stats?.users, icon: Users },
              {
                label: "Registered organizers",
                value: stats?.organizers,
                icon: Building2,
              },
              {
                label: "Tournaments hosted",
                value: stats?.tournaments,
                icon: Trophy,
              },
              {
                label: "Communities",
                value: stats?.communities,
                icon: Sparkles,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
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

      <AdminChatFab />
    </PageShell>
  );
}

function ProfileBlock({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
        <Icon className="h-4 w-4 text-neutral-400" />
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{children}</p>
    </div>
  );
}

function FounderCard({
  initials,
  role,
  name,
  email,
  focus,
  href,
}: {
  initials: string;
  role: string;
  name: string;
  email: string;
  focus: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent p-5 transition hover:border-white/25"
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-400 text-lg font-bold text-black">
        {initials}
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        {role}
      </p>
      <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-white">
        {name}
      </h3>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-neutral-400">
        <Mail className="h-3.5 w-3.5" />
        {email}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{focus}</p>
    </Link>
  );
}
