import { useMemo, useRef, useState, useLayoutEffect, type CSSProperties } from "react";
import type { Match, TournamentParticipant } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trophy, Lock } from "lucide-react";

const CARD_W = 176;
const CARD_H = 68;
const COL_GAP = 48;
const ROUND_PAD_X = 12;

function labelOf(players: TournamentParticipant[], id: string | null) {
  if (!id) return "TBD";
  const p = players.find((x) => x.id === id);
  return p ? p.club?.trim() || p.player_name : "TBD";
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

type RoundCol = { round: number; matches: Match[] };

/** Vertical slot layout so each later-round match sits between its two feeders */
function layoutTree(rounds: RoundCol[]) {
  if (!rounds.length) return { slots: [] as number[][], totalHeight: 0 };

  const n0 = Math.max(rounds[0].matches.length, 1);
  const unit = CARD_H + 20;
  const slots: number[][] = [];

  const r0: number[] = [];
  for (let i = 0; i < n0; i++) {
    r0.push(unit / 2 + i * unit);
  }
  slots.push(r0);

  for (let r = 1; r < rounds.length; r++) {
    const prev = slots[r - 1];
    const n = rounds[r].matches.length;
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
  const totalHeight = Math.max(...last.map((c) => c + CARD_H / 2), n0 * unit) + 24;
  return { slots, totalHeight };
}

function ConnectorSvg({
  rounds,
  slots,
  height,
}: {
  rounds: RoundCol[];
  slots: number[][];
  height: number;
}) {
  if (rounds.length < 2) return null;
  const width = rounds.length * (CARD_W + COL_GAP) - COL_GAP + ROUND_PAD_X * 2;
  const paths: string[] = [];

  for (let r = 0; r < rounds.length - 1; r++) {
    const leftX = ROUND_PAD_X + r * (CARD_W + COL_GAP) + CARD_W;
    const rightX = ROUND_PAD_X + (r + 1) * (CARD_W + COL_GAP);
    const midX = (leftX + rightX) / 2;
    const nextN = rounds[r + 1].matches.length;

    for (let i = 0; i < nextN; i++) {
      const yParent = slots[r + 1]?.[i];
      if (yParent == null) continue;
      const yA = slots[r]?.[i * 2];
      const yB = slots[r]?.[i * 2 + 1];

      if (yA != null) {
        paths.push(`M ${leftX} ${yA} H ${midX} V ${yParent} H ${rightX}`);
      }
      if (yB != null) {
        paths.push(`M ${leftX} ${yB} H ${midX} V ${yParent}`);
      }
    }
  }

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(148,163,184,0.35)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function MatchCard({
  m,
  players,
  isFinal,
  style,
}: {
  m: Match;
  players: TournamentParticipant[];
  isFinal: boolean;
  style: CSSProperties;
}) {
  const home = labelOf(players, m.home_id);
  const away = labelOf(players, m.away_id);
  const hp = photoOf(players, m.home_id);
  const ap = photoOf(players, m.away_id);
  const hs = m.played && m.home_score != null ? m.home_score : null;
  const ascore = m.played && m.away_score != null ? m.away_score : null;
  const homeWin = hs != null && ascore != null && hs > ascore;
  const awayWin = hs != null && ascore != null && ascore > hs;
  const leg = m.leg && m.leg > 1 ? `L${m.leg}` : m.leg === 1 ? "L1" : null;

  return (
    <div
      className={cn(
        "absolute left-0 overflow-hidden rounded-lg border shadow-sm",
        isFinal
          ? "border-amber-400/40 bg-gradient-to-b from-amber-500/15 to-[#0c1220] shadow-amber-500/15"
          : "border-white/12 bg-[#0c1220]/95",
      )}
      style={{ width: CARD_W, height: CARD_H, ...style }}
    >
      {isFinal && (
        <div className="flex h-4 items-center justify-center gap-1 border-b border-amber-400/25 bg-amber-400/10">
          <Trophy className="h-2.5 w-2.5 text-amber-300" />
          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-200">
            Final
          </span>
        </div>
      )}
      <div className={cn("flex flex-col", isFinal ? "h-[calc(100%-1rem)]" : "h-full")}>
        <Row name={home} photo={hp} score={hs} win={homeWin} muted={!m.home_id} />
        <div className="border-t border-white/8" />
        <Row name={away} photo={ap} score={ascore} win={awayWin} muted={!m.away_id} />
      </div>
      {leg && (
        <span className="absolute right-1 top-1 rounded bg-black/50 px-1 text-[8px] font-semibold text-white/60">
          {leg}
        </span>
      )}
    </div>
  );
}

function Row({
  name,
  photo,
  score,
  win,
  muted,
}: {
  name: string;
  photo: string | null;
  score: number | null;
  win: boolean;
  muted: boolean;
}) {
  return (
    <div className={cn("flex flex-1 items-center gap-1.5 px-2", win && "bg-emerald-500/15")}>
      <Avatar className="h-6 w-6 shrink-0 rounded-md">
        <AvatarImage src={photo ?? undefined} className="rounded-md object-cover" />
        <AvatarFallback className="rounded-md text-[8px] bg-white/10">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[11px] font-semibold",
          muted ? "text-white/35 italic" : win ? "text-emerald-100" : "text-white/90",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "w-5 shrink-0 text-right text-xs font-bold tabular-nums",
          score == null ? "text-white/20" : win ? "text-emerald-300" : "text-white/70",
        )}
      >
        {score != null ? score : "–"}
      </span>
    </div>
  );
}

export function BracketTree({
  matches,
  players,
  locked,
  tournamentName,
  tournamentLogo,
  organizerName,
  organizerLogo,
  bannerUrl,
}: {
  matches: Match[];
  players: TournamentParticipant[];
  locked?: boolean;
  tournamentName?: string;
  tournamentLogo?: string | null;
  organizerName?: string | null;
  organizerLogo?: string | null;
  bannerUrl?: string | null;
}) {
  const rounds = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of matches) {
      const r = m.round ?? 1;
      const list = map.get(r) ?? [];
      list.push(m);
      map.set(r, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, list]) => ({
        round,
        matches: [...list].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }));
  }, [matches]);

  const totalRounds = rounds.length;
  const { slots, totalHeight } = useMemo(() => layoutTree(rounds), [rounds]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950 px-4 py-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-white/20" />
        <p className="text-sm text-muted-foreground">No bracket matches yet.</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Generate knockout fixtures from the organizer dashboard.
        </p>
      </div>
    );
  }

  const treeWidth =
    rounds.length * (CARD_W + COL_GAP) - COL_GAP + ROUND_PAD_X * 2;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10",
        "bg-[#070b14]",
        locked && "select-none",
      )}
    >
      {bannerUrl && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `url(${bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-500/[0.06] via-transparent to-emerald-500/[0.04]" />

      <div className="relative z-[1] flex flex-col items-center gap-2.5 border-b border-white/10 px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          {(organizerLogo || tournamentLogo) && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-lg shadow-sky-500/10">
              <img
                src={organizerLogo || tournamentLogo || ""}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 text-center sm:text-left">
            {organizerName && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                {organizerName}
              </p>
            )}
            <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
              {tournamentName || "Knockout Bracket"}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-sky-400/50" />
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-200">
            Knockout Bracket
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-sky-400/50" />
        </div>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "relative z-[1] overflow-x-auto overflow-y-hidden",
          locked && "pointer-events-none",
        )}
      >
        {locked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#070b14]/45 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-xs font-semibold text-white/80">
              <Lock className="h-3.5 w-3.5" />
              Bracket locked
            </div>
          </div>
        )}

        <div
          className={cn("relative mx-auto", locked && "blur-[2px]")}
          style={{
            width: treeWidth,
            height: totalHeight + 40,
            minWidth: "100%",
          }}
        >
          <div className="absolute left-0 top-0 flex" style={{ width: treeWidth }}>
            {rounds.map((col, colIdx) => {
              const title = roundTitle(colIdx, totalRounds);
              const isFinal = colIdx === totalRounds - 1;
              return (
                <div
                  key={`lbl-${col.round}`}
                  className="flex justify-center"
                  style={{
                    width: CARD_W,
                    marginLeft: colIdx === 0 ? ROUND_PAD_X : COL_GAP,
                  }}
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.12em]",
                      isFinal ? "text-amber-300" : "text-white/40",
                    )}
                  >
                    {title}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="absolute left-0 top-8" style={{ width: treeWidth, height: totalHeight }}>
            {mounted && (
              <ConnectorSvg rounds={rounds} slots={slots} height={totalHeight} />
            )}
            {rounds.map((col, colIdx) => {
              const isFinal = colIdx === totalRounds - 1;
              const left = ROUND_PAD_X + colIdx * (CARD_W + COL_GAP);
              return col.matches.map((m, mi) => {
                const cy = slots[colIdx]?.[mi] ?? CARD_H;
                return (
                  <div
                    key={m.id}
                    className="absolute"
                    style={{
                      left,
                      top: cy - CARD_H / 2,
                      width: CARD_W,
                      height: CARD_H,
                    }}
                  >
                    <MatchCard m={m} players={players} isFinal={isFinal} style={{}} />
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>

      <div className="relative z-[1] flex flex-col items-center gap-1 border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-white/20" />
          <span className="text-[11px] font-bold tracking-[0.2em] text-white/50">
            NEPARENA
          </span>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-white/20" />
        </div>
        <p className="text-[9px] text-white/30">Powered by NepARENA</p>
      </div>
    </div>
  );
}
