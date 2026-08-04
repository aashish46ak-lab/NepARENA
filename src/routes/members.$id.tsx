import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import {
  supabase,
  type Profile,
  type TournamentParticipant,
} from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/members/$id")({
  component: MemberProfilePage,
});

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
        .select("id, tournament_id, player_name, club, status, photo_url")
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      const tournamentIds = [
        ...new Set(
          ((parts ?? []) as TournamentParticipant[]).map(
            (p) => p.tournament_id,
          ),
        ),
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
        parts: (parts ?? []) as TournamentParticipant[],
        tours,
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

  const { profile, parts, tours } = data;
  const tourMap = new Map(tours.map((t) => [t.id, t]));

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
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-brand text-primary-foreground text-xl">
              {(profile.full_name || profile.username || "P")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left space-y-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {profile.full_name || profile.username || "Player"}
            </h1>
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
              <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand-glow" />
            Tournaments ({parts.length})
          </h2>
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tournaments yet.</p>
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
