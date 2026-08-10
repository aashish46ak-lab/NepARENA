/**
 * NepARENA = PLATFORM PROFILE homepage (Facebook / Discord / X style).
 * NOT an organizer directory. No eFootball Nepal cards or tournament lists.
 * Organizers only after "View Organizers" → /organizers.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_NAME } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { AdminChatFab } from "@/components/AdminChatFab";
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
  Download,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${PLATFORM_NAME} — Multi-Organizer eFootball Platform` },
      {
        name: "description",
        content:
          "NepARENA is Nepal's multi-organizer eFootball platform. Verified organizers build independent esports communities.",
      },
      { property: "og:title", content: PLATFORM_NAME },
      { property: "og:site_name", content: PLATFORM_NAME },
    ],
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

function PlatformProfilePage() {
  const { data: stats } = useQuery({
    queryKey: ["platform_home_stats"],
    queryFn: platformStats,
  });

  return (
    <PageShell>
      {/* 1. Platform profile hero */}
      <section className="relative overflow-hidden">
        <div className="h-36 bg-[linear-gradient(135deg,#0a0a0a_0%,#1f1f1f_50%,#2a2a2a_100%)] sm:h-44" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_30%_0%,rgba(212,212,212,0.15),transparent_55%)]" />

        <div className="relative mx-auto max-w-3xl px-4 pb-10">
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            className="-mt-14 h-28 w-28 rounded-3xl object-cover shadow-2xl ring-4 ring-[#0a0a0a] sm:h-32 sm:w-32"
            onError={(e) => {
              e.currentTarget.src = "/android-chrome-512x512.png";
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
            <span>
              <strong className="text-neutral-100">
                {stats?.users?.toLocaleString() ?? "—"}
              </strong>{" "}
              Followers
            </span>
            <span>
              <strong className="text-neutral-100">
                {stats?.organizers?.toLocaleString() ?? "—"}
              </strong>{" "}
              Following
            </span>
            <span>
              <strong className="text-neutral-100">
                {stats?.users?.toLocaleString() ?? "—"}
              </strong>{" "}
              Registered users
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined 2026
            </span>
          </div>

          <p className="mt-6 text-base leading-relaxed text-neutral-300">
            Nepal&apos;s Multi-Organizer eFootball Platform where verified
            tournament organizers build and manage their own esports communities —
            each with independent branding, members, and tournaments.
          </p>

          <div className="mt-8 space-y-6">
            <ProfileBlock title="Mission" icon={Target}>
              Empower independent organizers with professional tools for
              tournaments, members, results, and community growth — without
              forcing every league under one brand name.
            </ProfileBlock>
            <ProfileBlock title="Vision" icon={Eye}>
              Become the standard multi-organizer infrastructure for competitive
              eFootball across Nepal, from local cups to national seasons.
            </ProfileBlock>
            <ProfileBlock title="About NepARENA" icon={Sparkles}>
              NepARENA is a platform, not a single organizer. We provide the
              technology layer so communities keep their identity while players
              share one account across organizers.
            </ProfileBlock>
            <ProfileBlock title="Why NepARENA exists" icon={Rocket}>
              Organizers were rebuilding the same tournament tools again and
              again. NepARENA exists so every community can run professionally on
              shared, reliable infrastructure.
            </ProfileBlock>
            <ProfileBlock title="Why choose NepARENA" icon={CheckCircle2}>
              Multi-tenant dashboards, verified organizers, shared player
              identity, result verification, standings, and room for many leagues
              — without mixing brands or themes.
            </ProfileBlock>
            <ProfileBlock title="Future goals" icon={Trophy}>
              National organizer network, better discovery, mobile-first PWA, and
              tools that scale from neighborhood cups to long competitive seasons.
            </ProfileBlock>
          </div>
        </div>
      </section>

      {/* 2. Founders */}
      <section className="border-t border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="text-xl font-semibold text-neutral-100">Founders</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-400 text-lg font-bold text-black">
                  AK
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                    Founder & CEO
                  </p>
                  <h3 className="text-lg font-semibold">Ashish Khadka</h3>
                  <a
                    href="mailto:aashish46ak@gmail.com"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    aashish46ak@gmail.com
                  </a>
                  <p className="mt-2 text-sm text-neutral-500">
                    Platform creator, system architecture, product vision and
                    roadmap.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 text-lg font-bold text-white">
                  AB
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                    Co-Founder
                  </p>
                  <h3 className="text-lg font-semibold">Ashish Baral</h3>
                  <a
                    href="mailto:baralk851@gmail.com"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    baralk851@gmail.com
                  </a>
                  <p className="mt-2 text-sm text-neutral-500">
                    Platform improvements, feedback, ideas, testing and strategy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Platform statistics */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Platform statistics
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{
              label: "Registered users",
              value: stats?.users,
              icon: Users,
            }, {
              label: "Registered organizers",
              value: stats?.organizers,
              icon: Building2,
            }, {
              label: "Tournaments hosted",
              value: stats?.tournaments,
              icon: Trophy,
            }, {
              label: "Communities",
              value: stats?.communities,
              icon: Sparkles,
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
        </div>
      </section>

      {/* 5. Install NepARENA PWA card */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <InstallNepArenaCard />
        </div>
      </section>

      {/* 6. View Organizers — button only, no cards */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-8 text-center">
            <h2 className="text-xl font-semibold text-neutral-100">
              Explore organizers
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
              Organizers are separate communities on this platform. Open the
              directory to browse verified organizers and their own pages.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 bg-gradient-to-r from-neutral-100 to-neutral-400 text-black hover:opacity-90"
            >
              <Link to="/organizers">
                View Organizers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Chat with Admin — floating */}
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallNepArenaCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    return () => window.removeEventListener("beforeinstallprompt", onBefore);
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-400 text-black">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-neutral-100">Install NepARENA</h2>
          <p className="mt-1 text-sm text-neutral-400">
            {standalone
              ? "You are already running the installed app."
              : "Add NepARENA to your home screen for a fast, app-like experience."}
          </p>
        </div>
      </div>
      {!standalone && (
        <Button
          className="shrink-0 bg-neutral-100 text-black hover:bg-white"
          disabled={!deferred}
          onClick={async () => {
            if (!deferred) return;
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
        >
          {deferred ? "Install app" : "Available in supported browsers"}
        </Button>
      )}
    </div>
  );
}
