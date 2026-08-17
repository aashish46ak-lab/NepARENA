/**
 * Tournament organizer public homepage — tournament-first hub.
 * Layout: sticky horizontal nav → compact hero (Home only) → section content → footer.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageShell } from "@/components/PageShell";
import {
  getOrganizerBySlug, getFollowerCount, followOrganizer, unfollowOrganizer, isFollowing, listOrganizerTeam, DEFAULT_ORGANIZER_SLUG,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Loader2, BadgeCheck, Trophy, MessageCircle, Share2, ExternalLink, History, Radio, Info, Home, Link2, MoreHorizontal, LayoutDashboard, Flag, Newspaper,
} from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getOrCreateDm } from "@/lib/dm";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/lib/platforms";
import { SocialFeed } from "@/components/SocialFeed";

export const Route = createFileRoute("/o/$slug")({
  head: ({ params }) => ({ ...buildSeoHead({ title: `${params.slug} — NepARENA`, description: "Tournament organizer on NepARENA", path: `/o/${params.slug}` }) }),
  component: OrganizerPublicPage,
});

type TabId = "home" | "live" | "history" | "about" | "community";
type Tourney = { id: string; name: string; status: string; starts_at: string | null; ends_at: string | null; game?: string | null; banner_url?: string | null; is_published?: boolean; participants_count?: number | null; max_players?: number | null };
type CommunityLink = { id: string; platform: string; label: string | null; url: string };

const NAV: { id: TabId | "message"; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "live", label: "Live", icon: Radio },
  { id: "history", label: "History", icon: History },
  { id: "message", label: "Message", icon: MessageCircle },
  { id: "about", label: "About", icon: Info },
  { id: "community", label: "Links", icon: Link2 },
];

function OrganizerPublicPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const { data: organizer, isLoading, isError } = useQuery({ queryKey: ["organizer", slug], queryFn: () => getOrganizerBySlug(slug), enabled: !!slug, staleTime: 30_000 });
  const { data: followerCount = 0 } = useQuery({ queryKey: ["org_followers", organizer?.id], queryFn: () => getFollowerCount(organizer!.id), enabled: !!organizer?.id });
  const { data: iFollow = false } = useQuery({ queryKey: ["org_following", organizer?.id, user?.id], queryFn: () => isFollowing(organizer!.id, user!.id), enabled: !!organizer?.id && !!user?.id });
  const { data: team = [] } = useQuery({ queryKey: ["org_team", organizer?.id], queryFn: () => listOrganizerTeam(organizer!.id), enabled: !!organizer?.id });
  const { data: postCount = 0 } = useQuery({
    queryKey: ["org_post_count", organizer?.id], enabled: !!organizer?.id,
    queryFn: async () => { const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("organizer_id", organizer!.id); return count ?? 0; },
  });
  const { data: isStaff = false } = useQuery({
    queryKey: ["org_staff", organizer?.id, user?.id], enabled: !!organizer?.id && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("organizer_members").select("role").eq("organizer_id", organizer!.id).eq("user_id", user!.id).maybeSingle();
      if (data) return true;
      const owner = (organizer as { owner_id?: string | null; owner_user_id?: string | null } | null)?.owner_id || (organizer as { owner_user_id?: string | null } | null)?.owner_user_id;
      return owner === user!.id;
    },
  });

  const isDefault = !!organizer && (organizer.slug === DEFAULT_ORGANIZER_SLUG || /efootball/i.test(organizer.name));
  const { data: tournaments = [] } = useQuery({
    queryKey: ["org_tournaments_v2", organizer?.id, isDefault], enabled: !!organizer?.id,
    queryFn: async () => {
      const cols = "id, name, status, starts_at, ends_at, game, banner_url, is_published, participants_count, max_players, organizer_id";
      const { data: linked } = await supabase.from("tournaments").select(cols).eq("organizer_id", organizer!.id).order("starts_at", { ascending: false }).limit(50);
      let rows = (linked ?? []) as Tourney[];
      if (!rows.length && isDefault) {
        const { data: all } = await supabase.from("tournaments").select(cols).order("starts_at", { ascending: false }).limit(50);
        rows = (all ?? []) as Tourney[];
      }
      return rows;
    },
  });

  const live = useMemo(() => tournaments.filter((t) => ["live", "ongoing", "check_in"].includes(String(t.status))), [tournaments]);
  const upcoming = useMemo(() => tournaments.filter((t) => ["upcoming", "registration_open", "registration_closed", "draft"].includes(String(t.status))), [tournaments]);
  const completed = useMemo(() => tournaments.filter((t) => ["completed", "archived"].includes(String(t.status))), [tournaments]);

  const { data: communityLinks = [] } = useQuery({
    queryKey: ["org_community_links", organizer?.id], enabled: !!organizer?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_links").select("id, platform, label, url, organizer_id").eq("organizer_id", organizer!.id).order("sort_order", { ascending: true }).limit(12);
      if (error) { console.warn("community_links", error.message); return [] as CommunityLink[]; }
      return (data ?? []) as CommunityLink[];
    },
  });

  const ownerId = (organizer as { owner_id?: string | null; owner_user_id?: string | null } | null)?.owner_id || (organizer as { owner_user_id?: string | null } | null)?.owner_user_id || team.find((m) => m.role === "owner")?.user_id || team.find((m) => m.role === "admin")?.user_id || null;

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [menuOpen]);

  const openMenu = () => {
    const el = menuBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setMenuOpen((v) => !v);
  };

  const toggleFollow = async () => {
    if (!user) { toast.message("Sign in to follow"); void navigate({ to: "/auth" }); return; }
    if (!organizer || followBusy) return;
    setFollowBusy(true);
    try {
      if (iFollow) { await unfollowOrganizer(organizer.id, user.id); toast.success("Unfollowed"); }
      else { await followOrganizer(organizer.id, user.id); toast.success("Following"); }
      await qc.invalidateQueries({ queryKey: ["org_following", organizer.id, user.id] });
      await qc.invalidateQueries({ queryKey: ["org_followers", organizer.id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setFollowBusy(false); }
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
    } catch { void navigate({ to: "/messages", search: { with: ownerId } }); }
    finally { setMsgBusy(false); }
  };

  const sharePage = async () => {
    if (!organizer) return;
    const url = `${window.location.origin}/o/${organizer.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: organizer.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {
      try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.message(url); }
    }
    setMenuOpen(false);
  };

  const onNav = (id: TabId | "message") => {
    if (id === "message") { void messageOrganizer(); return; }
    setTab(id);
    requestAnimationFrame(() => {
      const active = navRef.current?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
      active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  };

  if (isLoading) {
    return (<PageShell force="platform" hideChrome><div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div></PageShell>);
  }
  if (isError || !organizer) {
    return (<PageShell force="platform" hideChrome><div className="mx-auto max-w-md px-4 py-20 text-center"><p className="text-neutral-400">Organizer not found.</p><Button asChild className="mt-4"><Link to="/organizers">Browse organizers</Link></Button></div></PageShell>);
  }

  const year = new Date().getFullYear();
  const primaryGame = (organizer as { primary_game?: string | null }).primary_game;
  const banner = (organizer as { cover_url?: string | null }).cover_url || (organizer as { banner_url?: string | null }).banner_url || null;
  const displayName = organizer.name;
  const specialName = organizer.slug;

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-[100dvh] bg-[#0a0a0a] pb-24">
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div ref={navRef} className="mx-auto flex max-w-lg gap-1.5 overflow-x-auto px-2 py-2.5 sm:max-w-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.id !== "message" && tab === item.id;
              return (
                <button key={item.id} type="button" data-tab={item.id} onClick={() => onNav(item.id)} disabled={item.id === "message" && msgBusy} className={cn("flex min-w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-2xl px-3.5 py-2.5 text-[11px] font-semibold transition", active ? "bg-white/12 text-white" : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200")}>
                  <Icon className={cn("h-6 w-6", active && "text-sky-400")} strokeWidth={2} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {tab === "home" && (
          <div className="relative">
            <div className="relative h-24 w-full sm:h-28" style={{ background: banner ? `url(${banner}) center/cover` : "linear-gradient(135deg, rgba(14,165,233,0.28), #0a0a0a 72%)" }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
              <button type="button" disabled={followBusy} onClick={() => void toggleFollow()} className={cn("absolute right-3 top-3 z-10 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-lg transition", iFollow ? "border border-white/25 bg-black/50 text-white backdrop-blur" : "bg-sky-500 text-white hover:bg-sky-400")}>
                {followBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : iFollow ? "Following" : "Follow"}
              </button>
            </div>
            <div className="mx-auto max-w-lg px-3 sm:max-w-2xl sm:px-4">
              <div className="relative -mt-9 flex items-end gap-3">
                <button type="button" onClick={() => organizer.logo_url && setLogoOpen(true)} className="shrink-0 rounded-2xl ring-[3px] ring-[#0a0a0a] shadow-xl" aria-label="View logo">
                  <Avatar className="h-[4.25rem] w-[4.25rem] rounded-2xl sm:h-[4.75rem] sm:w-[4.75rem]">
                    <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-2xl object-cover" />
                    <AvatarFallback className="rounded-2xl text-lg">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="mb-0.5 min-w-0 flex-1 pb-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <h1 className="truncate text-lg font-bold leading-tight text-white sm:text-xl">{displayName}</h1>
                        {organizer.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-400" aria-label="Verified" />}
                      </div>
                      <p className="truncate text-xs text-neutral-500">@{specialName}</p>
                      {primaryGame && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-400/90">{String(primaryGame).replace(/_/g, " ")}</p>}
                    </div>
                    <button ref={menuBtnRef} type="button" onClick={openMenu} className="shrink-0 rounded-full border border-white/12 bg-white/[0.04] p-2 text-neutral-300 hover:bg-white/[0.08]" aria-label="More options">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
                <span><strong className="tabular-nums text-white">{followerCount}</strong> followers</span>
                <span><strong className="tabular-nums text-white">{postCount}</strong> posts</span>
                {tournaments.length > 0 && (
                  <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-400" /><strong className="tabular-nums text-white">{tournaments.length}</strong> tournaments</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={cn("mx-auto max-w-lg px-3 sm:max-w-2xl sm:px-4", tab === "home" ? "mt-4" : "mt-3")}>
          {tab === "home" && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><Newspaper className="h-3.5 w-3.5 text-sky-400" /> Posts</h2>
              <SocialFeed organizerId={organizer.id} organizerMeta={{ name: organizer.name, logo_url: organizer.logo_url, slug: organizer.slug }} hideComposer={!isStaff} emptyLabel={`${organizer.name} is yet to post`} />
            </section>
          )}

          {tab === "live" && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Radio className="h-3.5 w-3.5 text-rose-400" /> Live tournaments</h2>
              {live.length === 0 ? (
                <Empty text={upcoming[0] ? `Nothing live — next up: ${upcoming[0].name}` : "No live tournaments right now"} />
              ) : live.map((t) => <LiveTourneyCard key={t.id} t={t} />)}
              {upcoming.length > 0 && (
                <div className="pt-2">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Upcoming</h3>
                  <div className="space-y-2">{upcoming.slice(0, 6).map((t) => <TourneyRow key={t.id} t={t} badge={String(t.status).replace(/_/g, " ")} badgeClass="bg-amber-500/15 text-amber-200" />)}</div>
                </div>
              )}
            </section>
          )}

          {tab === "history" && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><History className="h-3.5 w-3.5 text-neutral-400" /> Tournament history</h2>
              {completed.length === 0 ? (
                <Empty text={`${organizer.name} is new to the platform — no completed tournaments yet`} />
              ) : (
                <div className="space-y-2">{completed.map((t) => <TourneyRow key={t.id} t={t} badge="Completed" badgeClass="bg-neutral-500/20 text-neutral-300" />)}</div>
              )}
            </section>
          )}

          {tab === "about" && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Info className="h-3.5 w-3.5 text-violet-300" /> About {organizer.name}</h2>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <Avatar className="h-14 w-14 rounded-xl"><AvatarImage src={organizer.logo_url ?? undefined} className="rounded-xl object-cover" /><AvatarFallback className="rounded-xl">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-neutral-500">@{specialName}</p>
                  {primaryGame && <p className="mt-0.5 text-[10px] font-semibold uppercase text-sky-400">{String(primaryGame).replace(/_/g, " ")}</p>}
                </div>
              </div>
              {organizer.description ? <p className="text-sm leading-relaxed text-neutral-300">{organizer.description}</p> : <Empty text="No bio yet" />}
              {team.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Team</p>
                  <div className="space-y-2">
                    {team.map((m) => (
                      <Link key={m.user_id} to="/members/$id" params={{ id: m.user_id }} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 transition hover:bg-white/[0.05]">
                        <Avatar className="h-8 w-8"><AvatarImage src={m.avatar_url ?? undefined} /><AvatarFallback>{(m.full_name || m.username || "?").slice(0, 1)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{m.full_name || m.username || "Member"}</p>
                          <p className="text-[10px] uppercase text-neutral-500">{m.role}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === "community" && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ExternalLink className="h-3.5 w-3.5 text-violet-400" /> Community links</h2>
              {communityLinks.length === 0 ? (
                <Empty text="No community links configured yet" />
              ) : (
                <div className="grid gap-2">
                  {communityLinks.map((l) => (
                    <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition hover:border-violet-400/30 hover:bg-white/[0.06]">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06]"><PlatformIcon platform={l.platform} className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white">{l.label || l.platform}</span>
                        <span className="block truncate text-[11px] text-neutral-500">{l.url.replace(/^https?:\/\//, "")}</span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          <footer className="mt-10 border-t border-white/5 py-6 text-center text-[11px] text-neutral-600">
            <p>{organizer.name} — All rights reserved</p>
            <p className="mt-1">Powered by <Link to="/" className="text-neutral-400 hover:text-neutral-200">NepARENA</Link></p>
            <p className="mt-0.5 text-neutral-700">© {year}</p>
          </footer>
        </div>

        {logoOpen && organizer.logo_url && (
          <button type="button" className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6" onClick={() => setLogoOpen(false)} aria-label="Close logo">
            <img src={organizer.logo_url} alt={organizer.name} className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/20" />
          </button>
        )}

        {menuOpen && menuPos && createPortal(
          <>
            <div className="fixed inset-0 z-[340]" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-white/12 bg-[#161618] py-1 shadow-2xl" style={{ top: menuPos.top, right: menuPos.right }}>
              {isStaff && (
                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); try { localStorage.setItem("neparena-active-organizer-slug", organizer.slug); } catch {} void navigate({ to: "/dashboard" }); }}>
                  <LayoutDashboard className="h-4 w-4 text-emerald-400" /> Go to Dashboard
                </button>
              )}
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => void sharePage()}><Share2 className="h-4 w-4 text-sky-400" /> Share</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); void messageOrganizer(); }}><MessageCircle className="h-4 w-4 text-violet-400" /> Message Organizer</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-neutral-400 hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); toast.message("Thanks — report received for review"); }}><Flag className="h-4 w-4" /> Report</button>
            </div>
          </>,
          document.body,
        )}
      </div>
    </PageShell>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-neutral-500">{text}</p>;
}

function TourneyRow({ t, badge, badgeClass }: { t: Tourney; badge: string; badgeClass: string }) {
  return (
    <Link to="/tournaments/$id" params={{ id: t.id }} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-sky-400/30 hover:bg-white/[0.05]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{t.name}</p>
        <p className="mt-0.5 text-[11px] text-neutral-500">{t.game ? `${t.game} · ` : ""}{t.starts_at ? new Date(t.starts_at).toLocaleDateString() : "Date TBA"}</p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", badgeClass)}>{badge}</span>
    </Link>
  );
}

function LiveTourneyCard({ t }: { t: Tourney }) {
  return (
    <Link to="/tournaments/$id" params={{ id: t.id }} className="flex overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-white/[0.03] to-transparent transition hover:border-rose-400/40">
      <div className="h-[5.5rem] w-[5.5rem] shrink-0 bg-cover bg-center sm:h-24 sm:w-28" style={{ backgroundImage: t.banner_url ? `url(${t.banner_url})` : "linear-gradient(135deg,#be123c55,#0a0a0a)" }} />
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{t.name}</p>
          <span className="shrink-0 rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-200">LIVE</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-neutral-400">{t.game ? `${t.game} · ` : ""}{t.starts_at ? new Date(t.starts_at).toLocaleString() : "Live now"}</p>
        {(t.participants_count != null || t.max_players != null) && (
          <p className="mt-1 text-[11px] text-neutral-500">{t.participants_count ?? 0}{t.max_players != null ? ` / ${t.max_players}` : ""} players</p>
        )}
        <p className="mt-1 text-[11px] font-medium text-sky-300">View tournament →</p>
      </div>
    </Link>
  );
}
