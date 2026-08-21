import { useMemo, useState } from "react";
import type { Match, Tournament, TournamentParticipant } from "@/lib/supabase";
import { BracketTree } from "@/components/BracketTree";
import { parseFormatConfig, hasGroupStage } from "@/lib/tournament-format";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles } from "lucide-react";
import { KnockoutSetupPanel } from "./KnockoutSetupPanel";
import type { TournamentData } from "./shared";

/** Organizer admin — real knockout bracket tree (not fixtures list). */
export function ManagerBracketTab({
  tournament,
  data,
}: {
  tournament: Tournament;
  data: TournamentData;
}) {
  const [setupOpen, setSetupOpen] = useState(false);

  const fmt = useMemo(
    () => parseFormatConfig(tournament.format_config, tournament.bracket_type),
    [tournament.format_config, tournament.bracket_type],
  );

  const pureKo = ["single_elimination", "double_elimination", "knockout"].includes(
    String(tournament.bracket_type ?? ""),
  );
  const knockoutStarted = pureKo || !hasGroupStage(fmt) || fmt.knockoutStarted === true;
  const players = data.players as TournamentParticipant[];

  const knockoutMatches = useMemo(() => {
    const all = data.matches as Match[];
    const ko = all.filter((m) => {
      const st = String(m.stage_type ?? "");
      if (st === "group" || st === "league") return false;
      if (m.group_key) return false;
      if (
        st === "knockout" ||
        st === "final" ||
        st === "third_place" ||
        st === "semi_final" ||
        st === "quarter_final"
      )
        return true;
      if (typeof m.round === "number" && m.round >= 100) return true;
      return false;
    });
    if (ko.length > 0) return ko;
    if (pureKo) {
      return all.filter(
        (m) => !m.group_key && m.stage_type !== "group" && m.stage_type !== "league",
      );
    }
    return [];
  }, [data.matches, pureKo]);

  const canSetup = hasGroupStage(fmt);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-amber-400" />
            Knockout bracket
          </h2>
          <p className="text-[11px] text-muted-foreground">Official tree · zoom · download</p>
        </div>
        {canSetup && (
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-gradient-brand text-primary-foreground"
            onClick={() => setSetupOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {fmt.knockoutStarted ? "Edit seeds" : "Start playoffs"}
          </Button>
        )}
      </div>

      {!knockoutStarted ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-12 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold">Knockout not public yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Finish groups, then use <span className="text-sky-300">Start playoffs</span> to pick
            qualifiers and seed this bracket.
          </p>
          {canSetup && (
            <Button
              type="button"
              className="mt-4 gap-1.5 bg-gradient-brand text-primary-foreground"
              onClick={() => setSetupOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Start playoffs
            </Button>
          )}
        </div>
      ) : knockoutMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No knockout matches yet. Generate fixtures with a KO stage first.
          </p>
        </div>
      ) : (
        <BracketTree
          matches={knockoutMatches}
          allMatches={data.matches as Match[]}
          players={players}
          tournamentName={tournament.name}
          tournamentLogo={tournament.logo_url}
          bannerUrl={tournament.banner_url}
          eventDate={tournament.starts_at ?? null}
          groupCount={fmt.stages.find((s) => s.type === "group")?.group?.groupCount ?? 4}
        />
      )}

      <KnockoutSetupPanel
        tournament={tournament}
        data={data}
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
      />
    </div>
  );
}
