import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, Newspaper, BadgeCheck, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FeedEmptySuggestions } from "@/components/FeedEmptySuggestions";
import { HomeInfoGrid } from "@/components/HomeInfoGrid";
import { isSuperAdminEmail } from "@/lib/organizers";
import { PhotoLightbox } from "@/components/PhotoLightbox";

export type FeedPost = {
  id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  pinned: boolean;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  author_verified?: boolean;
};

const PAGE = 15;

export function SocialFeed({
  authorId,
  mode = "for_you",
  hideComposer = false,
  organizerId,
  organizerMeta,
  filterQuery,
  emptyLabel,
  onPostsChange,
}: {
  authorId?: string;
  mode?: "for_you" | "following";
  hideComposer?: boolean;
  forceComposer?: boolean;
  onComposerClose?: () => void;
  onPosted?: () => void;
  organizerId?: string | null;
  organizerMeta?: { name: string; logo_url?: string | null; slug?: string | null } | null;
  filterQuery?: string;
  emptyLabel?: string;
  onPostsChange?: (count: number) => void;
}) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    onPostsChange?.(posts.length);
  }, [posts.length, onPostsChange]);

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      let followingIds: string[] = [];
      if (mode === "following" && user && !authorId) {
        const { data: fl } = await supabase.from("user_follows").select("following_id").eq("follower_id", user.id);
        followingIds = (fl ?? []).map((r) => r.following_id as string);
        if (!followingIds.length) {
          setPosts([]);
          setMore(false);
          setLoading(false);
          return;
        }
      }
      let q = supabase
        .from("posts")
        .select("id, author_id, body, image_url, image_urls, pinned, created_at, organizer_id")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (authorId) q = q.eq("author_id", authorId);
      if (organizerId) q = q.eq("organizer_id", organizerId);
      if (mode === "following" && followingIds.length) q = q.in("author_id", followingIds);
      if (!reset && cursor) q = q.lt("created_at", cursor);
      const { data, error } = await q;
      if (error) {
        console.warn(error.message);
        setLoading(false);
        return;
      }
      let rows = ((data ?? []) as any[]).filter(
        (r) => !String(r.body ?? "").trim().toLowerCase().startsWith("[gallery]"),
      );
      const authorIds = [...new Set(rows.map((r) => r.author_id as string))];
      const { data: profiles } = authorIds.length
        ? await supabase.from("profiles").select("id, username, full_name, avatar_url, is_verified").in("id", authorIds)
        : { data: [] as any[] };
      const pmap = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p]));
      const ids = rows.map((r) => r.id as string);
      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      const myLikes = new Set<string>();
      if (ids.length) {
        const { data: likes } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", ids);
        for (const l of likes ?? []) {
          likeCounts[l.post_id] = (likeCounts[l.post_id] ?? 0) + 1;
          if (user && l.user_id === user.id) myLikes.add(l.post_id);
        }
        const { data: comments } = await supabase.from("post_comments").select("post_id").in("post_id", ids);
        for (const c of comments ?? []) {
          commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1;
        }
      }
      const mapped: FeedPost[] = rows.map((r) => {
        const p = pmap.get(r.author_id);
        return {
          id: r.id,
          author_id: r.author_id,
          body: r.body,
          image_url: r.image_url,
          image_urls: r.image_urls,
          pinned: !!r.pinned,
          created_at: r.created_at,
          author_name: p?.full_name || p?.username || "User",
          author_avatar: p?.avatar_url ?? null,
          like_count: likeCounts[r.id] ?? 0,
          comment_count: commentCounts[r.id] ?? 0,
          liked_by_me: myLikes.has(r.id),
          author_verified: !!p?.is_verified,
        };
      });
      setPosts((prev) => (reset ? mapped : [...prev, ...mapped]));
      setMore(rows.length >= PAGE);
      if (rows.length) setCursor(rows[rows.length - 1].created_at);
      setLoading(false);
    },
    [authorId, cursor, user, mode, organizerId],
  );

  useEffect(() => {
    setCursor(null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, user?.id, mode, organizerId]);

  const toggleLike = async (p: FeedPost) => {
    if (!user) {
      toast.message("Sign in to like");
      return;
    }
    if (p.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", p.id).eq("user_id", user.id);
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, liked_by_me: false, like_count: Math.max(0, x.like_count - 1) } : x)),
      );
    } else {
      await supabase.from("post_likes").insert({ post_id: p.id, user_id: user.id });
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, liked_by_me: true, like_count: x.like_count + 1 } : x)),
      );
    }
  };

  const deletePost = async (p: FeedPost) => {
    if (!user) return;
    const isOwner = p.author_id === user.id;
    const isAdmin = isSuperAdminEmail(user.email);
    if (!isOwner && !isAdmin) {
      toast.error("Not allowed");
      return;
    }
    if (!confirm(isAdmin && !isOwner ? "Delete this post (policy)?" : "Delete your post?")) return;
    await supabase.from("post_likes").delete().eq("post_id", p.id);
    await supabase.from("post_comments").delete().eq("post_id", p.id);
    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message || "Could not delete post");
      return;
    }
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    toast.success("Post deleted");
  };

  const q = (filterQuery ?? "").trim().toLowerCase();
  const filteredPosts = !q
    ? posts
    : posts.filter(
        (p) => (p.body ?? "").toLowerCase().includes(q) || (p.author_name ?? "").toLowerCase().includes(q),
      );

  return (
    <div className="space-y-4">
      {filteredPosts.map((p) => {
        const urls = (p.image_urls?.length ? p.image_urls : p.image_url ? [p.image_url] : []) as string[];
        return (
          <article key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={p.author_avatar ?? undefined} />
                <AvatarFallback>{(p.author_name ?? "?").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link to="/members/$id" params={{ id: p.author_id }} className="text-sm font-semibold text-white hover:underline">
                    {p.author_name}
                  </Link>
                  {p.author_verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />}
                  <span className="text-[11px] text-neutral-500">{new Date(p.created_at).toLocaleString()}</span>
                </div>
                {p.body && (
                  <Link to="/posts/$id" params={{ id: p.id }} className="mt-1 block whitespace-pre-wrap break-words text-sm text-neutral-200 hover:opacity-90">
                    {p.body}
                  </Link>
                )}
                {urls.length === 1 && (
                  <button type="button" className="mt-2 block w-full" onClick={() => setLightbox(urls[0]!)}>
                    <img src={urls[0]} alt="" className="max-h-80 w-full rounded-xl object-cover" />
                  </button>
                )}
                {urls.length > 1 && (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {urls.slice(0, 4).map((u, i) => (
                      <button key={i} type="button" onClick={() => setLightbox(u)}>
                        <img src={u} alt="" className="max-h-40 w-full rounded-lg object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleLike(p);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs hover:bg-white/5",
                      p.liked_by_me ? "text-rose-400" : "text-neutral-400",
                    )}
                  >
                    <Heart className={cn("h-3.5 w-3.5", p.liked_by_me && "fill-current")} />
                    {p.like_count || ""}
                  </button>
                  <Link
                    to="/posts/$id"
                    params={{ id: p.id }}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-sky-300"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {p.comment_count || ""}
                  </Link>
                  {user && (p.author_id === user.id || isSuperAdminEmail(user.email)) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deletePost(p);
                      }}
                      className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-neutral-500 hover:bg-rose-500/10 hover:text-rose-300"
                      title="Delete post"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        </div>
      )}
      {!loading && filteredPosts.length === 0 && (
        authorId || organizerId ? (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
              <Newspaper className="h-8 w-8 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-300">
                {emptyLabel || (organizerMeta?.name ? `${organizerMeta.name} is yet to post` : "No posts yet")}
              </p>
            </div>
            {authorId && !organizerId && <HomeInfoGrid />}
          </div>
        ) : (
          <FeedEmptySuggestions mode={mode} />
        )
      )}
      {more && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" className="border-white/15" onClick={() => void load(false)}>
            Load more
          </Button>
        </div>
      )}
      <PhotoLightbox src={lightbox} open={!!lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
