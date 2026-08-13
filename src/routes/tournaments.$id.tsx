import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Calendar, Users, ShieldAlert, List, Table2, FileText,
  Award, Loader2, ExternalLink, UserPlus, CheckCircle2, ImagePlus, X,
  ChevronLeft, ChevronRight, Banknote, Shuffle, Lock, GitBranch, Swords,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BracketTree } from "@/components/BracketTree";
import { SubmitResultCard } from "@/components/SubmitResultCard";

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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Players" value={data.participants.length} />
              <Stat label="Matches" value={data.matches.length} />
              <Stat label="Status" value={status.replaceAll("_", " ")} />
            </div>
          </div>
        )}

        {tab === "fixtures" && (
          <FixturesList matches={data.matches} participants={data.participants} />
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
      <div className="text-lg font-bold capitalize">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function labelOf(participants: Record<string, unknown>[], pid: unknown) {
  const p = participants.find((x) => x.id === pid);
  return (p?.player_name as string) || (p?.club as string) || "TBD";
}

function FixturesList({ matches, participants }: { matches: Record<string, unknown>[]; participants: Record<string, unknown>[] }) {
  if (!matches.length) return <p className="text-sm text-muted-foreground">No fixtures yet.</p>;
  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <div key={String(m.id)} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm">
          <span className="truncate font-medium">{labelOf(participants, m.home_id)}</span>
          <span className="shrink-0 font-bold tabular-nums text-sky-300">
            {m.played ? `${m.home_score} - ${m.away_score}` : "vs"}
          </span>
          <span className="truncate text-right font-medium">{labelOf(participants, m.away_id)}</span>
        </div>
      ))}
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
