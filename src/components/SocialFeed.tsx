import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2, Loader2, Send, Repeat2, ImagePlus, X, Link2, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InlineStreak } from "@/components/StreakBadge";
import { listDmThreads, sendDmMessage, type DmThread } from "@/lib/dm";
import { encodeSharedPost } from "@/lib/shared-post";
import { followUser } from "@/lib/user-follows";

export type FeedPost = {
  id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  pinned: boolean;
  created_at: string;
  repost_of?: string | null;
  organizer_id?: string | null;
  author_name?: string;
  author_avatar?: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  author_streak?: number;
  is_organizer_post?: boolean;
  organizer_name?: string | null;
  organizer_logo?: string | null;
  organizer_slug?: string | null;
  i_follow_author?: boolean;
  original?: {
    id: string;
    author_id: string;
    body: string | null;
    image_url: string | null;
    image_urls?: string[] | null;
    created_at: string;
    author_name?: string;
    author_avatar?: string | null;
  } | null;
};

const PAGE = 12;
type FeedMode = "for_you" | "following";

export function SocialFeed({
  authorId,
  mode = "for_you",
  hideComposer = false,
  forceComposer = false,
  onComposerClose,
  onPosted,
  organizerId,
  organizerMeta,
  filterQuery,
}: {
  authorId?: string;
  mode?: FeedMode;
  hideComposer?: boolean;
  forceComposer?: boolean;
  onComposerClose?: () => void;
  onPosted?: () => void;
  organizerId?: string | null;
  organizerMeta?: { name: string; logo_url?: string | null; slug?: string | null } | null;
  filterQuery?: string;
}) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  // TEMP: full file restore in progress - minimal stub to unblock build
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-neutral-400">
      Loading feed…
    </div>
  );
}
