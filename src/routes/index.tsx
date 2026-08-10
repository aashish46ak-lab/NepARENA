/**
 * NepARENA PLATFORM homepage only.
 * Zero eFootball Nepal tournaments/standings/players here.
 * Organizers live at /organizers and /o/$slug.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_NAME } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { AdminChatFab } from "@/components/AdminChatFab";
import { PlatformPulse } from "@/components/PlatformPulse";
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
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${PLATFORM_NAME} — Multi-Organizer eFootball Platform` },
      {
        name: "description",
        content:
          "NepARENA is Nepal's multi-organizer eFootball platform where verified tournament organizers build and manage their own esports communities.",
      },
      { property: "og:title", content: PLATFORM_NAME },
      { property: "og:site_name", content: PLATFORM_NAME },
    ],
  }),
  component: PlatformHomePage,
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

function PlatformHomePage() {
  const { data: stats } = useQuery({
    queryKey: ["platform_home_stats"],
    queryFn: platformStats,
  });

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,212,212,0.12),_transparent_55%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            className="mx-auto h-20 w-20 rounded-2xl object-cover ring-1 ring-white/20 shadow-2xl"
            onError={(e) => {
              e.currentTarget.src = "/android-chrome-512x512.png";
            }}
          />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
            Platform
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-500 bg-clip-text text-transparent">
              {PLATFORM_NAME}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-400 sm:text-lg">
            Nepal's Multi-Organizer eFootball Platform where verified
            tournament organizers can build and manage their own esports
            communities.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-neutral-100 to-neutral-400 text-black hover:opacity-90"
            >
              <Link to="/organizers">
                View Organizers <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/15">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-14 sm:grid-cols-3">
        {[{
          icon: Sparkles,
          title: "Why NepARENA exists",
          body: "Nepal's esports organizers need one trusted platform — without forcing every league into a single brand.",
        }, {
          icon: Target,
          title: "Mission",
          body: "Empower independent organizers with professional tools for tournaments, members, results and community growth.",
        }, {
          icon: Eye,
          title: "Vision",
          body: "Become the standard multi-organizer infrastructure for competitive eFootball across Nepal.",
        }].map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
          >
            <c.icon className="mb-3 h-5 w-5 text-neutral-300" />
            <h2 className="font-semibold text-neutral-100">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{c.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Platform statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[{
            label: "Registered users",
            value: stats?.users,
            icon: Users,
          }, {
            label: "Registered organizers",
            value: stats?.organizers,
            icon: Building2,
          }, {
            label: "Communities",
            value: stats?.communities,
            icon: Sparkles,
          }, {
            label: "Tournaments hosted",
            value: stats?.tournaments,
            icon: Trophy,
          }].map((s) => (
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
      </section>

      <PlatformPulse />

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent">
          <div className="h-28 bg-[linear-gradient(135deg,#1a1a1a,#2a2a2a)]" />
          <div className="relative px-6 pb-8 pt-0">
            <img
              src="/neparena-logo.png"
              alt=""
              className="-mt-10 h-20 w-20 rounded-2xl object-cover ring-4 ring-[#0a0a0a]"
              onError={(e) => {
                e.currentTarget.src = "/android-chrome-512x512.png";
              }}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{PLATFORM_NAME}</h2>
              <Badge className="bg-sky-500/20 text-sky-300">Verified</Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-400">Joined 2026 · Platform · Nepal</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-400">
              <span>
                <strong className="text-neutral-100">{stats?.users ?? "—"}</strong> users
              </span>
              <span>
                <strong className="text-neutral-100">{stats?.organizers ?? "—"}</strong>{" "}
                organizers
              </span>
            </div>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-400">
              <p>
                <strong className="text-neutral-200">About. </strong>
                NepARENA is infrastructure for esports organizers — not a single
                league brand. Each organizer keeps their identity, theme and community.
              </p>
              <p>
                <strong className="text-neutral-200">Why we built it. </strong>
                Organizers were rebuilding the same tools again and again. We built
                one platform so every community can run professionally.
              </p>
              <p>
                <strong className="text-neutral-200">Why choose NepARENA. </strong>
                Multi-tenant dashboards, verified organizers, shared player identity,
                and room for FIFA Nepal, Pokhara, Butwal and more — without mixing brands.
              </p>
              <p>
                <strong className="text-neutral-200">Future goals. </strong>
                National organizer network, better discovery, mobile-first PWA, and
                tools that scale from local cups to long seasons.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="mb-6 text-xl font-semibold text-neutral-100">Founders</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-neutral-200 to-neutral-500 text-lg font-bold text-black">
                AK
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-500">
                  Owner · Founder & CEO
                </p>
                <h3 className="text-lg font-semibold">Ashish Khadka</h3>
                <a
                  href="mailto:aashish46ak@gmail.com"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
                >
                  <Mail className="h-3.5 w-3.5" /> aashish46ak@gmail.com
                </a>
                <p className="mt-3 text-sm text-neutral-400">
                  Platform creator, system architecture, product vision and future roadmap.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 text-lg font-bold text-white">
                AB
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-500">Co-Founder</p>
                <h3 className="text-lg font-semibold">Ashish Baral</h3>
                <a
                  href="mailto:baralk851@gmail.com"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
                >
                  <Mail className="h-3.5 w-3.5" /> baralk851@gmail.com
                </a>
                <p className="mt-3 text-sm text-neutral-400">
                  Platform improvements, feedback, ideas, testing and strategic advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">Explore organizers</h2>
            <p className="mt-1 text-sm text-neutral-400">
              eFootball Nepal and future leagues each keep their own page and branding.
            </p>
          </div>
          <Button
            asChild
            className="bg-gradient-to-r from-neutral-100 to-neutral-400 text-black"
          >
            <Link to="/organizers">
              View Organizers <Rocket className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <AdminChatFab />
    </PageShell>
  );
}
