import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  useTournaments, useLatestAnnouncement, useHallOfFame, useTournamentHistory,
  useGallery, useSponsors, useOwnerInfo, useMemberCount, useLatestMembers,
} from "@/hooks/useContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Calendar, Users, Megaphone, Award, ArrowRight, Sparkles, Crown } from "lucide-react";

export const Route = createFileRoute("/")({
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "eFootball Nepal — Tournaments & Community" },
      {
        name: "description",
        content:
          "Compete in official eFootball tournaments in Nepal. Join the community, climb the Hall of Fame, and follow every season.",
      },
      { property: "og:title", content: "eFootball Nepal" },
      {
        property: "og:description",
        content: "The official home of competitive eFootball tournaments in Nepal.",
      },
      { property: "og:site_name", content: "eFootball Nepal" },
      
      {
        property: "og:image",
        content: "https://efootballnepal.vercel.app/og-image.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:url",
        content: "https://efootballnepal.vercel.app",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "eFootball Nepal" },
      {
        name: "twitter:description",
        content: "The official home of competitive eFootball tournaments in Nepal.",
      },
      {
        name: "twitter:image",
        content: "https://efootballnepal.vercel.app/og-image.png",
      },
    ],
  }),

  component: HomePage,
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    upcoming: "bg-accent/20 text-accent-foreground",
    registration_open: "bg-emerald-500/20 text-emerald-300",
    ongoing: "bg-brand/25 text-brand-glow",
    completed: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[status] ?? "bg-muted"}>{status.replace("_", " ")}</Badge>;
}

