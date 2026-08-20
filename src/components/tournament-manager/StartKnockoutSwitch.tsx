import { useMemo, useState } from "react";
import { supabase, type Tournament } from "@/lib/supabase";
import { parseFormatConfig, hasGroupStage } from "@/lib/tournament-format";
import { seedKnockoutFromGroups } from "@/lib/seed-knockout";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { TournamentData } from "./shared";

export function StartKnockoutSwitch({
  tournament,
  data,
}: {
  tournament: Tournament;
  data: TournamentData;
}) {
  const [busy, setBusy] = useState(false);
  const fmtCfg = useMemo(
    () => parseFormatConfig(tournament.format_config, tournament.bracket_type),
    [tournament.format_config, tournament.bracket_type],
  );
  if (!hasGroupStage(fmtCfg)) return null;
  const on = !!fmtCfg.knockoutStarted;

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ format_config: { ...fmtCfg, knockoutStarted: next } as never })
        .eq("id", tournament.id);
      if (error) throw error;
      if (next) {
        try {
          await seedKnockoutFromGroups(tournament, data);
        } catch {
          /* seed optional */
        }
      }
      toast.success(
        next ? "Knockout started - bracket is now public" : "Knockout hidden from public",
      );
      data.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold">
      <Switch checked={on} disabled={busy || data.matches.length === 0} onCheckedChange={(v) => void toggle(v)} />
      <span className={on ? "text-emerald-300" : "text-muted-foreground"}>Start knockout</span>
    </label>
  );
}
