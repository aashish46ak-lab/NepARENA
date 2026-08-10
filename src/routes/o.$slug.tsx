/**
 * Organizer public profile — share link uses organizer logo as OG image.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  followOrganizer,
  getOrganizerBySlug,
  isFollowing,
  unfollowOrganizer,
  getFollowerCount,
} from "@/lib/organizers";
import {
  setOrganizerContext,
  organizerShareUrl,
} from "@/lib/organizer-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  Trophy,
  Users,
  Bell,
  BellOff,
  ArrowRight,
  Calendar,
  Share2,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/o/$slug")({
  loader: async ({ params }) => {
    const org = await getOrganizerBySlug(params.slug);
    return { org };
  },
  head: ({ params, loaderData }) => {
    const org = loaderData?.org as
      | {
          name?: string;
          description?: string | null;
          tagline?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
        }
      | null
      | undefined;
    const name = org?.name ?? params.slug;
    const desc =
      org?.description ||
      org?.tagline ||
      `${name} — organizer on NepARENA`;
    const image =
      org?.logo_url || org?.banner_url || "https://neparena.xyz/neparena-logo.png";
    const url = `https://neparena.xyz/o/${params.slug}`;
    return {
      meta: [
        { title: `${name} — NepARENA` },
        { name: "description", content: desc },
        { property: "og:title", content: name },
        { property: "og:description", content: desc },
        { property: "og:image", content: image },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "NepARENA" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: name },
        { name: "twitter:image", content: image },
      ],
    };
  },
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

  useEffect(() => {
    if (!organizer) return;
    setOrganizerContext({
      slug: organizer.slug,
      id: organizer.id,
      name: organizer.name,
      logo_url: organizer.logo_url,
    });
  }, [organizer]);

  const { data: following, refetch: refetchFollow } = useQuery({
    queryKey: ["following", organizer?.id, user?.id],
    enabled: !!organizer?.id && !!user?.id,
    queryFn: () => isFollowing(organizer!.id, user!.id),
  });

  const { data: followers = 0 } = useQuery({
    queryKey: ["org_followers", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: () => getFollowerCount(organizer!.id),
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["org_members_count", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("organizer_members")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", organizer!.id);
      return count ?? 0;
    },
  });

  const { data: site } = useQuery({
    queryKey: ["site_settings_public", organizer?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      return data as {
        logo_url?: string | null;
        hero_image_url?: string | null;
        tagline?: string;
        about_short?: string;
      } | null;
    },
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["org-tournaments", organizer?.id],
    enabled: !!organizer?.id,
    queryFn: async () => {
      const withOrg = await supabase
        .from("tournaments")
        .select(
          "id, name, slug, status, banner_url, prize_pool, participants_count, is_published, registration_open",
        )
        .eq("organizer_id", organizer!.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (withOrg.data?.length) return withOrg.data;
      if (slug === "efootball-nepal") {
        const { data } = await supabase
          .from("tournaments")
          .select(
            "id, name, slug, status, banner_url, prize_pool, participants_count, is_published, registration_open",
          )
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(24);
        return data ?? [];
      }
      return [];
    },
  });

  const toggleFollow = async () => {
    if (!user) {
      toast.message("Sign in to follow organizers");
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

  const share = async () => {
    const url = organizerShareUrl(slug);
    const title = organizer?.name ?? slug;
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url,
          text: `Join ${title} on NepARENA`,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied");
      } catch {
        toast.message(url);
      }
    }
  };

  if (isLoading) {
    return (
      <PageShell force="organizer">
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!organizer || organizer.status === "suspended") {
    return (
      <PageShell force="organizer">
        <div className="py-20 text-center text-muted-foreground">
          Organizer not found
          <div className="mt-4">
            <Link to="/" className="text-brand">
              Back to NepARENA
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const banner = organizer.banner_url || site?.hero_image_url || null;
  const logo = organizer.logo_url || site?.logo_url || null;
  const description =
    organizer.description ||
    organizer.tagline ||
    site?.about_short ||
    site?.tagline ||
    "Competitive esports community on NepARENA.";

  return (
    <PageShell force="organizer">
      <div className="relative">
        {banner ? (
          <img src={banner} alt="" className="h-44 w-full object-cover sm:h-56" />
        ) : (
          <div
            className="h-44 w-full sm:h-56"
            style={{
              background: `linear-gradient(135deg, ${organizer.primary_color ?? "#1a1a1a"}, ${organizer.secondary_color ?? "#333"})`,
            }}
          />
        )}
        <div className="relative mx-auto max-w-3xl -mt-14 px-4 pb-16">
          <div className="rounded-3xl border border-border/60 bg-background/95 p-5 shadow-xl backdrop-blur sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {logo ? (
                <img
                  src={logo}
                  alt={organizer.name}
                  className="h-24 w-24 rounded-2xl object-cover ring-4 ring-background"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-600 text-2xl font-bold text-black ring-4 ring-background">
                  {organizer.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">{organizer.name}</h1>
                  {organizer.is_verified && (
                    <Badge className="bg-sky-500/20 text-sky-300">Verified</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  @{organizer.slug} · Organizer on NepARENA
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{followers}</strong> Followers
                  </span>
                  <span>
                    <strong className="text-foreground">{memberCount || "—"}</strong>{" "}
                    Members
                  </span>
                  <span>
                    <strong className="text-foreground">{tournaments.length}</strong>{" "}
                    Tournaments
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    disabled={followBusy}
                    variant={following ? "outline" : "default"}
                    onClick={() => void toggleFollow()}
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
                  <Button type="button" variant="outline" onClick={() => void share()}>
                    <Share2 className="mr-1.5 h-4 w-4" /> Share link
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={async () => {
                      await navigator.clipboard.writeText(organizerShareUrl(slug));
                      toast.success("Link copied");
                    }}
                  >
                    <Link2 className="mr-1 h-3.5 w-3.5" />
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Trophy className="h-5 w-5" /> Tournaments
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a tournament portal for fixtures, standings and registration.
              </p>

              {tournaments.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  No published tournaments yet.
                </p>
              ) : (
                <ul className="mt-6 space-y-4">
                  {tournaments.map(
                    (t: {
                      id: string;
                      name: string;
                      status: string;
                      prize_pool: string | null;
                      participants_count: number;
                      registration_open?: boolean | null;
                    }) => (
                      <li
                        key={t.id}
                        className="rounded-2xl border border-border/60 bg-card/40 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{t.name}</h3>
                              <Badge variant="secondary" className="text-[10px] uppercase">
                                {t.status?.replaceAll("_", " ")}
                              </Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {t.participants_count ?? 0} players
                              </span>
                              {t.prize_pool && (
                                <span className="inline-flex items-center gap-1">
                                  <Trophy className="h-3 w-3" />
                                  {t.prize_pool}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Portal ready
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link to="/tournaments/$id" params={{ id: t.id }}>
                                View tournament
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              className="bg-gradient-brand text-primary-foreground"
                            >
                              <Link to="/tournaments/$id" params={{ id: t.id }}>
                                {t.registration_open || t.status === "registration_open"
                                  ? "Join tournament"
                                  : "Open portal"}
                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
