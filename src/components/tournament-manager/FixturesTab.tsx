import { useMemo, useRef, useState } from "react";
import {
  supabase,
  type Match,
  type Tournament,
  type TournamentParticipant,
} from "@/lib/supabase";
import {
  generateFixturesForTournament,
  bracketLabel,
} from "@/lib/brackets";
import { parseFormatConfig, hasGroupStage } from "@/lib/tournament-format";
import { seedKnockoutFromGroups, advanceKnockoutWinners } from "@/lib/seed-knockout";
import { logActivity } from "@/lib/activity";
import { ResultsTab } from "./ResultsTab";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Shuffle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { matchdayName, type TournamentData } from "./shared";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

interface Props {
  tournament: Tournament;
  data: TournamentData;
}

function getPlayer(
  data: TournamentData,
  id: string | null,
): TournamentParticipant | undefined {
  if (!id) return undefined;
  return data.players.find((p) => p.id === id);
}

function sideLabel(p: TournamentParticipant | undefined): string {
  if (!p) return "TBD";
  return p.club?.trim() || p.player_name;
}

function sidePhoto(
  data: TournamentData,
  p: TournamentParticipant | undefined,
): string | null {
  if (!p) return null;
  if (p.photo_url) return p.photo_url;
  if (p.user_id) return data.profiles.get(p.user_id)?.avatar_url ?? null;
  return null;
}

function scoreText(m: Match): string {
  if (!m.played) return "";
  const hs = Number(m.home_score);
  const ascore = Number(m.away_score);
  if (!Number.isFinite(hs) || !Number.isFinite(ascore)) return "";
  return String(hs) + "-" + String(ascore);
}

async function publishAndNotify(
  tournament: Tournament,
  matchdayId: string,
  matchdayLabel: string,
  published: boolean,
  matches: Match[],
) {
  const { error } = await supabase
    .from("matchdays")
    .update({
      is_published: published,
      notify_enabled: published,
    })
    .eq("id", matchdayId);
  if (error) throw error;

  if (!published) return 0;

  const mdMatches = matches.filter(
    (m) => m.matchday_id === matchdayId && !m.played,
  );
  const partIds = [
    ...new Set(
      mdMatches.flatMap((m) =>
        [m.home_id, m.away_id].filter(Boolean),
      ) as string[],
    ),
  ];
  if (partIds.length === 0) return 0;

  const { data: parts } = await supabase
    .from("tournament_participants")
    .select("id, user_id")
    .in("id", partIds)
    .eq("status", "approved");

  const userIds = [
    ...new Set(
      ((parts ?? []) as { user_id: string | null }[])
        .map((p) => p.user_id)
        .filter(Boolean) as string[],
    ),
  ];
  if (userIds.length === 0) return 0;

  const rows = userIds.map((user_id) => ({
    user_id,
    title: "Fixtures published",
    body:
      tournament.name +
      " — " +
      matchdayLabel +
      " is live. Check pending matches on your home page.",
    type: "match",
    link: "/#pending-matches",
  }));

  const { error: nErr } = await supabase.from("notifications").insert(rows);
  if (nErr) throw nErr;
  return rows.length;
}

