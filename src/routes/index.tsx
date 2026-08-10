import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { GuestPopup } from "@/components/GuestPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listActiveOrganizers,
  getFollowerCount,
  PLATFORM_NAME,
} from "@/lib/organizers";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Users, ArrowRight, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${PLATFORM_NAME} — Tournament Platform` },
      {
        name: "description",
        content:
          "NepARENA multi-organizer esports platform. Follow organizers, join tournaments, climb rankings.",
      },
      { property: "og:title", content: PLATFORM_NAME },
      { property: "og:image", content: "https://neparena.xyz/neparena-logo.png" },
      { property: "og:url", content: "https://neparena.xyz" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["active_organizers"],
    queryFn: listActiveOrganizers,
  });

  return (
    <PageShell>
      <GuestPopup />

      <section className="relative overflow-hidden border-b border-border/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(200,200,200,0.1),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-18">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {PLATFORM_NAME}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient-brand">Organizers</span>
            <span className="block text-foreground/90">across Nepal esports</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Pick an organizer to see their tournaments, standings, and community.
            eFootball Nepal and others each have their own page — not mixed on the
            platform home.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!user && (
              <Button asChild className="bg-gradient-brand text-primary-foreground">
                <Link to="/auth">
                  Sign in <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/members">Members</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Building2 className="h-5 w-5 text-brand" /> Organizers
          </h2>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading organizers…</p>
        )}

        {!isLoading && organizers.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
            <p>No active organizers yet.</p>
            <p className="mt-2 text-xs">
              Run SQL 11 + 12 in Supabase to seed eFootball Nepal, then refresh.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizers.map((o) => (
            <OrganizerCard key={o.id} id={o.id} slug={o.slug} name={o.name} tagline={o.tagline} logo={o.logo_url} verified={o.is_verified} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function OrganizerCard({
  id,
  slug,
  name,
  tagline,
  logo,
  verified,
}: {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo: string | null;
  verified: boolean;
}) {
  const { data: followers = 0 } = useQuery({
    queryKey: ["org_followers", id],
    queryFn: () => getFollowerCount(id),
  });

  return (
    <Link
      to="/o/$slug"
      params={{ slug }}
      className="glass group overflow-hidden rounded-2xl border border-border/50 transition hover:border-brand/40"
    >
      <div className="flex items-start gap-4 p-5">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold group-hover:text-brand">{name}</h3>
            {verified && (
              <Badge variant="secondary" className="text-[10px]">
                Verified
              </Badge>
            )}
          </div>
          {tagline && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tagline}</p>
          )}
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {followers} followers · /o/{slug}
          </p>
        </div>
      </div>
    </Link>
  );
}
