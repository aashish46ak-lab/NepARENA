/**
 * CURRENT eFootball Nepal public website UI.
 * Mounted at /o/efootball-nepal only.
 * Do NOT redesign — this is the existing organizer experience.
 */
import { Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  useTournaments,
  useLatestAnnouncement,
  useHallOfFame,
  useGallery,
  useSponsors,
  useMemberCount,
} from "@/hooks/useContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function OrganizerPublicSite() {
  const settings = useSiteSettings();
  const { data: tournaments = [] } = useTournaments();
  const { data: announcement } = useLatestAnnouncement();
  const { data: hof = [] } = useHallOfFame();
  const { data: gallery = [] } = useGallery();
  const { data: sponsors = [] } = useSponsors();
  const { data: memberCount = 0 } = useMemberCount();
  const featured = tournaments[0];

  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px circle at 20% 20%, oklch(0.5 0.25 245 / 0.4), transparent), radial-gradient(500px circle at 80% 60%, oklch(0.6 0.2 260 / 0.3), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 text-center md:pb-28 md:pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Organizer on NepARENA
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-6xl">
            <span className="text-gradient-brand">
              {settings?.hero_title ?? "eFootball Nepal"}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground md:text-xl">
            {settings?.hero_subtitle ??
              "The official home of competitive eFootball in Nepal — tournaments, community, and glory."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-brand text-primary-foreground glow-brand hover:opacity-90"
            >
              <Link to="/tournaments">
                View tournaments <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-brand/40">
              <Link to="/auth">Join the community</Link>
            </Button>
          </div>
          <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4 text-center">
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-bold text-gradient-brand">{memberCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">Members</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-bold text-gradient-brand">
                {tournaments.length}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Live/Upcoming</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-bold text-gradient-brand">{hof.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">Champions</div>
            </div>
          </div>
        </div>
      </section>

      {announcement && (
        <section className="mx-auto mb-12 max-w-7xl px-4">
          <div className="glass flex items-start gap-4 rounded-2xl p-5 md:p-6">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-brand">
              <Megaphone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-widest text-brand-glow">
                Announcement
              </div>
              <h3 className="mt-1 text-lg font-semibold">{announcement.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {announcement.body}
              </p>
            </div>
          </div>
        </section>
      )}

      {featured && (
        <section className="mx-auto mb-16 max-w-7xl px-4">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Featured Tournament</h2>
            <Link to="/tournaments" className="text-sm text-muted-foreground">
              All tournaments
            </Link>
          </div>
          <div className="glass grid overflow-hidden rounded-2xl md:grid-cols-2">
            <SmartImage
              src={featured.banner_url}
              alt={featured.name}
              className="aspect-video w-full"
              fit="cover"
            />
            <div className="flex flex-col justify-center p-6 md:p-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={featured.status} />
              </div>
              <h3 className="text-2xl font-bold md:text-3xl">{featured.name}</h3>
              {featured.description && (
                <p className="mt-2 text-muted-foreground">{featured.description}</p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {featured.prize_pool && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" /> {featured.prize_pool}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" /> {featured.participants_count} players
                </div>
                {featured.starts_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(featured.starts_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="mt-6">
                <Button asChild className="bg-gradient-brand text-primary-foreground">
                  <Link to="/tournaments/$id" params={{ id: featured.id }}>
                    View tournament
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {hof.length > 0 && (
        <section className="mx-auto mb-12 max-w-7xl px-4">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Crown className="h-5 w-5 text-brand" /> Hall of Fame
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {hof.slice(0, 4).map((h) => (
              <div key={h.id} className="glass rounded-xl p-4">
                <p className="font-medium">{h.player_name}</p>
                <p className="text-xs text-muted-foreground">{h.achievement}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="mx-auto mb-12 max-w-7xl px-4">
          <h2 className="mb-4 text-xl font-semibold">Gallery</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.slice(0, 6).map((g) => (
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

      {sponsors.length > 0 && (
        <section className="mx-auto mb-16 max-w-7xl px-4">
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
    </PageShell>
  );
}
