import { useMemo } from "react";
import type { Match, TournamentParticipant } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trophy, Lock } from "lucide-react";

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
  return `Round of ${2 ** (fromEnd + 1)}`;
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
        matches: [...list].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        ),
      }));
  }, [matches]);

  const totalRounds = rounds.length;

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950 px-4 py-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-white/20" />
        <p className="text-sm text-muted-foreground">No bracket matches yet.</p>
      </div>
    );
  }

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
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url(${bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-500/[0.07] via-transparent to-emerald-500/[0.05]" />
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative z-[1] flex flex-col items-center gap-3 border-b border-white/10 px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          {(organizerLogo || tournamentLogo) && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-lg shadow-sky-500/10">
              <img
                src={organizerLogo || tournamentLogo || ""}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 text-center sm:text-left">
            {organizerName && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
                {organizerName}
              </p>
            )}
            <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
              {tournamentName || "Knockout Bracket"}
            </h2>
          </div>
          {tournamentLogo && organizerLogo && (
            <div className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 sm:block">
              <img
                src={tournamentLogo}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-sky-400/50" />
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-200">
            Knockout
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-sky-400/50" />
        </div>
      </div>

      <div
        className={cn(
          "relative z-[1] overflow-x-auto pb-2 pt-2",
          locked && "pointer-events-none",
        )}
      >
        {locked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#070b14]/40 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-2 text-xs font-semibold text-white/80">
              <Lock className="h-3.5 w-3.5" />
              Bracket locked
            </div>
          </div>
        )}
        <div
          className={cn(
            "flex min-w-max gap-3 px-3 py-5 sm:gap-5 sm:px-5",
            locked && "blur-[2px]",
          )}
        >
          {rounds.map((col, colIdx) => {
            const title = roundTitle(colIdx, totalRounds);
            const isFinal = colIdx === totalRounds - 1;
            return (
              <div
                key={col.round}
                className="flex min-w-[168px] flex-col gap-3 sm:min-w-[200px]"
              >
                <div
                  className={cn(
                    "sticky top-0 z-[2] text-center text-[11px] font-bold uppercase tracking-[0.14em]",
                    isFinal ? "text-amber-300" : "text-white/45",
                  )}
                >
                  {title}
                </div>
                <div
                  className={cn(
                    "flex flex-1 flex-col justify-around gap-3",
                    isFinal && "justify-center",
                  )}
                >
                  {col.matches.map((m) => {
                    const home = labelOf(players, m.home_id);
                    const away = labelOf(players, m.away_id);
                    const hs =
                      m.played && m.home_score != null ? m.home_score : null;
                    const ascore =
                      m.played && m.away_score != null ? m.away_score : null;
                    const homeWin =
                      hs != null && ascore != null && hs > ascore;
                    const awayWin =
                      hs != null && ascore != null && ascore > hs;
                    const leg = m.leg && m.leg > 1 ? `L${m.leg}` : null;

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "relative w-[168px] overflow-hidden rounded-xl border sm:w-[200px]",
                          isFinal
                            ? "border-amber-400/35 bg-gradient-to-b from-amber-500/10 to-white/[0.03] shadow-lg shadow-amber-500/10"
                            : "border-white/10 bg-white/[0.04]",
                        )}
                      >
                        {isFinal && (
                          <div className="flex items-center justify-center gap-1 border-b border-amber-400/20 bg-amber-400/10 py-1">
                            <Trophy className="h-3 w-3 text-amber-300" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200">
                              Final
                            </span>
                          </div>
                        )}
                        {leg && (
                          <div className="absolute right-1.5 top-1.5 rounded bg-white/10 px-1 py-0.5 text-[8px] font-bold text-white/50">
                            {leg}
                          </div>
                        )}
                        <SideRow
                          name={home}
                          photo={photoOf(players, m.home_id)}
                          score={hs}
                          winner={homeWin}
                          border
                        />
                        <SideRow
                          name={away}
                          photo={photoOf(players, m.away_id)}
                          score={ascore}
                          winner={awayWin}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-[1] flex flex-col items-center gap-1.5 border-t border-white/10 px-4 py-4">
        <img
          src="/neparena-logo.png"
          alt="NepARENA"
          className="h-8 w-8 rounded-lg object-cover opacity-90"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <p className="text-[11px] font-bold tracking-[0.22em] text-white/50">
          NEPARENA
        </p>
        <p className="text-[9px] text-white/25">Official knockout bracket</p>
      </div>
    </div>
  );
}

function SideRow({
  name,
  photo,
  score,
  winner,
  border,
}: {
  name: string;
  photo: string | null;
  score: number | null;
  winner?: boolean;
  border?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-2",
        border && "border-b border-white/8",
        winner && "bg-emerald-500/10",
      )}
    >
      <Avatar className="h-7 w-7 shrink-0 ring-1 ring-white/10">
        <AvatarImage src={photo ?? undefined} />
        <AvatarFallback className="bg-white/10 text-[9px] font-bold text-white/70">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs font-semibold",
          winner ? "text-emerald-200" : "text-white/90",
          name === "TBD" && "text-white/35 italic",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "w-6 text-right text-sm font-bold tabular-nums",
          winner ? "text-emerald-300" : "text-sky-300/90",
          score == null && "text-white/25",
        )}
      >
        {score != null ? score : "–"}
      </span>
    </div>
  );
}
