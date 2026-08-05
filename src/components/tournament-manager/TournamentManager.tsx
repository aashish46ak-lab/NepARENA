import { useState } from "react";
import type { Tournament } from "@/lib/supabase";
import { useTournamentData } from "./shared";
import { OverviewTab } from "./OverviewTab";
import { PlayersTab } from "./PlayersTab";
import { FixturesTab } from "./FixturesTab";
import { ResultsTab } from "./ResultsTab";
import { StandingsTab } from "./StandingsTab";
import { InvitationsTab } from "./InvitationsTab";
import { SettingsTab } from "./SettingsTab";
import { VerificationsTab } from "./VerificationsTab";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "players", label: "Players" },
  { id: "fixtures", label: "Fixtures" },
  { id: "results", label: "Results" },
  { id: "verify", label: "Verify" },
  { id: "standings", label: "Standings" },
  { id: "invitations", label: "Invitations" },
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <p className="text-sm text-muted-foreground capitalize">
          Manage · {tournament.status.replace(/_/g, " ")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 glass rounded-2xl p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
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
          {tab === "fixtures" && (
            <FixturesTab tournament={tournament} data={data} />
          )}
          {tab === "results" && (
            <ResultsTab tournament={tournament} data={data} />
          )}
          {tab === "verify" && (
            <VerificationsTab tournament={tournament} data={data} />
          )}
          {tab === "standings" && (
            <StandingsTab tournament={tournament} data={data} />
          )}
          {tab === "invitations" && (
            <InvitationsTab tournament={tournament} data={data} />
          )}
          {tab === "settings" && (
            <SettingsTab tournament={tournament} onPatched={setTournament} />
          )}
        </div>
      )}
    </div>
  );
}
