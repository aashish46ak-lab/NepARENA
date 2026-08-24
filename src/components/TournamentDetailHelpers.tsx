import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { normalizeMatchdayLabel } from "@/components/tournament-manager/shared";
import { SubmitResultCard } from "@/components/SubmitResultCard";
import type { PendingMatch, MatchSubmission } from "@/lib/matches-pending";
import { Lock } from "lucide-react";

function partOf(participants: Record<string, unknown>[], pid: unknown) {
  const id = pid == null ? "" : String(pid);
  return participants.find((x) => String(x.id) === id) ?? null;
}
function labelOf(participants: Record<string, unknown>[], pid: unknown) {
  const p = partOf(participants, pid);
  if (!p) return "TBD";
  // Prefer Display Name (profile_name / full_name merge) over stored player_name/username
  return (
    String(
      (p as { profile_name?: string }).profile_name ||
        p.player_name ||
        p.club ||
        "TBD",
    ).trim() || "TBD"
  );
}
function photoOf(participants: Record<string, unknown>[], pid: unknown): string | null {
  const p = partOf(participants, pid);
  if (!p) return null;
  return (
    (p.photo_url as string | null) ||
    (p.club_logo_url as string | null) ||
    (p.avatar_url as string | null) ||
    null
  );
}
function userIdOf(participants: Record<string, unknown>[], pid: unknown): string | null {
  const p = partOf(participants, pid);
  const uid = p?.user_id;
  return uid ? String(uid) : null;
}

