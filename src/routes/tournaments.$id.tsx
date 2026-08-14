import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Users, List, Table2, FileText,
  Loader2, ExternalLink, Banknote, Lock,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
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
      <PageShell>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !data?.tournament) {
    return (
      <PageShell>
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
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/tournaments">← Tournaments</Link>
        </Button>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          {banner ? (
            <img src={banner} alt="" className="h-40 w-full object-cover sm:h-52" />
          ) : (
            <div className="h-32 bg-gradient-to-br from-sky-900 to-violet-950 sm:h-40" />
          )}
          <div className="p-5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{name}</h1>
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
            isStaff={false}
          />
        )}

        {tab === "standings" && (
          <StandingsTable standings={data.standings} participants={data.participants} />
        )}

        {tab === "players" && (
          <PlayersList participants={data.participants} />
        )}

        {tab === "rules" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Tournament rules</h2>
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

function labelOf(participants: Record<string, unknown>[], pid: unknown) {
  const p = participants.find((x) => x.id === pid);
  return (p?.player_name as string) || (p?.club as string) || "TBD";
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
  isStaff?: boolean;
}) {
  const groups = useMemo(() => {
    type G = { id: string | null; name: string; published: boolean; matches: Record<string, unknown>[] };
    const map = new Map<string, G>();
    for (const m of matches) {
      const md = matchdays.find((d) => d.id === m.matchday_id);
      const name = String(md?.name ?? `Round ${m.round ?? "?"}`);
      const key = name;
      const existing = map.get(key);
      if (existing) existing.matches.push(m);
      else {
        map.set(key, {
          id: (md?.id as string) ?? (m.matchday_id as string) ?? null,
          name,
          published: !!md?.is_published,
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
        <div className="relative">
          {!active.published && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/50 backdrop-blur-md">
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
                return (
                  <div
                    key={String(m.id)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm"
                  >
                    {homeUid ? (
                      <Link to="/members/$id" params={{ id: homeUid }} className="min-w-0 flex-1 truncate font-medium hover:underline">
                        {homeName}
                      </Link>
                    ) : (
                      <span className="min-w-0 flex-1 truncate font-medium">{homeName}</span>
                    )}
                    <span className="shrink-0 font-bold tabular-nums text-sky-300">
                      {m.played ? `${m.home_score} - ${m.away_score}` : "vs"}
                    </span>
                    {awayUid ? (
                      <Link to="/members/$id" params={{ id: awayUid }} className="min-w-0 flex-1 truncate text-right font-medium hover:underline">
                        {awayName}
                      </Link>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-right font-medium">{awayName}</span>
                    )}
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
  const sorted = [...standings].sort((a, b) => Number(b.points ?? 0) - Number(a.points ?? 0));
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">P</th>
            <th className="px-3 py-2">W</th>
            <th className="px-3 py-2">D</th>
            <th className="px-3 py-2">L</th>
            <th className="px-3 py-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-t border-white/5">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{labelOf(participants, row.participant_id) || String(row.player_name ?? "—")}</td>
              <td className="px-3 py-2">{Number(row.played ?? 0)}</td>
              <td className="px-3 py-2">{Number(row.won ?? 0)}</td>
              <td className="px-3 py-2">{Number(row.drawn ?? 0)}</td>
              <td className="px-3 py-2">{Number(row.lost ?? 0)}</td>
              <td className="px-3 py-2 font-bold">{Number(row.points ?? 0)}</td>
            </tr>
          ))}
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
        const inner = (
          <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-sm">
            <span className="font-medium">{name}</span>
            <Badge variant="outline" className="capitalize">{String(p.status ?? "")}</Badge>
          </div>
        );
        return uid ? (
          <li key={String(p.id)}>
            <Link to="/members/$id" params={{ id: uid }} className="block transition hover:bg-white/[0.03] rounded-xl">
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
