/** Organizer public hub */
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageShell } from "@/components/PageShell";
import {
  getOrganizerBySlug, getFollowerCount, followOrganizer, unfollowOrganizer,
  isFollowing, listOrganizerTeam, DEFAULT_ORGANIZER_SLUG,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Loader2, BadgeCheck, MessageCircle, Share2, ExternalLink, History, Radio, Home,
  MoreHorizontal, LayoutDashboard, Flag, Newspaper, Images, Lock, ImagePlus, Send, Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getOrCreateDm } from "@/lib/dm";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/lib/platforms";
import { SocialFeed } from "@/components/SocialFeed";
import { uploadPublicImage } from "@/lib/upload";

type TabId = "home" | "posts" | "live" | "history" | "gallery";
type Tourney = {
  id: string; name: string; status: string; starts_at: string | null;
  ends_at: string | null; game?: string | null; banner_url?: string | null; is_published?: boolean;
};
type CommunityLink = { id: string; platform: string; label: string | null; url: string };

const NAV: { id: TabId | "message"; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "posts", label: "Posts", icon: Newspaper },
  { id: "live", label: "Live", icon: Radio },
  { id: "history", label: "History", icon: History },
  { id: "message", label: "Message", icon: MessageCircle },
  { id: "gallery", label: "Gallery", icon: Images },
];

