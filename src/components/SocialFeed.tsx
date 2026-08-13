import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type FeedPost = {
  id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  pinned: boolean;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

const PAGE = 12;

export function SocialFeed({ authorId }: { authorId?: string }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      let q = supabase
        .from("posts")
        .select("id, author_id, body, image_url, pinned, created_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (authorId) q = q.eq("author_id", authorId);
      if (!reset && cursor) q = q.lt("created_at", cursor);
      const { data, error } = await q;
      if (error) {
        console.warn("posts", error.message);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as Omit<
        FeedPost,
        "like_count" | "comment_count" | "liked_by_me" | "author_name" | "author_avatar"
      >[];
      const ids = rows.map((r) => r.id);
      const authorIds = [...new Set(rows.map((r) => r.author_id))];

      const [profiles, likes, comments] = await Promise.all([
        authorIds.length
          ? supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .in("id", authorIds)
          : Promise.resolve({
              data: [] as {
                id: string;
                username: string | null;
                full_name: string | null;
                avatar_url: string | null;
              }[],
            }),
        ids.length
          ? supabase.from("post_likes").select("post_id, user_id").in("post_id", ids)
          : Promise.resolve({ data: [] as { post_id: string; user_id: string }[] }),
        ids.length
          ? supabase.from("post_comments").select("post_id").in("post_id", ids)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
      ]);

      const pmap = new Map(
        (
          (profiles.data ?? []) as {
            id: string;
            username: string | null;
            full_name: string | null;
            avatar_url: string | null;
          }[]
        ).map((p) => [p.id, p]),
      );
      const likeRows = (likes.data ?? []) as { post_id: string; user_id: string }[];
      const commentRows = (comments.data ?? []) as { post_id: string }[];
      const likeCount = new Map<string, number>();
      const likedMe = new Set<string>();
      for (const l of likeRows) {
        likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
        if (user && l.user_id === user.id) likedMe.add(l.post_id);
      }
      const cCount = new Map<string, number>();
      for (const c of commentRows) cCount.set(c.post_id, (cCount.get(c.post_id) ?? 0) + 1);

      const enriched: FeedPost[] = rows.map((r) => {
        const a = pmap.get(r.author_id);
        return {
          ...r,
          author_name: a?.full_name?.trim() || a?.username?.trim() || "Player",
          author_avatar: a?.avatar_url ?? null,
          like_count: likeCount.get(r.id) ?? 0,
          comment_count: cCount.get(r.id) ?? 0,
          liked_by_me: likedMe.has(r.id),
        };
      });

      setPosts((prev) => (reset ? enriched : [...prev, ...enriched]));
      setMore(rows.length === PAGE);
      if (rows.length) setCursor(rows[rows.length - 1]!.created_at);
      setLoading(false);
    },
    [authorId, cursor, user],
  );

  useEffect(() => {
    setCursor(null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, user?.id]);

  const createPost = async () => {
    if (!user || !body.trim() || posting) return;
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      body: body.trim(),
    });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    setCursor(null);
    void load(true);
    toast.success("Posted");
  };

  const toggleLike = async (post: FeedPost) => {
    if (!user) {
      toast.message("Sign in to like");
      return;
    }
    if (post.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: false, like_count: Math.max(0, p.like_count - 1) }
            : p,
        ),
      );
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p,
        ),
      );
    }
  };

  const sharePost = async (post: FeedPost) => {
    const url = `${window.location.origin}/members/${post.author_id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "NepARENA", text: post.body ?? "", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="space-y-4">
      {user && !authorId && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share a match result, screenshot, or thought…"
            className="min-h-[72px] resize-none border-white/10 bg-black/30"
            maxLength={2000}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">{body.length}/2000</span>
            <Button
              size="sm"
              disabled={posting || !body.trim()}
              onClick={() => void createPost()}
              className="bg-sky-500 text-white hover:bg-sky-400"
            >
              {posting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Post
            </Button>
          </div>
        </div>
      )}

      {posts.map((p) => (
        <article
          key={p.id}
          className={cn(
            "rounded-2xl border border-white/10 bg-white/[0.03] p-4",
            p.pinned && "border-amber-500/30",
          )}
        >
          <div className="flex items-start gap-3">
            <Link to="/members/$id" params={{ id: p.author_id }}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={p.author_avatar ?? undefined} />
                <AvatarFallback>{(p.author_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/members/$id"
                  params={{ id: p.author_id }}
                  className="text-sm font-semibold text-white hover:underline"
                >
                  {p.author_name}
                </Link>
                {p.pinned && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                    Pinned
                  </span>
                )}
                <span className="text-[11px] text-neutral-500">
                  {new Date(p.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {p.body && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-200">{p.body}</p>
              )}
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt=""
                  className="mt-2 max-h-80 w-full rounded-xl object-cover"
                  loading="lazy"
                />
              )}
              <div className="mt-3 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void toggleLike(p)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition hover:bg-white/5",
                    p.liked_by_me ? "text-rose-400" : "text-neutral-400",
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", p.liked_by_me && "fill-current")} />
                  {p.like_count || ""}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenComments((id) => (id === p.id ? null : p.id))}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-400 transition hover:bg-white/5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {p.comment_count || ""}
                </button>
                <button
                  type="button"
                  onClick={() => void sharePost(p)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-400 transition hover:bg-white/5"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {openComments === p.id && <PostComments postId={p.id} />}
            </div>
          </div>
        </article>
      ))}

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-neutral-500">
          No posts yet. Be the first to share something.
        </p>
      )}

      {more && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="border-white/15"
            onClick={() => void load(false)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function PostComments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<
    { id: string; body: string; user_id: string; created_at: string; name?: string }[]
  >([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("id, body, user_id, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(40);
      const list = (data ?? []) as {
        id: string;
        body: string;
        user_id: string;
        created_at: string;
      }[];
      const uids = [...new Set(list.map((c) => c.user_id))];
      const { data: profs } = uids.length
        ? await supabase.from("profiles").select("id, username, full_name").in("id", uids)
        : { data: [] as { id: string; username: string | null; full_name: string | null }[] };
      const map = new Map(
        ((profs ?? []) as { id: string; username: string | null; full_name: string | null }[]).map(
          (p) => [p.id, p.full_name?.trim() || p.username?.trim() || "Player"],
        ),
      );
      setRows(list.map((c) => ({ ...c, name: map.get(c.user_id) })));
    })();
  }, [postId]);

  const send = async () => {
    if (!user || !text.trim() || busy) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, body: text.trim() })
      .select("id, body, user_id, created_at")
      .maybeSingle();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      setRows((prev) => [
        ...prev,
        {
          ...(data as { id: string; body: string; user_id: string; created_at: string }),
          name: "You",
        },
      ]);
      setText("");
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
      {rows.map((c) => (
        <div key={c.id} className="text-xs text-neutral-300">
          <span className="font-semibold text-neutral-100">{c.name}</span>{" "}
          <span className="text-neutral-400">{c.body}</span>
        </div>
      ))}
      {user && (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            className="h-8 flex-1 rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white outline-none focus:border-sky-500/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <Button size="sm" variant="ghost" disabled={busy || !text.trim()} onClick={() => void send()}>
            Reply
          </Button>
        </div>
      )}
    </div>
  );
}
