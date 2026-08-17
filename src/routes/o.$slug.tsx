/**
 * Tournament-first organizer public page (all organizers).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import {
  getOrganizerBySlug, getFollowerCount, followOrganizer, unfollowOrganizer,
  isFollowing, listOrganizerTeam, DEFAULT_ORGANIZER_SLUG,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Loader2, UserPlus, UserMinus, BadgeCheck, Trophy, Users, MessageCircle,
  Share2, ExternalLink, Calendar, History, Radio, ChevronRight, Info,
} from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getOrCreateDm } from "@/lib/dm";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/lib/platforms";

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
  id: string; name: string; status: string; starts_at: string | null; ends_at: string | null;
  game?: string | null; banner_url?: string | null; is_published?: boolean;
  participants_count?: number | null; max_players?: number | null;
};
type CommunityLink = { id: string; platform: string; label: string | null; url: string };
type PostPreview = { id: string; body: string | null; image_url: string | null; created_at: string };

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

  const isDefault =
    !!organizer &&
    (organizer.slug === DEFAULT_ORGANIZER_SLUG || /efootball/i.test(organizer.name));

  const { data: tournaments = [] } = useQuery({
    queryKey: ["org_tournaments_v2", organizer?.id, isDefault],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const cols =
        "id, name, status, starts_at, ends_at, game, banner_url, is_published, participants_count, max_players, organizer_id";
      const { data: linked } = await supabase.from("tournaments").select(cols).eq("organizer_id", organizer!.id).order("starts_at", { ascending: false }).limit(50);
      let rows = (linked ?? []) as Tourney[];
      if (!rows.length && isDefault) {
        const { data: all } = await supabase.from("tournaments").select(cols).order("starts_at", { ascending: false }).limit(50);
        rows = (all ?? []) as Tourney[];
      }
      return rows;
    },
  });

  const live = tournaments.filter((t) => ["live", "ongoing", "check_in"].includes(String(t.status)));
  const upcoming = tournaments.filter((t) =>
    ["upcoming", "registration_open", "registration_closed", "draft"].includes(String(t.status)),
  );
  const completedCount = tournaments.filter((t) => ["completed", "archived"].includes(String(t.status))).length;

  const { data: postsPreview = [] } = useQuery({
    queryKey: ["org_posts_preview", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("id, body, image_url, created_at").eq("organizer_id", organizer!.id).order("created_at", { ascending: false }).limit(2);
      return (data ?? []) as PostPreview[];
    },
  });

  const { data: communityLinks = [] } = useQuery({
    queryKey: ["org_community_links", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_links").select("id, platform, label, url").order("sort_order", { ascending: true }).limit(12);
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
      if (iFollow) { await unfollowOrganizer(organizer.id, user.id); toast.success("Unfollowed"); }
      else { await followOrganizer(organizer.id, user.id); toast.success("Following"); }
      await qc.invalidateQueries({ queryKey: ["org_following", organizer.id, user.id] });
      await qc.invalidateQueries({ queryKey: ["org_followers", organizer.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setFollowBusy(false);
    }
  };

  const messageOrganizer = async () => {
    if (!user) { toast.message("Sign in to message the organizer"); void navigate({ to: "/auth" }); return; }
    if (!ownerId) { toast.error("Organizer contact unavailable"); return; }
    if (ownerId === user.id) { toast.message("This is your organizer page"); return; }
    setMsgBusy(true);
    try {
      const convId = await getOrCreateDm(ownerId);
      if (convId) void navigate({ to: "/messages", search: { c: convId } });
      else void navigate({ to: "/messages", search: { with: ownerId } });
    } catch {
      void navigate({ to: "/messages", search: { with: ownerId } });
    } finally {
      setMsgBusy(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
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
          <div className="-mt-12">
            <button type="button" onClick={() => organizer.logo_url && setLogoOpen(true)} className="rounded-2xl ring-[3px] ring-[#0a0a0a] shadow-lg" aria-label="View logo">
              <Avatar className="h-20 w-20 rounded-2xl sm:h-[5.25rem] sm:w-[5.25rem]">
                <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-2xl object-cover" />
                <AvatarFallback className="rounded-2xl text-xl">{organizer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </button>
          </div>

          <div className="mt-3 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="break-words text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">{organizer.name}</h1>
              {organizer.is_verified && <BadgeCheck className="h-5 w-5 shrink-0 text-sky-400" aria-label="Verified" />}
            </div>
            <p className="mt-0.5 break-all text-sm text-neutral-500">@{organizer.slug}</p>
          </div>

          {organizer.description && (
            <p className="mt-2.5 text-sm leading-relaxed text-neutral-300">{organizer.description}</p>
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
              <Empty text={upcoming[0] ? `No live events — next: ${upcoming[0].name}` : "No live tournaments right now"} />
            ) : (
              <div className="space-y-2.5">{live.map((t) => <LiveTourneyCard key={t.id} t={t} />)}</div>
            )}
          </Section>

          {upcoming.length > 0 && (
            <Section title="Upcoming" icon={Calendar} accent="text-amber-400">
              <div className="space-y-2">{upcoming.slice(0, 6).map((t) => (
                <TourneyRow key={t.id} t={t} badge={String(t.status).replace(/_/g, " ")} badgeClass="bg-amber-500/15 text-amber-200" />
              ))}</div>
            </Section>
          )}

          <Section title="Tournament history" icon={History} accent="text-neutral-400">
            <Link
              to="/o/$slug/history"
              params={{ slug: organizer.slug }}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition hover:border-sky-400/30 hover:bg-white/[0.05]"
            >
              <div>
                <p className="text-sm font-medium text-white">View full history</p>
                <p className="text-[11px] text-neutral-500">
                  {completedCount > 0 ? `${completedCount} completed` : "Past tournaments, latest first"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" />
            </Link>
          </Section>

          <Section title="Posts" icon={null} accent="text-sky-400">
            {postsPreview.length === 0 ? (
              <Empty text={`${organizer.name} is yet to post`} />
            ) : (
              <div className="space-y-2">{postsPreview.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  {p.body && <p className="line-clamp-3 text-sm text-neutral-200">{p.body}</p>}
                  {p.image_url && <img src={p.image_url} alt="" className="mt-2 max-h-36 w-full rounded-lg object-cover" />}
                  <p className="mt-1 text-[10px] text-neutral-500">{new Date(p.created_at).toLocaleString()}</p>
                </div>
              ))}</div>
            )}
            <Link
              to="/o/$slug/posts"
              params={{ slug: organizer.slug }}
              className="mt-2 flex items-center justify-center gap-1 rounded-full border border-white/10 py-2 text-xs font-semibold text-sky-300 transition hover:bg-white/[0.04]"
            >
              View all posts <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Section>

          <Section title="About" icon={Info} accent="text-violet-300">
            <Link
              to="/o/$slug/about"
              params={{ slug: organizer.slug }}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition hover:border-violet-400/30 hover:bg-white/[0.05]"
            >
              <div>
                <p className="text-sm font-medium text-white">About & team</p>
                <p className="text-[11px] text-neutral-500">Created date, who manages</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" />
            </Link>
          </Section>

          {communityLinks.length > 0 && (
            <Section title="Community links" icon={ExternalLink} accent="text-violet-400">
              <div className="flex flex-wrap gap-2">
                {communityLinks.map((l) => (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:bg-white/[0.08]">
                    <PlatformIcon platform={l.platform} className="h-3.5 w-3.5" />
                    {l.label || l.platform}
                  </a>
                ))}
              </div>
            </Section>
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

function TourneyRow({ t, badge, badgeClass }: { t: Tourney; badge: string; badgeClass: string }) {
  return (
    <Link to="/tournaments/$id" params={{ id: t.id }}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-sky-400/30 hover:bg-white/[0.05]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{t.name}</p>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          {t.game ? `${t.game} · ` : ""}{t.starts_at ? new Date(t.starts_at).toLocaleDateString() : "Date TBA"}
        </p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", badgeClass)}>{badge}</span>
    </Link>
  );
}

function LiveTourneyCard({ t }: { t: Tourney }) {
  return (
    <Link
      to="/tournaments/$id"
      params={{ id: t.id }}
      className="flex overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-white/[0.03] to-transparent transition hover:border-rose-400/40"
    >
      <div
        className="h-[5.5rem] w-[5.5rem] shrink-0 bg-cover bg-center sm:h-24 sm:w-28"
        style={{
          backgroundImage: t.banner_url
            ? `url(${t.banner_url})`
            : "linear-gradient(135deg,#be123c55,#0a0a0a)",
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{t.name}</p>
          <span className="shrink-0 rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-200">LIVE</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-neutral-400">
          {t.game ? `${t.game} · ` : ""}
          {t.starts_at ? new Date(t.starts_at).toLocaleString() : "Live now"}
        </p>
        {(t.participants_count != null || t.max_players != null) && (
          <p className="mt-1 text-[11px] text-neutral-500">
            {t.participants_count ?? 0}{t.max_players != null ? ` / ${t.max_players}` : ""} players
          </p>
        )}
        <p className="mt-1 text-[11px] font-medium text-sky-300">Open →</p>
      </div>
    </Link>
  );
}
