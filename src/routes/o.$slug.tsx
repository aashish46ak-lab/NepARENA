/**
 * Organizer public profile — theme-aware cover, join cards, share isolation.
 * Announcements expand on tap.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  followOrganizer,
  getOrganizerBySlug,
  isFollowing,
  unfollowOrganizer,
  getFollowerCount,
} from "@/lib/organizers";
import {
  setOrganizerContext,
  setOrganizerThemeContext,
  organizerShareUrl,
} from "@/lib/organizer-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, Users, Bell, BellOff, Share2, History, Image, Info, Swords, Medal, Megaphone, Pin,
} from "lucide-react";
import { toast } from "sonner";
import { PendingMatchesPanel } from "@/components/PendingMatchesPanel";
import { OrganizerChatFab } from "@/components/OrganizerChatFab";
import { getTheme } from "@/lib/themes";
import { PlatformIcon } from "@/lib/platforms";

export const Route = createFileRoute("/o/$slug")({
  loader: async ({ params }) => {
    const org = await getOrganizerBySlug(params.slug);
    return { org };
  },
  head: ({ params, loaderData }) => {
    const org = loaderData?.org as { name?: string; description?: string | null; tagline?: string | null; logo_url?: string | null; banner_url?: string | null } | null | undefined;
    const name = org?.name ?? params.slug;
    const desc = org?.description || org?.tagline || `${name} — organizer on NepARENA`;
    const rawImg = org?.logo_url || org?.banner_url || "https://neparena.xyz/neparena-logo.png";
    const image = rawImg.startsWith("http") ? rawImg : `https://neparena.xyz${rawImg.startsWith("/") ? "" : "/"}${rawImg}`;
    const url = `https://neparena.xyz/o/${params.slug}`;
    return {
      meta: [
        { title: `${name} — NepARENA` },
        { name: "description", content: desc },
        { property: "og:title", content: name },
        { property: "og:description", content: desc },
        { property: "og:image", content: image },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "NepARENA" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: name },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: OrganizerPublicPage,
});

function OrganizerPublicPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<string | null>(null);

  const { data: organizer, isLoading } = useQuery({
    queryKey: ["organizer", slug],
    queryFn: () => getOrganizerBySlug(slug),
  });

  useEffect(() => {
    if (!organizer) return;
    setOrganizerContext({ slug: organizer.slug, id: organizer.id, name: organizer.name, logo_url: organizer.logo_url });
    setOrganizerThemeContext({
      slug: organizer.slug,
      theme_id: (organizer as { theme_id?: string | null }).theme_id,
      primary_color: organizer.primary_color,
      secondary_color: organizer.secondary_color,
    });
  }, [organizer]);

  const { data: following, refetch: refetchFollow } = useQuery({
    queryKey: ["following", organizer?.id, user?.id],
    enabled: !!organizer?.id && !!user?.id,
    queryFn: () => isFollowing(organizer!.id, user!.id),
  });

  const { data: followers = 0 } = useQuery({
    queryKey: ["org_followers", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: () => getFollowerCount(organizer!.id),
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["org-tournaments", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const withOrg = await supabase.from("tournaments").select("id, name, slug, status, banner_url, prize_pool, participants_count, is_published, registration_open").eq("organizer_id", organizer!.id).eq("is_published", true).order("created_at", { ascending: false }).limit(24);
      if (withOrg.data?.length) return withOrg.data;
      if (slug === "efootball-nepal") {
        const { data } = await supabase.from("tournaments").select("id, name, slug, status, banner_url, prize_pool, participants_count, is_published, registration_open").eq("is_published", true).order("created_at", { ascending: false }).limit(24);
        return data ?? [];
      }
      return [];
    },
  });

  const { data: site } = useQuery({
    queryKey: ["site_settings_public", organizer?.id],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      return data as { logo_url?: string | null; hero_image_url?: string | null; tagline?: string; about_short?: string } | null;
    },
  });

  const { data: myJoins = [], refetch: refetchJoins } = useQuery({
    queryKey: ["my_joins", user?.id, (tournaments as { id: string }[]).map((x) => x.id).join(",")],
    enabled: !!user?.id && (tournaments as { id: string }[]).length > 0,
    queryFn: async () => {
      const ids = (tournaments as { id: string }[]).map((x) => x.id);
      const { data } = await supabase.from("tournament_participants").select("tournament_id, status").eq("user_id", user!.id).in("tournament_id", ids);
      return (data ?? []) as { tournament_id: string; status: string }[];
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["org_announcements", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("id, title, body, image_url, is_pinned, created_at").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(8);
      if (error) return [];
      return (data ?? []) as { id: string; title: string; body: string; image_url: string | null; is_pinned: boolean; created_at: string }[];
    },
  });

  const { data: communityLinks = [] } = useQuery({
    queryKey: ["community_links_public", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data } = await supabase.from("community_links").select("id, platform, label, url, sort_order").order("sort_order", { ascending: true }).limit(24);
      return (data ?? []) as { id: string; platform: string; label: string; url: string }[];
    },
  });

  const joinStatus = (tid: string) => myJoins.find((j) => j.tournament_id === tid)?.status ?? null;

  const requestJoin = async (tournamentId: string) => {
    if (!user) { toast.message("Sign in to request joining"); return; }
    const { error } = await supabase.from("tournament_participants").insert({ tournament_id: tournamentId, user_id: user.id, player_name: user.email?.split("@")[0] ?? "Player", status: "pending" });
    if (error) { toast.error(error.message); return; }
    toast.success("Join request sent");
    void refetchJoins();
  };

  const toggleFollow = async () => {
    if (!user) { toast.message("Sign in to follow organizers"); return; }
    if (!organizer) return;
    setFollowBusy(true);
    if (following) { await unfollowOrganizer(organizer.id, user.id); toast.success("Unfollowed"); }
    else { await followOrganizer(organizer.id, user.id); toast.success("Following"); }
    setFollowBusy(false);
    void refetchFollow();
    void qc.invalidateQueries({ queryKey: ["org_followers", organizer.id] });
    void qc.invalidateQueries({ queryKey: ["home_following_orgs"] });
  };

  const share = async () => {
    const url = organizerShareUrl(slug);
    const title = organizer?.name ?? slug;
    try {
      if (navigator.share) await navigator.share({ title, url, text: `Join ${title} on NepARENA` });
      else { await navigator.clipboard.writeText(url); toast.success("Share link copied"); }
    } catch {
      try { await navigator.clipboard.writeText(url); toast.success("Share link copied"); } catch { toast.message(url); }
    }
  };

  if (isLoading) {
    return (<PageShell force="organizer"><div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div></PageShell>);
  }

  if (!organizer || organizer.status === "suspended") {
    return (<PageShell force="organizer"><div className="py-20 text-center text-muted-foreground">Organizer not found<div className="mt-4"><Link to="/" className="text-brand">Back to NepARENA</Link></div></div></PageShell>);
  }

  const theme = getTheme((organizer as { theme_id?: string | null }).theme_id, {
    start: organizer.primary_color,
    end: organizer.secondary_color,
    accent: organizer.secondary_color || organizer.primary_color,
  });
  const banner = organizer.banner_url || site?.hero_image_url || null;
  const logo = organizer.logo_url || site?.logo_url || null;
  const description = organizer.description || organizer.tagline || site?.about_short || site?.tagline || "Competitive esports community on NepARENA.";

  const navItems = [
    { label: "Tournaments", desc: "Fixtures, standings & registration", to: "/tournaments" as const, icon: Swords, accent: "from-amber-500/25 to-transparent" },
    { label: "Hall of Fame", desc: "Champions & legends", to: "/hall-of-fame" as const, icon: Medal, accent: "from-sky-500/25 to-transparent" },
    { label: "History", desc: "Past seasons & winners", to: "/history" as const, icon: History, accent: "from-violet-500/25 to-transparent" },
    { label: "Gallery", desc: "Photos & highlights", to: "/gallery" as const, icon: Image, accent: "from-emerald-500/25 to-transparent" },
    { label: "Members", desc: "Players in this community", to: "/members" as const, icon: Users, accent: "from-rose-500/25 to-transparent" },
    { label: "About", desc: "Story & contact", to: "/about" as const, icon: Info, accent: "from-neutral-500/25 to-transparent" },
  ];

  return (
    <PageShell force="organizer">
      <div className="min-h-screen" style={{ backgroundImage: theme.pageBg }}>
        <div className="relative">
          {banner ? (<img src={banner} alt="" className="h-40 w-full object-cover sm:h-52" />) : (<div className="h-40 w-full sm:h-52" style={{ background: theme.cover }} />)}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 via-black/20 to-transparent sm:h-52" />

          <div className="relative mx-auto max-w-3xl px-4 pb-6">
            <div className="-mt-14 flex flex-col items-start gap-3 sm:-mt-16">
              {logo ? (<img src={logo} alt={organizer.name} className="h-24 w-24 rounded-2xl object-cover shadow-xl ring-4 ring-background sm:h-28 sm:w-28" />) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-500 text-2xl font-bold text-black shadow-xl ring-4 ring-background sm:h-28 sm:w-28">{organizer.name.slice(0, 2).toUpperCase()}</div>
              )}

              <div className="flex w-full flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl" style={{ textShadow: theme.nameShadow }}>{organizer.name}</h1>
                    {organizer.is_verified ? (<Badge className="bg-sky-500/25 text-sky-200 hover:bg-sky-500/25">Verified</Badge>) : (<Badge variant="secondary" className="text-[10px]">Unverified</Badge>)}
                  </div>
                  {organizer.tagline && <p className="mt-0.5 text-sm text-muted-foreground">{organizer.tagline}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <OrganizerChatFab organizerId={organizer.id} organizerName={organizer.name} organizerLogo={logo} />
                  <Button size="sm" variant="outline" className="border-white/15" onClick={() => void share()}><Share2 className="mr-1.5 h-3.5 w-3.5" /> Share</Button>
                  <Button size="sm" className={following ? "bg-white/10 text-foreground hover:bg-white/15" : ""} style={following ? undefined : { background: theme.cover, color: "#0a0a0a" }} disabled={followBusy} onClick={() => void toggleFollow()}>
                    {followBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : following ? <><BellOff className="mr-1.5 h-3.5 w-3.5" /> Following</> : <><Bell className="mr-1.5 h-3.5 w-3.5" /> Follow</>}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{followers}</strong> followers</span>
              <Link to="/tournaments" className="hover:text-foreground"><strong className="text-foreground">{tournaments.length}</strong> tournaments</Link>
              <Link to="/feed" className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20">Feed</Link>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground line-clamp-3">{description}</p>
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-6 px-4 pb-14 pt-4">
          {announcements.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"><Megaphone className="h-3.5 w-3.5" /> Announcements</h2>
              <div className="space-y-2">
                {announcements.map((a) => {
                  const open = expandedAnnouncement === a.id;
                  return (
                    <button key={a.id} type="button" onClick={() => setExpandedAnnouncement(open ? null : a.id)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]">
                      <div className="flex items-start gap-3">
                        {a.image_url && <img src={a.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {a.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                            <p className="font-semibold text-foreground">{a.title}</p>
                          </div>
                          <p className={`mt-1 text-sm leading-relaxed text-muted-foreground ${open ? "whitespace-pre-wrap" : "line-clamp-3"}`}>{a.body}</p>
                          <span className="mt-1.5 inline-block text-[11px] font-medium text-sky-400">{open ? "Show less" : "Read more"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <PendingMatchesPanel />

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Explore {organizer.name}</h2>
            <div className="grid grid-cols-2 gap-3">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${item.accent} p-4 transition hover:border-white/30 hover:scale-[1.02]`} style={{ backgroundColor: "rgba(0,0,0,0.25)" }}>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-black/50 ring-1 ring-white/15"><item.icon className="h-5 w-5 text-neutral-100" /></span>
                  <span><span className="block text-sm font-semibold text-foreground sm:text-base">{item.label}</span><span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">{item.desc}</span></span>
                </Link>
              ))}
            </div>
          </section>

          {tournaments.length > 0 && (
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Live tournaments</h2>
                <Link to="/tournaments" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {tournaments.slice(0, 6).map((t: { id: string; name: string; status?: string | null; banner_url?: string | null; participants_count?: number | null; registration_open?: boolean | null }) => {
                  const st = joinStatus(t.id);
                  return (
                    <div key={t.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                      {t.banner_url ? <img src={t.banner_url} alt="" className="h-32 w-full object-cover sm:h-36" /> : <div className="h-32 w-full sm:h-36" style={{ background: theme.cover }} />}
                      <div className="space-y-3 p-4">
                        <div>
                          <p className="font-semibold leading-snug">{t.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{(t.status ?? "").replaceAll("_", " ")} · {t.participants_count ?? 0} players</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline" className="border-white/15"><Link to="/tournaments/$id" params={{ id: t.id }}>Open portal</Link></Button>
                          {st === "approved" || st === "registered" ? (<Button size="sm" variant="secondary" disabled>Already joined</Button>)
                          : st === "pending" ? (<Button size="sm" variant="secondary" disabled>Request pending</Button>)
                          : t.registration_open || t.status === "registration_open" ? (<Button size="sm" style={{ background: theme.cover, color: "#0a0a0a" }} onClick={() => void requestJoin(t.id)}>Request to join</Button>)
                          : (<Button size="sm" variant="secondary" disabled>Registration closed</Button>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <section className="pt-2">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Community</h2>
            {communityLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {communityLinks.map((l) => (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neutral-200 transition hover:border-white/25 hover:bg-white/[0.08]">
                    <PlatformIcon platform={l.platform} className="h-4 w-4" />
                    {l.label || l.platform}
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-muted-foreground">Community links coming soon</p>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
