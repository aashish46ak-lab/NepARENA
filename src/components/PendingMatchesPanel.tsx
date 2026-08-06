import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  loadPendingMatches,
  loadMySubmissions,
  type PendingMatch,
  type MatchSubmission,
} from "@/lib/matches-pending";
import { SubmitResultCard } from "@/components/SubmitResultCard";

type Item = { pm: PendingMatch; submission: MatchSubmission | null };

/**
 * 🚨 Home-page Pending Matches widget (Dynamic Island style).
 * Shows only matches that belong to the signed-in player, are in a
 * published matchday and are not played yet. Updates in realtime.
 */
export function PendingMatchesPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const pms = await loadPendingMatches(user.id);
      const subs = await loadMySubmissions(
        user.id,
        pms.map((p) => p.match.id),
      );
      setItems(
        pms.map((pm) => ({
          pm,
          submission: subs.get(pm.match.id) ?? null,
        })),
      );
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  // Realtime: fixtures published / results approved / submissions reviewed
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("pending-matches-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matchdays" },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_submissions" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, reload]);

  if (!user || loading || items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-6">
      <div id="pending-matches" className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <h2 className="text-base font-bold text-red-400">
            🚨 Pending matches ({items.length})
          </h2>
        </div>

        <div className="space-y-2 max-w-lg">
          {items.map((it) => (
            <div key={it.pm.match.id} className="space-y-1.5">
              <SubmitResultCard
                matchId={it.pm.match.id}
                homeLabel={it.pm.homeLabel}
                awayLabel={it.pm.awayLabel}
                homePhoto={it.pm.homePhoto}
                awayPhoto={it.pm.awayPhoto}
                meta={it.pm.tournamentName + " · " + it.pm.matchdayName}
                participantId={it.pm.myParticipantId}
                submission={it.submission}
                onDone={reload}
              />
              <div className="flex justify-end">
                <Link
                  to="/tournaments/$id"
                  params={{ id: it.pm.tournamentId }}
                  className="text-[11px] text-brand-glow hover:underline"
                >
                  Open tournament
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}