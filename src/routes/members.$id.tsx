import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, Trophy, ArrowLeft, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/members/$id")({
  component: MemberProfilePage,
});

function statusBadgeClass(status: string) {
  if (status === "completed" || status === "archived")
    return "bg-muted text-muted-foreground";
  if (status === "live" || status === "ongoing")
    return "bg-brand/25 text-brand-glow";
  if (status === "registration_open")
    return "bg-emerald-500/20 text-emerald-300";
  return "bg-secondary text-secondary-foreground";
}

function MemberProfilePage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["member_profile", id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const { data: parts } = await supabase
        .from("tournament_participants")
        .select(
          "id, tournament_id, player_name, club, status, photo_url, created_at",
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      const partList = (parts ?? []) as TournamentParticipant[];

      const { data: hof } = await supabase.from("hall_of_fame").select("*");

      const names = new Set<string>();
      if (profile?.full_name) names.add(profile.full_name.toLowerCase());
      if (profile?.username) names.add(profile.username.toLowerCase());
      for (const p of partList) {
        names.add(p.player_name.toLowerCase());
        if (p.club) names.add(p.club.toLowerCase());
      }
      const achievements = ((hof ?? []) as HallOfFameEntry[]).filter((h) =>
        names.has(h.player_name.toLowerCase()),
      );

      const tournamentIds = [
        ...new Set(partList.map((p) => p.tournament_id)),
      ];

      let tours: { id: string; name: string; status: string }[] = [];
      if (tournamentIds.length) {
        const { data: t } = await supabase
          .from("tournaments")
          .select("id, name, status")
          .in("id", tournamentIds);
        tours = (t ?? []) as typeof tours;
      }

      return {
        profile: profile as Profile | null,
        parts: partList,
        tours,
        achievements,
      };
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[40vh] grid place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!data?.profile) {
    return (
      <PageShell>
        <div className="max-w-lg mx-auto py-20 text-center">
          <p className="text-muted-foreground">Member not found</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/members">
              <ArrowLeft className="h-4 w-4 mr-1" /> Members
            </Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const { profile, parts, tours, achievements } = data;
  const tourMap = new Map(tours.map((t) => [t.id, t]));
  const displayName =
    profile.full_name?.trim() || profile.username?.trim() || "Player";

  // Unique tournaments for tags (prefer approved / any participation)
  const joinedTags = parts
    .map((p) => {
      const t = tourMap.get(p.tournament_id);
      return {
        partId: p.id,
        tournamentId: p.tournament_id,
        name: t?.name ?? "Tournament",
        tourStatus: t?.status ?? "unknown",
        joinStatus: p.status,
      };
    })
    .filter(
      (tag, i, arr) =>
        arr.findIndex((x) => x.tournamentId === tag.tournamentId) === i,
    );

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/members">
            <ArrowLeft className="h-4 w-4 mr-1" /> Members
          </Link>
        </Button>

        <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Avatar className="h-24 w-24 ring-2 ring-brand/30">
            <AvatarImage
              src={profile.avatar_url ?? undefined}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xl">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left space-y-2 min-w-0 flex-1">
            <h1 className="text-2xl font-bold truncate">{displayName}</h1>
            {profile.username && (
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>
            )}
            {profile.favourite_club && (
              <p className="text-sm text-brand-glow">
                {profile.favourite_club}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
            )}

            {/* Tournament tags — tournaments they joined / played */}
            {joinedTags.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1.5">
                  Tournaments
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                  {joinedTags.map((tag) => (
                    <Link
                      key={tag.tournamentId}
                      to="/tournaments/$id"
                      params={{ id: tag.tournamentId }}
                    >
                      <Badge
                        className={cn(
                          "cursor-pointer border-0 capitalize",
                          statusBadgeClass(tag.tourStatus),
                        )}
                      >
                        {tag.name}
                        {tag.joinStatus !== "approved" && (
                          <span className="opacity-70 ml-1">
                            · {tag.joinStatus}
                          </span>
                        )}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {achievements.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-300" />
              Achievements
            </h2>
            <div className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <Badge
                  key={a.id}
                  className="bg-amber-500/15 text-amber-300 border-amber-500/30"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  {a.achievement}
                  {a.tournament ? " · " + a.tournament : ""}
                  {a.year ? " " + a.year : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand-glow" />
            Tournament history ({parts.length})
          </h2>
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not joined any tournament yet.
            </p>
          ) : (
            <div className="space-y-2">
              {parts.map((p) => {
                const t = tourMap.get(p.tournament_id);
                return (
                  <Link
                    key={p.id}
                    to="/tournaments/$id"
                    params={{ id: p.tournament_id }}
                    className="glass rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-accent/30 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {t?.name ?? "Tournament"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.club || p.player_name}
                        {t?.status ? " · " + t.status.replace(/_/g, " ") : ""}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">
                      {p.status}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
                                    }