export function FixturesTab({ tournament, data }: Props) {
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const settings = useSiteSettings();
  const approved = data.players.filter((p) => p.status === "approved");

  const groups = useMemo(() => {
    type G = { id: string | null; name: string; matches: Match[] };
    const map = new Map<string, G>();
    for (const m of data.matches) {
      const name = matchdayName(data.matchdays, m);
      const md = data.matchdays.find((d) => d.id === m.matchday_id);
      const key = name;
      const existing = map.get(key);
      if (existing) {
        existing.matches.push(m);
      } else {
        map.set(key, {
          id: md?.id ?? m.matchday_id,
          name,
          matches: [m],
        });
      }
    }
    for (const md of data.matchdays) {
      if (!map.has(md.name)) {
        map.set(md.name, { id: md.id, name: md.name, matches: [] });
      }
    }
    return [...map.values()].sort((a, b) => {
      const oa =
        data.matchdays.find((d) => d.id === a.id)?.sort_order ?? 999;
      const ob =
        data.matchdays.find((d) => d.id === b.id)?.sort_order ?? 999;
      return oa - ob;
    });
  }, [data.matches, data.matchdays]);

  const [selected, setSelected] = useState<string | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeName =
    selected && groups.some((g) => g.name === selected)
      ? selected
      : groups[0]?.name ?? null;
  const activeGroup = groups.find((g) => g.name === activeName);
  const activeMatches = activeGroup?.matches ?? [];
  const activeMdId = activeGroup?.id ?? null;
  const activeMd = data.matchdays.find((d) => d.id === activeMdId);
  const isPublished = !!activeMd?.is_published;

  const activeIdx = groups.findIndex((g) => g.name === activeName);

  const selectMatchday = (name: string) => {
    setSelected(name);
    tabRefs.current
      .get(name)
      ?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
  };

  const prevMatchday = () => {
    if (activeIdx > 0) selectMatchday(groups[activeIdx - 1].name);
  };
  const nextMatchday = () => {
    if (activeIdx < groups.length - 1)
      selectMatchday(groups[activeIdx + 1].name);
  };

  const generate = async () => {
    if (approved.length < 2)
      return toast.error("Need at least 2 approved players");
    if (
      data.matches.length > 0 &&
      !confirm(
        "Regenerating clears all existing fixtures and results. Continue?",
      )
    )
      return;

    setBusy(true);
    try {
      await supabase.from("matches").delete().eq("tournament_id", tournament.id);
      await supabase
        .from("matchdays")
        .delete()
        .eq("tournament_id", tournament.id);

      const specs = generateFixturesForTournament(
        tournament,
        approved.map((p) => p.id),
      );

      const names = [...new Set(specs.map((s) => s.matchday))];
      const { data: mdRows, error: mdErr } = await supabase
        .from("matchdays")
        .insert(
          names.map((name, i) => ({
            tournament_id: tournament.id,
            name,
            sort_order: i,
            is_published: false,
            notify_enabled: false,
          })),
        )
        .select();

      if (mdErr) throw mdErr;

      const mdId = new Map(
        (mdRows ?? []).map((r: { id: string; name: string }) => [
          r.name,
          r.id,
        ]),
      );

      const payload = specs.map((s, i) => ({
        tournament_id: tournament.id,
        matchday_id: mdId.get(s.matchday) ?? null,
        round: s.round,
        position: s.position ?? i + 1,
        home_id: s.home_id,
        away_id: s.away_id,
        played: false,
        status: "scheduled",
        stage_id: s.stage_id ?? null,
        stage_type: s.stage_type ?? null,
        group_key: s.group_key ?? null,
        leg: s.leg ?? 1,
        series_key: s.series_key ?? null,
      }));

      const { error } = await supabase.from("matches").insert(payload);
      if (error) throw error;

      const fmt = parseFormatConfig(
        tournament.format_config,
        tournament.bracket_type,
      );
      toast.success(
        payload.length +
          " fixtures generated (" +
          bracketLabel(tournament.bracket_type ?? fmt.preset) +
          "). All matchdays are unpublished until you toggle Publish.",
      );
      void logActivity("fixtures.generate", {
        tournament: tournament.name,
        matches: payload.length,
      });
      setSelected(null);
      data.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  };

  const removeMatch = async (m: Match) => {
    const { error } = await supabase.from("matches").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    data.reload();
  };

  const addMatch = async () => {
    const maxRound = Math.max(0, ...data.matches.map((m) => m.round ?? 0));
    const { error } = await supabase.from("matches").insert({
      tournament_id: tournament.id,
      matchday_id: activeMdId,
      round: maxRound || 1,
      position:
        data.matches.filter((m) => m.round === (maxRound || 1)).length + 1,
      home_id: null,
      away_id: null,
      played: false,
      status: "scheduled",
    });
    if (error) return toast.error(error.message);
    data.reload();
  };

  const onPublishToggle = async (on: boolean) => {
    if (!activeMdId || !activeName) {
      toast.error("Select a matchday first");
      return;
    }
    setToggling(true);
    try {
      const n = await publishAndNotify(
        tournament,
        activeMdId,
        activeName,
        on,
        data.matches,
      );
      toast.success(
        on
          ? activeName +
              " published to public & players notified" +
              (n ? " (" + n + ")" : "")
          : activeName + " unpublished — locked for public",
      );
      data.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={generate}
          disabled={busy}
          className="bg-gradient-brand text-primary-foreground"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Shuffle className="h-4 w-4 mr-1.5" />
          )}
          {data.matches.length ? "Regenerate fixtures" : "Generate fixtures"}
        </Button>
        {hasGroupStage(
          parseFormatConfig(tournament.format_config, tournament.bracket_type),
        ) && (
          <Button
            type="button"
            variant="outline"
            disabled={busy || data.matches.length === 0}
            onClick={() => {
              setBusy(true);
              void seedKnockoutFromGroups(tournament, data)
                .catch((e) =>
                  toast.error(e instanceof Error ? e.message : "Seed failed"),
                )
                .finally(() => setBusy(false));
            }}
            title="Fill first knockout round from group tables (A1 vs B2)"
          >
            Seed knockout from groups
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={busy || data.matches.length === 0}
          onClick={() => {
            setBusy(true);
            void advanceKnockoutWinners(tournament, data)
              .catch((e) =>
                toast.error(e instanceof Error ? e.message : "Advance failed"),
              )
              .finally(() => setBusy(false));
          }}
          title="Push match winners into the next knockout round"
        >
          Advance KO winners
        </Button>
        <Button variant="secondary" onClick={addMatch} disabled={!activeMdId}>
          <Plus className="h-4 w-4 mr-1.5" /> Add match
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Format: {bracketLabel(tournament.bracket_type)} · {approved.length}{" "}
          players · {groups.length} matchdays
        </span>
      </div>

      {data.matches.length === 0 && groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No fixtures yet. Click <strong>Generate fixtures</strong>. Matchdays
          stay unpublished until you turn Publish on.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 max-w-[420px] mx-auto">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              disabled={activeIdx <= 0}
              onClick={prevMatchday}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex flex-1 gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
              {groups.map((g) => {
                const played = g.matches.filter((m) => m.played).length;
                const isActive = g.name === activeName;
                const pub = !!data.matchdays.find((d) => d.id === g.id)
                  ?.is_published;
                return (
                  <button
                    key={g.name}
                    ref={(el) => {
                      if (el) tabRefs.current.set(g.name, el);
                      else tabRefs.current.delete(g.name);
                    }}
                    type="button"
                    onClick={() => selectMatchday(g.name)}
                    className={cn(
                      "flex shrink-0 min-w-[100px] snap-center flex-col items-center rounded-xl border px-3 py-2 text-center transition",
                      isActive
                        ? "border-brand bg-brand/15"
                        : "border-border/60 bg-secondary/30 hover:bg-secondary/50",
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-semibold truncate w-full",
                        isActive && "text-brand-glow",
                      )}
                    >
                      {g.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {String(played) + "/" + String(g.matches.length)}
                      {pub ? " · Live" : " · Draft"}
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              disabled={activeIdx >= groups.length - 1}
              onClick={nextMatchday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {activeName && (
            <div className="glass w-full max-w-[420px] mx-auto rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                <h3 className="text-sm font-semibold truncate">{activeName}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Switch
                      checked={isPublished}
                      disabled={toggling || !activeMdId}
                      onCheckedChange={(on) => void onPublishToggle(on)}
                    />
                    {isPublished ? "Published" : "Publish"}
                  </label>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                {isPublished
                  ? "Visible on public tournament page + pending matches for players."
                  : "Draft — public sees this matchday locked/blurred. Players do not get pending yet."}
              </p>

              <div className="space-y-2">
                {activeMatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No matches in this matchday.
                  </p>
                ) : (
                  activeMatches.map((m) => {
                    const homeP = getPlayer(data, m.home_id);
                    const awayP = getPlayer(data, m.away_id);
                    const homeLabel = sideLabel(homeP);
                    const awayLabel = sideLabel(awayP);
                    const homePhoto = sidePhoto(data, homeP);
                    const awayPhoto = sidePhoto(data, awayP);
                    const score = scoreText(m);

                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                          <span className="text-sm font-semibold truncate max-w-[120px] text-right">
                            {homeLabel}
                          </span>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={homePhoto ?? undefined} />
                            <AvatarFallback className="bg-secondary text-[10px]">
                              {homeLabel.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="w-14 shrink-0 text-center text-sm font-bold text-brand-glow">
                          {score || "\u00A0"}
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={awayPhoto ?? undefined} />
                            <AvatarFallback className="bg-secondary text-[10px]">
                              {awayLabel.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold truncate max-w-[120px]">
                            {awayLabel}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-muted-foreground"
                          onClick={() => removeMatch(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-6 space-y-2 border-t border-border/50 pt-4">
        <h3 className="text-sm font-semibold">Manual results</h3>
        <p className="text-xs text-muted-foreground">Update match scores here.</p>
        <ResultsTab tournament={tournament} data={data} />
      </div>
    </div>
  );
}
