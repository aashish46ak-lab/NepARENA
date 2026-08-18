import { useMemo, useState } from "react";
import type { Tournament } from "@/lib/supabase";
import { useTournamentData } from "./shared";
import { OverviewTab } from "./OverviewTab";
import { PlayersTab } from "./PlayersTab";
import { FixturesTab } from "./FixturesTab";
import { StandingsTab } from "./StandingsTab";
import { SettingsTab } from "./SettingsTab";
import { VerificationsTab } from "./VerificationsTab";
import { BrRoundsTab } from "./BrRoundsTab";
import { getGame, isBattleRoyale } from "@/lib/games";
import { GameBadge } from "@/components/tournaments/games/GameBadge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  hasKnockoutStage,
  hasStandingsStage,
  parseFormatConfig,
} from "@/lib/tournament-format";

const LEGACY_TABS = [
  { id: "overview", label: "Overview" },
  { id: "players", label: "Players" },
  { id: "fixtures", label: "Fixtures" },
  { id: "verify", label: "Verify" },
  { id: "standings", label: "Standings" },
  { id: "settings", label: "Settings" },
] as const;

const BR_TABS = [
  { id: "overview", label: "Overview" },
  { id: "players", label: "Participants" },
  { id: "rounds", label: "Rounds & Results" },
  { id: "settings", label: "Settings" },
] as const;

const MLBB_EA_TABS = [
  { id: "overview", label: "Overview" },
  { id: "players", label: "Participants" },
  { id: "fixtures", label: "Fixtures / Series" },
  { id: "standings", label: "Standings" },
  { id: "settings", label: "Settings" },
] as const;

interface Props {
  tournament: Tournament;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function TournamentManager({ tournament: initial }: Props) {
  const [tournament, setTournament] = useState(initial);
  const [tab, setTab] = useState<string>("overview");
  const data = useTournamentData(tournament.id, true);
  const game = getGame(tournament.game);
  const br = isBattleRoyale(tournament.game);

  const formatCfg = useMemo(
    () => parseFormatConfig(tournament.format_config, tournament.bracket_type),
    [tournament.format_config, tournament.bracket_type],
  );
  const showStandings = hasStandingsStage(formatCfg);
  const showBracket = hasKnockoutStage(formatCfg);

  const tabs = useMemo(() => {
    if (game.usesLegacyEngine) {
      return LEGACY_TABS.filter((t) => {
        if (t.id === "standings") return showStandings;
        return true;
      }).concat(
        showBracket && !LEGACY_TABS.some((t) => t.id === "bracket")
          ? ([{ id: "bracket" as const, label: "Bracket" }] as const)
          : [],
      );
    }
    if (br) return BR_TABS;
    return MLBB_EA_TABS.filter((t) => {
      if (t.id === "standings") return showStandings;
      return true;
    });
  }, [game.usesLegacyEngine, br, showStandings, showBracket]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <GameBadge gameId={tournament.game} />
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          Manage · {tournament.status.replace(/_/g, " ")} · {game.shortName}
        </p>
      </div>

      <div className="glass overflow-x-auto rounded-2xl p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm transition",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {data.loading &&
      data.matches.length === 0 &&
      data.players.length === 0 ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          {tab === "overview" && (
            <OverviewTab tournament={tournament} data={data} goTab={setTab} />
          )}
          {tab === "players" && (
            <PlayersTab tournament={tournament} data={data} />
          )}
          {tab === "rounds" && br && <BrRoundsTab tournament={tournament} />}
          {(tab === "fixtures" || tab === "bracket") && (
            <FixturesTab tournament={tournament} data={data} />
          )}
          {tab === "verify" && (
            <VerificationsTab tournament={tournament} data={data} />
          )}
          {tab === "standings" && showStandings && (
            <StandingsTab tournament={tournament} data={data} />
          )}
          {tab === "settings" && (
            <SettingsTab tournament={tournament} onPatched={setTournament} />
          )}
        </div>
      )}
    </div>
  );
}
