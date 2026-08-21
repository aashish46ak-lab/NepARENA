import { Link } from "@tanstack/react-router";
import {
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  type CSSProperties,
} from "react";
import type { Match, TournamentParticipant } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Lock,
  Download,
  Maximize2,
  Minimize2,
  Medal,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { captureElementPng } from "@/lib/capture-png";

/** Phone-first: readable cards; scroll if tree is wider than screen */
const CARD_W = 118;
const CARD_H = 46;
const COL_GAP = 16;
const ROUND_PAD_X = 8;
const ROW_GAP = 10;
const MIN_FIT_SCALE = 0.62;

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
function userIdOf(players: TournamentParticipant[], id: string | null) {
  if (!id) return null;
  const p = players.find((x) => x.id === id);
  return (p as { user_id?: string | null } | undefined)?.user_id ?? null;
}
function roundTitle(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - (roundIndex + 1);
  if (fromEnd <= 0) return "Final";
  if (fromEnd === 1) return "SF";
  if (fromEnd === 2) return "QF";
  if (fromEnd === 3) return "R16";
  if (fromEnd === 4) return "R32";
  if (fromEnd === 5) return "R64";
  return `R${2 ** Math.min(fromEnd + 1, 10)}`;
}
function pathFromPosition(position: number, groupCount = 4): { home: string; away: string } {
  const letters = "ABCDEFGH".slice(0, Math.max(2, Math.min(groupCount, 8))).split("");
  const pairIdx = Math.max(0, (position || 1) - 1);
  const a = letters[(pairIdx * 2) % letters.length] ?? "A";
  const b = letters[(pairIdx * 2 + 1) % letters.length] ?? "B";
  if (pairIdx % 2 === 0) return { home: `${a}1`, away: `${b}2` };
  return { home: `${b}1`, away: `${a}2` };
}
type RoundCol = { round: number; matches: Match[] };
function layoutTree(rounds: RoundCol[]) {
  if (!rounds.length) return { slots: [] as number[][], totalHeight: 0 };
  const n0 = Math.max(rounds[0].matches.length, 1);
  const unit = CARD_H + ROW_GAP;
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
  const totalHeight = Math.max(...last.map((c) => c + CARD_H / 2), n0 * unit) + 8;
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
          stroke="rgba(56,189,248,0.35)"
          strokeWidth={1.25}
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
  isFirstRound,
  groupCount,
  revealNames,
}: {
  m: Match;
  players: TournamentParticipant[];
  isFinal: boolean;
  isFirstRound?: boolean;
  groupCount?: number;
  revealNames: boolean;
}) {
  const path = isFirstRound ? pathFromPosition(m.position ?? 1, groupCount ?? 4) : null;
  const showHome = revealNames && !!m.home_id;
  const showAway = revealNames && !!m.away_id;
  // Prefer real names; seed labels only when slot empty (never "A1" + name together)
  const homeName = showHome
    ? (labelOf(players, m.home_id) ?? "TBD")
    : (path?.home ?? (isFirstRound ? "TBD" : "Winner"));
  const awayName = showAway
    ? (labelOf(players, m.away_id) ?? "TBD")
    : (path?.away ?? (isFirstRound ? "TBD" : "Winner"));
  const hp = showHome ? photoOf(players, m.home_id) : null;
  const ap = showAway ? photoOf(players, m.away_id) : null;
  const hs = revealNames && m.played && m.home_score != null ? m.home_score : null;
  const ascore = revealNames && m.played && m.away_score != null ? m.away_score : null;
  const homeWin = hs != null && ascore != null && hs > ascore;
  const awayWin = hs != null && ascore != null && ascore > hs;
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border",
        isFinal
          ? "border-amber-400/50 bg-gradient-to-br from-amber-500/25 via-[#12182a] to-[#0c1220] shadow-[0_0_12px_rgba(251,191,36,0.12)]"
          : "border-white/15 bg-gradient-to-b from-[#141c2e] to-[#0c121f] shadow-sm shadow-black/40",
      )}
      style={{ width: CARD_W, height: CARD_H }}
    >
      {isFinal && (
        <div className="flex h-3 items-center justify-center gap-0.5 border-b border-amber-400/25 bg-amber-400/12">
          <Trophy className="h-2 w-2 text-amber-300" />
          <span className="text-[6px] font-bold uppercase tracking-wider text-amber-200">Final</span>
        </div>
      )}
      <div className={cn("flex flex-col", isFinal ? "h-[calc(100%-0.75rem)]" : "h-full")}>
        <Row
          name={homeName}
          photo={hp}
          score={hs}
          win={homeWin}
          ph={!showHome}
          href={showHome ? userIdOf(players, m.home_id) : null}
        />
        <div className="border-t border-white/10" />
        <Row
          name={awayName}
          photo={ap}
          score={ascore}
          win={awayWin}
          ph={!showAway}
          href={showAway ? userIdOf(players, m.away_id) : null}
        />
      </div>
    </div>
  );
}
function Row({
  name,
  photo,
  score,
  win,
  ph,
  href,
}: {
  name: string;
  photo: string | null;
  score: number | null;
  win: boolean;
  ph?: boolean;
  href?: string | null;
}) {
  return (
    <div className={cn("flex flex-1 items-center gap-0.5 px-1", win && "bg-emerald-500/15")}>
      <Avatar className="h-5 w-5 shrink-0 rounded ring-1 ring-white/10">
        <AvatarImage src={photo ?? undefined} className="rounded object-cover" />
        <AvatarFallback
          className={cn(
            "rounded text-[7px] font-bold",
            ph ? "bg-sky-500/25 text-sky-200" : "bg-white/10",
          )}
        >
          {ph ? "•" : name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {href ? (
        <Link
          to="/members/$id"
          params={{ id: href }}
          className={cn(
            "min-w-0 flex-1 truncate text-[10px] font-semibold leading-none hover:underline",
            ph ? "font-bold tracking-wide text-sky-300" : win ? "text-emerald-100" : "text-white/95",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </Link>
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[10px] font-semibold leading-none",
            ph ? "font-bold tracking-wide text-sky-300" : win ? "text-emerald-100" : "text-white/95",
          )}
        >
          {name}
        </span>
      )}
      <span
        className={cn(
          "w-3.5 shrink-0 text-right text-[10px] font-bold tabular-nums",
          score == null ? "text-white/15" : win ? "text-emerald-300" : "text-white/65",
        )}
      >
        {score != null ? score : "–"}
      </span>
    </div>
  );
}
function ThirdPlaceCard({
  m,
  players,
  revealNames,
}: {
  m: Match;
  players: TournamentParticipant[];
  revealNames: boolean;
}) {
  const homeName =
    revealNames && m.home_id ? (labelOf(players, m.home_id) ?? "TBD") : "SF loser";
  const awayName =
    revealNames && m.away_id ? (labelOf(players, m.away_id) ?? "TBD") : "SF loser";
  const hs = revealNames && m.played && m.home_score != null ? m.home_score : null;
  const ascore = revealNames && m.played && m.away_score != null ? m.away_score : null;
  return (
    <div className="mx-auto w-full max-w-[200px] overflow-hidden rounded-md border border-violet-400/30 bg-violet-500/10">
      <div className="flex items-center justify-center gap-1 border-b border-violet-400/20 py-0.5">
        <Medal className="h-2.5 w-2.5 text-violet-300" />
        <span className="text-[8px] font-bold uppercase tracking-wider text-violet-200">3rd Place</span>
      </div>
      <div className="space-y-0.5 px-2 py-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <span className="truncate font-semibold text-white/90">{homeName}</span>
          <span className="tabular-nums font-bold text-violet-200">{hs != null ? hs : "–"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="truncate font-semibold text-white/90">{awayName}</span>
          <span className="tabular-nums font-bold text-violet-200">{ascore != null ? ascore : "–"}</span>
        </div>
      </div>
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
  bannerUrl: _bannerUrl,
  eventDate,
  allMatches,
  groupCount = 4,
}: {
  matches: Match[];
  players: TournamentParticipant[];
  locked?: boolean;
  tournamentName?: string;
  tournamentLogo?: string | null;
  organizerName?: string | null;
  organizerLogo?: string | null;
  bannerUrl?: string | null;
  eventDate?: string | null;
  allMatches?: Match[];
  groupCount?: number;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [userZoom, setUserZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);

  const revealNames = useMemo(() => {
    const pool = allMatches ?? matches;
    const groupMs = pool.filter((m) => !!m.group_key || m.stage_type === "group");
    if (groupMs.length === 0) return true;
    return groupMs.every((m) => m.played);
  }, [allMatches, matches]);

  const { mainRounds, thirdPlace } = useMemo(() => {
    const third: Match[] = [];
    const map = new Map<number, Match[]>();
    const seen = new Set<string>();
    for (const m of matches) {
      if (!m?.id || seen.has(m.id)) continue;
      seen.add(m.id);
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
        matches: [...list]
          .filter((x) => (x.leg ?? 1) === 1)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }))
      .filter((c) => c.matches.length > 0);
    return { mainRounds, thirdPlace: third };
  }, [matches]);

  const totalRounds = mainRounds.length;
  const { slots, totalHeight } = useMemo(() => layoutTree(mainRounds), [mainRounds]);
  const treeWidth =
    mainRounds.length > 0
      ? mainRounds.length * (CARD_W + COL_GAP) - COL_GAP + ROUND_PAD_X * 2
      : 0;

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || treeWidth <= 0) return;
    const apply = () => {
      const w = el.clientWidth - 16;
      if (w <= 0) return;
      // Never crush cards — allow horizontal scroll instead
      setFitScale(Math.min(1, Math.max(MIN_FIT_SCALE, w / treeWidth)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [treeWidth, fullscreen]);

  const zoom = fitScale * userZoom;
  const zoomIn = useCallback(
    () => setUserZoom((z) => Math.min(2, Math.round((z + 0.15) * 100) / 100)),
    [],
  );
  const zoomOut = useCallback(
    () => setUserZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100)),
    [],
  );
  const zoomReset = useCallback(() => setUserZoom(1), []);

  const downloadPng = async () => {
    const el = rootRef.current;
    if (!el) return;
    const fileName = `${(tournamentName || "bracket")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()}-bracket.png`;
    const res = await captureElementPng(el, {
      backgroundColor: "#070b14",
      fileName,
      scale: 2,
    });
    if (!res.ok) {
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({
            title: tournamentName || "Bracket",
            url: typeof window !== "undefined" ? window.location.href : undefined,
          });
        }
      } catch {
        /* cancel */
      }
      console.warn("bracket PNG:", res.error);
    }
  };

  if (mainRounds.length === 0 && thirdPlace.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-white/20" />
        <p className="text-sm text-muted-foreground">No bracket matches yet.</p>
      </div>
    );
  }

  const dateLabel = eventDate
    ? new Date(eventDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden border border-white/10 bg-[#070b14]",
        fullscreen
          ? "fixed inset-0 z-[200] rounded-none"
          : "rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)]",
        locked && "select-none",
      )}
    >
      {/* banner disabled — caused ghost double-tree on mobile */}

      <div className="relative z-[1] flex flex-col gap-1.5 border-b border-white/10 px-2.5 pb-2.5 pt-3">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {(organizerLogo || tournamentLogo) && (
              <div className="flex h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/20 bg-white/5">
                <img
                  src={organizerLogo || tournamentLogo || ""}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              {organizerName && (
                <p className="truncate text-[8px] font-semibold uppercase tracking-wider text-sky-300/85">
                  {organizerName}
                </p>
              )}
              <h2 className="truncate text-xs font-bold text-white">
                {tournamentName || "Knockout Bracket"}
              </h2>
              <p className="text-[8px] text-amber-200/80">
                Official Bracket{dateLabel ? ` · ${dateLabel}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={zoomOut} className="rounded border border-white/12 bg-white/5 p-1 text-white/70">
              <ZoomOut className="h-3 w-3" />
            </button>
            <button type="button" onClick={zoomReset} className="min-w-[2rem] rounded border border-white/12 bg-white/5 px-1 py-1 text-[8px] font-bold text-white/60">
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" onClick={zoomIn} className="rounded border border-white/12 bg-white/5 p-1 text-white/70">
              <ZoomIn className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => setFullscreen((v) => !v)} className="rounded border border-white/12 bg-white/5 p-1 text-white/70">
              {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </button>
          </div>
        </div>
        {!revealNames && (
          <p className="rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-center text-[9px] text-sky-200/90">
            Seeds update when group stage finishes
          </p>
        )}
      </div>

      {mainRounds.length === 0 ? (
        <div className="relative z-[1] px-4 py-8 text-center">
          <Trophy className="mx-auto mb-2 h-7 w-7 text-white/20" />
          <p className="text-sm text-white/60">Bracket will appear when knockout starts</p>
          <p className="mt-1 text-xs text-neutral-500">
            Semi-finals and final appear here once knockout fixtures exist.
          </p>
        </div>
      ) : (
        <div
          ref={viewportRef}
          className={cn(
            "relative z-[1] overflow-x-auto overflow-y-auto overscroll-x-contain",
            fullscreen ? "max-h-[calc(100dvh-140px)]" : "max-h-[min(75vh,640px)]",
            locked && "pointer-events-none",
          )}
        >
          {locked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#070b14]/50">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white/80">
                <Lock className="h-3 w-3" /> Locked
              </div>
            </div>
          )}
          <div
            className="relative mx-auto"
            style={{
              width: Math.max(treeWidth * zoom, 0),
              height: Math.max((totalHeight + 36) * zoom, 120),
            }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: treeWidth,
                height: totalHeight + 36,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                isolation: "isolate",
                willChange: "transform",
              }}
            >
              <div className="absolute left-0 top-0 flex" style={{ width: treeWidth }}>
                {mainRounds.map((col, colIdx) => {
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
                          "rounded-full px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider",
                          isFinal ? "bg-amber-400/15 text-amber-300" : "text-white/40",
                        )}
                      >
                        {title}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="absolute left-0 top-5" style={{ width: treeWidth, height: totalHeight }}>
                {mounted && (
                  <ConnectorSvg rounds={mainRounds} slots={slots} height={totalHeight} />
                )}
                {mainRounds.map((col, colIdx) => {
                  const isFinal = colIdx === totalRounds - 1;
                  const left = ROUND_PAD_X + colIdx * (CARD_W + COL_GAP);
                  return col.matches.map((m, mi) => {
                    const cy = slots[colIdx]?.[mi] ?? CARD_H;
                    return (
                      <div
                        key={m.id}
                        className="absolute"
                        style={
                          {
                            left,
                            top: cy - CARD_H / 2,
                            width: CARD_W,
                            height: CARD_H,
                          } as CSSProperties
                        }
                      >
                        <MatchCard
                          m={m}
                          players={players}
                          isFinal={isFinal}
                          isFirstRound={colIdx === 0}
                          groupCount={groupCount}
                          revealNames={revealNames}
                        />
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {thirdPlace.length > 0 && (
        <div className="relative z-[1] flex flex-col items-center gap-2 border-t border-white/10 px-3 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-300/80">Bronze match</p>
          {thirdPlace.map((m) => (
            <ThirdPlaceCard key={m.id} m={m} players={players} revealNames={revealNames} />
          ))}
        </div>
      )}

      <div className="relative z-[1] flex flex-col items-center gap-1 border-t border-white/10 px-2 py-2">
        <button
          type="button"
          onClick={() => void downloadPng()}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[9px] font-semibold text-white/80"
        >
          <Download className="h-2.5 w-2.5" /> Download PNG
        </button>
        <div className="flex items-center gap-1.5">
          <span className="h-px w-6 bg-gradient-to-r from-transparent to-white/25" />
          <span className="text-[10px] font-extrabold tracking-[0.18em] text-white/50">NEPARENA</span>
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-white/25" />
        </div>
        <p className="text-[7px] text-white/30">Powered by NepARENA</p>
      </div>
    </div>
  );
}
