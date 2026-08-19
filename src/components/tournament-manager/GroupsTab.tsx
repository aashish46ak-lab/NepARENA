import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Shuffle,
  Save,
  ArrowRightLeft,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase, type Tournament } from "@/lib/supabase";
import {
  parseFormatConfig,
  type FormatConfig,
} from "@/lib/tournament-format";
import { cn } from "@/lib/utils";
import type { TournamentData } from "./shared";

type GroupBucket = { name: string; ids: string[] };

function letterName(i: number) {
  return `Group ${String.fromCharCode(65 + (i % 26))}`;
}

function buildEmpty(count: number): GroupBucket[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    name: letterName(i),
    ids: [],
  }));
}

function randomize(ids: string[], groupCount: number): GroupBucket[] {
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const groups = buildEmpty(groupCount);
  shuffled.forEach((id, i) => {
    groups[i % groups.length].ids.push(id);
  });
  return groups;
}

export function GroupsTab({
  tournament,
  data,
  onPatched,
}: {
  tournament: Tournament;
  data: TournamentData;
  onPatched?: (t: Tournament) => void;
}) {
  const approved = useMemo(
    () => data.players.filter((p) => p.status === "approved"),
    [data.players],
  );
  const format = useMemo(
    () => parseFormatConfig(tournament.format_config, tournament.bracket_type),
    [tournament.format_config, tournament.bracket_type],
  );
  const groupStage = format.stages.find((s) => s.type === "group");
  const targetCount = Math.max(1, groupStage?.group?.groupCount ?? 4);
  const qualify = groupStage?.group?.qualifyPerGroup ?? 0;

  const [groups, setGroups] = useState<GroupBucket[]>(() => {
    if (format.groupDraw?.length) {
      return format.groupDraw.map((g) => ({
        name: g.name,
        ids: [...g.ids],
      }));
    }
    return buildEmpty(targetCount);
  });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const assigned = useMemo(() => new Set(groups.flatMap((g) => g.ids)), [groups]);
  const unassigned = approved.filter((p) => !assigned.has(p.id));

  const nameOf = (id: string) => {
    const p = approved.find((x) => x.id === id);
    return p ? p.club?.trim() || p.player_name : id.slice(0, 6);
  };
  const photoOf = (id: string) => {
    const p = approved.find((x) => x.id === id);
    return p?.photo_url || p?.club_logo_url || null;
  };

  const issues = useMemo(() => {
    const msgs: string[] = [];
    if (approved.length < 2) msgs.push("Need at least 2 approved players.");
    if (groups.some((g) => g.ids.length < 2) && assigned.size > 0) {
      msgs.push("Every group should have at least 2 players before generating fixtures.");
    }
    if (qualify > 0) {
      for (const g of groups) {
        if (g.ids.length > 0 && g.ids.length < qualify) {
          msgs.push(
            `${g.name} has ${g.ids.length} players but ${qualify} must qualify — add more players or lower qualify count in Settings.`,
          );
        }
      }
    }
    if (unassigned.length > 0 && assigned.size > 0) {
      msgs.push(`${unassigned.length} approved player(s) not in any group.`);
    }
    return msgs;
  }, [approved.length, groups, assigned.size, qualify, unassigned.length]);

  const setGroupCount = (n: number) => {
    const count = Math.max(1, Math.min(12, n));
    setGroups((prev) => {
      const next = buildEmpty(count);
      const all = prev.flatMap((g) => g.ids);
      all.forEach((id, i) => next[i % count].ids.push(id));
      prev.forEach((g, i) => {
        if (i < count && g.name) next[i].name = g.name;
      });
      return next;
    });
  };

  const moveTo = (id: string, groupIndex: number) => {
    setGroups((prev) => {
      const next = prev.map((g) => ({
        ...g,
        ids: g.ids.filter((x) => x !== id),
      }));
      if (groupIndex >= 0 && groupIndex < next.length) {
        next[groupIndex] = {
          ...next[groupIndex],
          ids: [...next[groupIndex].ids, id],
        };
      }
      return next;
    });
    setSelected(null);
  };

  const doRandomize = () => {
    const ids = approved.map((p) => p.id);
    setGroups(randomize(ids, groups.length || targetCount));
    toast.message("Groups randomized — save to keep");
  };

  const save = async () => {
    setSaving(true);
    try {
      const nextFormat: FormatConfig = {
        ...format,
        groupDraw: groups.map((g) => ({ name: g.name, ids: [...g.ids] })),
      };
      const stages = nextFormat.stages.map((s) =>
        s.type === "group" && s.group
          ? { ...s, group: { ...s.group, groupCount: groups.length } }
          : s,
      );
      nextFormat.stages = stages;

      const { data: row, error } = await supabase
        .from("tournaments")
        .update({ format_config: nextFormat as unknown as Record<string, unknown> })
        .eq("id", tournament.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (row && onPatched) onPatched(row as Tournament);
      toast.success("Group draw saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!groupStage) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
        <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          This tournament has no group stage.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose “Group Stage” or “Group Stage + Knockout” in Settings first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Groups</h2>
          <p className="text-xs text-muted-foreground">
            Assign players to groups, then generate fixtures.{" "}
            {qualify > 0
              ? `Top ${qualify} from each group advance.`
              : "No knockout qualification configured."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Groups</span>
            <Input
              type="number"
              min={1}
              max={12}
              className="h-8 w-16"
              value={groups.length}
              onChange={(e) => setGroupCount(Number(e.target.value) || 1)}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={doRandomize}>
            <Shuffle className="mr-1.5 h-3.5 w-3.5" /> Randomize
          </Button>
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save groups
          </Button>
        </div>
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          {issues.map((m, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              {m}
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs">
          <ArrowRightLeft className="h-3.5 w-3.5 text-sky-300" />
          <span className="font-medium text-white">Move {nameOf(selected)} to:</span>
          {groups.map((g, i) => (
            <Button
              key={g.name}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => moveTo(selected, i)}
            >
              {g.name}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[11px]"
            onClick={() => moveTo(selected, -1)}
          >
            Unassign
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => setSelected(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g, gi) => (
          <div
            key={gi}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <Input
                className="h-8 font-semibold"
                value={g.name}
                onChange={(e) =>
                  setGroups((prev) =>
                    prev.map((x, i) =>
                      i === gi ? { ...x, name: e.target.value } : x,
                    ),
                  )
                }
              />
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {g.ids.length}
              </span>
            </div>
            <ul className="space-y-1.5">
              {g.ids.length === 0 && (
                <li className="py-4 text-center text-[11px] text-muted-foreground">
                  Empty — randomize or pick from unassigned
                </li>
              )}
              {g.ids.map((id, rank) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelected(id === selected ? null : id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left text-sm transition",
                      selected === id
                        ? "border-sky-500/50 bg-sky-500/15"
                        : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <span className="w-4 text-[10px] font-bold text-muted-foreground">
                      {rank + 1}
                    </span>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={photoOf(id) ?? undefined} />
                      <AvatarFallback className="text-[9px]">
                        {nameOf(id).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {nameOf(id)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Unassigned ({unassigned.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => {
              const id = p.id;
              const label = p.club?.trim() || p.player_name;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id === selected ? null : id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                    selected === id
                      ? "border-sky-500/50 bg-sky-500/15"
                      : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage
                      src={p.photo_url || p.club_logo_url || undefined}
                    />
                    <AvatarFallback className="text-[8px]">
                      {label.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {label}
                </button>
              );
            })}
          </div>
          {selected && unassigned.some((p) => p.id === selected) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[11px] text-muted-foreground">Add to:</span>
              {groups.map((g, i) => (
                <Button
                  key={g.name}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => moveTo(selected, i)}
                >
                  {g.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
