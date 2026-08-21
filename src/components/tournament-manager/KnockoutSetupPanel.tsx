import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Match,
  type Tournament,
  type TournamentParticipant,
} from "@/lib/supabase";
import { standingsByGroup } from "@/lib/brackets";
import { parseFormatConfig } from "@/lib/tournament-format";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trophy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TournamentData } from "./shared";

function labelOf(p: TournamentParticipant | undefined): string {
  if (!p) return "Unknown";
  return p.club?.trim() || p.player_name;
}

function photoOf(
  data: TournamentData,
  p: TournamentParticipant | undefined,
): string | null {
  if (!p) return null;
  if (p.photo_url) return p.photo_url;
  if (p.user_id) return data.profiles.get(p.user_id)?.avatar_url ?? null;
  return null;
}

function groupTitle(key: string): string {
  const k = key.trim();
  if (/^group\s+/i.test(k)) return k;
  if (k.length === 1) return `Group ${k.toUpperCase()}`;
  return k;
}

/**
 * Organizer UI: show every group's table, pick who qualifies,
 * then seed first knockout round + mark knockout started.
 */
export function KnockoutSetupPanel({
  tournament,
  data,
  open,
  onClose,
}: {
  tournament: Tournament;
  data: TournamentData;
  open: boolean;
  onClose: () => void;
}) {
  const fmt = useMemo(
    () => parseFormatConfig(tournament.format_config, tournament.bracket_type),
    [tournament.format_config, tournament.bracket_type],
  );
  const groupStage = fmt.stages.find((s) => s.type === "group");
  const qpg = Math.max(1, groupStage?.group?.qualifyPerGroup ?? 2);

  const groupMatches = useMemo(
    () =>
      data.matches.filter(
        (m) =>
          !!m.group_key &&
          (m.stage_type === "group" || !m.stage_type || m.stage_type === "league"),
      ),
    [data.matches],
  );

  const tables = useMemo(() => standingsByGroup(groupMatches), [groupMatches]);

  const groupKeys = useMemo(() => {
    const keys = [...tables.keys()].sort((a, b) => a.localeCompare(b));
    for (const m of groupMatches) {
      if (m.group_key && !keys.includes(m.group_key)) keys.push(m.group_key);
    }
    return keys.sort((a, b) => a.localeCompare(b));
  }, [tables, groupMatches]);

  const playersById = useMemo(() => {
    const m = new Map<string, TournamentParticipant>();
    for (const p of data.players) m.set(p.id, p);
    return m;
  }, [data.players]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = new Set<string>();
    for (const gk of groupKeys) {
      const rows = tables.get(gk) ?? [];
      for (let i = 0; i < Math.min(qpg, rows.length); i++) {
        next.add(rows[i]!.id);
      }
    }
    setSelected(next);
  }, [open, groupKeys.join("|"), qpg, tables]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectTopPerGroup = () => {
    const next = new Set<string>();
    for (const gk of groupKeys) {
      const rows = tables.get(gk) ?? [];
      for (let i = 0; i < Math.min(qpg, rows.length); i++) {
        next.add(rows[i]!.id);
      }
    }
    setSelected(next);
  };

  const clearAll = () => setSelected(new Set());

  const koSlots = useMemo(() => {
    const ko = data.matches.filter(
      (m) =>
        !m.group_key &&
        (m.stage_type === "knockout" ||
          m.stage_type === "final" ||
          (typeof m.round === "number" && m.round >= 100)),
    );
    if (!ko.length) return [] as Match[];
    const minRound = Math.min(...ko.map((m) => m.round ?? 999));
    const first = ko
      .filter((m) => (m.round ?? 0) === minRound && (m.leg ?? 1) === 1)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return first;
  }, [data.matches]);

  const confirmAndSeed = async () => {
    const ids = [...selected];
    if (ids.length < 2) {
      toast.error("Select at least 2 teams to start the playoffs");
      return;
    }
    if (!koSlots.length) {
      toast.error("No knockout slots — generate fixtures with a KO stage first");
      return;
    }
    setBusy(true);
    try {
      const ordered: string[] = [];
      for (const gk of groupKeys) {
        const rows = tables.get(gk) ?? [];
        for (const r of rows) {
          if (selected.has(r.id)) ordered.push(r.id);
        }
      }
      for (const id of ids) {
        if (!ordered.includes(id)) ordered.push(id);
      }

      const slotCount = koSlots.length;
      const pairings: { home_id: string | null; away_id: string | null }[] = [];
      for (let i = 0; i < slotCount; i++) {
        const home = ordered[i * 2] ?? null;
        const away = ordered[i * 2 + 1] ?? null;
        pairings.push({ home_id: home, away_id: away });
      }

      let updated = 0;
      for (let i = 0; i < koSlots.length; i++) {
        const match = koSlots[i]!;
        const seed = pairings[i] ?? { home_id: null, away_id: null };
        const { error } = await supabase
          .from("matches")
          .update({ home_id: seed.home_id, away_id: seed.away_id })
          .eq("id", match.id);
        if (error) throw error;
        if (match.series_key) {
          const leg2 = data.matches.find(
            (m) =>
              m.series_key === match.series_key &&
              (m.leg ?? 1) === 2 &&
              m.id !== match.id,
          );
          if (leg2) {
            await supabase
              .from("matches")
              .update({ home_id: seed.away_id, away_id: seed.home_id })
              .eq("id", leg2.id);
          }
        }
        updated++;
      }

      const nextFmt = { ...fmt, knockoutStarted: true };
      await supabase
        .from("tournaments")
        .update({ format_config: nextFmt })
        .eq("id", tournament.id);

      toast.success(
        `Playoffs seeded · ${updated} match(es) · ${ids.length} teams selected`,
      );
      void logActivity("fixtures.seed_knockout_manual", {
        tournament: tournament.name,
        teams: ids.length,
        matches: updated,
      });
      data.reload();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const unfinished = groupMatches.filter((m) => !m.played).length;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={() => !busy && onClose()}
        aria-hidden
      />
      <div className="relative z-[1] flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0e1118] shadow-2xl">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-white">Setup playoffs</h2>
              <p className="text-[11px] text-neutral-400">
                Group standings · pick who qualifies · seed bracket
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-white/5"
              onClick={() => !busy && onClose()}
            >
              Close
            </button>
          </div>
          {unfinished > 0 && (
            <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
              {unfinished} group match(es) still unfinished — you can still select from current tables.
            </p>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-neutral-400">
              Suggested: top {qpg} per group
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={selectTopPerGroup}
            >
              Select top {qpg}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={clearAll}
            >
              Clear
            </Button>
            <span className="ml-auto font-semibold text-sky-300">
              {selected.size} selected
            </span>
          </div>

          {groupKeys.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              No group standings yet. Finish group matches first.
            </p>
          ) : (
            groupKeys.map((gk) => {
              const rows = tables.get(gk) ?? [];
              return (
                <div
                  key={gk}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="border-b border-white/8 bg-white/[0.04] px-3 py-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                      {groupTitle(gk)}
                    </h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {rows.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-neutral-500">
                        No results yet
                      </p>
                    ) : (
                      rows.map((r, idx) => {
                        const p = playersById.get(r.id);
                        const name = labelOf(p);
                        const photo = photoOf(data, p);
                        const isOn = selected.has(r.id);
                        const rank = idx + 1;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => toggle(r.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition",
                              isOn
                                ? "bg-emerald-500/10"
                                : "hover:bg-white/[0.04]",
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                isOn
                                  ? "border-emerald-400 bg-emerald-500/30 text-emerald-200"
                                  : "border-white/20 text-transparent",
                              )}
                            >
                              {isOn && <Check className="h-3 w-3" />}
                            </div>
                            <span
                              className={cn(
                                "w-5 shrink-0 text-center text-[11px] font-bold",
                                rank <= qpg ? "text-amber-300" : "text-neutral-500",
                              )}
                            >
                              {rank}
                            </span>
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={photo ?? undefined} />
                              <AvatarFallback className="bg-white/10 text-[9px]">
                                {name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-white">
                                {name}
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                {r.played}P · {r.pts}pts · GD {r.gd > 0 ? "+" : ""}
                                {r.gd}
                              </p>
                            </div>
                            {isOn && (
                              <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                                Qualifies
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}

          {koSlots.length > 0 && (
            <p className="text-center text-[11px] text-neutral-500">
              First KO round has {koSlots.length} match slot(s). Teams are paired
              in selection order (1vs2, 3vs4…).
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-white/10 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 gap-1.5 bg-gradient-brand text-primary-foreground"
            disabled={busy || selected.size < 2}
            onClick={() => void confirmAndSeed()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trophy className="h-4 w-4" />
            )}
            Confirm & seed bracket
          </Button>
        </div>
      </div>
    </div>
  );
}
