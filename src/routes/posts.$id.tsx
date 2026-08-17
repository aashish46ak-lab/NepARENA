/**
 * X-style post detail — body + nested comments/replies.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Heart, Loader2, MessageCircle, BadgeCheck, Send,
} from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/posts/$id")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: "Post — NepARENA",
      description: "Post and comments",
      path: `/posts/${params.id}`,
    }),
  }),
  component: PostDetailPage,
});

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
};

function PostDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: post, isLoading } = useQuery({
    queryKey: ["post_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .eq("id", data.author_id)
        .maybeSingle();
      const { count: likes } = await supabase
        .from("post_likes")
        .select("post_id", { count: "exact", head: true })
        .eq("post_id", id);
      let liked_by_me = false;
      if (user) {
        const { data: like } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("post_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        liked_by_me = !!like;
      }
      return {
        ...data,
        author_name: prof?.full_name || prof?.username || "Player",
        author_avatar: prof?.avatar_url,
        author_verified: !!prof?.is_verified,
        like_count: likes ?? 0,
        liked_by_me,
      };
    },
    enabled: !!id,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["post_comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, body, created_at, parent_id")
        .eq("post_id", id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        const { data: d2 } = await supabase
          .from("post_comments")
          .select("id, post_id, user_id, body, created_at")
          .eq("post_id", id)
          .order("created_at", { ascending: true })
          .limit(200);
        const rows = (d2 ?? []).map((r) => ({ ...r, parent_id: null as string | null }));
        return enrich(rows as Comment[]);
      }
      return enrich((data ?? []) as Comment[]);
    },
    enabled: !!id,
  });

  async function enrich(rows: Comment[]) {
    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (!ids.length) return rows;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => {
      const p = map.get(r.user_id);
      return {
        ...r,
        author_name: p?.full_name || p?.username || "Player",
        author_avatar: p?.avatar_url ?? null,
      };
    });
  }

  const roots = comments.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const submit = async () => {
    if (!user) {
      toast.message("Sign in to comment");
      void navigate({ to: "/auth" });
      return;
    }
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        post_id: id,
        user_id: user.id,
        body: text,
      };
      if (replyTo) payload.parent_id = replyTo.id;
      const { error } = await supabase.from("post_comments").insert(payload);
      if (error) throw error;
      setBody("");
      setReplyTo(null);
      await refetchComments();
      void qc.invalidateQueries({ queryKey: ["post_detail", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to comment");
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async () => {
    if (!user || !post) return;
    try {
      if (post.liked_by_me) {
        await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").upsert({ post_id: id, user_id: user.id });
      }
      void qc.invalidateQueries({ queryKey: ["post_detail", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
        </div>
      </PageShell>
    );
  }

  if (!post) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="px-4 py-16 text-center text-neutral-400">Post not found</div>
      </PageShell>
    );
  }

  const renderThread = (c: Comment, depth: number) => {
    const kids = childrenOf(c.id);
    const open = expanded[c.id] ?? depth < 1;
    return (
      <div key={c.id} className={cn("border-t border-white/5 py-3", depth > 0 && "ml-6 border-l border-white/10 pl-3")}>
        <div className="flex gap-2.5">
          <Link to="/members/$id" params={{ id: c.user_id }}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={c.author_avatar ?? undefined} />
              <AvatarFallback>{(c.author_name || "?").slice(0, 1)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <Link to="/members/$id" params={{ id: c.user_id }} className="font-semibold text-white hover:underline">
                {c.author_name}
              </Link>{" "}
              <span className="text-[11px] text-neutral-500">{new Date(c.created_at).toLocaleString()}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-200">{c.body}</p>
            <button
              type="button"
              className="mt-1 text-[11px] font-medium text-sky-400 hover:underline"
              onClick={() => {
                setReplyTo(c);
                setExpanded((e) => ({ ...e, [c.id]: true }));
              }}
            >
              Reply
            </button>
            {kids.length > 0 && (
              <button
                type="button"
                className="ml-3 mt-1 text-[11px] font-medium text-neutral-400 hover:text-white"
                onClick={() => setExpanded((e) => ({ ...e, [c.id]: !open }))}
              >
                {open ? "Hide replies" : `Show ${kids.length} ${kids.length === 1 ? "reply" : "replies"}`}
              </button>
            )}
            {open && kids.map((k) => renderThread(k, depth + 1))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 pb-28 pt-3">
        <Button size="sm" variant="ghost" className="-ml-2 mb-3 rounded-full" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex gap-3">
            <Link to="/members/$id" params={{ id: post.author_id }}>
              <Avatar className="h-11 w-11">
                <AvatarImage src={post.author_avatar ?? undefined} />
                <AvatarFallback>{String(post.author_name).slice(0, 1)}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <p className="flex items-center gap-1 font-semibold text-white">
                {post.author_name}
                {post.author_verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
              </p>
              <p className="text-[11px] text-neutral-500">{new Date(post.created_at).toLocaleString()}</p>
            </div>
          </div>
          {post.body && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-100">{post.body}</p>}
          {post.image_url && (
            <img src={post.image_url} alt="" className="mt-3 max-h-96 w-full rounded-xl object-cover" />
          )}
          <div className="mt-4 flex items-center gap-4 border-t border-white/8 pt-3 text-sm text-neutral-400">
            <button type="button" className={cn("inline-flex items-center gap-1.5 hover:text-rose-400", post.liked_by_me && "text-rose-400")} onClick={() => void toggleLike()}>
              <Heart className={cn("h-4 w-4", post.liked_by_me && "fill-current")} />
              {post.like_count}
            </button>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {comments.length}
            </span>
          </div>
        </article>

        <section className="mt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Comments</h2>
          {roots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-neutral-500">
              No comments yet — be the first
            </p>
          ) : (
            <div>{roots.map((c) => renderThread(c, 0))}</div>
          )}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0a0a]/95 px-3 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg flex-col gap-1.5">
          {replyTo && (
            <div className="flex items-center justify-between text-[11px] text-sky-300">
              <span>Replying to {replyTo.author_name}</span>
              <button type="button" className="text-neutral-400" onClick={() => setReplyTo(null)}>Cancel</button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={replyTo ? "Write a reply…" : "Post your reply"}
              rows={1}
              className="min-h-[40px] resize-none border-white/10 bg-white/[0.05]"
            />
            <Button size="icon" className="shrink-0 rounded-full bg-sky-500" disabled={busy || !body.trim()} onClick={() => void submit()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
