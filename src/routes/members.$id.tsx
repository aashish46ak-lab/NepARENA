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

  // FULL FILE CONTINUES - see artifact
  return null;
}
