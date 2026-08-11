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
import { AllTimeXiView, parseXi } from "@/components/AllTimeXi";
import { Loader2, Trophy, ArrowLeft, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/members/$id")({
  head: () => ({
    ...buildSeoHead({
      title: "Member profile",
      description: "Player profile on NepARENA",
      path: "/members",
      noIndex: true,
    }),
  }),
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["member_profile", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (pErr) throw pErr;

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

      const partIds = partList.map((p) => p.id);
      let wins = 0,
        draws = 0,
        losses = 0,
        goalsFor = 0,
        goalsAgainst = 0;
      if (partIds.length) {
        const orFilter =
          partIds.map((pid) => "home_id.eq." + pid).join(",") +
          "," +
          partIds.map((pid) => "away_id.eq." + pid).join(",");
        const { data: matchRows } = await supabase
          .from("matches")
          .select("home_id, away_id, home_score, away_score, played")
          .eq("played", true)
          .or(orFilter);
        for (const m of matchRows ?? []) {
          const hs = Number(m.home_score);
          const ascore = Number(m.away_score);
          if (!Number.isFinite(hs) || !Number.isFinite(ascore)) continue;
          const isHome = partIds.includes(m.home_id as string);
          const isAway = partIds.includes(m.away_id as string);
          if (!isHome && !isAway) continue;
          const my = isHome ? hs : ascore;
          const opp = isHome ? ascore : hs;
          goalsFor += my;
          goalsAgainst += opp;
          if (my > opp) wins += 1;
          else if (my < opp) losses += 1;
          else draws += 1;
        }
      }

      return {
        profile: (profile as Profile | null) ?? null,
        parts: partList,
        tours,
        achievements,
        stats: { wins, draws, losses, goalsFor, goalsAgainst },
      };
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !data?.profile) {
    return (
      <PageShell>
        <div className="mx-auto max-w-lg space-y-3 py-20 text-center">
          <p className="text-muted-foreground">Member not found</p>
          <Button asChild variant="outline">
            <Link to="/members">
              <ArrowLeft className="mr-1 h-4 w-4" /> Members
            </Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const { profile, parts, tours, achievements } = data;
  const tourMap = new Map(tours.map((t) => [t.id, t]));
  const displayName =
    profile.username?.trim() || profile.full_name?.trim() || "Player";
  const realName = profile.full_name?.trim() || null;
  const stats = data.stats ?? {
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };

  const links = (profile.social_links ?? {}) as Record<string, string>;
  const xi = parseXi(links.all_time_xi);

  const joinedTags = parts
    .map((p) => {
      const t = tourMap.get(p.tournament_id);
      return {
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
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/members">
            <ArrowLeft className="mr-1 h-4 w-4" /> Members
          </Link>
        </Button>

        <div className="glass flex flex-col items-center gap-5 rounded-2xl p-6 sm:flex-row sm:items-start">
          <Avatar className="h-24 w-24 ring-2 ring-brand/30">
            <AvatarImage
              src={profile.avatar_url ?? undefined}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-brand text-xl text-primary-foreground">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <h1 className="truncate text-2xl font-bold">{displayName}</h1>
            {realName && realName !== displayName && (
              <p className="truncate text-sm text-muted-foreground">{realName}</p>
            )}
            {profile.favourite_club && (
              <p className="text-sm text-brand-glow">{profile.favourite_club}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            )}

            {joinedTags.length > 0 && (
              <div className="pt-2">
                <p className="mb-1.5 text-xs text-muted-foreground">Tournaments</p>
                <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
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
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Wins", value: stats.wins },
            { label: "Draws", value: stats.draws },
            { label: "Losses", value: stats.losses },
            { label: "Goals", value: stats.goalsFor },
            { label: "Conceded", value: stats.goalsAgainst },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-gradient-brand">{s.value}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {xi && xi.slots.some((s) => s.name) && (
          <div className="glass rounded-2xl p-4">
            <AllTimeXiView xi={xi} />
          </div>
        )}

        {achievements.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Award className="h-5 w-5 text-amber-300" />
              Achievements
            </h2>
            <div className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <Badge
                  key={a.id}
                  className="border-amber-500/30 bg-amber-500/15 text-amber-300"
                >
                  <Trophy className="mr-1 h-3 w-3" />
                  {a.achievement}
                  {a.tournament ? " · " + a.tournament : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
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
                    className="glass flex items-center justify-between gap-3 rounded-xl p-3 transition hover:bg-accent/30"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {t?.name ?? "Tournament"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.club || p.player_name}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
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
