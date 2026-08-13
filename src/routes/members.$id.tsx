import { createFileRoute, Link } from "@tanstack/react-router";
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
import { AllTimeXiView, parseXi } from "@/components/AllTimeXi";
import {
  Loader2,
  Trophy,
  ArrowLeft,
  Award,
  Building2,
  UserPlus,
  UserMinus,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import {
  followUser,
  getUserFollowerCount,
  getUserFollowingCount,
  isFollowingUser,
  unfollowUser,
} from "@/lib/user-follows";
import { toast } from "sonner";
import { MessageProfileButton } from "@/components/MessageProfileButton";
import { SocialFeed } from "@/components/SocialFeed";
import { InlineStreak } from "@/components/StreakBadge";

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

function statusBadgeClass(status: string) {
  if (status === "completed" || status === "archived")
    return "bg-muted text-muted-foreground";
  if (status === "live" || status === "ongoing")
    return "bg-brand/25 text-brand-glow";
  if (status === "registration_open") return "bg-emerald-500/20 text-emerald-300";
  return "bg-secondary text-secondary-foreground";
}

function MemberProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);
  const [showXi, setShowXi] = useState(false);
  const isOwn = !!user?.id && user.id === id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["member_profile", id],
    enabled: !!id,
    queryFn: async () => {
      let profile: Profile | null = null;
      const { data: p1, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (pErr) console.warn("profiles select", pErr.message);
      profile = (p1 as Profile | null) ?? null;

      if (!profile) {
        const { data: p2 } = await supabase
          .from("public_members")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        profile = (p2 as Profile | null) ?? null;
      }

      if (!profile) {
        profile = {
          id,
          username: null,
          full_name: null,
          avatar_url: null,
          favourite_club: null,
          bio: null,
          country: null,
          social_links: {},
          is_suspended: false,
          has_password: false,
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

      const tournamentIds = [...new Set(partList.map((p) => p.tournament_id))];
      let tours: { id: string; name: string; status: string }[] = [];
      if (tournamentIds.length) {
        const { data: t } = await supabase
          .from("tournaments")
          .select("id, name, status")
          .in("id", tournamentIds);
        tours = (t ?? []) as typeof tours;
      }

      let followingOrgs: {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
        is_verified: boolean;
      }[] = [];
      const { data: follows } = await supabase
        .from("organizer_followers")
        .select("organizer_id")
        .eq("user_id", id);
      const orgIds = (follows ?? []).map((f: { organizer_id: string }) => f.organizer_id);
      if (orgIds.length) {
        const { data: orgs } = await supabase
          .from("organizers")
          .select("id, name, slug, logo_url, is_verified, status")
          .in("id", orgIds)
          .eq("status", "active");
        followingOrgs = ((orgs ?? []) as typeof followingOrgs).filter(Boolean);
      }

      const [followerCount, followingCount] = await Promise.all([
        getUserFollowerCount(id),
        getUserFollowingCount(id),
      ]);

      const streak = Number(
        (profile as Profile & { login_streak?: number }).login_streak ?? 0,
      );

      return {
        profile,
        parts: partList,
        tours,
        achievements,
        followingOrgs,
        followerCount,
        followingCount,
        streak,
      };
    },
  });

  const { data: iFollow = false, refetch: refetchFollow } = useQuery({
    queryKey: ["user_follow", user?.id, id],
    enabled: !!user?.id && !!id && user.id !== id,
    queryFn: () => isFollowingUser(user!.id, id),
  });

  const toggleFollow = async () => {
    if (!user) {
      toast.message("Sign in to follow players");
      return;
    }
    if (isOwn) return;
    setFollowBusy(true);
    try {
      if (iFollow) {
        await unfollowUser(user.id, id);
        toast.success("Unfollowed");
      } else {
        const res = await followUser(user.id, id);
        if (res.error) throw new Error(res.error.message);
        toast.success("Following");
      }
      void refetchFollow();
      void qc.invalidateQueries({ queryKey: ["member_profile", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update follow");
    } finally {
      setFollowBusy(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell force="platform">
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !data?.profile) {
    return (
      <PageShell force="platform">
        <div className="mx-auto max-w-lg space-y-3 py-20 text-center">
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Member not found"}
          </p>
          <Button asChild variant="outline">
            <Link to="/users">
              <ArrowLeft className="mr-1 h-4 w-4" /> Users
            </Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const {
    profile,
    parts,
    tours,
    achievements,
    followingOrgs,
    followerCount,
    followingCount,
    streak,
  } = data;
  const tourMap = new Map(tours.map((t) => [t.id, t]));
  const displayName =
    profile.username?.trim() || profile.full_name?.trim() || "Player";
  const realName = profile.full_name?.trim() || null;
  const links = (profile.social_links ?? {}) as Record<string, string>;
  const xi = parseXi(links.all_time_xi);
  const hasXi = !!(xi && xi.slots.some((s) => s.name));

  const joinedTags = parts
    .map((p) => {
      const t = tourMap.get(p.tournament_id);
      return {
        tournamentId: p.tournament_id,
        name: t?.name ?? "Tournament",
        tourStatus: t?.status ?? "unknown",
      };
    })
    .filter(
      (tag, i, arr) =>
        arr.findIndex((x) => x.tournamentId === tag.tournamentId) === i,
    );

  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-neutral-400">
          <Link to="/users">
            <ArrowLeft className="mr-1 h-4 w-4" /> Users
          </Link>
        </Button>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="relative h-32 bg-gradient-to-br from-sky-900 via-slate-900 to-violet-950 sm:h-40">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-sm"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
          <div className="relative px-4 pb-5 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Avatar className="-mt-12 h-24 w-24 ring-4 ring-[#0a0a0a] sm:h-28 sm:w-28">
                <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
                <AvatarFallback className="bg-gradient-brand text-xl text-primary-foreground">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isOwn && (
                <div className="flex flex-wrap gap-2">
                  <MessageProfileButton peerId={id} />
                  <Button
                    size="sm"
                    className={
                      iFollow
                        ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                        : "bg-neutral-100 text-black hover:bg-white"
                    }
                    disabled={followBusy}
                    onClick={() => void toggleFollow()}
                  >
                    {followBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : iFollow ? (
                      <>
                        <UserMinus className="mr-1.5 h-3.5 w-3.5" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Follow
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 min-w-0 space-y-2">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
                <span className="truncate">{displayName}</span>
                <InlineStreak streak={streak} className="text-sm" />
              </h1>
              {realName && realName !== displayName && (
                <p className="truncate text-sm text-muted-foreground">{realName}</p>
              )}
              {profile.favourite_club && (
                <p className="text-sm text-brand-glow">{profile.favourite_club}</p>
              )}
              {profile.bio && (
                <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
                <Link to="/followers/$id" params={{ id }} className="hover:text-foreground">
                  <strong className="text-foreground">{followerCount}</strong> Followers
                </Link>
                <span className="text-white/20">•</span>
                <Link to="/following-people/$id" params={{ id }} className="hover:text-foreground">
                  <strong className="text-foreground">{followingCount}</strong> Following
                </Link>
                <span className="text-white/20">•</span>
                <span>
                  <strong className="text-foreground">{followingOrgs.length}</strong> Organizers
                </span>
              </div>

              {joinedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {joinedTags.slice(0, 8).map((tag) => (
                    <Link key={tag.tournamentId} to="/tournaments/$id" params={{ id: tag.tournamentId }}>
                      <Badge className={cn("cursor-pointer border-0 capitalize", statusBadgeClass(tag.tourStatus))}>
                        🏆 {tag.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {hasXi && (
          <button
            type="button"
            onClick={() => setShowXi((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950/40 to-white/[0.03] px-4 py-4 text-left transition hover:border-emerald-500/30"
          >
            <div>
              <p className="text-sm font-semibold text-white">⚽ View Their All-Time XI</p>
              <p className="text-xs text-neutral-500">Tap to {showXi ? "hide" : "open"} lineup</p>
            </div>
            <ChevronRight className={cn("h-5 w-5 text-neutral-400 transition", showXi && "rotate-90")} />
          </button>
        )}
        {showXi && hasXi && (
          <div className="glass rounded-2xl p-4">
            <AllTimeXiView xi={xi!} />
          </div>
        )}

        {followingOrgs.length > 0 && (
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-4 w-4" /> Organizers
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {followingOrgs.map((o) => (
                <Link
                  key={o.id}
                  to="/o/$slug"
                  params={{ slug: o.slug }}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-2.5 text-xs font-medium text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  {o.logo_url ? (
                    <img src={o.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-neutral-700 text-[9px] font-bold">
                      {o.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="truncate">{o.name}</span>
                  {o.is_verified && <span className="text-sky-400">✓</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {achievements.length > 0 && (
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Award className="h-4 w-4 text-amber-300" /> Achievements
            </h2>
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

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Posts</h2>
          <SocialFeed authorId={id} />
        </div>
      </div>
    </PageShell>
  );
}
