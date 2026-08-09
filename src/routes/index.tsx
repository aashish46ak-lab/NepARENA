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
      { title: "NepARENA — Tournaments & Community" },
      {
        name: "description",
        content:
          "NepARENA multi-organizer esports tournament platform for Nepal — tournaments, rankings, Hall of Fame, and community.",
      },
      { property: "og:title", content: "NepARENA" },
      {
        property: "og:description",
        content:
          "Multi-organizer esports tournament platform for Nepal.",
      },
      { property: "og:site_name", content: "NepARENA" },
      {
        property: "og:image",
        content: "https://neparena.vercel.app/neparena-logo.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:url",
        content: "https://neparena.vercel.app",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NepARENA" },
      {
        name: "twitter:description",
        content:
          "Multi-organizer esports tournament platform for Nepal.",
      },
      {
        name: "twitter:image",
        content: "https://neparena.vercel.app/neparena-logo.png",
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
  return (
    <Badge className={map[status] ?? "bg-muted"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function HomePage() {
  const settings = useSiteSettings();
  const { data: tournaments } = useTournaments();
  const { data: announcement } = useLatestAnnouncement();
  const { data: hof } = useHallOfFame();
  const { data: history } = useTournamentHistory();
  const { data: gallery } = useGallery();
  const { data: sponsors } = useSponsors();
  const { data: owner } = useOwnerInfo();
  const { data: memberCount } = useMemberCount();
  const { data: latestMembers } = useLatestMembers();

  const live =
    tournaments?.filter(
      (t) =>
        t.status === "ongoing" ||
        t.status === "registration_open" ||
        t.status === "upcoming",
    ) ?? [];

  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/neparena-logo.png"
                  alt="NepARENA"
                  className="h-14 w-14 rounded-2xl object-cover shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = "/android-chrome-512x512.png";
                  }}
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-300/80">
                    Platform
                  </p>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gradient-brand">
                    {settings?.site_name ?? "NepARENA"}
                  </h1>
                </div>
              </div>
              <p className="text-muted-foreground max-w-xl">
                {settings?.tagline ??
                  "Multi-organizer esports tournaments for Nepal. Compete, climb the rankings, and join the community."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="bg-gradient-brand text-primary-foreground">
                  <Link to="/tournaments">
                    View tournaments <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/members">Members</Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {memberCount ?? "—"} members
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="h-4 w-4" /> {tournaments?.length ?? 0}{" "}
                  tournaments
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {announcement && (
        <section className="max-w-7xl mx-auto px-4 pb-8">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 flex gap-3">
            <Megaphone className="h-5 w-5 text-blue-300 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{announcement.title}</p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                {announcement.body}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Live & upcoming
          </h2>
          <Link
            to="/tournaments"
            className="text-sm text-blue-300 hover:underline"
          >
            See all
          </Link>
        </div>
        {live.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active tournaments right now. Check back soon.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                to="/tournaments/$id"
                params={{ id: t.id }}
                className="rounded-xl border border-border/60 bg-card/30 p-4 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium line-clamp-2">{t.name}</p>
                  <StatusBadge status={t.status} />
                </div>
                {t.prize_pool != null && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Prize: {String(t.prize_pool)}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {hof && hof.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Crown className="h-5 w-5" /> Hall of Fame
            </h2>
            <Link
              to="/hall-of-fame"
              className="text-sm text-blue-300 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {hof.slice(0, 8).map((entry: any) => (
              <div
                key={entry.id}
                className="min-w-[140px] rounded-xl border border-border/60 bg-card/30 p-3 text-center"
              >
                <Award className="h-6 w-6 mx-auto text-amber-300" />
                <p className="text-sm font-medium mt-2 line-clamp-2">
                  {entry.player_name ?? entry.title ?? "Champion"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {latestMembers && latestMembers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" /> Members
            </h2>
            <Link to="/members" className="text-sm text-blue-300 hover:underline">
              View more
            </Link>
          </div>
          <div className="space-y-2">
            {latestMembers.slice(0, 5).map((m: any) => (
              <Link
                key={m.id}
                to="/members/$id"
                params={{ id: m.id }}
                className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 hover:bg-white/5"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(m.username ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {m.display_name ?? m.username ?? "Player"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