export function MyMatchesPanel({
  userId, tournamentId, myPart, registrationOpen, registrationClosed, pendingItems, matches, participants, onDone,
}: {
  userId?: string; tournamentId?: string; myPart: Record<string, unknown> | null; registrationOpen: boolean; registrationClosed: boolean;
  pendingItems: { pm: PendingMatch; submission: MatchSubmission | null }[]; matches: Record<string, unknown>[]; participants: Record<string, unknown>[]; onDone: () => void;
}) {
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinPending, setJoinPending] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const pending = participants.some(
      (p) => String(p.user_id) === String(userId) && String(p.status) === "pending",
    );
    if (pending) setJoinPending(true);
  }, [userId, participants]);

  const requestJoin = async () => {
    if (!userId || !tournamentId) return;
    setJoinBusy(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { toast } = await import("sonner");
      const { data: existing } = await supabase
        .from("tournament_participants")
        .select("id, status")
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        if (existing.status === "pending") {
          setJoinPending(true);
          toast.message("Request already pending");
          return;
        }
        if (existing.status === "approved") {
          onDone();
          return;
        }
      }
      const { data: auth } = await supabase.auth.getUser();
      const email = auth.user?.email ?? "";
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      const displayName =
        (prof?.full_name && String(prof.full_name).trim()) ||
        email.split("@")[0] ||
        "Player";
      const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: tournamentId,
        user_id: userId,
        player_name: displayName,
        photo_url: (prof as { avatar_url?: string | null } | null)?.avatar_url ?? null,
        status: "pending",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setJoinPending(true);
      toast.success("Join request sent — wait for organizer approval");
      onDone();
    } finally {
      setJoinBusy(false);
    }
  };

  if (!userId) return <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-neutral-500">Sign in to see your matches</p>;
  if (!myPart) {
    if (registrationOpen) {
      return (
        <div className="space-y-3 rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-white">Registration is open</p>
          <p className="text-xs text-neutral-400">Request to join to play and see your matches here.</p>
          {joinPending ? (
            <p className="text-sm font-medium text-amber-300">Request pending — organizer will review</p>
          ) : (
            <button
              type="button"
              disabled={joinBusy || !tournamentId}
              onClick={() => void requestJoin()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-black hover:bg-white disabled:opacity-60"
            >
              {joinBusy ? "Sending…" : "Request to join"}
            </button>
          )}
        </div>
      );
    }
    if (registrationClosed) return <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-center"><p className="text-sm font-semibold text-amber-100">You're late!</p></div>;
    return <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-neutral-500">You are not in this tournament</p>;
  }
  const myId = String(myPart.id);
  const myFinished = matches.filter((m) => m.played && (String(m.home_id) === myId || String(m.away_id) === myId));
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-red-400">Pending matches ({pendingItems.length})</h2>
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
        ) : myFinished.map((m) => {
          const homeName = labelOf(participants, m.home_id);
          const awayName = labelOf(participants, m.away_id);
          const hs = Number(m.home_score ?? 0);
          const as_ = Number(m.away_score ?? 0);
          return (
            <div key={String(m.id)} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-right font-medium text-white">{homeName}</span>
              <span className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 font-bold tabular-nums text-sky-300">{hs} – {as_}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-white">{awayName}</span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export function FixturesByMatchday({ matches, matchdays, participants }: { matches: Record<string, unknown>[]; matchdays: Record<string, unknown>[]; participants: Record<string, unknown>[] }) {
  const groups = useMemo(() => {
    type G = { id: string | null; name: string; published: boolean; matches: Record<string, unknown>[]; sort: number };
    const map = new Map<string, G>();
    for (const m of matches) {
      const md = matchdays.find((d) => d.id === m.matchday_id);
      const raw = String(md?.name ?? `Round ${m.round ?? "?"}`);
      const gname = normalizeMatchdayLabel(raw);
      const sort = Number(md?.sort_order ?? 999);
      const published = md ? md.is_published === true : false;
      const existing = map.get(gname);
      if (existing) {
        existing.matches.push(m);
        existing.published = existing.published || published;
        existing.sort = Math.min(existing.sort, sort);
      } else {
        map.set(gname, {
          id: (md?.id as string) ?? (m.matchday_id as string) ?? null,
          name: gname,
          published,
          matches: [m],
          sort,
        });
      }
    }
    for (const md of matchdays) {
      const gname = normalizeMatchdayLabel(String(md.name));
      if (!map.has(gname)) {
        map.set(gname, {
          id: md.id as string,
          name: gname,
          published: md.is_published === true,
          matches: [],
          sort: Number(md.sort_order ?? 999),
        });
      } else {
        const g = map.get(gname)!;
        g.published = g.published || md.is_published === true;
      }
    }
    const stageOrder = (name: string): number => {
      const n = name.toLowerCase();
      const md = n.match(/matchday\s+(\d+)/);
      if (md) return Number(md[1]);
      if (n.includes("round of 32")) return 100;
      if (n.includes("round of 16")) return 110;
      if (n.includes("quarter") || n.includes("round of 8")) return 120;
      if (n.includes("semi")) return 130;
      if (n.includes("final") && !n.includes("third")) return 140;
      if (n.includes("third")) return 150;
      return 200;
    };
    return [...map.values()].sort(
      (a, b) => stageOrder(a.name) - stageOrder(b.name) || a.sort - b.sort,
    );
  }, [matches, matchdays]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeName = selected && groups.some((g) => g.name === selected) ? selected : groups[0]?.name ?? null;
  const active = groups.find((g) => g.name === activeName);

  const byGroupKey = useMemo(() => {
    if (!active) return [] as { key: string; matches: Record<string, unknown>[] }[];
    const map = new Map<string, Record<string, unknown>[]>();
    for (const m of active.matches) {
      const gk = (m.group_key as string | null)?.trim();
      const key = !gk ? "" : gk.length === 1 ? `Group ${gk}` : gk.startsWith("Group") ? gk : `Group ${gk}`;
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : a[0].localeCompare(b[0])))
      .map(([key, ms]) => ({ key, matches: ms }));
  }, [active]);

  if (!matches.length && !matchdays.length) return <p className="text-sm text-muted-foreground">No fixtures yet.</p>;

  const renderMatch = (m: Record<string, unknown>) => {
    const homeName = labelOf(participants, m.home_id);
    const awayName = labelOf(participants, m.away_id);
    const homeUid = userIdOf(participants, m.home_id);
    const awayUid = userIdOf(participants, m.away_id);
    const homePhoto = photoOf(participants, m.home_id);
    const awayPhoto = photoOf(participants, m.away_id);
    return (
      <div key={String(m.id)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm">
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
  };

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
              <p className="mt-1 text-xs text-neutral-400">This matchday is not published yet.</p>
            </div>
          )}
          <div className={cn("space-y-4", !active.published && "pointer-events-none select-none opacity-40")}>
            {active.matches.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches in this matchday.</p>
            ) : byGroupKey.length === 1 && byGroupKey[0].key === "" ? (
              <div className="space-y-2">{active.matches.map(renderMatch)}</div>
            ) : (
              byGroupKey.map(({ key, matches: gm }) => (
                <div key={key || "all"} className="space-y-2">
                  {key ? (
                    <div className="flex items-center gap-2 px-1">
                      <span className="h-px flex-1 bg-gradient-to-r from-sky-500/40 to-transparent" />
                      <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-200">{key}</span>
                      <span className="h-px flex-1 bg-gradient-to-l from-sky-500/40 to-transparent" />
                    </div>
                  ) : null}
                  <div className="space-y-2">{gm.map(renderMatch)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StandingsTable({
  standings, participants, matches = [],
}: {
  standings: Record<string, unknown>[];
  participants: Record<string, unknown>[];
  matches?: Record<string, unknown>[];
}) {
  const groupKeys = Array.from(new Set(matches.map((m) => (m.group_key as string | null) ?? null).filter((g): g is string => !!g))).sort();
  const nameOf = (pid: string) => {
    const p = participants.find((x) => String(x.id) === String(pid));
    if (!p) return "—";
    return String(
      (p as { profile_name?: string }).profile_name ||
        p.player_name ||
        p.club ||
        "Player",
    ).trim() || "—";
  };
  type Row = { participant_id: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number };
  const computeFor = (matchList: Record<string, unknown>[]): Row[] => {
    const map = new Map<string, Row>();
    const ensure = (id: string) => {
      if (!map.has(id)) map.set(id, { participant_id: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
      return map.get(id)!;
    };
    for (const m of matchList) {
      if (m.home_id) ensure(String(m.home_id));
      if (m.away_id) ensure(String(m.away_id));
    }
    for (const m of matchList) {
      if (!m.played || m.home_score == null || m.away_score == null) continue;
      const hid = m.home_id ? String(m.home_id) : null;
      const aid = m.away_id ? String(m.away_id) : null;
      if (!hid || !aid) continue;
      const h = ensure(hid); const a = ensure(aid);
      const hs = Number(m.home_score); const as_ = Number(m.away_score);
      h.played++; a.played++; h.gf += hs; h.ga += as_; a.gf += as_; a.ga += hs;
      if (hs > as_) { h.won++; a.lost++; h.points += 3; }
      else if (hs < as_) { a.won++; h.lost++; a.points += 3; }
      else { h.drawn++; a.drawn++; h.points += 1; a.points += 1; }
    }
    for (const r of map.values()) r.gd = r.gf - r.ga;
    return [...map.values()].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  };
  const renderTable = (rows: Row[], title?: string) => (
    <div key={title ?? "all"} className="space-y-2">
      {title && <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300/90">{title}</h3>}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-white/5 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-2">#</th><th className="px-2 py-2">Player</th>
              <th className="px-1 py-2 text-center">P</th><th className="px-1 py-2 text-center">W</th>
              <th className="px-1 py-2 text-center">D</th><th className="px-1 py-2 text-center">L</th>
              <th className="px-1 py-2 text-center">GD</th><th className="px-2 py-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.participant_id} className={cn("border-t border-white/5", i < 2 && "bg-emerald-500/[0.06]")}>
                <td className="px-2 py-2 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-2 py-2 font-medium text-white">
                  {(() => {
                    const part = participants.find((x) => String(x.id) === String(r.participant_id));
                    const uid = part?.user_id ? String(part.user_id) : null;
                    const label = nameOf(r.participant_id);
                    const photo = photoOf(participants, r.participant_id);
                    const inner = (
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0 rounded-full ring-1 ring-white/10">
                          <AvatarImage src={photo ?? undefined} className="object-cover" />
                          <AvatarFallback className="bg-white/10 text-[9px] font-bold">
                            {label.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{label}</span>
                      </span>
                    );
                    return uid ? (
                      <Link to="/members/$id" params={{ id: uid }} className="hover:text-sky-300 hover:underline">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    );
                  })()}
                </td>
                <td className="px-1 py-2 text-center tabular-nums">{r.played}</td>
                <td className="px-1 py-2 text-center tabular-nums">{r.won}</td>
                <td className="px-1 py-2 text-center tabular-nums">{r.drawn}</td>
                <td className="px-1 py-2 text-center tabular-nums">{r.lost}</td>
                <td className="px-1 py-2 text-center tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="px-2 py-2 text-center font-bold tabular-nums text-white">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  if (groupKeys.length > 0) {
    return (
      <div className="space-y-6">
        {groupKeys.map((gk) => {
          const rows = computeFor(matches.filter((m) => m.group_key === gk));
          if (!rows.length) return null;
          return renderTable(rows, gk.startsWith("Group") ? gk : `Group ${gk}`);
        })}
      </div>
    );
  }
  if (!standings.length) return <p className="text-sm text-muted-foreground">Standings not available yet.</p>;
  const rows: Row[] = [...standings].map((s) => ({
    participant_id: String(s.participant_id ?? ""),
    played: Number(s.played ?? 0), won: Number(s.won ?? 0), drawn: Number(s.drawn ?? 0), lost: Number(s.lost ?? 0),
    gf: Number(s.goals_for ?? 0), ga: Number(s.goals_against ?? 0), gd: Number(s.goal_diff ?? s.goal_difference ?? 0), points: Number(s.points ?? 0),
  })).sort((a, b) => b.points - a.points || b.gd - a.gd);
  return renderTable(rows);
}

export function PlayersList({ participants }: { participants: Record<string, unknown>[] }) {
  if (!participants.length) return <p className="text-sm text-muted-foreground">No players yet.</p>;
  return (
    <ul className="space-y-2">
      {participants.map((p) => {
        const pname = String(
          (p as { profile_name?: string }).profile_name || p.player_name || p.club || "Player",
        );
        const photo = (p.photo_url as string | null) || (p.avatar_url as string | null) || null;
        const uid = p.user_id ? String(p.user_id) : null;
        return (
          <li key={String(p.id)} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-sm">
            {uid ? (
              <Link to="/members/$id" params={{ id: uid }} className="flex min-w-0 items-center gap-2.5 hover:text-sky-300">
                <Avatar className="h-8 w-8 rounded-full ring-1 ring-white/10">
                  <AvatarImage src={photo ?? undefined} className="object-cover" />
                  <AvatarFallback className="bg-white/10 text-[10px] font-bold">{pname.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate font-semibold text-white">{pname}</span>
              </Link>
            ) : (
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar className="h-8 w-8 rounded-full ring-1 ring-white/10">
                  <AvatarImage src={photo ?? undefined} className="object-cover" />
                  <AvatarFallback className="bg-white/10 text-[10px] font-bold">{pname.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate font-semibold text-white">{pname}</span>
              </span>
            )}
            <Badge variant="outline" className="capitalize">{String(p.status ?? "")}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
