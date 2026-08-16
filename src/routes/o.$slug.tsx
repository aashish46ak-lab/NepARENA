/**
 * Tournament-first organizer public page.
 * Live → Upcoming → Matches → History → Posts → Message → Community
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import {
  getOrganizerBySlug,
  getFollowerCount,
  followOrganizer,
  unfollowOrganizer,
  isFollowing,
  listOrganizerTeam,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, UserPlus, UserMinus, BadgeCheck, Trophy, Users, MessageCircle,
  Share2, ExternalLink, Calendar, History, Radio,
} from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getOrCreateDm } from "@/lib/dm";
import { cn } from "@/lib/utils";
import { SocialFeed } from "@/components/SocialFeed";

export const Route = createFileRoute("/o/$slug")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: `${params.slug} — NepARENA`,
      description: "Tournament organizer on NepARENA",
      path: `/o/${params.slug}`,
    }),
  }),
  component: OrganizerPublicPage,
});

type Tourney = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  game?: string | null;
};

type MatchRow = {
  id: string;
  tournament_id: string;
  round: string | null;
  status: string | null;
  scheduled_at: string | null;
  home_name?: string | null;
  away_name?: string | null;
};

type CommunityLink = { id: string; platform: string; label: string | null; url: string };

function OrganizerPublicPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);

  const { data: organizer, isLoading, isError } = useQuery({
    queryKey: ["organizer", slug],
    queryFn: () => getOrganizerBySlug(slug),
    enabled: !!slug,
    staleTime: 30_000,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["org_followers", organizer?.id],
    queryFn: () => getFollowerCount(organizer!.id),
    enabled: !!organizer?.id,
  });

  const { data: iFollow = false } = useQuery({
    queryKey: ["org_following", organizer?.id, user?.id],
    queryFn: () => isFollowing(organizer!.id, user!.id),
    enabled: !!organizer?.id && !!user?.id,
  });

  const { data: team = [] } = useQuery({
    queryKey: ["org_team", organizer?.id],
    queryFn: () => listOrganizerTeam(organizer!.id),
    enabled: !!organizer?.id,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["org_tournaments", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name, status, start_date, end_date, game")
        .eq("organizer_id", organizer!.id)
        .order("start_date", { ascending: false })
        .limit(40);
      return (data ?? []) as Tourney[];
    },
  });

  const live = tournaments.filter((t) => ["live", "ongoing", "check_in"].includes(t.status));
  const upcoming = tournaments.filter((t) =>
    ["upcoming", "registration_open", "registration_closed", "draft"].includes(t.status),
  );
  const history = tournaments.filter((t) => ["completed", "archived"].includes(t.status));
  const liveIds = live.map((t) => t.id);

  const { data: pendingMatches = [] } = useQuery({
    queryKey: ["org_pending_matches", organizer?.id, liveIds.join(",")],
    enabled: !!organizer?.id && liveIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, tournament_id, round, status, scheduled_at")
        .in("tournament_id", liveIds)
        .in("status", ["scheduled", "pending", "live", "awaiting_result"])
        .order("scheduled_at", { ascending: true })
        .limit(12);
      return (data ?? []) as MatchRow[];
    },
  });

  const { data: communityLinks = [] } = useQuery({
    queryKey: ["org_community_links", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_links")
        .select("id, platform, label, url")
        .order("sort_order", { ascending: true })
        .limit(12);
      if (error) return [] as CommunityLink[];
      return (data ?? []) as CommunityLink[];
    },
  });

  const ownerId =
    organizer?.owner_id ||
    team.find((m) => m.role === "owner")?.user_id ||
    team.find((m) => m.role === "admin")?.user_id ||
    null;

  const toggleFollow = async () => {
    if (!user || !organizer || followBusy) return;
    setFollowBusy(true);
    try {
      if (iFollow) {
        await unfollowOrganizer(organizer.id, user.id);
        toast.success("Unfollowed");
      } else {
        await followOrganizer(organizer.id, user.id);
        toast.success("Following");
      }
      await qc.invalidateQueries({ queryKey: ["org_following", organizer.id, user.id] });
      await qc.invalidateQueries({ queryKey: ["org_followers", organizer.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setFollowBusy(false);
    }
  };

  const messageOrganizer = async () => {
    if (!user) {
      toast.message("Sign in to message the organizer");
      void navigate({ to: "/auth" });
      return;
    }
    if (!ownerId) {
      toast.error("Organizer contact unavailable");
      return;
    }
    if (ownerId === user.id) {
      toast.message("This is your organizer page");
      return;
    }
    setMsgBusy(true);
    try {
      const convId = await getOrCreateDm(ownerId);
      if (!convId) throw new Error("Could not open conversation");
      void navigate({ to: "/messages", search: { c: convId } as any });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Message failed");
    } finally {
      setMsgBusy(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      </PageShell>
    );
  }

  if (isError || !organizer) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-neutral-400">Organizer not found.</p>
          <Button asChild className="mt-4"><Link to="/organizers">Browse organizers</Link></Button>
        </div>
      </PageShell>
    );
  }

  const year = new Date().getFullYear();

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-[100dvh] bg-[#0a0a0a] pb-20">
        <div
          className="relative h-28 w-full sm:h-36"
          style={{
            background: organizer.cover_url
              ? `url(${organizer.cover_url}) center/cover`
              : "linear-gradient(135deg, rgba(14,165,233,0.35), #0a0a0a 70%)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        </div>

        <div className="mx-auto max-w-lg px-3 sm:px-4">
          <div className="-mt-10 flex items-end gap-3">
            <button type="button" onClick={() => organizer.logo_url && setLogoOpen(true)} className="rounded-2xl ring-[3px] ring-[#0a0a0a]" aria-label="View logo">
              <Avatar className="h-[4.5rem] w-[4.5rem] rounded-2xl">
                <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-2xl object-cover" />
                <AvatarFallback className="rounded-2xl text-lg">{organizer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </button>
            <div className="mb-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">{organizer.name}</h1>
                {organizer.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-400" />}
              </div>
              <p className="text-xs text-neutral-500">@{organizer.slug}</p>
            </div>
          </div>

          {organizer.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-snug text-neutral-300">{organizer.description}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
              <Users className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold tabular-nums text-white">{followerCount}</span> followers
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold tabular-nums text-white">{tournaments.length}</span> tournaments
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {user && (
              <Button size="sm" variant={iFollow ? "secondary" : "default"} className="rounded-full" disabled={followBusy} onClick={() => void toggleFollow()}>
                {followBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : iFollow ? <UserMinus className="mr-1.5 h-3.5 w-3.5" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
                {iFollow ? "Following" : "Follow"}
              </Button>
            )}
            <Button size="sm" className="rounded-full bg-sky-500 text-white hover:bg-sky-400" disabled={msgBusy} onClick={() => void messageOrganizer()}>
              {msgBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="mr-1.5 h-3.5 w-3.5" />}
              Message Organizer
            </Button>
            <Button size="sm" variant="outline" className="rounded-full border-white/15" onClick={async () => {
              const url = `${window.location.origin}/o/${organizer.slug}`;
              try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
              catch { toast.message(url); }
            }}>
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
            </Button>
          </div>

          <Section title="Live tournaments" icon={Radio} accent="text-rose-400">
            {live.length === 0 ? (
              <Empty text={upcoming[0] ? `Next up: ${upcoming[0].name}` : "No live tournaments right now"} />
            ) : (
              <div className="space-y-2">{live.map((t) => <TourneyCard key={t.id} t={t} badge="LIVE" badgeClass="bg-rose-500/20 text-rose-300" />)}</div>
            )}
          </Section>

          {upcoming.length > 0 && (
            <Section title="Upcoming" icon={Calendar} accent="text-amber-400">
              <div className="space-y-2">{upcoming.slice(0, 6).map((t) => (
                <TourneyCard key={t.id} t={t} badge={t.status.replace(/_/g, " ")} badgeClass="bg-amber-500/15 text-amber-200" />
              ))}</div>
            </Section>
          )}

          {pendingMatches.length > 0 && (
            <Section title="Upcoming matches" icon={Trophy} accent="text-sky-400">
              <div className="space-y-2">
                {pendingMatches.map((m) => {
                  const tourney = tournaments.find((t) => t.id === m.tournament_id);
                  return (
                    <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{m.home_name || "TBD"} vs {m.away_name || "TBD"}</p>
                        <Badge variant="outline" className="shrink-0 border-white/10 text-[10px] capitalize">{m.status || "scheduled"}</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {tourney?.name ?? "Tournament"}{m.round ? ` · ${m.round}` : ""}
                        {m.scheduled_at ? ` · ${new Date(m.scheduled_at).toLocaleString()}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Tournament history" icon={History} accent="text-neutral-400">
            {history.length === 0 ? <Empty text="No completed tournaments yet" /> : (
              <div className="space-y-2">{history.slice(0, 8).map((t) => (
                <TourneyCard key={t.id} t={t} badge="Done" badgeClass="bg-white/10 text-neutral-300" />
              ))}</div>
            )}
          </Section>

          <Section title="Posts" icon={null} accent="text-sky-400">
            <SocialFeed
              organizerId={organizer.id}
              organizerMeta={{ name: organizer.name, logo_url: organizer.logo_url, slug: organizer.slug }}
              hideComposer
            />
          </Section>

          {communityLinks.length > 0 && (
            <Section title="Community links" icon={ExternalLink} accent="text-violet-400">
              <div className="flex flex-wrap gap-2">
                {communityLinks.map((l) => (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/[0.08]">
                    <ExternalLink className="h-3 w-3 text-neutral-500" />{l.label || l.platform}
                  </a>
                ))}
              </div>
            </Section>
          )}

          {team.length > 0 && (
            <div className="mt-8 border-t border-white/5 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Team</p>
              <div className="flex flex-wrap gap-2">
                {team.slice(0, 8).map((m) => {
                  const name = m.full_name?.trim() || m.username?.trim() || "Member";
                  return (
                    <Link key={`${m.user_id}-${m.role}`} to="/members/$id" params={{ id: m.user_id }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-2.5 text-xs text-neutral-300 hover:bg-white/[0.06]">
                      <Avatar className="h-5 w-5"><AvatarImage src={m.avatar_url ?? undefined} /><AvatarFallback className="text-[9px]">{name.slice(0, 1)}</AvatarFallback></Avatar>
                      {name}<span className="text-[10px] capitalize text-neutral-500">{m.role}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <footer className="mt-10 border-t border-white/5 py-6 text-center text-[11px] text-neutral-600">
            © {year} {organizer.name}. All Rights Reserved.
            <span className="mx-1.5">·</span>
            <Link to="/" className="text-neutral-500 hover:text-neutral-300">NepARENA</Link>
          </footer>
        </div>

        {logoOpen && organizer.logo_url && (
          <button type="button" className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6" onClick={() => setLogoOpen(false)} aria-label="Close logo">
            <img src={organizer.logo_url} alt={organizer.name} className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/20" />
          </button>
        )}
      </div>
    </PageShell>
  );
}

function Section({ title, icon: Icon, accent, children }: { title: string; icon: typeof Trophy | null; accent: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-white">
        {Icon ? <Icon className={cn("h-3.5 w-3.5", accent)} /> : null}{title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-neutral-500">{text}</p>;
}

function TourneyCard({ t, badge, badgeClass }: { t: Tourney; badge: string; badgeClass: string }) {
  return (
    <Link to="/tournaments/$id" params={{ id: t.id }}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-sky-400/30 hover:bg-white/[0.05]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{t.name}</p>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          {t.game ? `${t.game} · ` : ""}{t.start_date ? new Date(t.start_date).toLocaleDateString() : "Date TBA"}
        </p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", badgeClass)}>{badge}</span>
    </Link>
  );
}
