/** Organizer public hub — Home-only banner/logo; body boxes; square cards. */
import { Link, useNavigate } from "@tanstack/react-router";
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
  Loader2, BadgeCheck, MessageCircle, Share2, ExternalLink, History, Radio, Home, MoreHorizontal,
  LayoutDashboard, Flag, Newspaper, Images, Lock, ImagePlus, Send, Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getOrCreateDm } from "@/lib/dm";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/lib/platforms";
import { SocialFeed } from "@/components/SocialFeed";
import { uploadPublicImage } from "@/lib/upload";

type TabId = "home" | "posts" | "live" | "history" | "gallery";
type Tourney = { id: string; name: string; status: string; starts_at: string | null; ends_at: string | null; game?: string | null; banner_url?: string | null; is_published?: boolean };
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
  const { slug } = (await import("@tanstack/react-router"), require("@tanstack/react-router"));
  return <PageShell force="platform" hideChrome><div className="p-8 text-center text-white">Loading organizer…</div></PageShell>;
}
