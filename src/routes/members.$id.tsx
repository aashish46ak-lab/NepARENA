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
  Menu, Settings, LogOut, Pencil, LayoutDashboard, Plus, MoreVertical, MapPin,
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
  if (!t) return "";
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
        const { data: orgs } = await supabase.from("organizers").select("id, name, slug, logo_url, is_verified, status").in("id", orgIds).eq("status", "active");
        followingOrgs = ((orgs ?? []) as typeof followingOrgs).filter(Boolean);
      }
      let ownedOrgs: { id: string; name: string; slug: string; logo_url: string | null }[] = [];
      {
        const { data: owned } = await supabase
          .from("organizers")
          .select("id, name, slug, logo_url, status, owner_user_id")
          .eq("owner_user_id", id)
          .eq("status", "active");
        ownedOrgs = ((owned ?? []) as typeof ownedOrgs).filter(Boolean);
      }
      const [followerCount, followingCount] = await Promise.all([getUserFollowerCount(id), getUserFollowingCount(id)]);
      const streak = Number((profile as Profile & { login_streak?: number }).login_streak ?? 0);
      return { profile, parts: partList, achievements, followingOrgs, ownedOrgs, followerCount, followingCount, streak };
    },
  });

  const { data: iFollow = false } = useQuery({
    queryKey: ["user_follow", user?.id, id],
    enabled: !!user?.id && !!id && user.id !== id,
    queryFn: () => isFollowingUser(user!.id, id),
  });

  const toggleFollow = async () => {
    if (!user) { toast.message("Sign in to follow players"); return; }
    if (isOwn || followBusy) return;
    setFollowBusy(true);
    const wasFollowing = iFollow;
    qc.setQueryData(["user_follow", user.id, id], !wasFollowing);
    qc.setQueryData(["member_profile", id], (old: typeof data) => {
      if (!old) return old;
      const delta = wasFollowing ? -1 : 1;
      return { ...old, followerCount: Math.max(0, (old.followerCount ?? 0) + delta) };
    });
    try {
      if (wasFollowing) {
        const res = await unfollowUser(user.id, id);
        if ((res as { error?: { message?: string } }).error) throw new Error((res as { error: { message: string } }).error.message);
        toast.success("Unfollowed");
      } else {
        const res = await followUser(user.id, id);
        if (res.error) throw new Error(res.error.message);
        toast.success("Following");
      }
    } catch (e) {
      qc.setQueryData(["user_follow", user.id, id], wasFollowing);
      qc.setQueryData(["member_profile", id], (old: typeof data) => {
        if (!old) return old;
        const delta = wasFollowing ? 1 : -1;
        return { ...old, followerCount: Math.max(0, (old.followerCount ?? 0) + delta) };
      });
      toast.error(e instanceof Error ? e.message : "Could not update follow");
    } finally {
      setFollowBusy(false);
      void qc.invalidateQueries({ queryKey: ["member_profile", id] });
      void qc.invalidateQueries({ queryKey: ["user_follow", user.id, id] });
    }
  };

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !data?.profile) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-lg space-y-3 py-20 text-center">
          <p className="text-muted-foreground">{error instanceof Error ? error.message : "Member not found"}</p>
        </div>
      </PageShell>
    );
  }

  const { profile, achievements, followingOrgs, ownedOrgs = [], followerCount, followingCount, streak } = data;
  const displayName = profile.username?.trim() || profile.full_name?.trim() || "Player";
  const realName = profile.full_name?.trim() || null;
  const links = (profile.social_links ?? {}) as Record<string, string>;
  const banner = links.banner_url || null;

  const socials: { key: string; label: string; href: string }[] = [];
  if (links.facebook) socials.push({ key: "facebook", label: "Facebook", href: normalizeUrl(links.facebook) });
  if (links.instagram) socials.push({ key: "instagram", label: "Instagram", href: normalizeUrl(links.instagram) });
  if (links.twitter || links.x) socials.push({ key: "x", label: "X / Twitter", href: normalizeUrl(links.twitter || links.x) });
  if (links.tiktok) socials.push({ key: "tiktok", label: "TikTok", href: normalizeUrl(links.tiktok) });
  if (links.youtube) socials.push({ key: "youtube", label: "YouTube", href: normalizeUrl(links.youtube) });

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 pb-28 pt-3">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121214]/90 shadow-2xl ring-1 ring-white/5">
          <div className="relative h-32 overflow-hidden bg-gradient-to-br from-neutral-800 via-neutral-900 to-black sm:h-40">
            {banner ? <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
          <div className="relative px-4 pb-5">
            <div className="flex items-end justify-between">
              <div className="-mt-12 h-24 w-24 overflow-hidden rounded-full ring-4 ring-[#121214]">
                <Avatar className="h-full w-full">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback className="text-2xl">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <div className="relative mb-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
                  aria-label="Menu"
                >
                  {isOwn ? <Menu className="h-5 w-5" /> : <MoreVertical className="h-5 w-5" />}
                </button>
                {menuOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-11 z-50 min-w-[220px] overflow-hidden rounded-2xl border border-white/12 bg-[#141416]/98 py-1.5 shadow-2xl backdrop-blur-xl">
                      {isOwn ? (
                        <>
                          <button type="button" className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8" onClick={() => { setMenuOpen(false); setEditOpen(true); }}>
                            <Pencil className="h-4 w-4 text-neutral-300" /> Edit Profile
                          </button>
                          <Link to="/settings" className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8" onClick={() => setMenuOpen(false)}>
                            <Settings className="h-4 w-4 text-neutral-400" /> Settings
                          </Link>
                          {ownedOrgs.map((o) => (
                            <Link key={o.id} to="/dashboard" className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8" onClick={() => setMenuOpen(false)}>
                              <LayoutDashboard className="h-4 w-4 text-emerald-400" />
                              <span className="truncate">{o.name} dashboard</span>
                            </Link>
                          ))}
                          {(isAdmin || isSuperAdmin) && (
                            <Link to="/platform" className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8" onClick={() => setMenuOpen(false)}>
                              <LayoutDashboard className="h-4 w-4 text-neutral-400" /> Platform admin
                            </Link>
                          )}
                          <button type="button" className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-rose-300 hover:bg-white/8" onClick={async () => { setMenuOpen(false); await signOut(); void navigate({ to: "/" }); }}>
                            <LogOut className="h-4 w-4" /> Log out
                          </button>
                        </>
                      ) : (
                        <>
                          {profile.country && (
                            <div className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-neutral-200">
                              <MapPin className="h-4 w-4 text-neutral-400" /> {profile.country}
                            </div>
                          )}
                          {profile.favourite_club && (
                            <div className="px-3.5 py-2 text-xs text-neutral-400">Club · {profile.favourite_club}</div>
                          )}
                          {links.favourite_national_team && (
                            <div className="px-3.5 py-2 text-xs text-neutral-400">National team · {links.favourite_national_team}</div>
                          )}
                          {links.favourite_player && (
                            <div className="px-3.5 py-2 text-xs text-neutral-400">Player · {links.favourite_player}</div>
                          )}
                          {!profile.country && !profile.favourite_club && !links.favourite_player && (
                            <div className="px-3.5 py-2.5 text-xs text-neutral-500">No extra details shared</div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3">
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              {realName && profile.username && <p className="text-sm text-neutral-400">{realName}</p>}
              {profile.bio && <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">{profile.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-neutral-400">
                <span><strong className="text-white tabular-nums">{followerCount}</strong> followers</span>
                <span><strong className="text-white tabular-nums">{followingCount}</strong> following</span>
                {streak > 0 && <InlineStreak streak={streak} />}
              </div>

              {socials.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:border-white/25 hover:bg-white/10"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {isOwn ? (
                  <Button size="sm" className="rounded-full bg-neutral-100 text-black hover:bg-white" onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant={iFollow ? "outline" : "default"} className="rounded-full" disabled={followBusy} onClick={() => void toggleFollow()}>
                      {iFollow ? <><UserMinus className="mr-1.5 h-3.5 w-3.5" /> Following</> : <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Follow</>}
                    </Button>
                    <MessageProfileButton userId={id} name={displayName} />
                  </>
                )}
              </div>
            </div>

            {achievements.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achievements</h2>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((a) => (
                    <Badge key={a.id} className="border-amber-500/30 bg-amber-500/15 text-amber-300">
                      <Trophy className="mr-1 h-3 w-3" />
                      {a.achievement}
                      {a.tournament ? " · " + a.tournament : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {followingOrgs.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Following organizers</h2>
                <div className="space-y-2">
                  {followingOrgs.map((o) => (
                    <Link key={o.id} to="/o/$slug" params={{ slug: o.slug }} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.06]">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={o.logo_url ?? undefined} />
                        <AvatarFallback>{o.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-sm font-medium text-white">{o.name}</span>
                      <ChevronRight className="h-4 w-4 text-neutral-500" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isOwn && (
          <button
            type="button"
            onClick={() => setPostOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" /> Create a post
          </button>
        )}

        <div className="mt-5 px-1">
          <h2 className="mb-3 px-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Posts</h2>
          <SocialFeed key={feedKey} authorId={id} hideComposer />
        </div>
      </div>
      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} />
      <CreatePostModal
        open={postOpen}
        onOpenChange={setPostOpen}
        onPosted={() => {
          setPostOpen(false);
          setFeedKey((k) => k + 1);
        }}
      />
    </PageShell>
  );
}
