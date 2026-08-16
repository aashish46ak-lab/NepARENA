import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Trophy, Loader2 } from "lucide-react";

type Row = {
  participant_id: string;
  player_name: string;
  team_name: string | null;
  matches: number;
  placement_points: number;
  kill_points: number;
  total_points: number;
};

export function BrLeaderboard({
  tournamentId,
  className,
}: {
  tournamentId: string;
  className?: string;
}) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["br_leaderboard", tournamentId],
    enabled: !!tournamentId,
    queryFn: async (): Promise<Row[]> => {
      const { data: results } = await supabase
        .from("tournament_br_results")
        .select(
          "participant_id, placement_points, kill_points, total_points, status, tournament_participants(player_name, team_name)",
        )
        .eq("tournament_id", tournamentId)
        .in("status", ["verified", "published"]);

      const map = new Map<string, Row>();
      for (const r of results ?? []) {
        const pid = r.participant_id as string;
        const part = r.tournament_participants as {
          player_name?: string;
          team_name?: string | null;
        } | null;
        const cur = map.get(pid) ?? {
          participant_id: pid,
          player_name: part?.player_name ?? "Player",
          team_name: part?.team_name ?? null,
          matches: 0,
          placement_points: 0,
          kill_points: 0,
          total_points: 0,
        };
        cur.matches += 1;
        cur.placement_points += Number(r.placement_points ?? 0);
        cur.kill_points += Number(r.kill_points ?? 0);
        cur.total_points += Number(r.total_points ?? 0);
        map.set(pid, cur);
      }
      return [...map.values()].sort((a, b) => b.total_points - a.total_points);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-neutral-500">
        No verified results yet. Standings appear after organizers verify match scores.
      </p>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-white/10", className)}>
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-3 py-2.5">#</th>
            <th className="px-3 py-2.5">Team / Player</th>
            <th className="px-3 py-2.5 text-right">Matches</th>
            <th className="px-3 py-2.5 text-right">Place pts</th>
            <th className="px-3 py-2.5 text-right">Kill pts</th>
            <th className="px-3 py-2.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.participant_id} className="border-b border-white/5 hover:bg-white/[0.03]">
              <td className="px-3 py-2.5 font-semibold text-neutral-400">
                {i === 0 ? <Trophy className="inline h-4 w-4 text-amber-400" /> : i + 1}
              </td>
              <td className="px-3 py-2.5 font-medium text-white">{r.team_name || r.player_name}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-neutral-400">{r.matches}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-neutral-300">{r.placement_points}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-neutral-300">{r.kill_points}</td>
              <td className="px-3 py-2.5 text-right font-bold tabular-nums text-white">{r.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
