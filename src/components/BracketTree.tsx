import { useMemo, useRef, useState, useLayoutEffect, type CSSProperties } from "react";
import type { Match, TournamentParticipant } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trophy, Lock, Download, Maximize2, Minimize2, Medal } from "lucide-react";

const CARD_W = 168;
const CARD_H = 72;
const COL_GAP = 40;
const ROUND_PAD_X = 16;

function labelOf(players: TournamentParticipant[], id: string | null) {
  if (!id) return null;
  const p = players.find((x) => x.id === id);
  return p ? p.club?.trim() || p.player_name : null;
}

function photoOf(players: TournamentParticipant[], id: string | null) {
  if (!id) return null;
  const p = players.find((x) => x.id === id);
  return p?.photo_url || p?.club_logo_url || null;
}

function roundTitle(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - (roundIndex + 1);
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  if (fromEnd === 3) return "Round of 16";
  if (fromEnd === 4) return "Round of 32";
  return `Round of ${2 ** (fromEnd + 1)}`;
}

function pathFromMatchday(m: Match & { matchday?: string | null }): { home: string; away: string } | null {
  const md = String(m.matchday ?? "");
  const parts = md.split("·").map((s) => s.trim());
  const tail = parts.length > 1 ? parts[parts.length - 1]! : md;
  const vs = tail.match(/([A-Za-z]\d+)\s*vs\s*([A-Za-z]\d+)/i);
  if (vs) return { home: vs[1]!.toUpperCase(), away: vs[2]!.toUpperCase() };
  return null;
}

type RoundCol = { round: number; matches: Match[] };

function layoutTree(rounds: RoundCol[]) {
  if (!rounds.length) return { slots: [] as number[][], totalHeight: 0 };
  const n0 = Math.max(rounds[0]!.matches.length, 1);
  const unit = CARD_H + 24;
  const slots: number[][] = [];
  const r0: number[] = [];
  for (let i = 0; i < n0; i++) r0.push(unit / 2 + i * unit);
  slots.push(r0);
  for (let r = 1; r < rounds.length; r++) {
    const prev = slots[r - 1]!;
    const n = rounds[r]!.matches.length;
    const centers: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = prev[i * 2];
      const b = prev[i * 2 + 1];
      if (a != null && b != null) centers.push((a + b) / 2);
      else if (a != null) centers.push(a);
      else centers.push(unit / 2 + i * unit * Math.pow(2, r));
    }
    slots.push(centers);
  }
  const last = slots[slots.length - 1] ?? [0];
  const totalHeight = Math.max(...last.map((c) => c + CARD_H / 2), n0 * unit) + 32;
  return { slots, totalHeight };
}

