/** Organizer public hub — home stats, members, community links, Request to join */
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
  Loader2, BadgeCheck, MessageCircle, Share2, History, Radio, Home,
  MoreHorizontal, LayoutDashboard, Flag, Newspaper, Images, Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/lib/platforms";
import { SocialFeed } from "@/components/SocialFeed";
import { OrganizerChat } from "@/components/OrganizerChat";
import { GalleryBlock } from "@/components/OrganizerGalleryBlock";
import {
  SquareCard,
  Empty,
  isLiveStatus,
  isUpcomingStatus,
  isHistoryStatus,
} from "@/components/OrganizerSquareCard";

type TabId = "home" | "posts" | "live" | "history" | "message" | "gallery";
type Tourney = {
  id: string; name: string; status: string; starts_at: string | null;
  ends_at: string | null; game?: string | null; banner_url?: string | null; is_published?: boolean; registration_open?: boolean;
};

const NAV: { id: TabId; label: string; icon: typeof Home }[] = [
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
      const cols = "id, name, status, starts_at, ends_at, game, banner_url, is_published, organizer_id, registration_open";
      const { data: linked } = await supabase.from("tournaments").select(cols).eq("organizer_id", organizer!.id).order("starts_at", { ascending: false }).limit(50);
      let rows = (linked ?? []) as Tourney[];
      if (!rows.length && isDefault) {
        const { data: all } = await supabase.from("tournaments").select(cols).order("starts_at", { ascending: false }).limit(50);
        rows = (all ?? []) as Tourney[];
      }
      return rows;
    },
  });

  // Live tab = live + upcoming (with LIVE / UPCOMING / REG OPEN tags)
  // History tab = completed / archived only
  const liveAndUpcoming = useMemo(() => {
    const rows = tournaments.filter((t) => {
      const s = String(t.status || "");
      return isLiveStatus(s) || isUpcomingStatus(s);
    });
    return rows.sort((a, b) => {
      const aLive = isLiveStatus(a.status) ? 0 : 1;
      const bLive = isLiveStatus(b.status) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      const at = a.starts_at ? new Date(a.starts_at).getTime() : 0;
      const bt = b.starts_at ? new Date(b.starts_at).getTime() : 0;
      return at - bt;
    });
  }, [tournaments]);
  const completed = useMemo(
    () => tournaments.filter((t) => isHistoryStatus(String(t.status || ""))),
    [tournaments],
  );

  const { data: communityLinks = [] } = useQuery({
    queryKey: ["org_community_links", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_links")
        .select("id, platform, label, url, organizer_id")
        .eq("organizer_id", organizer!.id)
        .order("sort_order", { ascending: true })
        .limit(12);
      if (error) return [] as { id: string; platform: string; label: string | null; url: string }[];
      return (data ?? []) as { id: string; platform: string; label: string | null; url: string }[];
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

  useEffect(() => {
    if (tab !== "message") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [tab]);

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

  const openMessageTab = () => {
    setTab("message");
    requestAnimationFrame(() => {
      navRef.current?.querySelector<HTMLElement>('[data-tab="message"]')?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
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

  const onNav = (id: TabId) => {
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
      <div className={cn("bg-[#0a0a0a]", tab === "message" ? "flex h-[calc(100dvh-5.25rem)] max-h-[calc(100dvh-5.25rem)] flex-col overflow-hidden" : "min-h-[100dvh] pb-24")}>
        <div className={cn("sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-md", tab === "message" && "shrink-0")}>
          <div ref={navRef} className="mx-auto flex max-w-lg gap-1.5 overflow-x-auto px-2 py-2 sm:max-w-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button key={item.id} type="button" data-tab={item.id} onClick={() => onNav(item.id)}
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
          <div className="relative animate-in fade-in duration-300">
            <div className="relative h-36 w-full sm:h-40" style={{ background: banner ? `url(${banner}) center/cover` : "linear-gradient(135deg, rgba(14,165,233,0.28), #0a0a0a 72%)" }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/45 to-transparent" />
              <button type="button" disabled={followBusy} onClick={() => void toggleFollow()}
                className={cn("absolute right-3 top-3 z-10 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-lg transition active:scale-95", iFollow ? "border border-white/25 bg-black/50 text-white" : "bg-sky-500 text-white hover:bg-sky-400")}>
                {followBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : iFollow ? "Following" : "Follow"}
              </button>
            </div>
            <div className="mx-auto max-w-lg px-3 sm:max-w-2xl sm:px-4">
              <div className="relative -mt-12 flex items-start gap-3 pl-4 sm:pl-6">
                <button type="button" onClick={() => organizer.logo_url && setLogoOpen(true)} className="shrink-0 rounded-2xl ring-[3px] ring-[#0a0a0a] shadow-xl transition hover:scale-[1.02] active:scale-[0.98]">
                  <Avatar className="h-[4.75rem] w-[4.75rem] rounded-2xl sm:h-20 sm:w-20">
                    <AvatarImage src={organizer.logo_url ?? undefined} className="rounded-2xl object-cover" />
                    <AvatarFallback className="rounded-2xl text-lg">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-5 pt-2 text-xs text-neutral-400">
                  <Link to="/org-followers/$id" params={{ id: organizer.id }} className="rounded-xl px-1 py-0.5 transition hover:bg-white/[0.06] active:scale-[0.98]">
                    <p className="text-base font-bold tabular-nums text-white">{followerCount}</p>
                    <p className="text-[10px] uppercase tracking-wide">Followers</p>
                  </Link>
                  <div>
                    <p className="text-base font-bold tabular-nums text-white">{postCount}</p>
                    <p className="text-[10px] uppercase tracking-wide">Posts</p>
                  </div>
                  <button ref={menuBtnRef} type="button" onClick={openMenu} className="ml-auto rounded-full border border-white/12 bg-white/[0.04] p-2 text-neutral-300 transition hover:bg-white/[0.08]">
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

        <div className={cn(
          "mx-auto max-w-lg sm:max-w-2xl",
          tab === "message"
            ? "flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 sm:px-4"
            : cn("px-3 sm:px-4", tab === "home" ? "mt-4" : "mt-3"),
        )}>
          {tab === "home" && (
            <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/15">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">About</p>
                <p className="text-sm leading-relaxed text-neutral-300">{organizer.description || "No bio yet"}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/15">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  <Calendar className="h-3 w-3" /> Joined platform
                </p>
                <p className="text-sm font-medium text-white">
                  {joinedAt
                    ? new Date(joinedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/15">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Tournament type</p>
                <p className="text-sm font-semibold uppercase text-sky-300">
                  {primaryGame ? String(primaryGame).replace(/_/g, " ") : "Not set"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center transition hover:border-sky-400/30 hover:bg-sky-500/5">
                  <p className="text-lg font-bold tabular-nums text-white">{tournaments.length}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Organized</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center transition hover:border-rose-400/30 hover:bg-rose-500/5">
                  <p className="text-lg font-bold tabular-nums text-rose-300">
                    {tournaments.filter((t) => isLiveStatus(t.status)).length}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Live</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center transition hover:border-emerald-400/30 hover:bg-emerald-500/5">
                  <p className="text-lg font-bold tabular-nums text-emerald-300">{completed.length}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Finished</p>
                </div>
                <Link
                  to="/org-followers/$id"
                  params={{ id: organizer.id }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center transition hover:border-violet-400/40 hover:bg-violet-500/10 active:scale-[0.98]"
                >
                  <p className="text-lg font-bold tabular-nums text-violet-200">{followerCount}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Members</p>
                </Link>
              </div>

              {team.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/15">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Team</p>
                  <div className="space-y-2">
                    {team.map((m) => (
                      <Link
                        key={m.user_id}
                        to="/members/$id"
                        params={{ id: m.user_id }}
                        className="flex items-center gap-2.5 rounded-xl border border-white/8 px-3 py-2 transition hover:bg-white/[0.05] active:scale-[0.99]"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback>{(m.full_name || m.username || "?").slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{m.full_name || m.username || "Member"}</p>
                          <p className="text-[10px] uppercase text-neutral-500">{m.role}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/15">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Community links</p>
                {communityLinks.length === 0 ? (
                  <p className="text-sm text-neutral-500">No links configured yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {communityLinks.map((l) => {
                      const raw = (l.label || "").trim();
                      const looksLikeUrl =
                        !raw ||
                        /^https?:\/\//i.test(raw) ||
                        /^www\./i.test(raw) ||
                        /[/.]/.test(raw);
                      const display = looksLikeUrl ? (l.platform || "Link") : raw;
                      return (
                        <a
                          key={l.id}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={display}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-violet-400/40 hover:bg-white/[0.07] active:scale-[0.98]"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.08]">
                            <PlatformIcon platform={l.platform} className="h-4 w-4" />
                          </span>
                          <span className="max-w-[8rem] truncate text-sm font-medium text-white">{display}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === "posts" && (
            <SocialFeed organizerId={organizer.id} organizerMeta={{ name: organizer.name, logo_url: organizer.logo_url, slug: organizer.slug }} hideComposer={!isStaff} emptyLabel={`${organizer.name} is yet to post`} />
          )}

          {tab === "live" && (
            <section className="space-y-3 animate-in fade-in duration-300">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Radio className="h-3.5 w-3.5 text-rose-400" /> Live & Upcoming
              </h2>
              {liveAndUpcoming.length === 0 ? (
                <Empty text="No live or upcoming tournaments right now" />
              ) : (
                <div className="space-y-3">
                  {liveAndUpcoming.map((t) => (
                    <SquareCard
                      key={t.id}
                      t={t}
                      variant={isLiveStatus(t.status) ? "live" : "upcoming"}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "history" && (
            <section className="space-y-3 animate-in fade-in duration-300">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><History className="h-3.5 w-3.5" /> Tournament history</h2>
              {completed.length === 0 ? (
                <Empty text={`${organizer.name} is new — no completed tournaments yet`} />
              ) : (
                <div className="space-y-3">{completed.map((t) => <SquareCard key={t.id} t={t} variant="history" />)}</div>
              )}
            </section>
          )}

          {tab === "message" && (
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2">
              <OrganizerChat
                organizerId={organizer.id}
                organizerName={organizer.name}
                organizerLogo={organizer.logo_url}
                organizerOwnerId={ownerId}
                mode="panel"
              />
            </section>
          )}

          {tab === "gallery" && (
            <GalleryBlock organizerId={organizer.id} items={galleryItems} userId={user?.id} onPosted={() => void refetchGallery()} />
          )}

          {tab !== "message" && (
            <footer className="mt-10 border-t border-white/5 py-6 text-center text-[11px] text-neutral-600">
              <p>{organizer.name} — All rights reserved</p>
              <p className="mt-1">Powered by <Link to="/" className="text-neutral-400 hover:text-neutral-200">NepARENA</Link></p>
              <p className="mt-0.5 text-neutral-700">© {year}</p>
            </footer>
          )}
        </div>

        {logoOpen && organizer.logo_url && (
          <button type="button" className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6 animate-in fade-in duration-200" onClick={() => setLogoOpen(false)}>
            <img src={organizer.logo_url} alt={organizer.name} className="max-h-[80vh] max-w-full rounded-2xl object-contain" />
          </button>
        )}

        {menuOpen && menuPos && createPortal(
          <>
            <div className="fixed inset-0 z-[340]" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-white/12 bg-[#161618] py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150" style={{ top: menuPos.top, right: menuPos.right }}>
              {isStaff && (
                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]"
                  onClick={() => { setMenuOpen(false); try { localStorage.setItem("neparena-active-organizer-slug", organizer.slug); } catch {} void navigate({ to: "/dashboard" }); }}>
                  <LayoutDashboard className="h-4 w-4 text-emerald-400" /> Go to Dashboard
                </button>
              )}
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => void sharePage()}><Share2 className="h-4 w-4 text-sky-400" /> Share</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); openMessageTab(); }}><MessageCircle className="h-4 w-4 text-violet-400" /> Message Organizer</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-neutral-400 hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); toast.message("Report received"); }}><Flag className="h-4 w-4" /> Report</button>
            </div>
          </>,
          document.body,
        )}
      </div>
    </PageShell>
  );
}
