import { supabase, type Match, type Tournament } from "@/lib/supabase";
import {
  standingsByGroup,
  seedFirstKnockoutRound,
} from "@/lib/brackets";
import { parseFormatConfig } from "@/lib/tournament-format";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

type DataLike = {
  matches: Match[];
  reload: () => void;
};

/** Fill first knockout round from finished group tables (A1 vs B2 …). */
export async function seedKnockoutFromGroups(
  tournament: Tournament,
  data: DataLike,
): Promise<void> {
  const fmt = parseFormatConfig(
    tournament.format_config,
    tournament.bracket_type,
  );
  const groupStage = fmt.stages.find((s) => s.type === "group");
  const qpg = groupStage?.group?.qualifyPerGroup ?? 2;
  if (!groupStage || qpg < 1) {
    toast.message("No group→knockout qualification configured");
    return;
  }

  const groupMatches = data.matches.filter(
    (m) =>
      m.group_key &&
      (m.stage_type === "group" || (!m.stage_type && m.group_key)),
  );
  if (!groupMatches.length) {
    toast.message("No group matches found");
    return;
  }
  const unfinished = groupMatches.filter((m) => !m.played);
  if (unfinished.length > 0) {
    const ok = window.confirm(
      `${unfinished.length} group match(es) not finished yet. Seed anyway from current tables?`,
    );
    if (!ok) return;
  }

  const tables = standingsByGroup(groupMatches);
  if (tables.size === 0) {
    toast.message("No group results yet — play some matches first");
    return;
  }

  const koMatches = data.matches
    .filter(
      (m) =>
        m.stage_type === "knockout" ||
        m.stage_type === "final" ||
        (typeof m.round === "number" && m.round >= 100),
    )
    .filter((m) => !m.group_key);
  if (!koMatches.length) {
    toast.message("No knockout slots — generate fixtures with a KO stage first");
    return;
  }

  const minRound = Math.min(...koMatches.map((m) => m.round ?? 999));
  const firstRound = koMatches
    .filter((m) => (m.round ?? 0) === minRound)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const uniquePos = new Map<number, Match>();
  for (const m of firstRound) {
    const pos = m.position ?? 0;
    if ((m.leg ?? 1) === 1) uniquePos.set(pos, m);
  }
  const slots = [...uniquePos.entries()].sort((a, b) => a[0] - b[0]);

  const seeding = seedFirstKnockoutRound(
    tables,
    qpg,
    slots.length || firstRound.length,
  );

  let updated = 0;
  for (const [pos, match] of slots) {
    const seed = seeding.get(pos);
    if (!seed) continue;
    if (!seed.home_id && !seed.away_id) continue;
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
  toast.success(
    updated
      ? `Seeded ${updated} knockout match(es) from group standings`
      : "Nothing to update — check group results",
  );
  void logActivity("fixtures.seed_knockout", {
    tournament: tournament.name,
    updated,
  });
  data.reload();
}

function winnerId(m: Match): string | null {
  if (!m.played || m.home_score == null || m.away_score == null) return null;
  if (!m.home_id || !m.away_id) return null;
  if (m.home_score > m.away_score) return m.home_id;
  if (m.away_score > m.home_score) return m.away_id;
  return null;
}

/** Push winners of completed knockout matches into the next round slots. */
export async function advanceKnockoutWinners(
  tournament: Tournament,
  data: DataLike,
): Promise<void> {
  const ko = data.matches.filter(
    (m) =>
      m.stage_type === "knockout" ||
      m.stage_type === "final" ||
      m.stage_type === "third_place" ||
      (typeof m.round === "number" && m.round >= 100),
  );
  if (!ko.length) {
    toast.message("No knockout matches");
    return;
  }

  const byRound = new Map<number, Match[]>();
  for (const m of ko) {
    if ((m.leg ?? 1) !== 1) continue;
    if (m.stage_type === "third_place") continue;
    const r = m.round ?? 0;
    const list = byRound.get(r) ?? [];
    list.push(m);
    byRound.set(r, list);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  if (rounds.length < 2) {
    toast.message("Need at least two knockout rounds");
    return;
  }

  let updated = 0;
  for (let i = 0; i < rounds.length - 1; i++) {
    const r = rounds[i]!;
    const nextR = rounds[i + 1]!;
    const current = (byRound.get(r) ?? []).sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    const next = (byRound.get(nextR) ?? []).sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );

    for (const m of current) {
      const w = winnerId(m);
      if (!w) continue;
      const pos = m.position ?? 1;
      const nextPos = Math.ceil(pos / 2);
      const target = next.find((x) => (x.position ?? 0) === nextPos);
      if (!target) continue;
      const asHome = pos % 2 === 1;
      const field = asHome ? "home_id" : "away_id";
      const currentVal = asHome ? target.home_id : target.away_id;
      if (currentVal === w) continue;
      const { error } = await supabase
        .from("matches")
        .update({ [field]: w })
        .eq("id", target.id);
      if (error) throw error;
      if (target.series_key) {
        const leg2 = data.matches.find(
          (x) =>
            x.series_key === target.series_key &&
            (x.leg ?? 1) === 2 &&
            x.id !== target.id,
        );
        if (leg2) {
          const field2 = asHome ? "away_id" : "home_id";
          await supabase
            .from("matches")
            .update({ [field2]: w })
            .eq("id", leg2.id);
        }
      }
      updated++;
    }
  }

  toast.success(
    updated
      ? `Advanced ${updated} winner(s) into the next round`
      : "No new winners to advance (finish matches or already seeded)",
  );
  void logActivity("fixtures.advance_knockout", {
    tournament: tournament.name,
    updated,
  });
  data.reload();
}
