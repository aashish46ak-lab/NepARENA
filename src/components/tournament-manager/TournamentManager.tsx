import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import type { Tournament } from "@/lib/supabase";
import { useTournamentData } from "./shared";
import { OverviewTab } from "./OverviewTab";
import { PlayersTab } from "./PlayersTab";
import { InvitationsTab } from "./InvitationsTab";
import { FixturesTab } from "./FixturesTab";
import { ResultsTab } from "./ResultsTab";
import { StandingsTab } from "./StandingsTab";
import { SettingsTab } from "./SettingsTab";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "players", label: "Players" },
  { value: "invitations", label: "Invitations" },
  { value: "fixtures", label: "Fixtures" },
  { value: "results", label: "Results" },
  { value: "standings", label: "Standings" },
  { value: "settings", label: "Settings" },
];

export function TournamentManager({
  tournament,
  open,
  onOpenChange,
  inline = false,
}: {
  tournament: Tournament;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  /** render as a page section instead of a dialog */
  inline?: boolean;
}) {
  const [tab, setTab] = useState("overview");
  const [current, setCurrent] = useState(tournament);
  const data = useTournamentData(tournament.id, inline || !!open);

  const body = data.loading ? (
    <div className="flex justify-center p-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ) : (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex flex-wrap h-auto gap-1">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab tournament={current} data={data} goTab={setTab} />
      </TabsContent>
      <TabsContent value="players">
        <PlayersTab tournament={current} data={data} />
      </TabsContent>
      <TabsContent value="invitations">
        <InvitationsTab tournament={current} data={data} />
      </TabsContent>
      <TabsContent value="fixtures">
        <FixturesTab tournament={current} data={data} />
      </TabsContent>
      <TabsContent value="results">
        <ResultsTab tournament={current} data={data} />
      </TabsContent>
      {/* 🟢 EXACT FIX HERE: tournament={current} PASS GARIEKO CHHA */}
      <TabsContent value="standings">
        <StandingsTab tournament={current} data={data} />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsTab tournament={current} onPatched={setCurrent} />
      </TabsContent>
    </Tabs>
  );

  if (inline) {
    return (
      <div className="glass rounded-3xl p-4 sm:p-6">
        <h1 className="text-xl font-bold mb-4">🏆 {current.name}</h1>
        {body}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🏆 {current.name}</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
          }
      
