import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Users, List, Table2, FileText, ShieldAlert,
  Loader2, ExternalLink, Banknote, Lock,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OrganizerSubnav } from "@/components/OrganizerSubnav";
import { ReportForm } from "@/components/ReportForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase, type Tournament, type TournamentParticipant } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tournaments/$id")({
  head: () => ({
    meta: [
      { title: "Tournament — NepARENA" },
      { name: "description", content: "Tournament standings, fixtures, rules and registration." },
    ],
  }),
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");

  const { data, isLoading, error } = useQuery({
    queryKey: ["tournament", id],
    enabled: !!id,
    queryFn: async () => {
      const [tRes, pRes, mRes, mdRes, sRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
        supabase.from("tournament_participants").select("*").eq("tournament_id", id).order("created_at"),
        supabase.from("matches").select("*").eq("tournament_id", id).order("round").order("position"),
        supabase.from("matchdays").select("*").eq("tournament_id", id).order("sort_order"),
        supabase.from("tournament_standings").select("*").eq("tournament_id", id),
      ]);
      if (tRes.error) throw tRes.error;
      return {
        tournament: tRes.data as Record<string, unknown> | null,
        participants: (pRes.data ?? []) as Record<string, unknown>[],
        matches: (mRes.data ?? []) as Record<string, unknown>[],
        matchdays: (mdRes.data ?? []) as Record<string, unknown>[],
        standings: (sRes.data ?? []) as Record<string, unknown>[],
      };
    },
  });

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel("tour-" + id)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: "tournament_id=eq." + id }, () => {
        void qc.invalidateQueries({ queryKey: ["tournament", id] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, qc]);

  if (isLoading) {
    return (
      <PageShell force="organizer" hideChrome>
        <OrganizerSubnav title="Tournament" />
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !data?.tournament) {
    return (
      <PageShell force="organizer" hideChrome>
        <OrganizerSubnav title="Tournament" />
        <div className="mx-auto max-w-lg py-20 text-center space-y-3">
          <p className="text-muted-foreground">Tournament not found</p>
          <Button asChild variant="outline"><Link to="/tournaments">Back to tournaments</Link></Button>
        </div>
      </PageShell>
    );
  }

  const tournament = data.tournament;
  const name = String(tournament.name ?? "Tournament");
  const status = String(tournament.status ?? "");
  const rulesText = (tournament.rules_text as string | null) ?? null;
  const rulesUrl = (tournament.rules_url as string | null) ?? null;
  const description = (tournament.description as string | null) ?? null;
  const prize = tournament.prize_pool;
  const banner = tournament.banner_url as string | null;

  const completed = data.matches.filter((m) => m.played).length;
  const total = data.matches.length;
  const remaining = Math.max(0, total - completed);
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const tabs = [
    { id: "overview", label: "Overview", icon: Trophy },
    { id: "fixtures", label: "Fixtures", icon: List },
    { id: "standings", label: "Standings", icon: Table2 },
    { id: "players", label: "Players", icon: Users },
    { id: "rules", label: "Rules", icon: FileText },
    { id: "report", label: "Report", icon: ShieldAlert },
  ];

  const tournamentTyped = tournament as unknown as Tournament;
  const playersTyped = data.participants as unknown as TournamentParticipant[];

  return (
    <PageShell force="organizer" hideChrome>
      <OrganizerSubnav title={name} />
      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-24 pt-2">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {banner ? (
            <img src={banner} alt="" className="h-40 w-full object-cover sm:h-52" />
          ) : (
            <div className="h-32 bg-gradient-to-br from-sky-900 to-violet-950 sm:h-40" />
          )}
          <div className="space-y-2 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{name}</h1>
              <Badge variant="secondary" className="capitalize">{status.replaceAll("_", " ")}</Badge>
            </div>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {prize != null && prize !== "" && (
                <span className="inline-flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> {String(prize)}</span>
              )}
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {data.participants.length} players</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
                tab === t.id ? "bg-neutral-100 text-black" : "text-neutral-400 hover:bg-white/5",
              )}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {description || "Follow fixtures, standings and rules for this tournament."}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Players" value={data.participants.length} />
              <Stat label="Total matches" value={total} />
              <Stat label="Completed" value={completed} />
              <Stat label="Remaining" value={remaining} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-neutral-400">Tournament progress</span>
                <span className="font-semibold tabular-nums text-white">{completionPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {tab === "fixtures" && (
          <FixturesByMatchday
            matches={data.matches}
            matchdays={data.matchdays}
            participants={data.participants}
          />
        )}

        {tab === "standings" && (
          <StandingsTable standings={data.standings} participants={data.participants} />
        )}

        {tab === "players" && (
          <PlayersList participants={data.participants} />
        )}

        {tab === "rules" && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" /> Tournament rules</h2>
            {rulesText ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{rulesText}</p>
            ) : rulesUrl ? (
              <Button asChild variant="outline">
                <a href={rulesUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> View rules document
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No rules published yet.</p>
            )}
          </div>
        )}

        {tab === "report" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <ReportForm tournament={tournamentTyped} players={playersTyped} />
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className="text-lg font-bold capitalize tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/** Prefer player display name (player_name / club), never raw username alone */
function labelOf(participants: Record<string, unknown>[], pid: unknown) {
  const p = participants.find((x) => x.id === pid);
  if (!p) return "TBD";
  return String(p.player_name || p.club || "TBD").trim() || "TBD";
}

function photoOf(participants: Record<string, unknown>[], pid: unknown): string | null {
  const p = participants.find((x) => x.id === pid);
  return (p?.photo_url as string | null) ?? null;
}

function userIdOf(participants: Record<string, unknown>[], pid: unknown): string | null {
  const p = participants.find((x) => x.id === pid);
  return (p?.user_id as string | null) ?? null;
}

function FixturesByMatchday({
  matches,
  matchdays,
  participants,
}: {
  matches: Record<string, unknown>[];
  matchdays: Record<string, unknown>[];
  participants: Record<string, unknown>[];
}) {
  const groups = useMemo(() => {
    type G = { id: string | null; name: string; published: boolean; matches: Record<string, unknown>[] };
    const map = new Map<string, G>();
    for (const m of matches) {
      const md = matchdays.find((d) => d.id === m.matchday_id);
      const name = String(md?.name ?? `Round ${m.round ?? "?"}`);
      const existing = map.get(name);
      if (existing) existing.matches.push(m);
      else {
        map.set(name, {
          id: (md?.id as string) ?? (m.matchday_id as string) ?? null,
          name,
          published: md ? !!md.is_published : true,
          matches: [m],
        });
      }
    }
    for (const md of matchdays) {
      const name = String(md.name);
      if (!map.has(name)) {
        map.set(name, {
          id: md.id as string,
          name,
          published: !!md.is_published,
          matches: [],
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      const oa = Number(matchdays.find((d) => d.id === a.id)?.sort_order ?? 999);
      const ob = Number(matchdays.find((d) => d.id === b.id)?.sort_order ?? 999);
      return oa - ob;
    });
  }, [matches, matchdays]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeName =
    selected && groups.some((g) => g.name === selected)
      ? selected
      : groups[0]?.name ?? null;
  const active = groups.find((g) => g.name === activeName);

  if (!matches.length && !matchdays.length) {
    return <p className="text-sm text-muted-foreground">No fixtures yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => {
          const isActive = g.name === activeName;
          return (
            <button
              key={g.name}
              type="button"
              onClick={() => setSelected(g.name)}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-2 text-center transition",
                isActive
                  ? "border-sky-500/50 bg-sky-500/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06]",
              )}
            >
              <div className="text-xs font-semibold">{g.name}</div>
              <div className="mt-0.5 text-[10px] opacity-70">
                {g.matches.filter((m) => m.played).length}/{g.matches.length}
                {g.published ? " · Live" : " · Locked"}
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="relative min-h-[120px]">
          {!active.published && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/55 backdrop-blur-md">
              <Lock className="mb-2 h-8 w-8 text-neutral-300" />
              <p className="text-sm font-semibold text-white">Fixtures locked</p>
              <p className="mt-1 max-w-xs text-center text-xs text-neutral-400">
                This matchday is not published yet.
              </p>
            </div>
          )}
          <div className={cn("space-y-2", !active.published && "pointer-events-none select-none opacity-40")}>
            {active.matches.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches in this matchday.</p>
            ) : (
              active.matches.map((m) => {
                const homeName = labelOf(participants, m.home_id);
                const awayName = labelOf(participants, m.away_id);
                const homeUid = userIdOf(participants, m.home_id);
                const awayUid = userIdOf(participants, m.away_id);
                const homePhoto = photoOf(participants, m.home_id);
                const awayPhoto = photoOf(participants, m.away_id);
                return (
                  <div
                    key={String(m.id)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm"
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      {homeUid ? (
                        <Link to="/members/$id" params={{ id: homeUid }} className="truncate font-semibold text-white hover:underline">
                          {homeName}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold text-white">{homeName}</span>
                      )}
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={homePhoto ?? undefined} />
                        <AvatarFallback className="text-[9px]">{homeName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="w-12 shrink-0 text-center font-bold tabular-nums text-sky-300">
                      {m.played ? `${m.home_score}-${m.away_score}` : "vs"}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={awayPhoto ?? undefined} />
                        <AvatarFallback className="text-[9px]">{awayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {awayUid ? (
                        <Link to="/members/$id" params={{ id: awayUid }} className="truncate font-semibold text-white hover:underline">
                          {awayName}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold text-white">{awayName}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StandingsTable({ standings, participants }: { standings: Record<string, unknown>[]; participants: Record<string, unknown>[] }) {
  if (!standings.length) return <p className="text-sm text-muted-foreground">Standings not available yet.</p>;

  const sorted = [...standings].sort((a, b) => {
    const pts = Number(b.points ?? 0) - Number(a.points ?? 0);
    if (pts !== 0) return pts;
    const gd = Number(b.goal_difference ?? b.gd ?? 0) - Number(a.goal_difference ?? a.gd ?? 0);
    if (gd !== 0) return gd;
    return Number(b.goals_for ?? b.gf ?? 0) - Number(a.goals_for ?? a.gf ?? 0);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-white/5 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-2.5 font-medium">#</th>
            <th className="px-2 py-2.5 font-medium">Player</th>
            <th className="px-1.5 py-2.5 text-center font-medium">Pts</th>
            <th className="px-1.5 py-2.5 text-center font-medium">MP</th>
            <th className="px-1.5 py-2.5 text-center font-medium">W</th>
            <th className="px-1.5 py-2.5 text-center font-medium">D</th>
            <th className="px-1.5 py-2.5 text-center font-medium">L</th>
            <th className="px-1.5 py-2.5 text-center font-medium">GF</th>
            <th className="px-1.5 py-2.5 text-center font-medium">GA</th>
            <th className="px-1.5 py-2.5 text-center font-medium">GD</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const pid = row.participant_id;
            const displayName = labelOf(participants, pid) || String(row.player_name ?? "—");
            const photo = photoOf(participants, pid);
            const uid = userIdOf(participants, pid);
            const gf = Number(row.goals_for ?? row.gf ?? 0);
            const ga = Number(row.goals_against ?? row.ga ?? 0);
            const gd = Number(row.goal_difference ?? row.gd ?? gf - ga);
            const nameCell = (
              <span className="flex min-w-0 items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={photo ?? undefined} />
                  <AvatarFallback className="text-[9px]">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate font-semibold text-white">{displayName}</span>
              </span>
            );
            return (
              <tr key={String(row.id ?? i)} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-2 py-2.5 tabular-nums text-neutral-400">{i + 1}</td>
                <td className="px-2 py-2.5">
                  {uid ? (
                    <Link to="/members/$id" params={{ id: uid }} className="hover:underline">
                      {nameCell}
                    </Link>
                  ) : nameCell}
                </td>
                <td className="px-1.5 py-2.5 text-center font-bold tabular-nums text-sky-300">{Number(row.points ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{Number(row.played ?? row.matches_played ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{Number(row.won ?? row.wins ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{Number(row.drawn ?? row.draws ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{Number(row.lost ?? row.losses ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{gf}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{ga}</td>
                <td className={cn("px-1.5 py-2.5 text-center font-medium tabular-nums", gd > 0 ? "text-emerald-400" : gd < 0 ? "text-rose-400" : "")}>{gd > 0 ? `+${gd}` : gd}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlayersList({ participants }: { participants: Record<string, unknown>[] }) {
  if (!participants.length) return <p className="text-sm text-muted-foreground">No players yet.</p>;
  return (
    <ul className="space-y-2">
      {participants.map((p) => {
        const uid = p.user_id as string | null;
        const name = String(p.player_name || p.club || "Player");
        const photo = (p.photo_url as string | null) ?? null;
        const inner = (
          <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={photo ?? undefined} />
                <AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate font-semibold text-white">{name}</span>
            </span>
            <Badge variant="outline" className="capitalize">{String(p.status ?? "")}</Badge>
          </div>
        );
        return uid ? (
          <li key={String(p.id)}>
            <Link to="/members/$id" params={{ id: uid }} className="block rounded-xl transition hover:bg-white/[0.03]">
              {inner}
            </Link>
          </li>
        ) : (
          <li key={String(p.id)}>{inner}</li>
        );
      })}
    </ul>
  );
}
