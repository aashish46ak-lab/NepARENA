import { useMemo, useState } from "react";
import { supabase, type Match, type Tournament, type TournamentParticipant } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { matchdayName, type TournamentData } from "./shared";
import { cn } from "@/lib/utils";

function getPlayer(data: TournamentData, id: string | null): TournamentParticipant | undefined {
  if (!id) return undefined;
  return data.players.find((p) => p.id === id);
}

function sideLabel(p: TournamentParticipant | undefined): string {
  if (!p) return "TBD";
  const club = p.club?.trim();
  return club || p.player_name;
}

function sidePhoto(data: TournamentData, p: TournamentParticipant | undefined): string | null {
  if (!p) return null;
  if (p.photo_url) return p.photo_url;
  if (p.user_id) return data.profiles.get(p.user_id)?.avatar_url ?? null;
  return null;
}

export function ResultsTab({ tournament, data }: { tournament: Tournament; data: TournamentData }) {
  const groups = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of data.matches) {
      const key = matchdayName(data.matchdays, m);
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [data.matches, data.matchdays]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeName =
    selected && groups.some(([n]) => n === selected) ? selected : groups[0]?.[0] ?? null;
  const activeMatches = groups.find(([n]) => n === activeName)?.[1] ?? [];

  if (data.matches.length === 0) {
    return (
      <div className="pt-4">
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Generate fixtures first to enter results.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Compact matchday chips */}
      <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1">
        <div className="flex gap-2">
          {groups.map(([name, matches]) => {
            const played = matches.filter((m) => m.played).length;
            const isActive = name === activeName;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                className={cn(
                  "snap-start shrink-0 w-auto rounded-xl border px-3 py-2 text-left transition whitespace-nowrap",
                  isActive
                    ? "border-brand bg-brand/15"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/50",
                )}
              >
                <div className={cn("text-sm font-semibold", isActive && "text-brand-glow")}>
                  {name}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {played}/{matches.length} played
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeName && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-semibold mb-1">{activeName}</h3>
          {activeMatches.map((m) => {
            const homeP = getPlayer(data, m.home_id);
            const awayP = getPlayer(data, m.away_id);
            return (
              <ResultRow
                key={m.id}
                match={m}
                homeLabel={sideLabel(homeP)}
                awayLabel={sideLabel(awayP)}
                homePhoto={sidePhoto(data, homeP)}
                awayPhoto={sidePhoto(data, awayP)}
                disabled={!m.home_id || !m.away_id}
                onSaved={() => {
                  void logActivity("result.save", { tournament: tournament.name, match: m.id });
                  data.reload();
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultRow({
  match, homeLabel, awayLabel, homePhoto, awayPhoto, disabled, onSaved,
}: {
  match: Match;
  homeLabel: string;
  awayLabel: string;
  homePhoto: string | null;
  awayPhoto: string | null;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [hs, setHs] = useState(match.home_score?.toString() ?? "");
  const [as, setAs] = useState(match.away_score?.toString() ?? "");

  const save = async () => {
    const played = hs !== "" && as !== "";
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: hs === "" ? null : Number(hs),
        away_score: as === "" ? null : Number(as),
        status: played ? "finished" : "scheduled",
        played,
      })
      .eq("id", match.id);
    if (error) return toast.error(error.message);
    toast.success("Result saved — standings updated");
    onSaved();
  };

  const clear = async () => {
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: null,
        away_score: null,
        status: "scheduled",
        played: false,
      })
      .eq("id", match.id);
    if (error) return toast.error(error.message);
    setHs("");
    setAs("");
    toast.success("Result cleared");
    onSaved();
  };

  return (
    <div className={`rounded-xl border border-border/60 p-3 space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="text-sm font-semibold truncate max-w-[120px] text-right">{homeLabel}</span>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={homePhoto ?? undefined} />
            <AvatarFallback className="bg-secondary text-[10px]">{homeLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        <Input
          className="w-12 h-8 text-center shrink-0"
          inputMode="numeric"
          placeholder=""
          value={hs}
          onChange={(e) => setHs(e.target.value)}
          disabled={disabled}
        />
        <span className="text-muted-foreground text-xs">-</span>
        <Input
          className="w-12 h-8 text-center shrink-0"
          inputMode="numeric"
          placeholder=""
          value={as}
          onChange={(e) => setAs(e.target.value)}
          disabled={disabled}
        />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={awayPhoto ?? undefined} />
            <AvatarFallback className="bg-secondary text-[10px]">{awayLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold truncate max-w-[120px]">{awayLabel}</span>
        </div>

        {match.played && (
          <Badge className="bg-emerald-500/20 text-emerald-300 shrink-0 text-[10px]">played</Badge>
        )}
      </div>

      <div className="flex justify-end gap-1.5">
        {match.played && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clear} title="Clear result">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="sm" className="h-8 bg-gradient-brand text-primary-foreground" onClick={save} disabled={disabled}>
          <Save className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
        }
