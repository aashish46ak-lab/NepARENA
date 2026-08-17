/**
 * User profile — banner, country flag, full 3-dot (fixed portal, never clipped), social icons.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { PageShell } from "@/components/PageShell";
import { supabase, type Profile } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Loader2, MessageCircle, BadgeCheck, Settings, Plus, MoreHorizontal,
  Share2, Copy, UserPlus, UserMinus, LayoutDashboard, LogOut, Shield,
} from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getOrCreateDm } from "@/lib/dm";
import { SocialFeed } from "@/components/SocialFeed";
import { EditProfileModal } from "@/components/EditProfileModal";
import { CreatePostModal } from "@/components/CreatePostModal";
import { PlatformIcon } from "@/lib/platforms";
import { isSuperAdminEmail } from "@/lib/organizers";
import { countryFlag } from "@/lib/country-flag";

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

const SOCIAL_KEYS = ["facebook", "instagram", "whatsapp", "twitter", "tiktok", "youtube"] as const;

function normalizeUrl(v: string) {
  if (!v) return v;
  const t = v.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("wa.me/") || t.startsWith("api.whatsapp.com")) return `https://${t}`;
  if (/^\+?\d{8,15}$/.test(t.replace(/\s/g, ""))) return `https://wa.me/${t.replace(/\D/g, "")}`;
  return `https://${t}`;
}

function MemberProfilePage() {
  const { id } = Route.useParams();
  const { user, signOut, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [msgBusy, setMsgBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const isOwn = !!user && user.id === id;
  const isPlatformAdmin = isSuperAdminEmail(user?.email) || isOwner;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      const menu = document.getElementById("profile-overflow-menu");
      if (menu?.contains(t)) return;
      setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setMenuOpen((v) => !v);
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ["member_profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!id,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["member_followers", id],
    queryFn: async () => {
      const { count } = await supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", id);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["member_following", id],
    queryFn: async () => {
      const { count } = await supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("follower_id", id);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: iFollow = false } = useQuery({
    queryKey: ["member_i_follow", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("user_follows").select("id").eq("follower_id", user.id).eq("following_id", id).maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user && user.id !== id,
  });

  const { data: hasOrgMembership = false } = useQuery({
    queryKey: ["member_has_org", id],
    queryFn: async () => {
      const { data } = await supabase.from("organizer_members").select("id").eq("user_id", id).limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!id && isOwn,
  });

  const displayName = profile?.full_name?.trim() || profile?.username?.trim() || "Player";
  const handleName = profile?.username?.trim() || displayName;
  const links = ((profile as any)?.social_links && typeof (profile as any).social_links === "object"
    ? ((profile as any).social_links as Record<string, string>) : {}) as Record<string, string>;
  const bannerUrl = links.banner_url || (profile as any)?.banner_url || null;
  const socialEntries = SOCIAL_KEYS.filter((k) => links[k]?.trim()).map((k) => [k, links[k].trim()] as const);
  const flag = countryFlag(profile?.country ?? null);

  const messageUser = async () => {
    if (!user) { toast.message("Sign in to message"); void navigate({ to: "/auth" }); return; }
    if (user.id === id) return;
    setMsgBusy(true);
    try {
      const convId = await getOrCreateDm(id);
      if (convId) void navigate({ to: "/messages", search: { c: convId } });
      else void navigate({ to: "/messages", search: { with: id } });
    } catch {
      void navigate({ to: "/messages", search: { with: id } });
    } finally { setMsgBusy(false); }
  };

  const toggleFollow = async () => {
    if (!user || followBusy || user.id === id) return;
    setFollowBusy(true);
    try {
      if (iFollow) {
        await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", id);
        toast.success("Unfollowed");
      } else {
        await supabase.from("user_follows").insert({ follower_id: user.id, following_id: id });
        toast.success("Following");
      }
      await qc.invalidateQueries({ queryKey: ["member_i_follow", id, user.id] });
      await qc.invalidateQueries({ queryKey: ["member_followers", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setFollowBusy(false); }
  };

  const closeMenu = () => setMenuOpen(false);

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-neutral-500" /></div>
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

  const menu = menuOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          id="profile-overflow-menu"
          role="menu"
          className="fixed z-[400] min-w-[14rem] overflow-visible rounded-xl border border-white/15 bg-[#161618] py-1.5 shadow-2xl shadow-black/80"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          {isOwn && (
            <>
              <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.08]"
                onClick={() => { closeMenu(); setEditOpen(true); }}>
                <Settings className="h-4 w-4 shrink-0 text-neutral-400" /> Edit profile
              </button>
              {(hasOrgMembership || isAdmin) && (
                <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.08]"
                  onClick={() => { closeMenu(); void navigate({ to: "/dashboard" }); }}>
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-neutral-400" /> Organizer dashboard
                </button>
              )}
              {isPlatformAdmin && (
                <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.08]"
                  onClick={() => { closeMenu(); void navigate({ to: "/platform" }); }}>
                  <Shield className="h-4 w-4 shrink-0 text-neutral-400" /> Platform control
                </button>
              )}
              <div className="my-1 border-t border-white/10" />
            </>
          )}
          <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.08]"
            onClick={async () => {
              closeMenu();
              const url = `${window.location.origin}/members/${id}`;
              try {
                if (navigator.share) await navigator.share({ title: displayName, url });
                else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
              } catch { /* cancel */ }
            }}>
            <Share2 className="h-4 w-4 shrink-0 text-neutral-400" /> Share profile
          </button>
          <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.08]"
            onClick={async () => {
              closeMenu();
              const url = `${window.location.origin}/members/${id}`;
              try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
              catch { toast.message(url); }
            }}>
            <Copy className="h-4 w-4 shrink-0 text-neutral-400" /> Copy link
          </button>
          {isOwn && (
            <>
              <div className="my-1 border-t border-white/10" />
              <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-rose-300 hover:bg-white/[0.08]"
                onClick={async () => {
                  closeMenu();
                  await signOut();
                  void navigate({ to: "/" });
                  toast.success("Signed out");
                }}>
                <LogOut className="h-4 w-4 shrink-0" /> Log out
              </button>
            </>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 pb-24 pt-3">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#121214]/90 shadow-2xl ring-1 ring-white/5">
          <div
            className="relative h-32 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black sm:h-40"
            style={bannerUrl ? { background: `url(${bannerUrl}) center/cover` } : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-black/30 to-transparent" />
            {flag && (
              <span
                className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/45 text-lg shadow-lg backdrop-blur-md"
                title={profile.country ?? ""}
                aria-label={profile.country ?? "Country"}
              >
                {flag}
              </span>
            )}
            <div className="absolute right-3 top-3 z-20">
              <button
                ref={btnRef}
                type="button"
                onClick={openMenu}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75"
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            {menu}
          </div>

          <div className="relative px-4 pb-5">
            <div className="-mt-12 flex items-end justify-between gap-3">
              <Avatar className="h-24 w-24 ring-4 ring-[#121214]">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-xl">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="mb-1 flex flex-wrap gap-2">
                {isOwn ? (
                  <Button size="sm" variant="outline" className="rounded-full border-white/15" onClick={() => setEditOpen(true)}>Edit profile</Button>
                ) : (
                  <>
                    <Button size="sm" variant={iFollow ? "secondary" : "default"} className="rounded-full" disabled={followBusy} onClick={() => void toggleFollow()}>
                      {followBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : iFollow ? <UserMinus className="mr-1 h-3.5 w-3.5" /> : <UserPlus className="mr-1 h-3.5 w-3.5" />}
                      {iFollow ? "Following" : "Follow"}
                    </Button>
                    <Button size="sm" className="rounded-full bg-sky-500 text-white hover:bg-sky-400" disabled={msgBusy} onClick={() => void messageUser()}>
                      {msgBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="mr-1 h-3.5 w-3.5" />}
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>

            <h1 className="mt-3 flex flex-wrap items-center gap-1.5 text-xl font-bold text-white">
              {displayName}
              {profile.is_verified && <BadgeCheck className="h-5 w-5 text-sky-400" />}
            </h1>
            {profile.username && <p className="text-sm text-neutral-500">@{profile.username}</p>}
            {profile.country && (
              <p className="mt-0.5 text-xs text-neutral-500">{flag ? `${flag} ` : ""}{profile.country}</p>
            )}
            {profile.bio && <p className="mt-2 text-sm leading-relaxed text-neutral-300">{profile.bio}</p>}

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-400">
              <span><strong className="tabular-nums text-white">{followerCount}</strong> followers</span>
              <span><strong className="tabular-nums text-white">{followingCount}</strong> following</span>
            </div>

            {socialEntries.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socialEntries.map(([k, v]) => (
                  <a key={k} href={normalizeUrl(v)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium capitalize text-neutral-200 transition hover:bg-white/[0.08]">
                    <PlatformIcon platform={k} className="h-3.5 w-3.5" />
                    {k === "twitter" ? "X" : k}
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
              <button type="button" onClick={() => setPostOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition hover:border-sky-400/30 hover:text-sky-300">
                <Plus className="h-3 w-3" /> New post
              </button>
            )}
          </div>
          <SocialFeed key={feedKey} authorId={id} hideComposer emptyLabel={`${handleName} is yet to post`} />
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
