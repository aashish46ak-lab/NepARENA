import { useMemo } from "react";
import type { Match, TournamentParticipant } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function labelOf(players: TournamentParticipant[], id: string | null) {
  if (!id) return "TBD";
  const p = players.find((x) => x.id === id);
  return p ? p.club?.trim() || p.player_name : "TBD";
}

function photoOf(players: TournamentParticipant[], id: string | null) {
  if (!id) return null;
  return players.find((x) => x.id === id)?.photo_url ?? null;
}

export function BracketTree({
  matches,
  players,
  locked,
}: {
  matches: Match[];
  players: TournamentParticipant[];
  locked?: boolean;
}) {
  const rounds = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of matches) {
      const list = map.get(m.round) ?? [];
      list.push(m);
      map.set(m.round, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, list]) => ({
        round,
        matches: [...list].sort((a, b) => a.position - b.position),
      }));
  }, [matches]);

  if (rounds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No bracket matches yet.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto pb-2",
        locked && "pointer-events-none select-none blur-sm",
      )}
    >
      <div className="flex gap-6 min-w-max px-2 py-4">
        {rounds.map((col) => (
          <div
            key={col.round}
            className="flex flex-col justify-around gap-4 min-w-[200px]"
          >
            <div className="text-center text-xs font-semibold text-muted-foreground">
              Round {col.round}
            </div>
            {col.matches.map((m) => {
              const home = labelOf(players, m.home_id);
              const away = labelOf(players, m.away_id);
              const hs =
                m.played && m.home_score != null ? m.home_score : null;
              const ascore =
                m.played && m.away_score != null ? m.away_score : null;
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden w-[200px]"
                >
                  <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border/40">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage
                        src={photoOf(players, m.home_id) ?? undefined}
                      />
                      <AvatarFallback className="text-[9px] bg-secondary">
                        {home.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-xs font-semibold truncate">
                      {home}
                    </span>
                    <span className="text-xs font-bold text-brand-glow w-5 text-right">
                      {hs != null ? hs : "–"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage
                        src={photoOf(players, m.away_id) ?? undefined}
                      />
                      <AvatarFallback className="text-[9px] bg-secondary">
                        {away.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-xs font-semibold truncate">
                      {away}
                    </span>
                    <span className="text-xs font-bold text-brand-glow w-5 text-right">
                      {ascore != null ? ascore : "–"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
        }
