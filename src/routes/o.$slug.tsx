/**
 * Organizer public pages.
 * /o/efootball-nepal = CURRENT eFootball Nepal public website (unchanged UI).
 * Other organizers use the generic card layout.
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
  DEFAULT_ORGANIZER_SLUG,
} from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Trophy, Users, Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrganizerPublicSite } from "@/components/organizer-public-site";

export const Route = createFileRoute("/o/$slug")({
  head: ({ params }) => ({
    meta: [
      {
        title:
          params.slug === "efootball-nepal"
            ? "eFootball Nepal — Tournaments & Community"
            : `${params.slug} — NepARENA`,
      },
      {
        name: "description",
        content: `Tournaments and community for ${params.slug}`,
      },
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
    enabled: !!organizer?.id && slug !== DEFAULT_ORGANIZER_SLUG,
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(
          "id, name, slug, status, banner_url, prize_pool, participants_count, is_published",
        )
        .eq("organizer_id", organizer!.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (!data?.length) {
        const { data: legacy } = await supabase
          .from("tournaments")
          .select(
            "id, name, slug, status, banner_url, prize_pool, participants_count, is_published",
          )
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
      toast.success("Following");
    }
    setFollowBusy(false);
    void refetchFollow();
  };

  // CURRENT eFootball Nepal website — not redesigned
  if (slug === DEFAULT_ORGANIZER_SLUG) {
    return <OrganizerPublicSite />;
  }

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
            className="h-40 w-full object-cover opacity-80 md:h-56"
          />
        ) : (
          <div
            className="h-40 w-full md:h-56"
            style={{
              background: `linear-gradient(135deg, ${organizer.primary_color ?? "#2563eb"}, ${organizer.secondary_color ?? "#dc2626"})`,
            }}
          />
        )}
        <div className="relative mx-auto max-w-7xl -mt-12 px-4 pb-12">
          <div className="glass flex flex-col items-start gap-4 rounded-2xl p-5 sm:flex-row md:p-6">
            {organizer.logo_url ? (
              <img
                src={organizer.logo_url}
                alt={organizer.name}
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-border"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand text-2xl font-bold text-white">
                {organizer.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold md:text-3xl">{organizer.name}</h1>
                {organizer.is_verified && (
                  <Badge className="bg-emerald-500/20 text-emerald-300">Verified</Badge>
                )}
              </div>
              {organizer.tagline && (
                <p className="mt-1 text-muted-foreground">{organizer.tagline}</p>
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
                  <BellOff className="mr-1.5 h-4 w-4" /> Following
                </>
              ) : (
                <>
                  <Bell className="mr-1.5 h-4 w-4" /> Follow
                </>
              )}
            </Button>
          </div>

          <h2 className="mb-4 mt-10 flex items-center gap-2 text-xl font-bold">
            <Trophy className="h-5 w-5" /> Tournaments
          </h2>
          {tournaments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published tournaments yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map(
                (t: {
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
                    className="glass rounded-2xl p-4 transition hover:ring-1 hover:ring-brand/40"
                  >
                    <div className="text-xs uppercase text-brand-glow">{t.status}</div>
                    <div className="mt-1 font-semibold">{t.name}</div>
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {t.participants_count}
                      </span>
                      {t.prize_pool && <span>{t.prize_pool}</span>}
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
