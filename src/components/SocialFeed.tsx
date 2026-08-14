import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdminEmail } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2, Loader2, Send, Repeat2, ImagePlus, X, MoreHorizontal, Pencil, Trash2, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ZoomableImage } from "@/components/PhotoLightbox";
import { InlineStreak } from "@/components/StreakBadge";
import { listDmThreads, sendDmMessage, type DmThread } from "@/lib/dm";
import { encodeSharedPost } from "@/lib/shared-post";

export type FeedPost = {
  id: string; author_id: string; body: string | null; image_url: string | null;
  image_urls?: string[] | null; pinned: boolean; created_at: string;
  repost_of?: string | null; organizer_id?: string | null;
  author_name?: string; author_avatar?: string | null;
  like_count: number; comment_count: number; liked_by_me: boolean;
  author_streak?: number; is_organizer_post?: boolean;
  organizer_slug?: string | null;
  original?: { id: string; author_id: string; body: string | null; image_url: string | null; image_urls?: string[] | null; created_at: string; author_name?: string; author_avatar?: string | null } | null;
};

const PAGE = 12;

export function SocialFeed({
  authorId, mode = "for_you", hideComposer = false, forceComposer = false,
  onComposerClose, onPosted, organizerId, organizerMeta, filterQuery,
}: {
  authorId?: string; mode?: "for_you" | "following"; hideComposer?: boolean; forceComposer?: boolean;
  onComposerClose?: () => void; onPosted?: () => void;
  organizerId?: string | null;
  organizerMeta?: { name: string; logo_url?: string | null; slug?: string | null } | null;
  filterQuery?: string;
}) {
  const { user } = useAuth();
  const isPlatformAdmin = isSuperAdminEmail(user?.email);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<FeedPost | null>(null);
  const [shareThreads, setShareThreads] = useState<DmThread[]>([]);
  const [shareBusy, setShareBusy] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [myRepostIds, setMyRepostIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    let followingIds: string[] = [];
    if (mode === "following" && user && !authorId) {
      const { data: fl } = await supabase.from("user_follows").select("following_id").eq("follower_id", user.id);
      followingIds = (fl ?? []).map((r) => r.following_id as string);
      if (!followingIds.length) { setPosts([]); setMore(false); setLoading(false); return; }
    }
    let q = supabase.from("posts").select("id, author_id, body, image_url, image_urls, pinned, created_at, repost_of, organizer_id").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(PAGE);
    if (authorId) q = q.eq("author_id", authorId);
    if (mode === "following" && followingIds.length) q = q.in("author_id", followingIds);
    if (!reset && cursor) q = q.lt("created_at", cursor);
    const { data, error } = await q;
    if (error) { console.warn(error.message); setLoading(false); return; }
    const rows = (data ?? []) as any[];
    const ids = rows.map((r) => r.id as string);
    const authorIds = [...new Set(rows.map((r) => r.author_id as string))];
    const repostIds = rows.map((r) => r.repost_of).filter(Boolean) as string[];
    const orgIds = [...new Set(rows.map((r) => r.organizer_id).filter(Boolean) as string[])];
    const [profiles, likes, comments, originals, orgs] = await Promise.all([
      authorIds.length ? supabase.from("profiles").select("id, username, full_name, avatar_url, login_streak").in("id", authorIds) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from("post_likes").select("post_id, user_id").in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from("post_comments").select("post_id").in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
      repostIds.length ? supabase.from("posts").select("id, author_id, body, image_url, image_urls, created_at").in("id", repostIds) : Promise.resolve({ data: [] as any[] }),
      orgIds.length ? supabase.from("organizers").select("id, name, logo_url, slug").in("id", orgIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const origAuthorIds = [...new Set(((originals.data ?? []) as any[]).map((o) => o.author_id as string))];
    const { data: origProfs } = origAuthorIds.length ? await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", origAuthorIds) : { data: [] as any[] };
    if (user) {
      const targets = [...new Set([...ids, ...repostIds])];
      if (targets.length) {
        const { data: mine } = await supabase.from("posts").select("id, repost_of").eq("author_id", user.id).not("repost_of", "is", null).in("repost_of", targets);
        setMyRepostIds(new Set(((mine ?? []) as { repost_of: string }[]).map((r) => r.repost_of)));
      }
    }
    const pmap = new Map(((profiles.data ?? []) as any[]).map((p) => [p.id as string, p]));
    const omap = new Map(((originals.data ?? []) as any[]).map((o) => [o.id as string, o]));
    const opmap = new Map(((origProfs ?? []) as any[]).map((p) => [p.id as string, p]));
    const orgMap = new Map(((orgs.data ?? []) as any[]).map((o) => [o.id as string, o]));
    const likeRows = (likes.data ?? []) as { post_id: string; user_id: string }[];
    const commentRows = (comments.data ?? []) as { post_id: string }[];
    const likeCount = new Map<string, number>();
    const likedMe = new Set<string>();
    for (const l of likeRows) { likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1); if (user && l.user_id === user.id) likedMe.add(l.post_id); }
    const cCount = new Map<string, number>();
    for (const c of commentRows) cCount.set(c.post_id, (cCount.get(c.post_id) ?? 0) + 1);
    const enriched: FeedPost[] = rows.map((r) => {
      const a = pmap.get(r.author_id);
      let original: FeedPost["original"] = null;
      if (r.repost_of) {
        const o = omap.get(r.repost_of);
        if (o) {
          const oa = opmap.get(o.author_id);
          original = { id: o.id, author_id: o.author_id, body: o.body, image_url: o.image_url, image_urls: o.image_urls, created_at: o.created_at, author_name: oa?.full_name?.trim() || oa?.username?.trim() || "Player", author_avatar: oa?.avatar_url ?? null };
        }
      }
      const org = r.organizer_id ? orgMap.get(r.organizer_id) : null;
      const isOrg = !!org;
      return { ...r, author_name: isOrg ? org!.name : a?.full_name?.trim() || a?.username?.trim() || "Player", author_avatar: isOrg ? org!.logo_url ?? null : a?.avatar_url ?? null, author_streak: isOrg ? 0 : Number(a?.login_streak ?? 0), like_count: likeCount.get(r.id) ?? 0, comment_count: cCount.get(r.id) ?? 0, liked_by_me: likedMe.has(r.id), is_organizer_post: isOrg, organizer_slug: org?.slug ?? null, original };
    });
    setPosts((prev) => (reset ? enriched : [...prev, ...enriched.filter((e) => !prev.some((p) => p.id === e.id))]));
    setMore(rows.length === PAGE);
    if (rows.length) setCursor(rows[rows.length - 1]!.created_at);
    setLoading(false);
  }, [authorId, cursor, user, mode]);

  useEffect(() => { setCursor(null); void load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [authorId, user?.id, mode, organizerId]);

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-post-menu]")) setMenuId(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuId(null); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [menuId]);

  const mediaUrls = (p: { image_url?: string | null; image_urls?: string[] | null }) =>
    ((p.image_urls && p.image_urls.length ? p.image_urls : null) || (p.image_url ? [p.image_url] : [])).filter(Boolean) as string[];

  const createPost = async () => {
    if (!user || posting || (!body.trim() && !images.length)) return;
    setPosting(true);
    try {
      const urls: string[] = [];
      for (const f of images) urls.push(await uploadPublicImage(f, "posts"));
      const payload: Record<string, unknown> = { author_id: user.id, body: body.trim() || null, image_url: urls[0] ?? null, image_urls: urls };
      if (organizerId) payload.organizer_id = organizerId;
      const { error } = await supabase.from("posts").insert(payload);
      if (error) throw error;
      setBody(""); setImages([]); previews.forEach((u) => URL.revokeObjectURL(u)); setPreviews([]);
      setCursor(null); void load(true); toast.success("Posted"); onPosted?.(); onComposerClose?.();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); } finally { setPosting(false); }
  };

  const toggleLike = async (post: FeedPost) => {
    if (!user) return toast.message("Sign in to like");
    if (post.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked_by_me: false, like_count: Math.max(0, p.like_count - 1) } : p)));
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p)));
    }
  };

  const doRepost = async (post: FeedPost) => {
    if (!user) return toast.message("Sign in to repost");
    const targetId = post.repost_of || post.id;
    if (myRepostIds.has(targetId) || (post.repost_of && post.author_id === user.id)) {
      await supabase.from("posts").delete().eq("author_id", user.id).eq("repost_of", targetId);
      setMyRepostIds((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
      setCursor(null); void load(true); toast.success("Repost removed"); return;
    }
    await supabase.from("posts").insert({ author_id: user.id, body: null, repost_of: targetId });
    setMyRepostIds((prev) => new Set(prev).add(targetId)); setCursor(null); void load(true); toast.success("Reposted");
  };

  const deletePost = async (post: FeedPost) => {
    if (!user) return;
    if (post.author_id !== user.id && !isPlatformAdmin) return;
    if (!window.confirm(isPlatformAdmin && post.author_id !== user.id ? "Delete this post (moderation)?" : "Delete this post?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== post.id)); setMenuId(null);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { toast.error(error.message); void load(true); } else toast.success("Deleted");
  };

  const saveEdit = async (postId: string) => {
    if (!user || !editBody.trim()) return;
    const { error } = await supabase.from("posts").update({ body: editBody.trim(), edited_at: new Date().toISOString() }).eq("id", postId).eq("author_id", user.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, body: editBody.trim() } : p))); setEditId(null); toast.success("Updated");
  };

  const q = (filterQuery ?? "").trim().toLowerCase();
  const filteredPosts = !q ? posts : posts.filter((p) => ((p.repost_of && p.original ? p.original.body : p.body) ?? "").toLowerCase().includes(q) || ((p.repost_of && p.original ? p.original.author_name : p.author_name) ?? "").toLowerCase().includes(q));
  const showComposer = user && !authorId && (!hideComposer || forceComposer);

  return (
    <div className="space-y-4">
      {showComposer && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share something…" className="min-h-[72px] resize-none border-white/10 bg-black/30" maxLength={2000} />
          {previews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => { setImages((p) => p.filter((_, j) => j !== i)); setPreviews((p) => { const u = p[i]; if (u) URL.revokeObjectURL(u); return p.filter((_, j) => j !== i); }); }} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (!e.target.files?.length) return; const list = Array.from(e.target.files).slice(0, 4 - images.length); setImages((prev) => [...prev, ...list].slice(0, 4)); setPreviews((prev) => [...prev, ...list.map((f) => URL.createObjectURL(f))].slice(0, 4)); }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-neutral-400 hover:bg-white/5"><ImagePlus className="h-4 w-4" /> Photo</button>
            <Button size="sm" disabled={posting || (!body.trim() && !images.length)} onClick={() => void createPost()} className="bg-sky-500 text-white">{posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />} Post</Button>
          </div>
        </div>
      )}
      {filteredPosts.map((p) => {
        const isRepost = !!p.repost_of && p.original;
        const urls = mediaUrls(isRepost ? p.original! : p);
        const displayAuthorId = isRepost ? p.original!.author_id : p.author_id;
        const displayName = isRepost ? p.original!.author_name : p.author_name;
        const displayAvatar = isRepost ? p.original!.author_avatar : p.author_avatar;
        const isMine = !!(user && p.author_id === user.id);
        const alreadyReposted = myRepostIds.has(p.repost_of || p.id);
        return (
          <article key={p.id} className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4", p.pinned && "border-amber-500/30")}>
            {isRepost && <div className="mb-2 flex items-center gap-1.5 text-[11px] text-neutral-500"><Repeat2 className="h-3 w-3" /><span>{p.author_name} reposted</span></div>}
            <div className="flex items-start gap-3">
              <Link to={p.is_organizer_post && p.organizer_slug ? "/o/$slug" : "/members/$id"} params={p.is_organizer_post && p.organizer_slug ? { slug: p.organizer_slug } : { id: displayAuthorId }}>
                <Avatar className={cn("h-10 w-10", p.is_organizer_post && "ring-1 ring-sky-500/30")}><AvatarImage src={displayAvatar ?? undefined} /><AvatarFallback>{(displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={p.is_organizer_post && p.organizer_slug ? "/o/$slug" : "/members/$id"} params={p.is_organizer_post && p.organizer_slug ? { slug: p.organizer_slug } : { id: displayAuthorId }} className="text-sm font-semibold text-white hover:underline">{displayName}</Link>
                  {p.is_organizer_post && <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">Organizer</span>}
                  {!isRepost && !p.is_organizer_post && <InlineStreak streak={p.author_streak} />}
                  <span className="text-[11px] text-neutral-500">{new Date(isRepost ? p.original!.created_at : p.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  {(isMine || isPlatformAdmin) && (
                    <div className="relative ml-auto z-50" data-post-menu>
                      <button type="button" onClick={() => setMenuId((id) => (id === p.id ? null : p.id))} className="rounded-full p-1 text-neutral-400 hover:bg-white/5"><MoreHorizontal className="h-4 w-4" /></button>
                      {menuId === p.id && (
                        <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-xl border border-white/10 bg-[#151515] py-1 shadow-xl">
                          {isMine && !p.repost_of && <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-200 hover:bg-white/5" onClick={() => { setEditId(p.id); setEditBody(p.body ?? ""); setMenuId(null); }}><Pencil className="h-3.5 w-3.5" /> Edit</button>}
                          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-400 hover:bg-white/5" onClick={() => void deletePost(p)}><Trash2 className="h-3.5 w-3.5" /> {isPlatformAdmin && !isMine ? "Remove (admin)" : "Delete"}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {editId === p.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="min-h-[60px] border-white/10 bg-black/30 text-sm" maxLength={2000} />
                    <div className="flex gap-2"><Button size="sm" className="bg-sky-500 text-white" onClick={() => void saveEdit(p.id)}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button></div>
                  </div>
                ) : ((isRepost ? p.original!.body : p.body) && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-200">{isRepost ? p.original!.body : p.body}</p>)}
                {urls.length === 1 && <ZoomableImage src={urls[0]!} alt="" className="mt-2 max-h-80 w-full rounded-xl object-cover" />}
                {urls.length > 1 && <div className="mt-2 grid grid-cols-2 gap-1">{urls.slice(0, 4).map((u, i) => <ZoomableImage key={i} src={u} alt="" className="max-h-40 w-full rounded-lg object-cover" />)}</div>}
                <div className="mt-3 flex items-center gap-1">
                  <button type="button" onClick={() => void toggleLike(p)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs hover:bg-white/5", p.liked_by_me ? "text-rose-400" : "text-neutral-400")}><Heart className={cn("h-3.5 w-3.5", p.liked_by_me && "fill-current")} />{p.like_count || ""}</button>
                  <button type="button" onClick={() => setOpenComments((id) => (id === p.id ? null : p.id))} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-400 hover:bg-white/5"><MessageCircle className="h-3.5 w-3.5" />{p.comment_count || ""}</button>
                  <button type="button" onClick={() => void doRepost(p)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs hover:bg-white/5", alreadyReposted || (isRepost && isMine) ? "text-emerald-400" : "text-neutral-400")}><Repeat2 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={async () => { setShareTarget(p); if (user) { const t = await listDmThreads(user.id); setShareThreads(t.filter((x) => x.status === "active").slice(0, 20)); } }} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-400 hover:bg-white/5"><Share2 className="h-3.5 w-3.5" /></button>
                </div>
                {openComments === p.id && <PostComments postId={p.id} />}
              </div>
            </div>
          </article>
        );
      })}
      {loading && <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-neutral-500" /></div>}
      {!loading && filteredPosts.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-6 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.06]"><Newspaper className="h-6 w-6 text-neutral-500" /></div>
          <p className="text-base font-semibold text-white">No posts yet</p>
          <p className="max-w-xs text-sm text-neutral-500">{mode === "following" ? "Follow users or organizers to see their posts here." : "Follow users or organizers to see posts. Be the first to share something!"}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Link to="/organizers" className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-sky-400/40 hover:bg-sky-500/10">Find organizers</Link>
            <Link to="/members" className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-sky-400/40 hover:bg-sky-500/10">Find members</Link>
          </div>
        </div>
      )}
      {more && !loading && <div className="flex justify-center"><Button variant="outline" size="sm" className="border-white/15" onClick={() => void load(false)}>Load more</Button></div>}
      <Dialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)}>
        <DialogContent className="border-white/10 bg-[#111] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-base">Share to chat</DialogTitle></DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {shareThreads.map((t) => (
              <button key={t.conversation_id} type="button" disabled={shareBusy} onClick={async () => {
                if (!user || !shareTarget) return; setShareBusy(true);
                const body = encodeSharedPost({ id: shareTarget.repost_of && shareTarget.original ? shareTarget.original.id : shareTarget.id, author_id: shareTarget.repost_of && shareTarget.original ? shareTarget.original.author_id : shareTarget.author_id, author_name: shareTarget.repost_of && shareTarget.original ? shareTarget.original.author_name : shareTarget.author_name, body: shareTarget.repost_of && shareTarget.original ? shareTarget.original.body : shareTarget.body, image_url: shareTarget.repost_of && shareTarget.original ? shareTarget.original.image_url : shareTarget.image_url, image_urls: shareTarget.repost_of && shareTarget.original ? shareTarget.original.image_urls : shareTarget.image_urls });
                const res = await sendDmMessage({ conversationId: t.conversation_id, senderId: user.id, body });
                setShareBusy(false); if (res.error) toast.error(res.error); else { toast.success("Sent"); setShareTarget(null); }
              }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5">
                <Avatar className="h-9 w-9"><AvatarImage src={t.peer_avatar ?? undefined} /><AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <span className="truncate text-sm font-medium text-white">{t.peer_name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PostComments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ id: string; body: string; user_id: string; name?: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("post_comments").select("id, body, user_id, created_at").eq("post_id", postId).order("created_at", { ascending: true }).limit(40);
      const list = (data ?? []) as { id: string; body: string; user_id: string }[];
      const uids = [...new Set(list.map((c) => c.user_id))];
      const { data: profs } = uids.length ? await supabase.from("profiles").select("id, username, full_name").in("id", uids) : { data: [] as any[] };
      const map = new Map(((profs ?? []) as any[]).map((p) => [p.id, p.full_name?.trim() || p.username?.trim() || "Player"]));
      setRows(list.map((c) => ({ ...c, name: map.get(c.user_id) as string })));
    })();
  }, [postId]);
  const send = async () => {
    if (!user || !text.trim() || busy) return; setBusy(true);
    const { data, error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, body: text.trim() }).select("id, body, user_id").maybeSingle();
    setBusy(false); if (error) return toast.error(error.message);
    if (data) { setRows((prev) => [...prev, { ...(data as any), name: "You" }]); setText(""); }
  };
  return (
    <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
      {rows.map((c) => <div key={c.id} className="text-xs text-neutral-300"><span className="font-semibold text-neutral-100">{c.name}</span> <span className="text-neutral-400">{c.body}</span></div>)}
      {user && <div className="flex gap-2"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Comment…" className="h-8 flex-1 rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white outline-none" onKeyDown={(e) => { if (e.key === "Enter") void send(); }} /><Button size="sm" variant="ghost" disabled={busy || !text.trim()} onClick={() => void send()}>Reply</Button></div>}
    </div>
  );
}
