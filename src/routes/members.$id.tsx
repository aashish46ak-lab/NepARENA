import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
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
import {
  Loader2, MessageCircle, BadgeCheck, MapPin, Calendar, ChevronRight,
  Settings, Plus, Trophy, Users,
} from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getOrCreateDm } from "@/lib/dm";
import { SocialFeed } from "@/components/SocialFeed";
import { EditProfileModal } from "@/components/EditProfileModal";
import { CreatePostModal } from "@/components/CreatePostModal";
import { PlatformIcon } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/members/$id")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: "Member profile — NepARENA",
      description: "Player profile on NepARENA",
      path: `/members/${params.id}`,
    }),
  }),
  component: MemberProfilePage,
});

function normalizeUrl(v: string) {
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function MemberProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [msgBusy, setMsgBusy] = useState(false);

  const isOwn = !!user && user.id === id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["member_profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!id,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["member_followers", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", id);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["member_following", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", id);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["member_orgs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizer_members")
        .select("role, organizers(id, name, slug, logo_url, is_verified)")
        .eq("user_id", id);
      return (data ?? []).map((r: any) => ({
        role: r.role as string,
        ...(r.organizers ?? {}),
      }));
    },
    enabled: !!id,
  });

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    "Player";

  const socialEntries = Object.entries(
    (profile as any)?.social_links && typeof (profile as any).social_links === "object"
      ? ((profile as any).social_links as Record<string, string>)
      : {},
  ).filter(([, v]) => typeof v === "string" && v.trim());

  const messageUser = async () => {
    if (!user) {
      toast.message("Sign in to message");
      void navigate({ to: "/auth" });
      return;
    }
    if (user.id === id) return;
    setMsgBusy(true);
    try {
      const convId = await getOrCreateDm(id);
      if (convId) void navigate({ to: "/messages", search: { c: convId } });
      else void navigate({ to: "/messages", search: { with: id } });
    } catch {
      void navigate({ to: "/messages", search: { with: id } });
    } finally {
      setMsgBusy(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
        </div>
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="px-4 py-16 text-center text-neutral-400">Profile not found</div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 pb-24 pt-3">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#121214]/90 shadow-2xl ring-1 ring-white/5">
          <div
            className="relative h-28 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black sm:h-36"
            style={
              (profile as any).banner_url
                ? { background: `url(${(profile as any).banner_url}) center/cover` }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-black/30 to-transparent" />
          </div>
          <div className="relative px-4 pb-6">
            <div className="-mt-12 flex items-end justify-between gap-3">
              <Avatar className="h-24 w-24 ring-4 ring-[#121214]">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-xl">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="mb-1 flex flex-wrap gap-2">
                {isOwn ? (
                  <Button size="sm" variant="outline" className="rounded-full border-white/15" onClick={() => setEditOpen(true)}>
                    <Settings className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                ) : (
                  <Button size="sm" className="rounded-full bg-sky-500 text-white hover:bg-sky-400" disabled={msgBusy} onClick={() => void messageUser()}>
                    {msgBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="mr-1 h-3.5 w-3.5" />}
                    Message
                  </Button>
                )}
              </div>
            </div>
            <h1 className="mt-3 flex flex-wrap items-center gap-1.5 text-xl font-bold text-white">
              {displayName}
              {profile.is_verified && <BadgeCheck className="h-5 w-5 text-sky-400" />}
            </h1>
            {profile.username && <p className="text-sm text-neutral-500">@{profile.username}</p>}
            {profile.bio && <p className="mt-2 text-sm text-neutral-300">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-400">
              <span><strong className="text-white">{followerCount}</strong> followers</span>
              <span><strong className="text-white">{followingCount}</strong> following</span>
            </div>
            {orgs.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Organizations</p>
                <div className="space-y-1.5">
                  {orgs.map((o: any) => (
                    <Link
                      key={o.id || o.slug}
                      to="/o/$slug"
                      params={{ slug: o.slug }}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-sky-400/30"
                    >
                      <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold">
                        {o.logo_url ? <img src={o.logo_url} alt="" className="h-full w-full object-cover" /> : (o.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{o.name}</span>
                      {o.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />}
                      <ChevronRight className="h-4 w-4 text-neutral-500" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {socialEntries.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socialEntries.map(([k, v]) => (
                  <a key={k} href={normalizeUrl(v)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08]">
                    <PlatformIcon platform={k} className="h-3.5 w-3.5" />
                    {k}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Posts</h2>
            {isOwn && (
              <button
                type="button"
                onClick={() => setPostOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition hover:border-sky-400/30 hover:text-sky-300"
              >
                <Plus className="h-3 w-3" /> New post
              </button>
            )}
          </div>
          <SocialFeed key={feedKey} authorId={id} hideComposer />
        </section>
      </div>

      {isOwn && (
        <>
          <EditProfileModal open={editOpen} onOpenChange={setEditOpen} onSaved={() => void qc.invalidateQueries({ queryKey: ["member_profile", id] })} />
          <CreatePostModal open={postOpen} onOpenChange={setPostOpen} onPosted={() => { setPostOpen(false); setFeedKey((k) => k + 1); }} />
        </>
      )}
    </PageShell>
  );
}
