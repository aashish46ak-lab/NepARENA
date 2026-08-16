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
  Menu, Settings, LogOut, Pencil, LayoutDashboard, Plus, MoreVertical, MapPin, HelpCircle, BadgeCheck,
  RefreshCw, Shield,
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
      const orgIds = (follows ?? []).map((f: any) => f.organizer_id as string);
      if (orgIds.length) {
        const { data: orgs } = await supabase.from("organizers").select("id, name, slug, logo_url, is_verified").in("id", orgIds);
        followingOrgs = (orgs ?? []) as any[];
      }
      const followerCount = await getUserFollowerCount(id);
      const followingCount = await getUserFollowingCount(id);
      let iFollow = false;
      if (user?.id && user.id !== id) iFollow = await isFollowingUser(user.id, id);
      return { profile, parts: partList, achievements, followingOrgs, followerCount, followingCount, iFollow };
    },
  });

  const profile = data?.profile;
  const primaryName = profile?.full_name?.trim() || profile?.username?.trim() || "Player";

  const toggleFollow = async () => {
    if (!user || !profile || followBusy) return;
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
      <PageShell force="platform">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      </PageShell>
    );
  }

  if (error || !profile) {
    return (
      <PageShell force="platform">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-neutral-400">Profile not found.</p>
          <Button asChild className="mt-4"><Link to="/members">Browse players</Link></Button>
        </div>
      </PageShell>
    );
  }

  const social = (profile.social_links || {}) as Record<string, string>;

  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-3 pb-28 pt-4 sm:px-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 ring-2 ring-white/10">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{primaryName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold text-white">{primaryName}</h1>
                {(profile as any).is_verified && <BadgeCheck className="h-5 w-5 shrink-0 text-sky-400" />}
              </div>
              {profile.username && <p className="text-sm text-neutral-400">@{profile.username}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                {profile.country && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.country}</span>
                )}
                <InlineStreak userId={id} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!isOwn && user && (
                  <>
                    <Button size="sm" variant={data?.iFollow ? "secondary" : "default"} className="rounded-full" disabled={followBusy} onClick={() => void toggleFollow()}>
                      {followBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : data?.iFollow ? <UserMinus className="mr-1 h-3.5 w-3.5" /> : <UserPlus className="mr-1 h-3.5 w-3.5" />}
                      {data?.iFollow ? "Following" : "Follow"}
                    </Button>
                    <MessageProfileButton peerId={id} peerName={primaryName} />
                  </>
                )}
                {isOwn && (
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit profile
                  </Button>
                )}
              </div>
            </div>
          </div>
          {profile.bio && <p className="mt-4 text-sm leading-relaxed text-neutral-300">{profile.bio}</p>}
          <div className="mt-4 flex gap-6 text-sm">
            <Link to="/followers/$id" params={{ id }} className="hover:text-white">
              <span className="font-semibold text-white">{data?.followerCount ?? 0}</span>{" "}
              <span className="text-neutral-500">followers</span>
            </Link>
            <Link to="/following-people/$id" params={{ id }} className="hover:text-white">
              <span className="font-semibold text-white">{data?.followingCount ?? 0}</span>{" "}
              <span className="text-neutral-500">following</span>
            </Link>
          </div>
        </div>

        {Object.keys(social).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(social).map(([k, v]) => {
              if (!v) return null;
              const href = normalizeUrl(v);
              return (
                <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08]">
                  <PlatformIcon platform={k} className="h-3.5 w-3.5" />
                  {k}
                </a>
              );
            })}
          </div>
        )}

        {(data?.achievements?.length ?? 0) > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><Trophy className="h-4 w-4 text-amber-400" /> Achievements</h2>
            <div className="space-y-2">
              {data!.achievements.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  <p className="font-medium text-neutral-100">{a.title || a.player_name}</p>
                  {a.tournament_name && <p className="text-xs text-neutral-500">{a.tournament_name}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Posts</h2>
            {isOwn && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPostOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Post
              </Button>
            )}
          </div>
          <SocialFeed key={feedKey} authorId={id} />
        </section>
      </div>

      {isOwn && (
        <>
          <EditProfileModal open={editOpen} onOpenChange={setEditOpen} onSaved={() => void qc.invalidateQueries({ queryKey: ["member_profile", id] })} />
          <CreatePostModal open={postOpen} onOpenChange={setPostOpen} onCreated={() => setFeedKey((k) => k + 1)} />
        </>
      )}
    </PageShell>
  );
}