function HomePage() {
  const settings = useSiteSettings();
  const { data: tournaments = [] } = useTournaments(3);
  const { data: announcement } = useLatestAnnouncement();
  const { data: hof = [] } = useHallOfFame(4);
  const { data: history = [] } = useTournamentHistory(3);
  const { data: gallery = [] } = useGallery(6);
  const { data: sponsors = [] } = useSponsors();
  const { data: owner } = useOwnerInfo();
  const { data: memberCount = 0 } = useMemberCount();
  const { data: latestMembers = [] } = useLatestMembers(5);
  const featured = tournaments[0];

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(600px circle at 20% 20%, oklch(0.5 0.25 245 / 0.4), transparent), radial-gradient(500px circle at 80% 60%, oklch(0.6 0.2 260 / 0.3), transparent)" }} />
        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <Badge className="mb-4 glass border-brand/40 text-brand-glow">
            <Sparkles className="h-3 w-3 mr-1" /> Phase 1 · Official launch
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-gradient-brand">{settings?.hero_title ?? "eFootball Nepal"}</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {settings?.hero_subtitle ?? "The official home of competitive eFootball in Nepal — tournaments, community, and glory."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90 glow-brand">
              <Link to="/tournaments">View tournaments <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-brand/40">
              <Link to="/auth">Join the community</Link>
            </Button>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg mx-auto text-center">
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-bold text-gradient-brand">{memberCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Members</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-bold text-gradient-brand">{tournaments.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Live/Upcoming</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl font-bold text-gradient-brand">{hof.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Champions</div>
            </div>
          </div>
        </div>
      </section>

      {/* ANNOUNCEMENT */}
      {announcement && (
        <section className="max-w-7xl mx-auto px-4 mb-12">
          <div className="glass rounded-2xl p-5 md:p-6 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center shrink-0">
              <Megaphone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xs uppercase tracking-widest text-brand-glow">Announcement</div>
                {announcement.is_pinned && <Badge variant="outline" className="text-[10px] border-brand/40">Pinned</Badge>}
              </div>
              <h3 className="font-semibold text-lg mt-1">{announcement.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{announcement.body}</p>
            </div>
          </div>
        </section>
      )}

      {/* FEATURED TOURNAMENT */}
      {featured && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <SectionHeading title="Featured Tournament" href="/tournaments" cta="All tournaments" />
          <div className="glass rounded-2xl overflow-hidden grid md:grid-cols-2 gap-0">
            <div className="aspect-video md:aspect-auto bg-secondary relative">
              {featured.banner_url ? (
                <img src={featured.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-brand opacity-20 grid place-items-center"><Trophy className="h-20 w-20 text-brand" /></div>
              )}
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={featured.status} />
                {featured.registration_open && <Badge className="bg-emerald-500/20 text-emerald-300">Registration open</Badge>}
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">{featured.name}</h3>
              {featured.description && <p className="mt-2 text-muted-foreground">{featured.description}</p>}
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {featured.prize_pool && <InfoCell icon={<Award className="h-4 w-4" />} label="Prize Pool" value={featured.prize_pool} />}
                <InfoCell icon={<Users className="h-4 w-4" />} label="Participants" value={String(featured.participants_count)} />
                {featured.starts_at && <InfoCell icon={<Calendar className="h-4 w-4" />} label="Starts" value={new Date(featured.starts_at).toLocaleDateString()} />}
              </div>
              <div className="mt-6">
                <Button asChild className="bg-gradient-brand text-primary-foreground hover:opacity-90">
                  <Link to="/tournaments">Details <ArrowRight className="h-4 w-4 ml-2" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* OWNER */}
      {owner && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <SectionHeading title="Ownership" />
          <div className="glass rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 ring-2 ring-brand/40">
              <AvatarImage src={owner.photo_url ?? undefined} />
              <AvatarFallback className="bg-gradient-brand text-primary-foreground">{owner.name.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Crown className="h-4 w-4 text-brand-glow" />
                <div className="text-xs uppercase tracking-widest text-brand-glow">{owner.title}</div>
              </div>
              <h3 className="text-2xl font-bold mt-1">{owner.name}</h3>
              <p className="text-muted-foreground mt-2">{owner.bio}</p>
            </div>
          </div>
        </section>
      )}

      {/* HALL OF FAME */}
      {hof.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <SectionHeading title="Hall of Fame" href="/hall-of-fame" cta="View all" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hof.map((h) => (
              <div key={h.id} className="glass rounded-2xl p-5 text-center">
                <Avatar className="h-20 w-20 mx-auto ring-2 ring-brand/40">
                  <AvatarImage src={h.photo_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-brand text-primary-foreground">{h.player_name.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h4 className="mt-3 font-semibold">{h.player_name}</h4>
                <div className="text-xs text-brand-glow mt-1">{h.achievement}</div>
                {h.tournament && <div className="text-xs text-muted-foreground mt-1">{h.tournament}{h.year ? ` · ${h.year}` : ""}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* HISTORY */}
      {history.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <SectionHeading title="Tournament History" href="/history" cta="Full history" />
          <div className="grid gap-4 md:grid-cols-3">
            {history.map((h) => (
              <div key={h.id} className="glass rounded-2xl overflow-hidden">
                <div className="aspect-video bg-secondary relative">
                  {h.banner_url ? <img src={h.banner_url} className="absolute inset-0 h-full w-full object-cover" alt="" /> : <div className="absolute inset-0 bg-gradient-brand opacity-15 grid place-items-center"><Trophy className="h-10 w-10 text-brand" /></div>}
                </div>
                <div className="p-4">
                  <div className="text-xs text-brand-glow">{h.year}</div>
                  <h4 className="font-semibold mt-1">{h.tournament_name}</h4>
                  <div className="text-sm text-muted-foreground mt-1">🏆 Winner: <span className="text-foreground">{h.winner}</span></div>
                  {h.runner_up && <div className="text-xs text-muted-foreground">🥈 Runner-up: {h.runner_up}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MEMBERS */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <SectionHeading title="Community" href="/members" cta="All members" />
        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="text-5xl font-bold text-gradient-brand">{memberCount}</div>
              <div className="text-sm text-muted-foreground mt-1">registered members and counting</div>
            </div>
            <Button asChild variant="outline" className="border-brand/40"><Link to="/members">View more</Link></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {latestMembers.map((m) => (
              <div key={m.id} className="rounded-xl bg-white/5 p-3 flex flex-col items-center text-center">
                <Avatar className="h-14 w-14"><AvatarImage src={m.avatar_url ?? undefined} /><AvatarFallback className="bg-gradient-brand text-primary-foreground">{(m.username ?? "U").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="mt-2 font-medium text-sm truncate max-w-full">{m.username ?? "Player"}</div>
                <div className="text-[11px] text-muted-foreground">{m.favourite_club ?? "—"}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">joined {new Date(m.created_at).toLocaleDateString()}</div>
              </div>
            ))}
            {latestMembers.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground py-4">Be the first to join!</div>}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <SectionHeading title="Gallery" href="/gallery" cta="View gallery" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((g) => (
              <div key={g.id} className="glass rounded-xl overflow-hidden aspect-square">
                <img src={g.image_url} alt={g.caption ?? ""} className="h-full w-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SPONSORS */}
      {sponsors.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <SectionHeading title="Sponsors & Partners" />
          <div className="glass rounded-2xl p-6 flex flex-wrap items-center justify-center gap-8">
            {sponsors.map((s) => (
              <a key={s.id} href={s.website_url ?? "#"} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition">
                {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-12 object-contain" /> : <div className="font-semibold">{s.name}</div>}
              </a>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

function SectionHeading({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
      {href && cta && <Link to={href} className="text-sm text-brand-glow hover:underline flex items-center gap-1">{cta} <ArrowRight className="h-3 w-3" /></Link>}
    </div>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">{icon} {label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
