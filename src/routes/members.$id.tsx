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
import { AllTimeXiView, parseXi } from "@/components/AllTimeXi";
import {
  Loader2,
  Trophy,
  Award,
  Building2,
  UserPlus,
  UserMinus,
  ChevronRight,
  Menu,
  Settings,
  LogOut,
  Pencil,
  LayoutDashboard,
  Users,
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
import { isSuperAdminEmail } from "@/lib/organizers";
import { EditProfileModal } from "@/components/EditProfileModal";

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
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);
  const [showXi, setShowXi] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isOwn = !!user?.id && user.id === id;
  const isSuperAdmin = isSuperAdminEmail(user?.email);

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
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Member not found"}
          </p>
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
  the_rest_continues_in_next_push = true;
}
