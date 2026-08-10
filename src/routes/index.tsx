/**
 * NepARENA = PLATFORM homepage.
 * eFootball Nepal is ONLY the first organizer at /o/efootball-nepal.
 * Do NOT treat this as a rename of eFootball Nepal.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listActiveOrganizers,
  getFollowerCount,
  PLATFORM_NAME,
  DEFAULT_ORGANIZER_SLUG,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Trophy,
  Users,
  Swords,
  ArrowRight,
  Shield,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${PLATFORM_NAME} — Multi-Organizer Platform` },
      {
        name: "description",
        content:
          "NepARENA is the multi-organizer esports platform of Nepal. eFootball Nepal is the first organizer.",
      },
      { property: "og:title", content: PLATFORM_NAME },
      { property: "og:site_name", content: PLATFORM_NAME },
    ],
  }),
  component: PlatformHomePage,
});

async function platformStats() {
  const [users, organizers, tournaments, matches] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("organizers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("tournaments").select("id", { count: "exact", head: true }),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .not("home_score", "is", null)
      .not("away_score", "is", null),
  ]);
  return {
    users: users.count ?? 0,
    organizers: organizers.count ?? 0,
    tournaments: tournaments.count ?? 0,
    matches: matches.count ?? 0,
  };
}

async function organizerExtra(organizerId: string) {
  const [members, tournaments, followers] = await Promise.all([
    supabase
      .from("organizer_members")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId),
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId),
    getFollowerCount(organizerId),
  ]);
  let tCount = tournaments.count ?? 0;
  if (tCount === 0) {
    const { count } = await supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true });
    tCount = count ?? 0;
  }
  return {
    members: members.count ?? 0,
    tournaments: tCount,
    followers,
  };
}

function PlatformHomePage() {
  const { data: stats } = useQuery({
    queryKey: ["platform_stats"],
    queryFn: platformStats,
  });
  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["active_organizers"],
    queryFn: listActiveOrganizers,
  });

  const list =
    organizers.length > 0
      ? organizers
      : [
          {
            id: "seed-efn",
            slug: DEFAULT_ORGANIZER_SLUG,
            name: "eFootball Nepal",
            tagline: "The home of competitive eFootball in Nepal",
            description: null,
            logo_url: null,
            banner_url: null,
            is_verified: true,
          },
        ];

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(200,200,200,0.12),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="flex items-center gap-4">
            <img
              src="/neparena-logo.png"
              alt={PLATFORM_NAME}
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/15"
              onError={(e) => {
                e.currentTarget.src = "/android-chrome-512x512.png";
              }}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Platform
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="text-gradient-brand">{PLATFORM_NAME}</span>
              </h1>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Multi-Organizer eFootball Platform of Nepal.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            eFootball Nepal is the first organizer. FIFA Nepal, Pokhara, Butwal
            and more will join under the same platform — each keeps their own
            page, tournaments, and community.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-gradient-brand text-primary-foreground">
              <Link to="/o/$slug" params={{ slug: DEFAULT_ORGANIZER_SLUG }}>
                Open eFootball Nepal <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Platform statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[{
            label: "Signed-up users",
            value: stats?.users,
            icon: Users,
          }, {
            label: "Organizers",
            value: stats?.organizers,
            icon: Building2,
          }, {
            label: "Tournaments",
            value: stats?.tournaments,
            icon: Trophy,
          }, {
            label: "Matches played",
            value: stats?.matches,
            icon: Swords,
          }].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <s.icon className="mb-2 h-4 w-4 text-brand" />
              <p className="text-2xl font-bold tabular-nums">
                {s.value == null ? "—" : s.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 pb-16">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
          <Building2 className="h-5 w-5 text-brand" /> Organizers
        </h2>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading organizers…</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((o) => (
            <OrganizerCard key={o.id} organizer={o} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function OrganizerCard({
  organizer,
}: {
  organizer: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    description?: string | null;
    logo_url: string | null;
    banner_url: string | null;
    is_verified: boolean;
  };
}) {
  const { data: extra } = useQuery({
    queryKey: ["org_extra", organizer.id],
    enabled: organizer.id !== "seed-efn",
    queryFn: () => organizerExtra(organizer.id),
  });

  return (
    <Link
      to="/o/$slug"
      params={{ slug: organizer.slug }}
      className="glass group overflow-hidden rounded-2xl border border-border/50 transition hover:border-brand/40"
    >
      <div className="aspect-[21/9] bg-muted/40">
        {organizer.banner_url ? (
          <img
            src={organizer.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Shield className="h-8 w-8 opacity-40" />
          </div>
        )}
      </div>
      <div className="flex gap-3 p-4">
        {organizer.logo_url ? (
          <img
            src={organizer.logo_url}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
            <Trophy className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold group-hover:text-brand">
              {organizer.name}
            </h3>
            {organizer.is_verified && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {organizer.tagline ||
              organizer.description ||
              "Organizer on NepARENA"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span>{extra?.followers ?? 0} followers</span>
            <span>·</span>
            <span>{extra?.members ?? "—"} members</span>
            <span>·</span>
            <span>{extra?.tournaments ?? "—"} tournaments</span>
          </div>
          {organizer.is_verified && (
            <Badge variant="secondary" className="mt-2 text-[10px]">
              Verified
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