export function OrganizerPublicPage() {
  const { slug } = useParams({ from: "/o/$slug" });
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
  const { data: postCount = 0 } = useQuery({
    queryKey: ["org_post_count", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("organizer_id", organizer!.id);
      return count ?? 0;
    },
  });
  const { data: isStaff = false } = useQuery({
    queryKey: ["org_staff", organizer?.id, user?.id],
    enabled: !!organizer?.id && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("organizer_members").select("role").eq("organizer_id", organizer!.id).eq("user_id", user!.id).maybeSingle();
      if (data) return true;
      const owner = (organizer as { owner_id?: string; owner_user_id?: string } | null)?.owner_id
        || (organizer as { owner_user_id?: string } | null)?.owner_user_id;
      return owner === user!.id;
    },
  });

  const isDefault = !!organizer && (organizer.slug === DEFAULT_ORGANIZER_SLUG || /efootball/i.test(organizer.name));
  const { data: tournaments = [] } = useQuery({
    queryKey: ["org_tournaments_v2", organizer?.id, isDefault],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const cols = "id, name, status, starts_at, ends_at, game, banner_url, is_published, organizer_id";
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
    queryKey: ["org_community_links", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_links").select("id, platform, label, url, organizer_id").eq("organizer_id", organizer!.id).order("sort_order", { ascending: true }).limit(12);
      if (error) return [] as CommunityLink[];
      return (data ?? []) as CommunityLink[];
    },
  });

  const { data: galleryItems = [], refetch: refetchGallery } = useQuery({
    queryKey: ["org_gallery", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("id, image_url, body, author_id, created_at").eq("organizer_id", organizer!.id).not("image_url", "is", null).like("body", "[gallery]%").order("created_at", { ascending: false }).limit(48);
      return ((data ?? []) as { id: string; image_url: string; body: string | null; author_id: string | null; created_at: string }[])
        .filter((r) => r.image_url)
        .map((r) => ({ id: r.id, image_url: r.image_url, caption: (r.body || "").replace(/^\[gallery\]\s*/i, "") || null, author_id: r.author_id, created_at: r.created_at }));
    },
  });

  const ownerId =
    (organizer as { owner_id?: string; owner_user_id?: string } | null)?.owner_id
    || (organizer as { owner_user_id?: string } | null)?.owner_user_id
    || team.find((m) => m.role === "owner")?.user_id
    || team.find((m) => m.role === "admin")?.user_id
    || null;

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
      navRef.current?.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
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
  const primaryGame = (organizer as { primary_game?: string | null }).primary_game;
  const banner = (organizer as { cover_url?: string | null }).cover_url || (organizer as { banner_url?: string | null }).banner_url || null;
  const displayName = organizer.name;
  const specialName = organizer.slug;
  const joinedAt = (organizer as { created_at?: string | null }).created_at || null;

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-[100dvh] bg-[#0a0a0a] pb-24">
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div ref={navRef} className="mx-auto flex max-w-lg gap-1.5 overflow-x-auto px-2 py-2 sm:max-w-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.id !== "message" && tab === item.id;
              return (
                <button key={item.id} type="button" data-tab={item.id} onClick={() => onNav(item.id)} disabled={item.id === "message" && msgBusy}
                  className={cn(
                    "flex h-[3.15rem] w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border text-[10px] font-semibold transition",
                    active ? "border-sky-400/40 bg-white/12 text-white" : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:bg-white/[0.06]",
                  )}>
                  <Icon className={cn("h-4 w-4", active && "text-sky-400")} strokeWidth={2} />
                  <span className="max-w-full truncate px-0.5">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {tab === "home" && (
          <div className="relative">
            <div className="relative h-36 w-full sm:h-40" style={{ background: banner ? `url(${banner}) center/cover` : "linear-gradient(135deg, rgba(14,165,233,0.28), #0a0a0a 72%)" }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/45 to-transparent" />
              <button type="button" disabled={followBusy} onClick={() => void toggleFollow()}
                className={cn("absolute right-3 top-3 z-10 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-lg", iFollow ? "border border-white/25 bg-black/50 text-white" : "bg-sky-500 text-white")}>
                {followBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : iFollow ? "Following" : "Follow"}
              </button>
            </div>
            <div className="mx-auto max-w-lg px-3 sm:max-w-2xl sm:px-4">
              <div className="relative -mt-12 flex items-start gap-3 pl-4 sm:pl-6">
                <button type="button" onClick={() => organizer.logo_url && setLogoOpen(true)} className="shrink-0 rounded-2xl ring-[3px] ring-[#0a0a0a] shadow-xl">
                  <Avatar className="h-[4.75rem] w-[4.75rem] rounded-2xl sm:h-20 sm:w-20">
                    <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-2xl object-cover" />
                    <AvatarFallback className="rounded-2xl text-lg">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-5 pt-2 text-xs text-neutral-400">
                  <div>
                    <p className="text-base font-bold tabular-nums text-white">{followerCount}</p>
                    <p className="text-[10px] uppercase tracking-wide">Followers</p>
                  </div>
                  <div>
                    <p className="text-base font-bold tabular-nums text-white">{postCount}</p>
                    <p className="text-[10px] uppercase tracking-wide">Posts</p>
                  </div>
                  <button ref={menuBtnRef} type="button" onClick={openMenu} className="ml-auto rounded-full border border-white/12 bg-white/[0.04] p-2 text-neutral-300">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 pl-4 sm:pl-6">
                <div className="flex flex-wrap items-center gap-1">
                  <h1 className="text-lg font-bold text-white sm:text-xl">{displayName}</h1>
                  {organizer.is_verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                </div>
                <p className="text-xs text-neutral-500">@{specialName}</p>
                {primaryGame && <p className="mt-0.5 text-[10px] font-semibold uppercase text-sky-400/90">{String(primaryGame).replace(/_/g, " ")}</p>}
              </div>
            </div>
          </div>
        )}

        <div className={cn("mx-auto max-w-lg px-3 sm:max-w-2xl sm:px-4", tab === "home" ? "mt-4" : "mt-3")}>
          {tab === "home" && (
            <section className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase text-neutral-500">About</p>
                <p className="text-sm text-neutral-300">{organizer.description || "No bio yet"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-neutral-500"><Calendar className="h-3 w-3" /> Joined platform</p>
                <p className="text-sm text-white">{joinedAt ? new Date(joinedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase text-neutral-500">Tournament type</p>
                <p className="text-sm font-semibold uppercase text-sky-300">{primaryGame ? String(primaryGame).replace(/_/g, " ") : "Not set"}</p>
              </div>
              {team.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase text-neutral-500">Team</p>
                  <div className="space-y-2">
                    {team.map((m) => (
                      <Link key={m.user_id} to="/members/$id" params={{ id: m.user_id }} className="flex items-center gap-2.5 rounded-xl border border-white/8 px-3 py-2 hover:bg-white/[0.05]">
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
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase text-neutral-500">Community links</p>
                {communityLinks.length === 0 ? (
                  <p className="text-sm text-neutral-500">No links configured yet</p>
                ) : (
                  <div className="grid gap-2">
                    {communityLinks.map((l) => (
                      <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-white/8 px-3 py-2.5 hover:border-violet-400/30">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06]"><PlatformIcon platform={l.platform} className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-white">{l.label || l.platform}</span>
                          <span className="block truncate text-[11px] text-neutral-500">{l.url.replace(/^https?:\/\//, "")}</span>
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === "posts" && (
            <SocialFeed organizerId={organizer.id} organizerMeta={{ name: organizer.name, logo_url: organizer.logo_url, slug: organizer.slug }} hideComposer={!isStaff} emptyLabel={`${organizer.name} is yet to post`} />
          )}

          {tab === "live" && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Radio className="h-3.5 w-3.5 text-rose-400" /> Live tournaments</h2>
              {live.length === 0 ? (
                <Empty text={upcoming[0] ? `Nothing live — next up: ${upcoming[0].name}` : "No live tournaments right now"} />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{live.map((t) => <SquareCard key={t.id} t={t} variant="live" />)}</div>
              )}
              {upcoming.length > 0 && (
                <div className="pt-2">
                  <h3 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Upcoming</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{upcoming.slice(0, 8).map((t) => <SquareCard key={t.id} t={t} variant="upcoming" />)}</div>
                </div>
              )}
            </section>
          )}

          {tab === "history" && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><History className="h-3.5 w-3.5" /> Tournament history</h2>
              {completed.length === 0 ? (
                <Empty text={`${organizer.name} is new — no completed tournaments yet`} />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{completed.map((t) => <SquareCard key={t.id} t={t} variant="history" />)}</div>
              )}
            </section>
          )}

          {tab === "gallery" && (
            <GalleryBlock organizerId={organizer.id} items={galleryItems} userId={user?.id} onPosted={() => void refetchGallery()} />
          )}

          <footer className="mt-10 border-t border-white/5 py-6 text-center text-[11px] text-neutral-600">
            <p>{organizer.name} — All rights reserved</p>
            <p className="mt-1">Powered by <Link to="/" className="text-neutral-400 hover:text-neutral-200">NepARENA</Link></p>
            <p className="mt-0.5 text-neutral-700">© {year}</p>
          </footer>
        </div>

        {logoOpen && organizer.logo_url && (
          <button type="button" className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6" onClick={() => setLogoOpen(false)}>
            <img src={organizer.logo_url} alt={organizer.name} className="max-h-[80vh] max-w-full rounded-2xl object-contain" />
          </button>
        )}

        {menuOpen && menuPos && createPortal(
          <>
            <div className="fixed inset-0 z-[340]" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-white/12 bg-[#161618] py-1 shadow-2xl" style={{ top: menuPos.top, right: menuPos.right }}>
              {isStaff && (
                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]"
                  onClick={() => { setMenuOpen(false); try { localStorage.setItem("neparena-active-organizer-slug", organizer.slug); } catch {} void navigate({ to: "/dashboard" }); }}>
                  <LayoutDashboard className="h-4 w-4 text-emerald-400" /> Go to Dashboard
                </button>
              )}
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => void sharePage()}><Share2 className="h-4 w-4 text-sky-400" /> Share</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); void messageOrganizer(); }}><MessageCircle className="h-4 w-4 text-violet-400" /> Message Organizer</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-neutral-400 hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); toast.message("Report received"); }}><Flag className="h-4 w-4" /> Report</button>
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

function SquareCard({ t, variant }: { t: Tourney; variant: "live" | "upcoming" | "history" }) {
  if (t.is_published === false) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-3 text-center">
          <Lock className="h-5 w-5 text-neutral-300" />
          <span className="text-xs font-semibold text-neutral-200">Locked · Not published</span>
        </div>
      </div>
    );
  }
  const badge = variant === "live" ? "LIVE" : variant === "history" ? "Completed" : String(t.status).replace(/_/g, " ");
  const badgeClass = variant === "live" ? "bg-rose-500/25 text-rose-200" : variant === "history" ? "bg-neutral-500/25 text-neutral-300" : "bg-amber-500/20 text-amber-200";
  return (
    <Link to="/tournaments/$id" params={{ id: t.id }}
      className={cn("flex aspect-square flex-col overflow-hidden rounded-2xl border transition",
        variant === "live" ? "border-rose-500/25 from-rose-500/10 bg-gradient-to-br hover:border-rose-400/40" : "border-white/10 bg-white/[0.03] hover:border-sky-400/30")}>
      <div className="h-[45%] w-full bg-cover bg-center" style={{ backgroundImage: t.banner_url ? `url(${t.banner_url})` : "linear-gradient(135deg,#1e293b,#0a0a0a)" }} />
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <div className="flex items-start justify-between gap-1">
            <p className="line-clamp-2 text-sm font-semibold text-white">{t.name}</p>
            <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", badgeClass)}>{badge}</span>
          </div>
          <p className="mt-1 truncate text-[11px] text-neutral-400">{t.game ? `${t.game} · ` : ""}{t.starts_at ? new Date(t.starts_at).toLocaleDateString() : "TBA"}</p>
        </div>
        <p className="text-[11px] font-medium text-sky-300">Open →</p>
      </div>
    </Link>
  );
}

function GalleryBlock({ organizerId, items, userId, onPosted }: {
  organizerId: string;
  items: { id: string; image_url: string; caption: string | null }[];
  userId?: string;
  onPosted: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | null) => {
    if (!file || !userId) { if (!userId) toast.message("Sign in to post"); return; }
    setUploading(true);
    try {
      const url = await uploadPublicImage(file, "efn-public", { folder: "gallery" });
      setPreview(url);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!userId || !preview) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("posts").insert({ author_id: userId, organizer_id: organizerId, body: `[gallery] ${caption.trim()}`.trim(), image_url: preview });
      if (error) throw error;
      toast.success("Posted to gallery");
      setCaption(""); setPreview(null); onPosted();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Images className="h-3.5 w-3.5 text-violet-300" /> Gallery</h2>
      {userId ? (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
          {preview ? (
            <img src={preview} alt="" className="max-h-48 w-full rounded-xl object-cover" />
          ) : (
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-white/15 py-8 text-neutral-400">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
              <span className="text-xs font-medium">Add photo</span>
            </button>
          )}
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional caption" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          <Button size="sm" disabled={!preview || busy} onClick={() => void submit()} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />} Post to gallery
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-neutral-500">Sign in to post in the gallery</p>
      )}
      {items.length === 0 ? (
        <Empty text="No gallery posts yet — be the first" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((g) => (
            <figure key={g.id} className="overflow-hidden rounded-xl border border-white/10">
              <img src={g.image_url} alt="" className="aspect-square w-full object-cover" />
              {g.caption && <figcaption className="truncate px-2 py-1.5 text-[11px] text-neutral-400">{g.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
