import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import {
  supabase,
  type HallOfFameEntry,
  type Profile,
  type TournamentParticipant,
} from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Trophy, UserPlus, UserMinus, ChevronRight,
  Menu, Settings, LogOut, Pencil, LayoutDashboard, Plus, MoreVertical, MapPin, Palette, HelpCircle, BadgeCheck,
} from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import {
  followUser, getUserFollowerCount, getUserFollowingCount, isFollowingUser, unfollowUser,
} from "@/lib/user-follows";
import { toast } from "sonner";
import { MessageProfileButton } from "@/components/MessageProfileButton";
import { SocialFeed } from "@/components/SocialFeed";
import { InlineStreak } from "@/components/StreakBadge";
import { isSuperAdminEmail } from "@/lib/organizers";
import { EditProfileModal } from "@/components/EditProfileModal";
import { CreatePostModal } from "@/components/CreatePostModal";
import { PlatformIcon } from "@/lib/platforms";

export const Route = createFileRoute("/members/$id")({
  head: () => ({
    ...buildSeoHead({
      title: "Profile — NepARENA",
      description: "Player profile on NepARENA",
      path: "/members",
    }),
  }),
  component: MemberProfilePage,
});

function normalizeUrl(raw: string) {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function MemberProfilePage() {
  const { id } = Route.useParams();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const isOwn = !!user?.id && user.id === id;
  const isSuperAdmin = isSuperAdminEmail(user?.email);

  const { data, isLoading, error } = useQuery({
    queryKey: ["member_profile", id],
    enabled: !!id,
    queryFn: async () => {
      let profile: Profile | null = null;
      const { data: p1 } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      profile = (p1 as Profile | null) ?? null;
      if (!profile) {
        const { data: p2 } = await supabase.from("public_members").select("*").eq("id", id).maybeSingle();
        profile = (p2 as Profile | null) ?? null;
      }
      if (!profile) {
        profile = {
          id, username: null, full_name: null, avatar_url: null, favourite_club: null,
          bio: null, country: null, social_links: {}, is_suspended: false, has_password: false,
          created_at: new Date().toISOString(),
        } as Profile;
      }
      const { data: parts } = await supabase
        .from("tournament_participants")
        .select("id, tournament_id, player_name, club, status, photo_url, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      const partList = (parts ?? []) as TournamentParticipant[];
      const { data: hof } = await supabase.from("hall_of_fame").select("*");
      const names = new Set<string>();
      if (profile.full_name) names.add(profile.full_name.toLowerCase());
      if (profile.username) names.add(profile.username.toLowerCase());
      for (const p of partList) {
        names.add(p.player_name.toLowerCase());
        if (p.club) names.add(p.club.toLowerCase());
      }
      const achievements = ((hof ?? []) as HallOfFameEntry[]).filter((h) =>
        names.has(h.player_name.toLowerCase()),
      );
      let followingOrgs: { id: string; name: string; slug: string; logo_url: string | null; is_verified: boolean }[] = [];
      const { data: follows } = await supabase.from("organizer_followers").select("organizer_id").eq("user_id", id);
      const orgIds = (follows ?? []).map((f: { organizer_id: string }) => f.organizer_id);
      if (orgIds.length) {
        const { data: orgs } = await supabase.from("organizers").select("id, name, slug, logo_url, is_verified").in("id", orgIds);
        followingOrgs = ((orgs ?? []) as typeof followingOrgs).filter(Boolean);
      }
      let ownedOrgs: { id: string; name: string; slug: string; logo_url: string | null }[] = [];
      if (isOwn) {
        const { data: mems } = await supabase.from("organizer_members").select("organizer_id, role").eq("user_id", id);
        const oids = (mems ?? []).filter((m: { role: string }) => m.role === "owner" || m.role === "admin").map((m: { organizer_id: string }) => m.organizer_id);
        if (oids.length) {
          const { data: orgs } = await supabase.from("organizers").select("id, name, slug, logo_url").in("id", oids);
          ownedOrgs = (orgs ?? []) as typeof ownedOrgs;
        }
      }
      const followerCount = await getUserFollowerCount(id);
      const followingCount = await getUserFollowingCount(id);
      let iFollow = false;
      if (user?.id && user.id !== id) {
        iFollow = await isFollowingUser(user.id, id);
      }
      const streak = Number((profile as Profile & { login_streak?: number }).login_streak ?? 0);
      return { profile, parts: partList, achievements, followingOrgs, ownedOrgs, followerCount, followingCount, streak, iFollow };
    },
  });

  const toggleFollow = async () => {
    if (!user || !id || followBusy || isOwn) return;
    setFollowBusy(true);
    try {
      if (data?.iFollow) {
        await unfollowUser(user.id, id);
        toast.success("Unfollowed");
      } else {
        await followUser(user.id, id);
        toast.success("Following");
      }
      await qc.invalidateQueries({ queryKey: ["member_profile", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setFollowBusy(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      </PageShell>
    );
  }

  if (error || !data?.profile) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-neutral-400">Profile not found.</p>
          <Button asChild className="mt-4"><Link to="/members">Browse players</Link></Button>
        </div>
      </PageShell>
    );
  }

  const { profile, achievements, followingOrgs, ownedOrgs = [], followerCount, followingCount, streak } = data;
  const iFollow = data.iFollow;
  const primaryName = profile.full_name?.trim() || profile.username?.trim() || "Player";
  const links = (profile.social_links || {}) as Record<string, string>;
  const banner = links.banner_url || null;
  const socialEntries = Object.entries(links).filter(([k, v]) => v && k !== "banner_url" && k !== "all_time_xi");

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 pb-28 pt-3 sm:px-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121214]/90 shadow-2xl ring-1 ring-white/5">
          <div className="relative h-32 overflow-hidden bg-gradient-to-br from-neutral-800 via-neutral-900 to-black sm:h-40">
            {banner ? <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-black/20 to-transparent" />
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md ring-1 ring-white/10"
                aria-label="Menu"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-11 z-20 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1c] py-1 shadow-xl">
                  {isOwn && (
                    <>
                      <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-white/5" onClick={() => { setMenuOpen(false); setEditOpen(true); }}>
                        <Pencil className="h-4 w-4 text-neutral-400" /> Edit profile
                      </button>
                      <Link to="/settings" className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                        <Settings className="h-4 w-4 text-neutral-400" /> Settings
                      </Link>
                      {isAdmin && (
                        <Link to="/dashboard" className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                          <LayoutDashboard className="h-4 w-4 text-neutral-400" /> Dashboard
                        </Link>
                      )}
                      <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-white/5" onClick={() => { setMenuOpen(false); void signOut(); }}>
                        <LogOut className="h-4 w-4" /> Log out
                      </button>
                    </>
                  )}
                  {!isOwn && (
                    <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                      <HelpCircle className="h-4 w-4 text-neutral-400" /> Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="relative px-4 pb-5">
            <div className="-mt-12 flex items-end gap-3">
              <Avatar className="h-24 w-24 ring-4 ring-[#121214]">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-2xl">{primaryName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="mb-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="truncate text-xl font-bold text-white">{primaryName}</h1>
                  {(profile as Profile & { is_verified?: boolean }).is_verified && (
                    <BadgeCheck className="h-5 w-5 shrink-0 text-sky-400" />
                  )}
                  {streak > 0 && <InlineStreak streak={streak} />}
                </div>
                {profile.username && (
                  <p className="text-sm text-neutral-400">@{profile.username}</p>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">{profile.bio}</p>
            )}

            <div className="mt-3 flex gap-4 text-sm">
              <Link to="/followers/$id" params={{ id }} className="hover:text-white">
                <span className="font-semibold text-white">{followerCount}</span>{" "}
                <span className="text-neutral-500">followers</span>
              </Link>
              <Link to="/following-people/$id" params={{ id }} className="hover:text-white">
                <span className="font-semibold text-white">{followingCount}</span>{" "}
                <span className="text-neutral-500">following</span>
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isOwn ? (
                <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                </Button>
              ) : user ? (
                <>
                  <Button size="sm" variant={iFollow ? "outline" : "default"} className="rounded-full" disabled={followBusy} onClick={() => void toggleFollow()}>
                    {iFollow ? <><UserMinus className="mr-1.5 h-3.5 w-3.5" /> Following</> : <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Follow</>}
                  </Button>
                  <MessageProfileButton peerId={id} peerName={primaryName} />
                </>
              ) : null}
            </div>

            {achievements.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achievements</h2>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((a) => (
                    <Badge key={a.id} variant="secondary" className="gap-1">
                      <Trophy className="h-3 w-3 text-amber-400" />
                      {a.title || a.player_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {followingOrgs.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Following organizers</h2>
                <div className="space-y-1.5">
                  {followingOrgs.map((o) => (
                    <Link
                      key={o.id}
                      to="/o/$slug"
                      params={{ slug: o.slug }}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-sky-400/30"
                    >
                      <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold">
                        {o.logo_url ? <img src={o.logo_url} alt="" className="h-full w-full object-cover" /> : o.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{o.name}</span>
                      {o.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />}
                      <ChevronRight className="h-4 w-4 text-neutral-500" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {socialEntries.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socialEntries.map(([k, v]) => (
                  <a key={k} href={normalizeUrl(v)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08]">
                    <PlatformIcon platform={k} className="h-3.5 w-3.5" />
                    {k}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {isOwn && (
          <button
            type="button"
            onClick={() => setPostOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium text-neutral-300 transition hover:border-sky-400/30 hover:bg-white/[0.06]"
          >
            <Plus className="h-4 w-4" /> Create a post
          </button>
        )}

        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Posts</h2>
          <SocialFeed key={feedKey} authorId={id} />
        </section>
      </div>

      {isOwn && (
        <>
          <EditProfileModal open={editOpen} onOpenChange={setEditOpen} onSaved={() => void qc.invalidateQueries({ queryKey: ["member_profile", id] })} />
          <CreatePostModal open={postOpen} onOpenChange={setPostOpen} onPosted={() => { setPostOpen(false); setFeedKey((k) => k + 1); }} />
        </>
      )}
    </PageShell>
  );
}
