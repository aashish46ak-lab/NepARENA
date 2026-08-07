import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  useTournaments,
  useLatestAnnouncement,
  useHallOfFame,
  useTournamentHistory,
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
  head: () => ({
    meta: [
      { title: "eFootball Nepal — Tournaments & Community" },
      {
        name: "description",
        content: "Official eFootball Nepal platform for tournaments, rankings, community, Hall of Fame, and esports updates.",
      },
      { property: "og:title", content: "eFootball Nepal" },
      {
        property: "og:description",
        content: "Official eFootball Nepal platform for tournaments, rankings, community, Hall of Fame, and esports updates.",
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
      {
        property: "og:image:secure_url",
        content: "https://efootballnepal.vercel.app/og-image.png",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "eFootball Nepal" },
      {
        name: "twitter:description",
        content: "Official eFootball Nepal platform for tournaments, rankings, community, Hall of Fame, and esports updates.",
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
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(600px circle at 20% 20%, oklch(0.5 0.25 245 / 0.4), transparent), radial-gradient(500px circle at 80% 60%, oklch(0.6 0.2 260 / 0.3), transparent)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-gradient-brand">{settings?.hero_title ?? "eFootball Nepal"}</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {settings?.hero_subtitle ??
              "The official home of competitive eFootball in Nepal — tournaments, community, and glory."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-brand text-primary-foreground hover:opacity-90 glow-brand"
            >
              <Link to="/tournaments">
                View tournaments <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
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

      {announcement && (
        <section className="max-w-7xl mx-auto px-4 mb-12">
          <div className="glass rounded-2xl p-5 md:p-6 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center shrink-0">
              <Megaphone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xs uppercase tracking-widest text-brand-glow">Announcement</div>
                {announcement.is_pinned && (
                  <Badge variant="outline" className="text-[10px] border-brand/40">Pinned</Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg mt-1">{announcement.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{announcement.body}</p>
            </div>
          </div>
        </section>
      )}

      {featured && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <SectionHeading title="Featured Tournament" href="/tournaments" cta="All tournaments" />
          <div className="glass rounded-2xl overflow-hidden grid md:grid-cols-2 gap-0">
            <SmartImage
              src={featured.banner_url}
              alt={featured.name}
              ratio="aspect-video"
              fallback={
                <div className="absolute inset-0 bg-gradient-brand opacity-20 grid place-items-center">
                  <Trophy className="h-20 w-20 text-brand" />
                </div>
              }
            />
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={featured.status} />
                {featured.registration_open && (
                  <Badge className="bg-emerald-500/20 text-emerald-300">Registration open</Badge>
                )}
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">{featured.name}</h3>
              {featured.description && (
                <p className="mt-2 text-muted-foreground">{featured.description}</p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {featured.prize_pool && (
                  <InfoCell icon={<Award className="h-4 w-4" />} label="Prize Pool" value={featured.prize_pool} />
                )}
                <InfoCell icon={<Users className="h-4 w-4" />} label="Participants" value={String(featured.participants_count)} />
                {featured.starts_at && (
                  <InfoCell icon={<Calendar className="h-4 w-4" />} label="Starts" value={new Date(featured.starts_at).toLocaleDateString()} />
                )}
              </div>
              <div className="mt-6">
                <Button asChild className="bg-gradien