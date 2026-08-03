import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, type Match, type Tournament, type TournamentParticipant } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { matchdayName, type TournamentData } from "./shared";
import { cn } from "@/lib/utils";

function getPlayer(data: TournamentData, id: string | null): TournamentParticipant | undefined {
  if (!id) return undefined;
  return data.players.find((p) => p.id === id);
}

function sideLabel(p: TournamentParticipant | undefined): string {
  if (!p) return "TBD";
  return p.club?.trim() || p.player_name;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeName =
    selected && groups.some(([n]) => n === selected) ? selected : groups[0]?.[0] ?? null;
  const activeMatches = groups.find(([n]) => n === activeName)?.[1] ?? [];

  const selectMatchday = (name: string) => {
    setSelected(name);
    tabRefs.current.get(name)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const activeIdx = groups.findIndex(([n]) => n === activeName);

  const prevMatchday = () => {
    if (activeIdx > 0) {
      selectMatchday(groups[activeIdx - 1][0]);
    }
  };

  const nextMatchday = () => {
    if (activeIdx < groups.length - 1) {
      selectMatchday(groups[activeIdx + 1][0]);
    }
  };

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
      {/* Matchdays Navigation Toolbar */}
      <div className="flex items-center gap-1.5 max-w-[380px] mx-auto">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          disabled={activeIdx <= 0}
          onClick={prevMatchday}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1"
        >
          {groups.map(([name, matches]) => {
            const played = matches.filter((m) => m.played).length;
            const isActive = name === activeName;
            return (
              <button
                key={name}
                ref={(el) => {
                  if (el) tabRefs.current.set(name, el);
                  else tabRefs.current.delete(name);
                }}
                type="button"
                onClick={() => selectMatchday(name)}
                className={cn(
                  "flex shrink-0 min-w-[100px] snap-center flex-col items-center rounded-xl border px-3 py-2 text-center transition",
                  isActive
                    ? "border-brand bg-brand/15 shadow-sm"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/50",
                )}
              >
                <div className={cn("text-xs font-semibold truncate w-full", isActive && "text-brand-glow")}>
                  {name}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {played}/{matches.length} played
                </div>
              </button>
            );
          })}
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          disabled={activeIdx >= groups.length - 1}
          onClick={nextMatchday}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Matchday Matches List */}
      {activeName && (
        <div className="glass flex flex-col w-full max-w-[420px] mx-auto rounded-2xl p-4 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
            <h3 className="text-sm font-semibold truncate">{activeName}</h3>
            <span className="text-xs text-muted-foreground">
              {activeMatches.filter((m) => m.played).length} / {activeMatches.length} Finished
            </span>
          </div>

          <div className="space-y-3">
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
        </div>
      )}
    </div>
  );
}

function ResultRow({
  match,
  homeLabel,
  awayLabel,
  homePhoto,
  awayPhoto,
  disabled,
  onSaved,
}: {
  match: Match;
  homeLabel: string;
  awayLabel: string;
  homePhoto: string | null;
  awayPhoto: string | null;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [hs, setHs] = useState(
    match.home_score != null ? String(match.home_score) : "",
  );
  const [ascore, setAscore] = useState(
    match.away_score != null ? String(match.away_score) : "",
  );
  const [saving, setSaving] = useState(false);

  // Sync state whenever match payload changes after save/reload
  useEffect(() => {
    setHs(match.home_score != null ? String(match.home_score) : "");
    setAscore(match.away_score != null ? String(match.away_score) : "");
  }, [match.home_score, match.away_score, match.id]);

  const save = async () => {
    if (disabled) return;
    setSaving(true);
    const played = hs !== "" && ascore !== "";
    const homeNum = hs === "" ? null : Number(hs);
    const awayNum = ascore === "" ? null : Number(ascore);

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: homeNum,
        away_score: awayNum,
        status: played ? "finished" : "scheduled",
        played,
      })
      .eq("id", match.id);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Result saved — standings updated");
    onSaved();
  };

  const clear = async () => {
    if (disabled) return;
    setSaving(true);
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: null,
        away_score: null,
        status: "scheduled",
        played: false,
      })
      .eq("id", match.id);

    setSaving(false);
    if (error) return toast.error(error.message);
    setHs("");
    setAscore("");
    toast.success("Result cleared");
    onSaved();
  };

  return (
    <div className={cn(
      "rounded-xl border border-border/60 p-3 space-y-2.5 transition",
      disabled && "opacity-50 pointer-events-none bg-secondary/10"
    )}>
      <div className="flex items-center gap-2">
        {/* Home Side */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
          <span className="text-xs font-semibold truncate text-right">{homeLabel}</span>
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={homePhoto ?? undefined} />
            <AvatarFallback className="bg-secondary text-[10px]">
              {homeLabel.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Input Controls */}
        <div className="flex items-center gap-1 shrink-0 px-1">
          <Input
            className="w-10 h-8 text-center px-0 text-sm font-bold shrink-0"
            inputMode="numeric"
            maxLength={2}
            value={hs}
            onChange={(e) => setHs(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={disabled || saving}
          />
          <span className="text-muted-foreground text-xs font-bold">-</span>
          <Input
            className="w-10 h-8 text-center px-0 text-sm font-bold shrink-0"
            inputMode="numeric"
            maxLength={2}
            value={ascore}
            onChange={(e) => setAscore(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={disabled || saving}
          />
        </div>

        {/* Away Side */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={awayPhoto ?? undefined} />
            <AvatarFallback className="bg-secondary text-[10px]">
              {awayLabel.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold truncate">{awayLabel}</span>
        </div>
      </div>

      {/* Row Footer Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <div>
          {match.played ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-normal px-2 py-0">
              Played
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground">Scheduled</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {match.played && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={clear}
              disabled={saving}
              title="Clear result"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-gradient-brand text-primary-foreground font-medium"
            onClick={save}
            disabled={disabled || saving}
          >
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
      }
