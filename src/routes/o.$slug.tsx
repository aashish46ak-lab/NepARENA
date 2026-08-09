/**
 * Public organizer page — /o/efootball-nepal , /o/fifa-nepal , …
 * Members see this organizer's branding + tournaments only.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  followOrganizer,
  getOrganizerBySlug,
  isFollowing,
  unfollowOrganizer,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Trophy, Users, Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/o/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — NepARENA` },
      { name: "description", content: `Tournaments and community for ${params.slug}` },
    ],
  }),
  component: OrganizerPublicPage,
});

function OrganizerPublicPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [followBusy, setFollowBusy] = useState(false);

  const { data: organizer, isLoading } = useQuery({
    queryKey: ["organizer", slug],
    queryFn: () => getOrganizerBySlug(slug),
  });

  const { data: following, refetch: refetchFollow } = useQuery({
    queryKey: ["following", organizer?.id, user?.id],
    enabled: !!organizer?.id && !!user?.id,
    queryFn: () => isFollowing(organizer!.id, user!.id),
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["org-tournaments", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name, slug, status, banner_url, prize_pool, participants_count, is_published")
        .eq("organizer_id", organizer!.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(24);
      // Fallback: if no organizer_id linked yet, show global published (legacy)
      if (!data?.length) {
        const { data: legacy } = await supabase
          .from("tournaments")
          .select("id, name, slug, status, banner_url, prize_pool, participants_count, is_published")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(12);
        return legacy ?? [];
      }
      return data;
    },
  });

  const toggleFollow = async () => {
    if (!user) {
      toast.message("Sign in to follow this organizer");
      return;
    }
    if (!organizer) return;
    setFollowBusy(true);
    if (following) {
      await unfollowOrganizer(organizer.id, user.id);
      toast.success("Unfollowed");
    } else {
      await followOrganizer(organizer.id, user.id);
      toast.success("Following — their events will be prioritized");
    }
    setFollowBusy(false);
    void refetchFollow();
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!organizer || organizer.status === "suspended") {
    return (
      <PageShell>
        <div className="py-20 text-center text-muted-foreground">
          Organizer not found
          <div className="mt-4">
            <Link to="/" className="text-brand">
              Home
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="relative overflow-hidden">
        {organizer.banner_url ? (
          <img
            src={organizer.banner_url}
            alt=""
            className="h-40 w-full object-cover md:h-56 opacity-80"
          />
        ) : (
          <div
            className="h-40 md:h-56 w-full"
            style={{
              background: `linear-gradient(135deg, ${organizer.primary_color ?? "#2563eb"}, ${organizer.secondary_color ?? "#dc2626"})`,
            }}
          />
        )}
        <div className="max-w-7xl mx-auto px-4 -mt-12 relative pb-12">
          <div className="glass rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row gap-4 items-start">
            {organizer.logo_url ? (
              <img
                src={organizer.logo_url}
                alt={organizer.name}
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-border"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-gradient-brand grid place-items-center text-2xl font-bold text-white">
                {organizer.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{organizer.name}</h1>
                {organizer.is_verified && (
                  <Badge className="bg-emerald-500/20 text-emerald-300">Verified</Badge>
                )}
              </div>
              {organizer.tagline && (
                <p className="text-muted-foreground mt-1">{organizer.tagline}</p>
              )}
              {organizer.description && (
                <p className="text-sm mt-3 whitespace-pre-wrap">{organizer.description}</p>
              )}
            </div>
            <Button
              onClick={toggleFollow}
              disabled={followBusy}
              variant={following ? "outline" : "default"}
              className={!following ? "bg-gradient-brand text-primary-foreground" : undefined}
            >
              {following ? (
                <>
                  <BellOff className="h-4 w-4 mr-1.5" /> Following
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-1.5" /> Follow
                </>
              )}
            </Button>
          </div>

          <h2 className="text-xl font-bold mt-10 mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5" /> Tournaments
          </h2>
          {tournaments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published tournaments yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t: {
                id: string;
                name: string;
                status: string;
                prize_pool: string | null;
                participants_count: number;
              }) => (
                <Link
                  key={t.id}
                  to="/tournaments/$id"
                  params={{ id: t.id }}
                  className="glass rounded-2xl p-4 hover:ring-1 hover:ring-brand/40 transition"
                >
                  <div className="text-xs text-brand-glow uppercase">{t.status}</div>
                  <div className="font-semibold mt-1">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-2 flex gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {t.participants_count}
                    </span>
                    {t.prize_pool && <span>{t.prize_pool}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
