/**
 * Organizer public profile — no site Header/Footer (hideChrome).
 * Theme-aware, optimistic followers, vertical community links.
 */
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import {
  getOrganizerBySlug,
  getFollowerCount,
  followOrganizer,
  unfollowOrganizer,
  isFollowing,
  listOrganizerTeam,
  type Organizer,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, UserPlus, UserMinus, BadgeCheck, Trophy, Users, MessagesSquare,
  Share2, Shield, ExternalLink, Calendar,
} from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getOrCreateOrgCommunityChat, requestOrgCommunityChat } from "@/lib/dm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/o/$slug")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: `${params.slug} — NepARENA`,
      description: "Organizer on NepARENA",
      path: `/o/${params.slug}`,
    }),
  }),
  component: OrganizerPublicPage,
});

function OrganizerPublicPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  const { data: organizer, isLoading } = useQuery({
    queryKey: ["organizer", slug],
    queryFn: () => getOrganizerBySlug(slug),
    enabled: !!slug,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["org_followers", organizer?.id],
    queryFn: () => getFollowerCount(organizer!.id),
    enabled: !!organizer?.id,
  });

  const { data: iFollow = false } = useQuery({
    queryKey: ["org_following", organizer?.id, user?.id],
    queryFn: () => isFollowing(organizer!.id, user!.id),
    enabled: !!organizer?.id && !!user?.id,
  });

  const { data: team = [] } = useQuery({
    queryKey: ["org_team", organizer?.id],
    queryFn: () => listOrganizerTeam(organizer!.id),
    enabled: !!organizer?.id,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["org_tournaments", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name, status, starts_at, cover_url")
        .eq("organizer_id", organizer!.id)
        .order("starts_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  const { data: communityLinks = [] } = useQuery({
    queryKey: ["community_links_public", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_links")
        .select("id, title, url, sort_order")
        .eq("organizer_id", organizer!.id)
        .order("sort_order");
      return data ?? [];
    },
  });

  const toggleFollow = async () => {
    if (!user || !organizer || followBusy) return;
    setFollowBusy(true);
    try {
      if (iFollow) {
        await unfollowOrganizer(organizer.id, user.id);
        toast.success("Unfollowed");
      } else {
        await followOrganizer(organizer.id, user.id);
        toast.success("Following");
      }
      await qc.invalidateQueries({ queryKey: ["org_following", organizer.id, user.id] });
      await qc.invalidateQueries({ queryKey: ["org_followers", organizer.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setFollowBusy(false);
    }
  };

  const openGroupChat = async () => {
    if (!user || !organizer || chatBusy) return;
    setChatBusy(true);
    try {
      const res = await getOrCreateOrgCommunityChat(organizer.id);
      if (res.id) {
        await navigate({ to: "/messages", search: { c: res.id } });
        return;
      }
      const req = await requestOrgCommunityChat(organizer.id);
      if (req.status === "already_member" && req.conversationId) {
        await navigate({ to: "/messages", search: { c: req.conversationId } });
        return;
      }
      if (req.status === "requested" || req.status === "pending") {
        toast.success("Group chat request sent. Organizer will approve.");
      } else if (req.error) {
        toast.error(req.error);
      } else {
        toast.message("Request submitted");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open group chat");
    } finally {
      setChatBusy(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      </PageShell>
    );
  }

  if (!organizer) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-neutral-400">Organizer not found.</p>
          <Button asChild className="mt-4"><Link to="/organizers">Browse organizers</Link></Button>
        </div>
      </PageShell>
    );
  }

  const theme = (organizer.theme || {}) as Record<string, string>;
  const accent = theme.accent || "#0A84FF";

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-[100dvh] bg-[#0a0a0a] pb-24">
        <div
          className="relative h-40 w-full sm:h-52"
          style={{
            background: organizer.cover_url
              ? `url(${organizer.cover_url}) center/cover`
              : `linear-gradient(135deg, ${accent}33, #0a0a0a)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>

        <div className="mx-auto max-w-lg px-4">
          <div className="-mt-12 flex items-end gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-[#0a0a0a]">
              <AvatarImage src={organizer.logo_url ?? undefined} />
              <AvatarFallback className="text-2xl">{organizer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="mb-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold text-white">{organizer.name}</h1>
                {organizer.is_verified && <BadgeCheck className="h-5 w-5 shrink-0 text-sky-400" />}
              </div>
              <p className="text-sm text-neutral-500">@{organizer.slug}</p>
            </div>
          </div>

          {organizer.description && (
            <p className="mt-4 text-sm leading-relaxed text-neutral-300">{organizer.description}</p>
          )}

          <div className="mt-3 flex items-center gap-4 text-sm text-neutral-400">
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {followerCount} followers</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {user && (
              <Button
                size="sm"
                variant={iFollow ? "secondary" : "default"}
                className="rounded-full"
                disabled={followBusy}
                onClick={() => void toggleFollow()}
                style={!iFollow ? { backgroundColor: accent } : undefined}
              >
                {followBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : iFollow ? <UserMinus className="mr-1.5 h-3.5 w-3.5" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
                {iFollow ? "Following" : "Follow"}
              </Button>
            )}
            {user && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-white/15"
                disabled={chatBusy}
                onClick={() => void openGroupChat()}
              >
                {chatBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <MessagesSquare className="mr-1.5 h-3.5 w-3.5" />}
                Group Chat
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-white/15"
              onClick={async () => {
                const url = `${window.location.origin}/o/${organizer.slug}`;
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied");
                } catch {
                  toast.message(url);
                }
              }}
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
            </Button>
          </div>

          {/* Owner & team — roles from About / organizer_members, not hardcoded */}
          {team.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Shield className="h-3.5 w-3.5" /> Owner & team
              </h2>
              <div className="space-y-2">
                {team.map((m) => {
                  const roleLabel = m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : "Moderator";
                  const name = m.full_name?.trim() || m.username?.trim() || "Member";
                  return (
                    <Link
                      key={`${m.user_id}-${m.role}`}
                      to="/members/$id"
                      params={{ id: m.user_id }}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06]"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.avatar_url ?? undefined} />
                        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-100">{name}</p>
                        <p className="text-[11px] text-neutral-500">{roleLabel}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-white/10 text-[10px]">
                        {roleLabel}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tournaments */}
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Tournaments
            </h2>
            {tournaments.length === 0 ? (
              <p className="text-sm text-neutral-500">No tournaments yet.</p>
            ) : (
              <div className="space-y-2">
                {tournaments.map((t: any) => (
                  <Link
                    key={t.id}
                    to="/tournaments/$id"
                    params={{ id: t.id }}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 hover:bg-white/[0.06]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-100">{t.name}</p>
                      <p className="text-[11px] capitalize text-neutral-500">{t.status || "draft"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {communityLinks.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-white">Community</h2>
              <div className="space-y-2">
                {communityLinks.map((l: any) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/[0.06]"
                  >
                    <span className="truncate">{l.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-neutral-500">
            © {new Date().getFullYear()} {organizer.name}. All rights reserved. · Powered by NepARENA
          </footer>
        </div>
      </div>
    </PageShell>
  );
}
