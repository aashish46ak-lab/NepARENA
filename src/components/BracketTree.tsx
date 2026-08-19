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

const CARD_W = 128;
const CARD_H = 48;
const COL_GAP = 18;
const ROUND_PAD_X = 10;
const ROW_GAP = 10;

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
  if (fromEnd === 1) return "Semi";
  if (fromEnd === 2) return "QF";
  if (fromEnd === 3) return "R16";
  if (fromEnd === 4) return "R32";
  return `R${2 ** (fromEnd + 1)}`;
}

function pathFromPosition(
  position: number,
  groupCount = 4,
): { home: string; away: string } {
  const letters = "ABCDEFGH"
    .slice(0, Math.max(2, Math.min(groupCount, 8)))
    .split("");
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
  const totalHeight =
    Math.max(...last.map((c) => c + CARD_H / 2), n0 * unit) + 16;
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
      if (yA != null)
        paths.push(`M ${leftX} ${yA} H ${midX} V ${yParent} H ${rightX}`);
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
          stroke="rgba(56,189,248,0.32)"
          strokeWidth={1.5}
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
  const path = isFirstRound
    ? pathFromPosition(m.position ?? 1, groupCount ?? 4)
    : null;
  const showHome = revealNames && !!m.home_id;
  const showAway = revealNames && !!m.away_id;
  const homeName = showHome
    ? (labelOf(players, m.home_id) ?? path?.home ?? "TBD")
    : path?.home ?? (isFirstRound ? "TBD" : "Winner");
  const awayName = showAway
    ? (labelOf(players, m.away_id) ?? path?.away ?? "TBD")
    : path?.away ?? (isFirstRound ? "TBD" : "Winner");
  const hp = showHome ? photoOf(players, m.home_id) : null;
  const ap = showAway ? photoOf(players, m.away_id) : null;
  const hs =
    revealNames && m.played && m.home_score != null ? m.home_score : null;
  const ascore =
    revealNames && m.played && m.away_score != null ? m.away_score : null;
  const homeWin = hs != null && ascore != null && hs > ascore;
  const awayWin = hs != null && ascore != null && ascore > hs;
  const isPlaceholderHome = !showHome;
  const isPlaceholderAway = !showAway;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border shadow-md",
        isFinal
          ? "border-amber-400/45 bg-gradient-to-br from-amber-500/18 via-[#0f172a] to-[#0c1220]"
          : "border-white/12 bg-gradient-to-br from-white/[0.07] to-[#0c1220]/95",
      )}
      style={{ width: CARD_W, height: CARD_H }}
    >
      {isFinal && (
        <div className="flex h-3.5 items-center justify-center gap-0.5 border-b border-amber-400/25 bg-amber-400/12">
          <Trophy className="h-2 w-2 text-amber-300" />
          <span className="text-[7px] font-bold uppercase tracking-wider text-amber-200">
            Final
          </span>
        </div>
      )}
      <div
        className={cn(
          "flex flex-col",
          isFinal ? "h-[calc(100%-0.875rem)]" : "h-full",
        )}
      >
        <Row
          name={homeName}
          photo={hp}
          score={hs}
          win={homeWin}
          placeholder={isPlaceholderHome}
        />
        <div className="border-t border-white/10" />
        <Row
          name={awayName}
          photo={ap}
          score={ascore}
          win={awayWin}
          placeholder={isPlaceholderAway}
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
  placeholder,
}: {
  name: string;
  photo: string | null;
  score: number | null;
  win: boolean;
  placeholder?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-1 px-1.5",
        win && "bg-emerald-500/15",
      )}
    >
      <Avatar className="h-5 w-5 shrink-0 rounded-md ring-1 ring-white/10">
        <AvatarImage
          src={photo ?? undefined}
          className="rounded-md object-cover"
        />
        <AvatarFallback
          className={cn(
            "rounded-md text-[8px] font-bold",
            placeholder ? "bg-sky-500/25 text-sky-200" : "bg-white/10",
          )}
        >
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight",
          placeholder
            ? "font-bold tracking-wide text-sky-300"
            : win
              ? "text-emerald-100"
              : "text-white/95",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "w-4 shrink-0 text-right text-[10px] font-bold tabular-nums",
          score == null
            ? "text-white/15"
            : win
              ? "text-emerald-300"
              : "text-white/65",
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
    revealNames && m.home_id
      ? (labelOf(players, m.home_id) ?? "TBD")
      : "SF loser";
  const awayName =
    revealNames && m.away_id
      ? (labelOf(players, m.away_id) ?? "TBD")
      : "SF loser";
  const hs =
    revealNames && m.played && m.home_score != null ? m.home_score : null;
  const ascore =
    revealNames && m.played && m.away_score != null ? m.away_score : null;

  return (
    <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-lg border border-violet-400/30 bg-gradient-to-br from-violet-500/12 to-[#0c1220]">
      <div className="flex items-center justify-center gap-1 border-b border-violet-400/20 bg-violet-500/12 py-1">
        <Medal className="h-3 w-3 text-violet-300" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-200">
          3rd Place
        </span>
      </div>
      <div className="space-y-0.5 px-2.5 py-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-white/90">{homeName}</span>
          <span className="tabular-nums font-bold text-violet-200">
            {hs != null ? hs : "–"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-white/90">{awayName}</span>
          <span className="tabular-nums font-bold text-violet-200">
            {ascore != null ? ascore : "–"}
          </span>
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
  bannerUrl,
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
  const [zoom, setZoom] = useState(1);

  const revealNames = useMemo(() => {
    const pool = allMatches ?? matches;
    const groupMs = pool.filter(
      (m) => !!m.group_key || m.stage_type === "group",
    );
    if (groupMs.length === 0) return true;
    return groupMs.every((m) => m.played);
  }, [allMatches, matches]);

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
        matches: [...list]
          .filter((x) => (x.leg ?? 1) === 1)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }))
      .filter((c) => c.matches.length > 0);
    return { mainRounds, thirdPlace: third };
  }, [matches]);

  const totalRounds = mainRounds.length;
  const { slots, totalHeight } = useMemo(
    () => layoutTree(mainRounds),
    [mainRounds],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);

  const treeWidth =
    mainRounds.length * (CARD_W + COL_GAP) - COL_GAP + ROUND_PAD_X * 2;

  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(1.6, Math.round((z + 0.1) * 10) / 10)),
    [],
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(0.55, Math.round((z - 0.1) * 10) / 10)),
    [],
  );
  const zoomFit = useCallback(() => setZoom(0.85), []);

  const downloadPng = async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      const mod = await import("html2canvas").catch(() => null);
      if (mod?.default) {
        const canvas = await mod.default(el, {
          backgroundColor: "#070b14",
          scale: 2,
          useCORS: true,
        });
        const a = document.createElement("a");
        a.download = `${(tournamentName || "bracket")
          .replace(/[^a-z0-9]+/gi, "-")
          .toLowerCase()}-bracket.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      }
    } catch {
      /* ignore */
    }
  };

  if (mainRounds.length === 0 && thirdPlace.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950 px-4 py-12 text-center">
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
        fullscreen ? "fixed inset-0 z-[200] rounded-none" : "rounded-2xl",
        locked && "select-none",
      )}
    >
      {bannerUrl && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url(${bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.1),_transparent_55%)]" />

      <div className="relative z-[1] flex flex-col gap-2 border-b border-white/10 px-3 pb-3 pt-4">
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {(organizerLogo || tournamentLogo) && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-white/5">
                <img
                  src={organizerLogo || tournamentLogo || ""}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              {organizerName && (
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-sky-300/85">
                  {organizerName}
                </p>
              )}
              <h2 className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
                {tournamentName || "Knockout Bracket"}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200/90">
                  Official Bracket
                </span>
                {dateLabel && (
                  <>
                    <span className="text-white/25">·</span>
                    <span className="text-[9px] text-white/50">{dateLabel}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={zoomOut}
              className="rounded-md border border-white/12 bg-white/5 p-1.5 text-white/70 hover:bg-white/10"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={zoomFit}
              className="min-w-[2.25rem] rounded-md border border-white/12 bg-white/5 px-1 py-1.5 text-[9px] font-bold text-white/60 hover:bg-white/10"
              title="Fit"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="rounded-md border border-white/12 bg-white/5 p-1.5 text-white/70 hover:bg-white/10"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              className="rounded-md border border-white/12 bg-white/5 p-1.5 text-white/70 hover:bg-white/10"
              title={fullscreen ? "Exit full screen" : "Full screen"}
            >
              {fullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        {!revealNames && (
          <p className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1.5 text-center text-[10px] text-sky-200/90">
            Group stage unfinished — bracket shows{" "}
            <span className="font-bold">A1 / B2</span> seeds. Names fill after
            all group games are played.
          </p>
        )}
      </div>

      <div
        className={cn(
          "relative z-[1] overflow-auto",
          fullscreen ? "max-h-[calc(100dvh-160px)]" : "max-h-[min(62vh,520px)]",
          locked && "pointer-events-none",
        )}
      >
        {locked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#070b14]/45 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-xs font-semibold text-white/80">
              <Lock className="h-3.5 w-3.5" /> Bracket locked
            </div>
          </div>
        )}
        <div
          className={cn(
            "relative mx-auto origin-top py-2",
            locked && "blur-[2px]",
          )}
          style={{
            width: Math.max(treeWidth, 280),
            height: (totalHeight + 40) * zoom,
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
          }}
        >
          <div
            className="absolute left-0 top-0 flex"
            style={{ width: treeWidth }}
          >
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
                      "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em]",
                      isFinal
                        ? "bg-amber-400/15 text-amber-300"
                        : "text-white/45",
                    )}
                  >
                    {title}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            className="absolute left-0 top-6"
            style={{ width: treeWidth, height: totalHeight }}
          >
            {mounted && (
              <ConnectorSvg
                rounds={mainRounds}
                slots={slots}
                height={totalHeight}
              />
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

      {thirdPlace.length > 0 && (
        <div className="relative z-[1] space-y-2 border-t border-white/10 px-3 py-3">
          {thirdPlace.map((m) => (
            <ThirdPlaceCard
              key={m.id}
              m={m}
              players={players}
              revealNames={revealNames}
            />
          ))}
        </div>
      )}

      <div className="relative z-[1] flex flex-col items-center gap-1.5 border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={() => void downloadPng()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/10"
        >
          <Download className="h-3 w-3" />
          Download PNG
        </button>
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/25" />
            <span className="text-[11px] font-extrabold tracking-[0.2em] text-white/55">
              NEPARENA
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/25" />
          </div>
          <p className="text-[8px] text-white/35">Powered by NepARENA</p>
        </div>
      </div>
    </div>
  );
}
