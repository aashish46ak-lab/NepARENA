import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import {
  useTournaments,
  useAnnouncements,
  useHallOfFame,
  useGallery,
  useSponsors,
  useOwnerInfo,
  useMemberCount,
  useLatestMembers,
} from "@/hooks/useContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SmartImage } from "@/components/SmartImage";
import {
  Trophy,
  Calendar,
  Users,
  Megaphone,
  Award,
  ArrowRight,
  Crown,
} from "lucide-react";

export const Route = createFileRoute("/")({
  // Client-render home like localhost — avoids SSR/hydrate mismatch blank screen on Vercel
  ssr: false,
  head: () => ({
    meta: [
      { title: "NepARENA — Tournaments & Community" },
      {
        name: "description",
        content:
          "NepARENA multi-organizer esports tournament platform for Nepal — tournaments, rankings, Hall of Fame, and community.",
      },
      { property: "og:title", content: "NepARENA" },
      {
        property: "og:description",
        content: "Multi-organizer esports tournament platform for Nepal.",
      },
      { property: "og:site_name", content: "NepARENA" },
      {
        property: "og:image",
        content: "https://neparena.xyz/neparena-logo.png",
      },
      { property: "og:url", content: "https://neparena.xyz" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    upcoming: "bg-accent/20 text-accent-foreground",
    registration_open: "bg-emerald-500/20 text-emerald-300",
    ongoing: "bg-brand/25 text-brand-glow",
    live: "bg-brand/25 text-brand-glow",
    completed: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={map[status] ?? "bg-muted"}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

function HomePage() {
  const { data: tournaments = [] } = useTournaments();
  const { data: announcements = [] } = useAnnouncements();
  const { data: hof = [] } = useHallOfFame();
  const { data: gallery = [] } = useGallery();
  const { data: sponsors = [] } = useSponsors();
  const { data: owner } = useOwnerInfo();
  const { data: memberCount } = useMemberCount();
  const { data: latestMembers = [] } = useLatestMembers();

  const live = tournaments.filter((t) =>
    ["live", "ongoing", "registration_open"].includes(t.status),
  );
  const featured = tournaments.filter((t) => t.is_featured).slice(0, 3);
  const show = (featured.length ? featured : tournaments).slice(0, 6);

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(200,200,200,0.12),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            NepARENA
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient-brand">Tournament platform</span>
            <span className="block text-foreground/90">for Nepal esports</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Host leagues, follow organizers, climb standings, and build your
            competitive profile — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-gradient-brand text-primary-foreground">
              <Link to="/tournaments">
                View tournaments <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/hall-of-fame">Hall of Fame</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand" />
              {tournaments.length} tournaments
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              {memberCount ?? "—"} members
            </span>
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand" />
              {live.length} live / open
            </span>
          </div>
        </div>
      </section>

      {show.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="text-xl font-semibold">Tournaments</h2>
            <Link
              to="/tournaments"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              See all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {show.map((t) => (
              <Link
                key={t.id}
                to="/tournaments/$id"
                params={{ id: t.id }}
                className="glass group overflow-hidden rounded-2xl border border-border/50 transition hover:border-brand/40"
              >
                <div className="aspect-[16/9] bg-muted/30">
                  {t.banner_url ? (
                    <SmartImage
                      src={t.banner_url}
                      alt={t.name}
                      className="h-full w-full"
                      fit="cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">
                      <Trophy className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug group-hover:text-brand">
                      {t.name}
                    </h3>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.participants_count ?? 0} players
                    {Number(t.prize_pool) > 0
                      ? ` · NPR ${Number(t.prize_pool).toLocaleString()}`
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {announcements.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Megaphone className="h-5 w-5 text-brand" /> Announcements
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {announcements.slice(0, 4).map((a) => (
              <div key={a.id} className="glass rounded-xl p-4">
                <p className="font-medium">{a.title}</p>
                {a.body && (
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {a.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {hof.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Crown className="h-5 w-5 text-brand" /> Hall of Fame
            </h2>
            <Link to="/hall-of-fame" className="text-sm text-muted-foreground">
              Full list
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {hof.slice(0, 3).map((h) => (
              <div key={h.id} className="glass flex items-center gap-3 rounded-xl p-4">
                {h.photo_url ? (
                  <img
                    src={h.photo_url}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-primary-foreground">
                    <Award className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{h.player_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.achievement}
                    {h.tournament ? ` · ${h.tournament}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {latestMembers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Members</h2>
            <Link to="/members" className="text-sm text-muted-foreground">
              View more
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {latestMembers.slice(0, 8).map((m) => (
              <Link
                key={m.id}
                to="/members/$id"
                params={{ id: m.id }}
                className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(m.username ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {m.username ?? "Player"}
              </Link>
            ))}
          </div>
        </section>
      )}

      {sponsors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Partners
          </h2>
          <div className="flex flex-wrap items-center gap-6 opacity-80">
            {sponsors.map((s) =>
              s.logo_url ? (
                <img
                  key={s.id}
                  src={s.logo_url}
                  alt={s.name}
                  className="h-8 object-contain"
                />
              ) : (
                <span key={s.id} className="text-sm text-muted-foreground">
                  {s.name}
                </span>
              ),
            )}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 pb-16">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Gallery</h2>
            <Link to="/gallery" className="text-sm text-muted-foreground">
              Open gallery
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {gallery.slice(0, 4).map((g) => (
              <div key={g.id} className="aspect-square overflow-hidden rounded-xl">
                <SmartImage
                  src={g.image_url}
                  alt={g.caption ?? ""}
                  className="h-full w-full"
                  fit="cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {owner && (
        <section className="border-t border-border/40 py-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 text-sm text-muted-foreground">
            {owner.photo_url && (
              <img
                src={owner.photo_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <span>Platform by NepARENA</span>
          </div>
        </section>
      )}
    </PageShell>
  );
}