function ConnectorSvg({ rounds, slots, height }: { rounds: RoundCol[]; slots: number[][]; height: number }) {
  if (rounds.length < 2) return null;
  const width = rounds.length * (CARD_W + COL_GAP) - COL_GAP + ROUND_PAD_X * 2;
  const paths: string[] = [];
  for (let r = 0; r < rounds.length - 1; r++) {
    const leftX = ROUND_PAD_X + r * (CARD_W + COL_GAP) + CARD_W;
    const rightX = ROUND_PAD_X + (r + 1) * (CARD_W + COL_GAP);
    const midX = (leftX + rightX) / 2;
    const nextN = rounds[r + 1]!.matches.length;
    for (let i = 0; i < nextN; i++) {
      const yParent = slots[r + 1]?.[i];
      if (yParent == null) continue;
      const yA = slots[r]?.[i * 2];
      const yB = slots[r]?.[i * 2 + 1];
      if (yA != null) paths.push(`M ${leftX} ${yA} H ${midX} V ${yParent} H ${rightX}`);
      if (yB != null) paths.push(`M ${leftX} ${yB} H ${midX} V ${yParent}`);
    }
  }
  return (
    <svg className="pointer-events-none absolute left-0 top-0" width={width} height={height} style={{ overflow: "visible" }}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(56,189,248,0.28)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function MatchCard({ m, players, isFinal, style }: { m: Match; players: TournamentParticipant[]; isFinal: boolean; style: CSSProperties }) {
  const path = pathFromMatchday(m as Match & { matchday?: string | null });
  const homeName = labelOf(players, m.home_id) ?? path?.home ?? "TBD";
  const awayName = labelOf(players, m.away_id) ?? path?.away ?? "TBD";
  const hp = photoOf(players, m.home_id);
  const ap = photoOf(players, m.away_id);
  const hs = m.played && m.home_score != null ? m.home_score : null;
  const ascore = m.played && m.away_score != null ? m.away_score : null;
  const homeWin = hs != null && ascore != null && hs > ascore;
  const awayWin = hs != null && ascore != null && ascore > hs;
  const isPlaceholderHome = !m.home_id;
  const isPlaceholderAway = !m.away_id;
  const leg = m.leg && m.leg > 1 ? `Leg ${m.leg}` : m.leg === 1 && m.series_key ? "Leg 1" : null;

  return (
    <div
      className={cn(
        "absolute left-0 overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm",
        isFinal
          ? "border-amber-400/50 bg-gradient-to-br from-amber-500/20 via-[#0f172a] to-[#0c1220] shadow-amber-500/20"
          : "border-white/15 bg-gradient-to-br from-white/[0.08] to-[#0c1220]/95 shadow-black/40",
      )}
      style={{ width: CARD_W, height: CARD_H, ...style }}
    >
      {isFinal && (
        <div className="flex h-4 items-center justify-center gap-1 border-b border-amber-400/30 bg-amber-400/15">
          <Trophy className="h-2.5 w-2.5 text-amber-300" />
          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-200">Final</span>
        </div>
      )}
      <div className={cn("flex flex-col", isFinal ? "h-[calc(100%-1rem)]" : "h-full")}>
        <Row name={homeName} photo={hp} score={hs} win={homeWin} muted={isPlaceholderHome} placeholder={isPlaceholderHome} />
        <div className="border-t border-white/10" />
        <Row name={awayName} photo={ap} score={ascore} win={awayWin} muted={isPlaceholderAway} placeholder={isPlaceholderAway} />
      </div>
      {leg && (
        <span className="absolute right-1.5 top-1 rounded bg-sky-500/20 px-1 text-[7px] font-bold text-sky-200">{leg}</span>
      )}
    </div>
  );
}

function Row({ name, photo, score, win, muted, placeholder }: { name: string; photo: string | null; score: number | null; win: boolean; muted: boolean; placeholder?: boolean }) {
  return (
    <div className={cn("flex flex-1 items-center gap-1.5 px-2", win && "bg-emerald-500/20")}>
      <Avatar className="h-7 w-7 shrink-0 rounded-lg ring-1 ring-white/10">
        <AvatarImage src={photo ?? undefined} className="rounded-lg object-cover" />
        <AvatarFallback className={cn("rounded-lg text-[9px]", placeholder ? "bg-sky-500/20 text-sky-200" : "bg-white/10")}>
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className={cn("min-w-0 flex-1 truncate text-[11px] font-semibold", placeholder ? "font-bold tracking-wide text-sky-300/90" : muted ? "italic text-white/35" : win ? "text-emerald-100" : "text-white/95")}>
        {name}
      </span>
      <span className={cn("w-5 shrink-0 text-right text-xs font-bold tabular-nums", score == null ? "text-white/20" : win ? "text-emerald-300" : "text-white/70")}>
        {score != null ? score : "–"}
      </span>
    </div>
  );
}

function ThirdPlaceCard({ m, players }: { m: Match; players: TournamentParticipant[] }) {
  const path = pathFromMatchday(m as Match & { matchday?: string | null });
  const homeName = labelOf(players, m.home_id) ?? path?.home ?? "TBD";
  const awayName = labelOf(players, m.away_id) ?? path?.away ?? "TBD";
  const hs = m.played && m.home_score != null ? m.home_score : null;
  const ascore = m.played && m.away_score != null ? m.away_score : null;
  return (
    <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 to-[#0c1220] shadow-lg">
      <div className="flex items-center justify-center gap-1.5 border-b border-violet-400/25 bg-violet-500/15 py-1.5">
        <Medal className="h-3.5 w-3.5 text-violet-300" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200">3rd Place</span>
      </div>
      <div className="space-y-0 px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-semibold text-white/90">{homeName}</span>
          <span className="tabular-nums font-bold text-violet-200">{hs != null ? hs : "–"}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-semibold text-white/90">{awayName}</span>
          <span className="tabular-nums font-bold text-violet-200">{ascore != null ? ascore : "–"}</span>
        </div>
      </div>
    </div>
  );
}

export function BracketTree({
  matches, players, locked, tournamentName, tournamentLogo, organizerName, organizerLogo, bannerUrl, eventDate,
}: {
  matches: (Match & { matchday?: string | null })[];
  players: TournamentParticipant[];
  locked?: boolean;
  tournamentName?: string;
  tournamentLogo?: string | null;
  organizerName?: string | null;
  organizerLogo?: string | null;
  bannerUrl?: string | null;
  eventDate?: string | null;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const { mainRounds, thirdPlace } = useMemo(() => {
    const third: Match[] = [];
    const map = new Map<number, Match[]>();
    for (const m of matches) {
      if (m.stage_type === "third_place") {
        third.push(m);
        continue;
      }
      const r = m.round ?? 1;
      const list = map.get(r) ?? [];
      list.push(m);
      map.set(r, list);
    }
    const mainRounds = [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, list]) => ({
        round,
        matches: [...list].filter((x) => (x.leg ?? 1) === 1).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }))
      .filter((c) => c.matches.length > 0);
    return { mainRounds, thirdPlace: third };
  }, [matches]);

  const totalRounds = mainRounds.length;
  const { slots, totalHeight } = useMemo(() => layoutTree(mainRounds), [mainRounds]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);

  const downloadPng = async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      const mod = await import("html2canvas").catch(() => null);
      if (mod?.default) {
        const canvas = await mod.default(el, { backgroundColor: "#070b14", scale: 2, useCORS: true });
        const a = document.createElement("a");
        a.download = `${(tournamentName || "bracket").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-bracket.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
        return;
      }
    } catch { /* fall through */ }
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 20px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(tournamentName || "Official Bracket", canvas.width / 2, 40);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui";
    ctx.fillText("NEPARENA", canvas.width / 2, canvas.height - 20);
    const a = document.createElement("a");
    a.download = "bracket.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  if (mainRounds.length === 0 && thirdPlace.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950 px-4 py-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-white/20" />
        <p className="text-sm text-muted-foreground">No bracket matches yet.</p>
      </div>
    );
  }

  const treeWidth = mainRounds.length * (CARD_W + COL_GAP) - COL_GAP + ROUND_PAD_X * 2;
  const dateLabel = eventDate
    ? new Date(eventDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden border border-white/10 bg-[#070b14]",
        fullscreen ? "fixed inset-0 z-[200] rounded-none" : "rounded-2xl",
        locked && "select-none",
      )}
    >
      {bannerUrl && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_55%)]" />

      <div className="relative z-[1] flex flex-col items-center gap-2 border-b border-white/10 px-4 pb-4 pt-5">
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {(organizerLogo || tournamentLogo) && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-lg shadow-sky-500/15">
                <img src={organizerLogo || tournamentLogo || ""} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              {organizerName && (
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/85">{organizerName}</p>
              )}
              <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">{tournamentName || "Knockout Bracket"}</h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90">Official Bracket</span>
                {dateLabel && (<><span className="text-white/25">·</span><span className="text-[10px] text-white/50">{dateLabel}</span></>)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            className="rounded-lg border border-white/12 bg-white/5 p-2 text-white/70 hover:bg-white/10"
            title={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className={cn("relative z-[1] overflow-x-auto overflow-y-auto", fullscreen ? "max-h-[calc(100dvh-180px)]" : "max-h-[70vh]", locked && "pointer-events-none")}>
        {locked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#070b14]/45 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-xs font-semibold text-white/80">
              <Lock className="h-3.5 w-3.5" /> Bracket locked
            </div>
          </div>
        )}
        <div className={cn("relative mx-auto py-2", locked && "blur-[2px]")} style={{ width: Math.max(treeWidth, 320), height: totalHeight + 48, minWidth: "100%" }}>
          <div className="absolute left-0 top-0 flex" style={{ width: treeWidth }}>
            {mainRounds.map((col, colIdx) => {
              const title = roundTitle(colIdx, totalRounds);
              const isFinal = colIdx === totalRounds - 1;
              return (
                <div key={`lbl-${col.round}`} className="flex justify-center" style={{ width: CARD_W, marginLeft: colIdx === 0 ? ROUND_PAD_X : COL_GAP }}>
                  <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]", isFinal ? "bg-amber-400/15 text-amber-300" : "text-white/45")}>
                    {title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute left-0 top-8" style={{ width: treeWidth, height: totalHeight }}>
            {mounted && <ConnectorSvg rounds={mainRounds} slots={slots} height={totalHeight} />}
            {mainRounds.map((col, colIdx) => {
              const isFinal = colIdx === totalRounds - 1;
              const left = ROUND_PAD_X + colIdx * (CARD_W + COL_GAP);
              return col.matches.map((m, mi) => {
                const cy = slots[colIdx]?.[mi] ?? CARD_H;
                return (
                  <div key={m.id} className="absolute" style={{ left, top: cy - CARD_H / 2, width: CARD_W, height: CARD_H }}>
                    <MatchCard m={m} players={players} isFinal={isFinal} style={{}} />
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>

      {thirdPlace.length > 0 && (
        <div className="relative z-[1] space-y-2 border-t border-white/10 px-4 py-4">
          {thirdPlace.map((m) => (
            <ThirdPlaceCard key={m.id} m={m} players={players} />
          ))}
        </div>
      )}

      <div className="relative z-[1] flex flex-col items-center gap-2 border-t border-white/10 px-4 py-4">
        <button type="button" onClick={() => void downloadPng()} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10">
          <Download className="h-3.5 w-3.5" /> Download bracket PNG
        </button>
        <div className="flex flex-col items-center gap-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-white/25" />
            <span className="text-[12px] font-extrabold tracking-[0.22em] text-white/55">NEPARENA</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-white/25" />
          </div>
          <p className="text-[9px] text-white/35">Powered by NepARENA</p>
        </div>
      </div>
    </div>
  );
}
