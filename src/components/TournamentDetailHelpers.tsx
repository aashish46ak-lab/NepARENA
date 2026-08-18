import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SubmitResultCard } from "@/components/SubmitResultCard";
import type { PendingMatch, MatchSubmission } from "@/lib/matches-pending";
import { Lock } from "lucide-react";

export function MyMatchesPanel({
  userId, tournamentId, myPart, registrationOpen, registrationClosed, pendingItems, matches, participants, onDone,
}: {
  userId?: string; tournamentId: string; myPart: Record<string, unknown> | null; registrationOpen: boolean; registrationClosed: boolean;
  pendingItems: { pm: PendingMatch; submission: MatchSubmission | null }[]; matches: Record<string, unknown>[]; participants: Record<string, unknown>[]; onDone: () => void;
}) {
  if (!userId) return <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-neutral-500">Sign in to see your matches</p>;
  if (!myPart) {
    if (registrationOpen) {
      return (
        <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-white">Join the tournament</p>
          <p className="mt-1 text-xs text-neutral-400">Register to see your matches here.</p>
        </div>
      );
    }
    if (registrationClosed) {
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-amber-100">You&apos;re late!</p>
          <p className="mt-1 text-xs text-neutral-400">Registration has closed for this tournament.</p>
        </div>
      );
    }
    return <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-neutral-500">You are not in this tournament</p>;
  }
  const myId = String(myPart.id);
  const myFinished = matches.filter((m) => m.played && (String(m.home_id) === myId || String(m.away_id) === myId));
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h2 className="text-sm font-bold text-red-400">Pending matches ({pendingItems.length})</h2>
        </div>
        {pendingItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-neutral-500">No matches need your attention right now</p>
        ) : pendingItems.map((it) => (
          <SubmitResultCard key={it.pm.match.id} matchId={it.pm.match.id} homeLabel={it.pm.homeLabel} awayLabel={it.pm.awayLabel} homePhoto={it.pm.homePhoto} awayPhoto={it.pm.awayPhoto} meta={it.pm.matchdayName} participantId={it.pm.myParticipantId} submission={it.submission} onDone={onDone} />
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-300">Recent results</h2>
        {myFinished.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-neutral-500">No finalized results yet</p>
        ) : (
          <div className="space-y-2">
            {myFinished.map((m) => {
              const homeName = labelOf(participants, m.home_id);
              const awayName = labelOf(participants, m.away_id);
              const hs = Number(m.home_score ?? 0);
              const as_ = Number(m.away_score ?? 0);
              const iAmHome = String(m.home_id) === myId;
              const won = iAmHome ? hs > as_ : as_ > hs;
              const draw = hs === as_;
              return (
                <div key={String(m.id)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-right font-medium text-white">{homeName}</span>
                  <span className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 font-bold tabular-nums text-sky-300">{hs} – {as_}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-white">{awayName}</span>
                  <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase", draw ? "bg-neutral-500/20 text-neutral-300" : won ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
                    {draw ? "Draw" : won ? "Win" : "Loss"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

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

export function FixturesByMatchday({ matches, matchdays, participants }: { matches: Record<string, unknown>[]; matchdays: Record<string, unknown>[]; participants: Record<string, unknown>[] }) {
  const groups = useMemo(() => {
    type G = { id: string | null; name: string; published: boolean; matches: Record<string, unknown>[] };
    const map = new Map<string, G>();
    for (const m of matches) {
      const md = matchdays.find((d) => d.id === m.matchday_id);
      const gname = String(md?.name ?? `Round ${m.round ?? "?"}`);
      const existing = map.get(gname);
      if (existing) existing.matches.push(m);
      else map.set(gname, { id: (md?.id as string) ?? (m.matchday_id as string) ?? null, name: gname, published: md ? md.is_published === true : false, matches: [m] });
    }
    for (const md of matchdays) {
      const gname = String(md.name);
      if (!map.has(gname)) map.set(gname, { id: md.id as string, name: gname, published: md.is_published === true, matches: [] });
    }
    return [...map.values()].sort((a, b) => {
      const oa = Number(matchdays.find((d) => d.id === a.id)?.sort_order ?? 999);
      const ob = Number(matchdays.find((d) => d.id === b.id)?.sort_order ?? 999);
      return oa - ob;
    });
  }, [matches, matchdays]);
  const [selected, setSelected] = useState<string | null>(null);
  const activeName = selected && groups.some((g) => g.name === selected) ? selected : groups[0]?.name ?? null;
  const active = groups.find((g) => g.name === activeName);
  if (!matches.length && !matchdays.length) return <p className="text-sm text-muted-foreground">No fixtures yet.</p>;
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <button key={g.name} type="button" onClick={() => setSelected(g.name)} className={cn("shrink-0 rounded-xl border px-3 py-2 text-center transition", g.name === activeName ? "border-sky-500/50 bg-sky-500/15 text-white" : "border-white/10 bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06]")}>
            <div className="text-xs font-semibold">{g.name}</div>
            <div className="mt-0.5 text-[10px] opacity-70">{g.matches.filter((m) => m.played).length}/{g.matches.length}{g.published ? " · Live" : " · Locked"}</div>
          </button>
        ))}
      </div>
      {active && (
        <div className="relative min-h-[120px]">
          {!active.published && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/55 backdrop-blur-md">
              <Lock className="mb-2 h-8 w-8 text-neutral-300" />
              <p className="text-sm font-semibold text-white">Fixtures locked</p>
              <p className="mt-1 max-w-xs text-center text-xs text-neutral-400">This matchday is not published yet.</p>
            </div>
          )}
          <div className={cn("space-y-2", !active.published && "pointer-events-none select-none opacity-40")}>
            {active.matches.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches in this matchday.</p>
            ) : active.matches.map((m) => {
              const homeName = labelOf(participants, m.home_id);
              const awayName = labelOf(participants, m.away_id);
              const homeUid = userIdOf(participants, m.home_id);
              const awayUid = userIdOf(participants, m.away_id);
              const homePhoto = photoOf(participants, m.home_id);
              const awayPhoto = photoOf(participants, m.away_id);
              return (
                <div key={String(m.id)} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm">
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    {homeUid ? <Link to="/members/$id" params={{ id: homeUid }} className="truncate font-semibold text-white hover:underline">{homeName}</Link> : <span className="truncate font-semibold text-white">{homeName}</span>}
                    <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={homePhoto ?? undefined} /><AvatarFallback className="text-[9px]">{homeName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  </div>
                  <span className="w-12 shrink-0 text-center font-bold tabular-nums text-sky-300">{m.played ? `${m.home_score}-${m.away_score}` : "vs"}</span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={awayPhoto ?? undefined} /><AvatarFallback className="text-[9px]">{awayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    {awayUid ? <Link to="/members/$id" params={{ id: awayUid }} className="truncate font-semibold text-white hover:underline">{awayName}</Link> : <span className="truncate font-semibold text-white">{awayName}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function StandingsTable({ standings, participants }: { standings: Record<string, unknown>[]; participants: Record<string, unknown>[] }) {
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
                <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={photo ?? undefined} /><AvatarFallback className="text-[9px]">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <span className="truncate font-semibold text-white">{displayName}</span>
              </span>
            );
            return (
              <tr key={String(row.id ?? i)} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-2 py-2.5 tabular-nums text-neutral-400">{i + 1}</td>
                <td className="px-2 py-2.5">{uid ? <Link to="/members/$id" params={{ id: uid }} className="hover:underline">{nameCell}</Link> : nameCell}</td>
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

export function PlayersList({ participants }: { participants: Record<string, unknown>[] }) {
  if (!participants.length) return <p className="text-sm text-muted-foreground">No players yet.</p>;
  return (
    <ul className="space-y-2">
      {participants.map((p) => {
        const uid = p.user_id as string | null;
        const pname = String(p.player_name || p.club || "Player");
        const photo = (p.photo_url as string | null) ?? null;
        const inner = (
          <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="h-8 w-8"><AvatarImage src={photo ?? undefined} /><AvatarFallback className="text-[10px]">{pname.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <span className="truncate font-semibold text-white">{pname}</span>
            </span>
            <Badge variant="outline" className="capitalize">{String(p.status ?? "")}</Badge>
          </div>
        );
        return uid ? (
          <li key={String(p.id)}><Link to="/members/$id" params={{ id: uid }} className="block rounded-xl transition hover:bg-white/[0.03]">{inner}</Link></li>
        ) : (
          <li key={String(p.id)}>{inner}</li>
        );
      })}
    </ul>
  );
}
