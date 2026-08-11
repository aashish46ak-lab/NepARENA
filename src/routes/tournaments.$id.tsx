import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Users,
  List,
  Table2,
  FileText,
  Loader2,
  UserPlus,
  CheckCircle2,
  Lock,
  GitBranch,
  Banknote,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  supabase,
  type Tournament,
  type TournamentParticipant,
  type Match,
  type Matchday,
} from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sortStandings, type StandingRow } from "@/components/tournament-manager/shared";
import { bracketLabel, isElimination } from "@/lib/brackets";
import { BracketTree } from "@/components/BracketTree";
import { MyMatches } from "@/components/MyMatches";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/tournaments/$id")({
  head: ({ params }) => ({
    ...buildSeoHead({
      title: "Tournament",
      description:
        "Tournament standings, fixtures, rules and registration on NepARENA.",
      path: `/tournaments/${params.id}`,
    }),
  }),
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<
    "fixtures" | "standings" | "bracket" | "rules" | "players"
  >("fixtures");

  const { data: tournament, isLoading: tLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Tournament | null;
    },
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["tournament_participants", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TournamentParticipant[];
    },
  });

  const players = useMemo(
    () => allParticipants.filter((p) => p.status === "approved"),
    [allParticipants],
  );

  const { data: matchdays = [] } = useQuery({
    queryKey: ["matchdays", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matchdays")
        .select("*")
        .eq("tournament_id", id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Matchday[];
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id)
        .order("round", { ascending: true })
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Match[];
    },
  });

  if (tLoading) {
    return (
      <PageShell>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!tournament || tournament.is_published === false) {
    return (
      <PageShell>
        <div className="py-20 text-center text-muted-foreground">
          Tournament not found
          <div className="mt-4">
            <Link to="/tournaments" className="text-brand-glow hover:underline">
              Back to tournaments
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const tabs = [
    { id: "fixtures" as const, label: "Fixtures", icon: List },
    { id: "standings" as const, label: "Standings", icon: Table2 },
    ...(isElimination(tournament.bracket_type)
      ? [{ id: "bracket" as const, label: "Bracket", icon: GitBranch }]
      : []),
    { id: "players" as const, label: "Players", icon: Users },
    { id: "rules" as const, label: "Rules", icon: FileText },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="overflow-hidden rounded-2xl border border-border/60">
          {tournament.banner_url ? (
            <img
              src={tournament.banner_url}
              alt=""
              className="h-36 w-full object-cover sm:h-44"
            />
          ) : (
            <div className="h-36 w-full bg-gradient-to-br from-neutral-900 to-neutral-700 sm:h-44" />
          )}
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">{tournament.name}</h1>
                <p className="mt-1 text-sm capitalize text-muted-foreground">
                  {(tournament.status ?? "draft").replaceAll("_", " ")} ·{" "}
                  {bracketLabel(tournament.bracket_type)}
                </p>
              </div>
              <RegisterButton
                tournament={tournament}
                allParticipants={allParticipants}
                onDone={() => {
                  void qc.invalidateQueries({
                    queryKey: ["tournament_participants", id],
                  });
                }}
              />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {players.length} players
              </span>
              {tournament.prize_pool ? (
                <span className="inline-flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5" />
                  {tournament.prize_pool}
                </span>
              ) : null}
              {tournament.start_date ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(tournament.start_date).toLocaleDateString()}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <MyMatches
          tournament={tournament}
          matches={matches}
          matchdays={matchdays}
          allParticipants={allParticipants}
          players={players}
        />

        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/50 bg-secondary/30 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
                tab === t.id
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "fixtures" && (
          <PublicFixtures
            matches={matches}
            matchdays={matchdays}
            players={players}
          />
        )}
        {tab === "standings" && (
          <PublicStandings
            matches={matches}
            players={players}
            tournamentId={tournament.id}
          />
        )}
        {tab === "bracket" && (
          <div className="glass rounded-2xl p-4">
            <BracketTree matches={matches} players={players} />
          </div>
        )}
        {tab === "players" && (
          <div className="glass space-y-2 rounded-2xl p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4" /> Players ({players.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2"
                >
                  <Avatar className="h-9 w-9">
                    {p.photo_url ? <AvatarImage src={p.photo_url} /> : null}
                    <AvatarFallback className="text-[10px]">
                      {(p.club || p.player_name || "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.club?.trim() || p.player_name}
                    </p>
                    {p.club?.trim() && (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.player_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                  No approved players yet.
                </p>
              )}
            </div>
          </div>
        )}
        {tab === "rules" && (
          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" /> Rules
            </h2>
            {tournament.rules ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {tournament.rules}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Rules for this tournament haven't been published yet.
              </p>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function RegisterButton({
  tournament,
  allParticipants,
  onDone,
}: {
  tournament: Tournament;
  allParticipants: TournamentParticipant[];
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const existing = user
    ? allParticipants.find((p) => p.user_id === user.id)
    : undefined;

  if (existing?.status === "approved" || existing?.status === "registered") {
    return (
      <Badge className="bg-emerald-500/20 px-3 py-1.5 text-emerald-300">
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Joined
      </Badge>
    );
  }
  if (existing?.status === "pending") {
    return (
      <Badge className="bg-amber-500/20 px-3 py-1.5 text-amber-300">
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Request pending
      </Badge>
    );
  }

  const open =
    tournament.registration_open || tournament.status === "registration_open";

  if (!open) {
    return (
      <Badge variant="secondary" className="px-3 py-1.5">
        Registration closed
      </Badge>
    );
  }

  const requestJoin = async () => {
    if (!user) {
      toast.message("Sign in to join this tournament");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournament.id,
      user_id: user.id,
      player_name: user.email?.split("@")[0] ?? "Player",
      status: "pending",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Join request sent");
    onDone();
  };

  return (
    <Button
      size="sm"
      className="bg-gradient-brand text-primary-foreground"
      disabled={busy}
      onClick={() => void requestJoin()}
    >
      {busy ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
      )}
      Request to join
    </Button>
  );
}

function PublicFixtures({
  matches,
  matchdays,
  players,
}: {
  matches: Match[];
  matchdays: Matchday[];
  players: TournamentParticipant[];
}) {
  const groups = useMemo(() => {
    type G = {
      id: string | null;
      name: string;
      published: boolean;
      matches: Match[];
      sort: number;
    };
    const byId = new Map<string, G>();
    for (const md of matchdays) {
      byId.set(md.id, {
        id: md.id,
        name: md.name,
        published: md.is_published === true,
        matches: [],
        sort: md.sort_order ?? 0,
      });
    }
    for (const m of matches) {
      if (!m.matchday_id) continue;
      const g = byId.get(m.matchday_id);
      if (g) g.matches.push(m);
    }
    return [...byId.values()].sort((a, b) => a.sort - b.sort);
  }, [matches, matchdays]);

  const [activeName, setActiveName] = useState<string | null>(null);
  const active =
    groups.find((g) => g.name === activeName) ??
    groups.find((g) => g.published) ??
    groups[0] ??
    null;
  const isPublished = active?.published === true;

  const labelOf = (pid: string | null) => {
    if (!pid) return "TBD";
    const p = players.find((x) => x.id === pid);
    return p?.club?.trim() || p?.player_name || "TBD";
  };
  const photoOf = (pid: string | null) =>
    pid ? (players.find((x) => x.id === pid)?.photo_url ?? null) : null;

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        Fixtures not available yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {groups.map((g) => {
          const played = g.matches.filter((m) => m.played).length;
          const isActive = g.name === active?.name;
          return (
            <button
              key={g.name}
              type="button"
              onClick={() => setActiveName(g.name)}
              className={cn(
                "flex min-w-[96px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-center transition",
                isActive
                  ? "border-brand bg-brand/15"
                  : "border-border/60 bg-secondary/30 hover:bg-secondary/50",
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold",
                  isActive && "text-brand-glow",
                )}
              >
                {g.name}
              </span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {g.published
                  ? `${played}/${g.matches.length} Completed`
                  : "Locked"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative glass rounded-2xl p-4">
        <div
          className={cn(
            "space-y-2",
            !isPublished && "pointer-events-none select-none blur-sm",
          )}
          aria-hidden={!isPublished}
        >
          {(active?.matches ?? []).map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <span className="max-w-[120px] truncate text-right text-sm font-semibold">
                  {labelOf(m.home_id)}
                </span>
                <Avatar className="h-8 w-8 shrink-0">
                  {photoOf(m.home_id) ? (
                    <AvatarImage src={photoOf(m.home_id)!} />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {labelOf(m.home_id).slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="w-14 shrink-0 text-center text-sm font-bold text-brand-glow">
                {m.played && m.home_score != null && m.away_score != null
                  ? `${m.home_score} - ${m.away_score}`
                  : "vs"}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  {photoOf(m.away_id) ? (
                    <AvatarImage src={photoOf(m.away_id)!} />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {labelOf(m.away_id).slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate text-sm font-semibold">
                  {labelOf(m.away_id)}
                </span>
              </div>
            </div>
          ))}
          {(active?.matches ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No matches in this matchday.
            </p>
          )}
        </div>
        {!isPublished && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-2xl border border-white/10 bg-black/70 px-6 py-4 text-center backdrop-blur">
              <Lock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold">Fixtures not published yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Organizer will publish this matchday soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PublicStandings({
  matches,
  players,
  tournamentId,
}: {
  matches: Match[];
  players: TournamentParticipant[];
  tournamentId: string;
}) {
  const rows: StandingRow[] = useMemo(() => {
    const map = new Map<string, StandingRow>();
    for (const p of players) {
      map.set(p.id, {
        participant_id: p.id,
        tournament_id: tournamentId,
        player_name: p.player_name,
        club: p.club,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_diff: 0,
        points: 0,
      });
    }
    for (const m of matches) {
      if (!m.played || m.home_score == null || m.away_score == null) continue;
      if (!m.home_id || !m.away_id) continue;
      const h = map.get(m.home_id);
      const a = map.get(m.away_id);
      if (!h || !a) continue;
      h.played++;
      a.played++;
      h.goals_for += m.home_score;
      h.goals_against += m.away_score;
      a.goals_for += m.away_score;
      a.goals_against += m.home_score;
      if (m.home_score > m.away_score) {
        h.won++;
        a.lost++;
        h.points += 3;
      } else if (m.home_score < m.away_score) {
        a.won++;
        h.lost++;
        a.points += 3;
      } else {
        h.drawn++;
        a.drawn++;
        h.points += 1;
        a.points += 1;
      }
    }
    for (const r of map.values()) r.goal_diff = r.goals_for - r.goals_against;
    return sortStandings([...map.values()]);
  }, [matches, players, tournamentId]);

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Standings will appear after results.
      </p>
    );
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 text-xs text-muted-foreground">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-2 py-2 text-center">P</th>
            <th className="px-2 py-2 text-center">W</th>
            <th className="px-2 py-2 text-center">D</th>
            <th className="px-2 py-2 text-center">L</th>
            <th className="px-2 py-2 text-center">GD</th>
            <th className="px-3 py-2 text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.participant_id} className="border-b border-border/30">
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 font-medium">
                {(r.club || "").trim() || r.player_name}
              </td>
              <td className="px-2 py-2 text-center">{r.played}</td>
              <td className="px-2 py-2 text-center">{r.won}</td>
              <td className="px-2 py-2 text-center">{r.drawn}</td>
              <td className="px-2 py-2 text-center">{r.lost}</td>
              <td className="px-2 py-2 text-center">{r.goal_diff}</td>
              <td className="px-3 py-2 text-center font-bold text-brand-glow">
                {r.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
