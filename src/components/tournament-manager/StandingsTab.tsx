import { Crown, Medal } from "lucide-react";
import { sortStandings, type TournamentData } from "./shared";

export function StandingsTab({ data }: { data: TournamentData }) {
  const rows = sortStandings(data.standings);

  if (rows.length === 0) {
    return (
      <div className="pt-4">
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Standings appear once players are approved and results are saved.
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        Tie-breakers: Points → Goal difference → Goals scored.
      </p>
      <div className="glass rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <th className="p-3 text-left w-10">#</th>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-center">P</th>
              <th className="p-3 text-center">W</th>
              <th className="p-3 text-center">D</th>
              <th className="p-3 text-center">L</th>
              <th className="p-3 text-center">GF</th>
              <th className="p-3 text-center">GA</th>
              <th className="p-3 text-center">GD</th>
              <th className="p-3 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.participant_id} className="border-b border-border/40 last:border-0">
                <td className="p-3">
                  <span className="inline-flex items-center gap-1">
                    {i === 0 && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                    {i === 1 && <Medal className="h-3.5 w-3.5 text-slate-300" />}
                    {i === 2 && <Medal className="h-3.5 w-3.5 text-orange-400" />}
                    {i + 1}
                  </span>
                </td>
                <td className="p-3">
                  <div className="font-medium">{s.player_name}</div>
                  {s.club && <div className="text-xs text-muted-foreground">{s.club}</div>}
                </td>
                <td className="p-3 text-center">{s.played}</td>
                <td className="p-3 text-center text-emerald-300">{s.won}</td>
                <td className="p-3 text-center">{s.drawn}</td>
                <td className="p-3 text-center text-rose-300">{s.lost}</td>
                <td className="p-3 text-center">{s.goals_for}</td>
                <td className="p-3 text-center">{s.goals_against}</td>
                <td className="p-3 text-center">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
                <td className="p-3 text-center font-bold">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}