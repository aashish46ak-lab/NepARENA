import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, Loader2, Send, Repeat2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InlineStreak } from "@/components/StreakBadge";

export type FeedPost = {
  id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  pinned: boolean;
  created_at: string;
  repost_of?: string | null;
  author_name?: string;
  author_avatar?: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  author_streak?: number;
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
}: {
  authorId?: string;
  mode?: FeedMode;
  hideComposer?: boolean;
  forceComposer?: boolean;
  onComposerClose?: () => void;
  onPosted?: () => void;
}) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      let followingIds: string[] = [];
      if (mode === "following" && user && !authorId) {
        const { data: fl } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
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
        .select("id, author_id, body, image_url, image_urls, pinned, created_at, repost_of")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (authorId) q = q.eq("author_id", authorId);
      if (mode === "following" && followingIds.length) q = q.in("author_id", followingIds);
      if (!reset && cursor) q = q.lt("created_at", cursor);

      const { data, error } = await q;
      if (error) {
        console.warn("posts", error.message);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as any[];
      const ids = rows.map((r) => r.id as string);
      const authorIds = [...new Set(rows.map((r) => r.author_id as string))];
      const repostIds = rows.map((r) => r.repost_of).filter(Boolean) as string[];

      const [profiles, likes, comments, originals] = await Promise.all([
        authorIds.length
          ? supabase.from("profiles").select("id, username, full_name, avatar_url, login_streak").in("id", authorIds)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("post_likes").select("post_id, user_id").in("post_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("post_comments").select("post_id").in("post_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        repostIds.length
          ? supabase.from("posts").select("id, author_id, body, image_url, image_urls, created_at").in("id", repostIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const origAuthorIds = [...new Set(((originals.data ?? []) as any[]).map((o) => o.author_id as string))];
      const { data: origProfs } = origAuthorIds.length
        ? await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", origAuthorIds)
        : { data: [] as any[] };

      const pmap = new Map(((profiles.data ?? []) as any[]).map((p) => [p.id as string, p]));
      const omap = new Map(((originals.data ?? []) as any[]).map((o) => [o.id as string, o]));
      const opmap = new Map(((origProfs ?? []) as any[]).map((p) => [p.id as string, p]));

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
        let original: FeedPost["original"] = null;
        if (r.repost_of) {
          const o = omap.get(r.repost_of);
          if (o) {
            const oa = opmap.get(o.author_id);
            original = {
              id: o.id,
              author_id: o.author_id,
              body: o.body,
              image_url: o.image_url,
              image_urls: o.image_urls,
              created_at: o.created_at,
              author_name: oa?.full_name?.trim() || oa?.username?.trim() || "Player",
              author_avatar: oa?.avatar_url ?? null,
            };
          }
        }
        return {
          ...r,
          author_name: a?.full_name?.trim() || a?.username?.trim() || "Player",
          author_avatar: a?.avatar_url ?? null,
          author_streak: Number(a?.login_streak ?? 0),
          like_count: likeCount.get(r.id) ?? 0,
          comment_count: cCount.get(r.id) ?? 0,
          liked_by_me: likedMe.has(r.id),
          original,
        };
      });

      setPosts((prev) => (reset ? enriched : [...prev, ...enriched]));
      setMore(rows.length === PAGE);
      if (rows.length) setCursor(rows[rows.length - 1]!.created_at);
      setLoading(false);
    },
    [authorId, cursor, user, mode],
  );

  useEffect(() => {
    setCursor(null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, user?.id, mode]);

  const onPickImages = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 4 - images.length);
    setImages((prev) => [...prev, ...list].slice(0, 4));
    setPreviews((prev) => [...prev, ...list.map((f) => URL.createObjectURL(f))].slice(0, 4));
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      const u = prev[idx];
      if (u) URL.revokeObjectURL(u);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const createPost = async () => {
    if (!user || posting) return;
    if (!body.trim() && images.length === 0) return;
    setPosting(true);
    try {
      const urls: string[] = [];
      for (const f of images) {
        urls.push(await uploadPublicImage(f, "posts"));
      }
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        body: body.trim() || null,
        image_url: urls[0] ?? null,
        image_urls: urls,
      });
      if (error) throw error;
      setBody("");
      setImages([]);
      previews.forEach((u) => URL.revokeObjectURL(u));
      setPreviews([]);
      setCursor(null);
      void load(true);
      toast.success("Posted");
      onPosted?.();
      onComposerClose?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const doRepost = async (post: FeedPost) => {
    if (!user) {
      toast.message("Sign in to repost");
      return;
    }
    const targetId = post.repost_of || post.id;
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      body: null,
      repost_of: targetId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCursor(null);
    void load(true);
    toast.success("Reposted");
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
          p.id === post.id ? { ...p, liked_by_me: false, like_count: Math.max(0, p.like_count - 1) } : p,
        ),
      );
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p)),
      );
    }
  };

  const sharePost = async (post: FeedPost) => {
    const url = `${window.location.origin}/members/${post.author_id}`;
    try {
      if (navigator.share) await navigator.share({ title: "NepARENA", text: post.body ?? "", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch { /* cancelled */ }
  };

  const mediaUrls = (p: { image_url?: string | null; image_urls?: string[] | null }) => {
    const arr = (p.image_urls && p.image_urls.length ? p.image_urls : null) || (p.image_url ? [p.image_url] : []);
    return arr.filter(Boolean) as string[];
  };

  const showComposer = user && !authorId && (!hideComposer || forceComposer);

  return (
    <div className="space-y-4">
      {showComposer && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          {forceComposer && (
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Create post</span>
              <button type="button" onClick={() => onComposerClose?.()} className="rounded-full p-1 text-neutral-400 hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share a match result, screenshot, or thought…"
            className="min-h-[72px] resize-none border-white/10 bg-black/30"
            maxLength={2000}
          />
          {previews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickImages(e.target.files)} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={images.length >= 4} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-sky-300 disabled:opacity-40">
                <ImagePlus className="h-4 w-4" /> Photo
              </button>
              <span className="text-[11px] text-neutral-500">{body.length}/2000</span>
            </div>
            <Button size="sm" disabled={posting || (!body.trim() && images.length === 0)} onClick={() => void createPost()} className="bg-sky-500 text-white hover:bg-sky-400">
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Post
            </Button>
          </div>
        </div>
      )}

      {posts.map((p) => {
        const isRepost = !!p.repost_of && p.original;
        const urls = mediaUrls(isRepost ? p.original! : p);
        return (
          <article key={p.id} className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4", p.pinned && "border-amber-500/30")}>
            {isRepost && (
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-neutral-500">
                <Repeat2 className="h-3 w-3" />
                <span>{p.author_name} reposted</span>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Link to="/members/$id" params={{ id: isRepost ? p.original!.author_id : p.author_id }}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={(isRepost ? p.original!.author_avatar : p.author_avatar) ?? undefined} />
                  <AvatarFallback>{((isRepost ? p.original!.author_name : p.author_name) ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/members/$id" params={{ id: isRepost ? p.original!.author_id : p.author_id }} className="text-sm font-semibold text-white hover:underline">
                    {isRepost ? p.original!.author_name : p.author_name}
                  </Link>
                  {!isRepost && <InlineStreak streak={p.author_streak} />}
                  {p.pinned && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">Pinned</span>}
                  <span className="text-[11px] text-neutral-500">
                    {new Date(isRepost ? p.original!.created_at : p.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                {(isRepost ? p.original!.body : p.body) && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-200">{isRepost ? p.original!.body : p.body}</p>
                )}
                {urls.length === 1 && <img src={urls[0]} alt="" className="mt-2 max-h-80 w-full rounded-xl object-cover" loading="lazy" />}
                {urls.length > 1 && (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {urls.slice(0, 4).map((u, i) => (
                      <img key={i} src={u} alt="" className="max-h-40 w-full rounded-lg object-cover" loading="lazy" />
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1">
                  <button type="button" onClick={() => void toggleLike(p)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition hover:bg-white/5", p.liked_by_me ? "text-rose-400" : "text-neutral-400")}>
                    <Heart className={cn("h-3.5 w-3.5", p.liked_by_me && "fill-current")} />
                    {p.like_count || ""}
                  </button>
                  <button type="button" onClick={() => setOpenComments((id) => (id === p.id ? null : p.id))} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-400 transition hover:bg-white/5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {p.comment_count || ""}
                  </button>
                  <button type="button" onClick={() => void doRepost(p)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-400 transition hover:bg-white/5" title="Repost">
                    <Repeat2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => void sharePost(p)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-400 transition hover:bg-white/5" title="Share">
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {openComments === p.id && <PostComments postId={p.id} />}
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

      {!loading && posts.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-neutral-500">
          {mode === "following" ? "Follow people to see their posts here." : "No posts yet. Be the first to share something."}
        </p>
      )}

      {more && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" className="border-white/15" onClick={() => void load(false)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function PostComments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ id: string; body: string; user_id: string; created_at: string; name?: string }[]>([]);
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
      const list = (data ?? []) as { id: string; body: string; user_id: string; created_at: string }[];
      const uids = [...new Set(list.map((c) => c.user_id))];
      const { data: profs } = uids.length
        ? await supabase.from("profiles").select("id, username, full_name").in("id", uids)
        : { data: [] as any[] };
      const map = new Map(((profs ?? []) as any[]).map((p) => [p.id, p.full_name?.trim() || p.username?.trim() || "Player"]));
      setRows(list.map((c) => ({ ...c, name: map.get(c.user_id) as string })));
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
      setRows((prev) => [...prev, { ...(data as any), name: "You" }]);
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
