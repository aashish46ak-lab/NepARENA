import { useEffect, useMemo, useRef, useState } from "react";
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
import { SubmissionsReview } from "./ResultsTab";
import { KnockoutSetupPanel } from "./KnockoutSetupPanel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Shuffle,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import {
  matchdayName,
  normalizeMatchdayLabel,
  migrateLegacyMatchdayNames,
  recomputeStandings,
  type TournamentData,
} from "./shared";
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

async function publishAndNotify(
  tournament: Tournament,
  matchdayId: string,
  matchdayLabel: string,
  published: boolean,
  matches: Match[],
) {
  const { error } = await supabase
    .from("matchdays")
    .update({ is_published: published, notify_enabled: published })
    .eq("id", matchdayId);
  if (error) throw error;
  if (!published) return 0;
  const mdMatches = matches.filter((m) => m.matchday_id === matchdayId && !m.played);
  const partIds = [
    ...new Set(
      mdMatches.flatMap((m) => [m.home_id, m.away_id].filter(Boolean) as string[]),
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
    body: tournament.name + " — " + matchdayLabel + " is live. Check pending matches on your home page.",
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
  const [setupKoOpen, setSetupKoOpen] = useState(false);
  const approved = data.players.filter((p) => p.status === "approved");
  const fmtCfg = useMemo(
    () => parseFormatConfig(tournament.format_config, tournament.bracket_type),
    [tournament.format_config, tournament.bracket_type],
  );
  const canStartKnockout = hasGroupStage(fmtCfg);
  const knockoutStarted = !!fmtCfg.knockoutStarted;

  const setKnockoutStarted = async (on: boolean) => {
    setBusy(true);
    try {
      const next = { ...fmtCfg, knockoutStarted: on };
      const { error } = await supabase
        .from("tournaments")
        .update({ format_config: next })
        .eq("id", tournament.id);
      if (error) throw error;
      toast.success(on ? "Knockout started — bracket is now public" : "Knockout hidden from public");
      data.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const groups = useMemo(() => {
    type G = { id: string | null; name: string; matches: Match[]; sort: number };
    const map = new Map<string, G>();
    for (const m of data.matches) {
      const name = matchdayName(data.matchdays, m);
      const md = data.matchdays.find((d) => d.id === m.matchday_id);
      const existing = map.get(name);
      if (existing) {
        existing.matches.push(m);
        existing.sort = Math.min(existing.sort, md?.sort_order ?? 999);
      } else {
        map.set(name, {
          id: md?.id ?? m.matchday_id,
          name,
          matches: [m],
          sort: md?.sort_order ?? 999,
        });
      }
    }
    for (const md of data.matchdays) {
      const name = normalizeMatchdayLabel(md.name);
      if (!map.has(name)) {
        map.set(name, { id: md.id, name, matches: [], sort: md.sort_order ?? 999 });
      }
    }
    const stageOrder = (name: string): number => {
      const n = name.toLowerCase();
      const md = n.match(/matchday\s+(\d+)/);
      if (md) return Number(md[1]);
      if (n.includes("round of 32")) return 100;
      if (n.includes("round of 16")) return 110;
      if (n.includes("round of 8") || n.includes("quarter")) return 120;
      if (n.includes("semi")) return 130;
      if (n.includes("final") && !n.includes("third")) return 140;
      if (n.includes("third")) return 150;
      return 200 + (map.get(name)?.sort ?? 999);
    };
    return [...map.values()].sort((a, b) => stageOrder(a.name) - stageOrder(b.name) || a.sort - b.sort);
  }, [data.matches, data.matchdays]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const changed = await migrateLegacyMatchdayNames(tournament.id, data.matchdays, data.matches);
      if (changed && !cancelled) data.reload();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, data.matchdays.length]);

  const [selected, setSelected] = useState<string | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeName =
    selected && groups.some((g) => g.name === selected) ? selected : (groups[0]?.name ?? null);
  const activeGroup = groups.find((g) => g.name === activeName);
  const activeMatches = activeGroup?.matches ?? [];
  const activeMatchesByGroup = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of activeMatches) {
      const raw = (m as { group_key?: string | null }).group_key?.trim() || "";
      const key = !raw ? "" : raw.length === 1 ? `Group ${raw}` : raw.startsWith("Group") ? raw : `Group ${raw}`;
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "") return 1;
      if (b[0] === "") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [activeMatches]);
  const activeMdId = activeGroup?.id ?? null;
  const activeMd = data.matchdays.find((d) => d.id === activeMdId);
  const isPublished = !!activeMd?.is_published;
  const activeIdx = groups.findIndex((g) => g.name === activeName);

  const selectMatchday = (name: string) => {
    setSelected(name);
    tabRefs.current.get(name)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  const prevMatchday = () => { if (activeIdx > 0) selectMatchday(groups[activeIdx - 1]!.name); };
  const nextMatchday = () => { if (activeIdx < groups.length - 1) selectMatchday(groups[activeIdx + 1]!.name); };

  const generate = async () => {
    if (approved.length < 2) return toast.error("Need at least 2 approved players");
    if (data.matches.length > 0 && !confirm("Regenerating clears all existing fixtures and results. Continue?")) return;
    setBusy(true);
    try {
      await supabase.from("matches").delete().eq("tournament_id", tournament.id);
      await supabase.from("matchdays").delete().eq("tournament_id", tournament.id);
      const specs = generateFixturesForTournament(tournament, approved.map((p) => p.id));
      for (const s of specs) s.matchday = normalizeMatchdayLabel(s.matchday);
      const names = [...new Set(specs.map((s) => s.matchday))];
      const { data: mdRows, error: mdErr } = await supabase
        .from("matchdays")
        .insert(names.map((name, i) => ({ tournament_id: tournament.id, name, sort_order: i, is_published: false, notify_enabled: false })))
        .select();
      if (mdErr) throw mdErr;
      const mdId = new Map((mdRows ?? []).map((r: { id: string; name: string }) => [r.name, r.id]));
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
      toast.success(payload.length + " fixtures generated");
      void logActivity("fixtures.generate", { tournament: tournament.name, matches: payload.length });
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
      position: data.matches.filter((m) => m.round === (maxRound || 1)).length + 1,
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
      const n = await publishAndNotify(tournament, activeMdId, activeName, on, data.matches);
      toast.success(on ? activeName + " published" + (n ? " (" + n + ")" : "") : activeName + " unpublished");
      data.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setToggling(false);
    }
  };

  const [draftScores, setDraftScores] = useState<Record<string, { hs: string; as: string }>>({});
  const [savingMd, setSavingMd] = useState(false);

  useEffect(() => {
    const next: Record<string, { hs: string; as: string }> = {};
    for (const m of activeMatches) {
      next[m.id] = {
        hs: m.home_score != null ? String(m.home_score) : "",
        as: m.away_score != null ? String(m.away_score) : "",
      };
    }
    setDraftScores(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeName, activeMatches.map((m) => `${m.id}:${m.home_score}:${m.away_score}`).join("|")]);

  const setDraft = (id: string, side: "hs" | "as", value: string) => {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 3);
    setDraftScores((prev) => ({
      ...prev,
      [id]: {
        hs: side === "hs" ? clean : (prev[id]?.hs ?? ""),
        as: side === "as" ? clean : (prev[id]?.as ?? ""),
      },
    }));
  };

  const saveMatchday = async () => {
    if (!activeMatches.length) return toast.error("No matches in this matchday");
    setSavingMd(true);
    try {
      let n = 0;
      for (const m of activeMatches) {
        if (!m.home_id || !m.away_id) continue;
        const d = draftScores[m.id] ?? { hs: "", as: "" };
        const hs = d.hs.trim();
        const ascore = d.as.trim();
        if (hs === "" && ascore === "" && !m.played) continue;
        const played = hs !== "" && ascore !== "";
        const homeNum = hs === "" ? null : Number(hs);
        const awayNum = ascore === "" ? null : Number(ascore);
        if (played && (!Number.isFinite(homeNum!) || !Number.isFinite(awayNum!))) continue;
        const { error } = await supabase
          .from("matches")
          .update({ home_score: homeNum, away_score: awayNum, status: played ? "finished" : "scheduled", played })
          .eq("id", m.id);
        if (error) throw error;
        n++;
      }
      await recomputeStandings(tournament.id);
      toast.success(n ? `${activeName} saved · ${n} match(es) · standings updated` : "Nothing to save");
      void logActivity("result.save_matchday", { tournament: tournament.name, matchday: activeName, count: n });
      data.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingMd(false);
    }
  };

  const renderMatchRow = (m: Match) => {
    const homeP = getPlayer(data, m.home_id);
    const awayP = getPlayer(data, m.away_id);
    const homeLabel = sideLabel(homeP);
    const awayLabel = sideLabel(awayP);
    const homePhoto = sidePhoto(data, homeP);
    const awayPhoto = sidePhoto(data, awayP);
    const draft = draftScores[m.id] ?? { hs: "", as: "" };
    const disabled = !m.home_id || !m.away_id;
    return (
      <div key={m.id} className="space-y-2 rounded-xl border border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <span className="max-w-[100px] truncate text-right text-xs font-semibold">{homeLabel}</span>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={homePhoto ?? undefined} />
              <AvatarFallback className="bg-secondary text-[9px]">{homeLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Input className="h-8 w-11 px-0 text-center text-sm font-bold" inputMode="numeric" maxLength={3} placeholder="–" value={draft.hs} disabled={disabled || savingMd} onChange={(e) => setDraft(m.id, "hs", e.target.value)} />
            <span className="text-xs font-bold text-muted-foreground">-</span>
            <Input className="h-8 w-11 px-0 text-center text-sm font-bold" inputMode="numeric" maxLength={3} placeholder="–" value={draft.as} disabled={disabled || savingMd} onChange={(e) => setDraft(m.id, "as", e.target.value)} />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={awayPhoto ?? undefined} />
              <AvatarFallback className="bg-secondary text-[9px]">{awayLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate text-xs font-semibold">{awayLabel}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={() => void removeMatch(m)} title="Remove match">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {m.played ? (
          <p className="text-center text-[10px] font-medium text-emerald-400">Played</p>
        ) : disabled ? (
          <p className="text-center text-[10px] text-muted-foreground">TBD sides</p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate} disabled={busy} className="bg-gradient-brand text-primary-foreground">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4 mr-1.5" />}
          {data.matches.length ? "Regenerate fixtures" : "Generate fixtures"}
        </Button>
        {canStartKnockout && (
          <Button
            type="button"
            variant={knockoutStarted ? "outline" : "default"}
            className={!knockoutStarted ? "bg-gradient-brand text-primary-foreground" : ""}
            disabled={busy || data.matches.length === 0}
            onClick={() => setSetupKoOpen(true)}
          >
            <Trophy className="mr-1.5 h-4 w-4" />
            {knockoutStarted ? "Edit playoff seeds" : "Start playoffs"}
          </Button>
        )}
        {canStartKnockout && knockoutStarted && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold">
            <Switch checked={knockoutStarted} disabled={busy} onCheckedChange={(on) => { if (!on) void setKnockoutStarted(false); }} />
            <span className="text-emerald-300">Knockout live</span>
          </label>
        )}
        <Button type="button" variant="outline" disabled={busy || data.matches.length === 0} onClick={() => { setBusy(true); void advanceKnockoutWinners(tournament, data).catch((e) => toast.error(e instanceof Error ? e.message : "Advance failed")).finally(() => setBusy(false)); }}>
          Advance KO winners
        </Button>
        <Button variant="secondary" onClick={addMatch} disabled={!activeMdId}>
          <Plus className="h-4 w-4 mr-1.5" /> Add match
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Format: {bracketLabel(tournament.bracket_type)} · {approved.length} players · {groups.length} matchdays
        </span>
      </div>

      {data.matches.length === 0 && groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No fixtures yet. Click <strong>Generate fixtures</strong>.
        </div>
      ) : (
        <>
          <div className="mx-auto flex max-w-[420px] items-center gap-1.5">
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={activeIdx <= 0} onClick={prevMatchday}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-1 gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
              {groups.map((g) => {
                const played = g.matches.filter((m) => m.played).length;
                const isActive = g.name === activeName;
                const pub = !!data.matchdays.find((d) => d.id === g.id)?.is_published;
                return (
                  <button key={g.name} ref={(el) => { if (el) tabRefs.current.set(g.name, el); else tabRefs.current.delete(g.name); }} type="button" onClick={() => selectMatchday(g.name)} className={cn("flex min-w-[100px] shrink-0 snap-center flex-col items-center rounded-xl border px-3 py-2 text-center transition", isActive ? "border-brand bg-brand/15" : "border-border/60 bg-secondary/30 hover:bg-secondary/50")}>
                    <div className={cn("w-full truncate text-xs font-semibold", isActive && "text-brand-glow")}>{g.name}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{played}/{g.matches.length}{pub ? " · Live" : " · Draft"}</div>
                  </button>
                );
              })}
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={activeIdx >= groups.length - 1} onClick={nextMatchday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {activeName && (
            <div className="glass mx-auto w-full max-w-[420px] space-y-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                <h3 className="truncate text-sm font-semibold">{activeName}</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-8 gap-1 bg-gradient-brand px-3 text-xs font-semibold text-primary-foreground" disabled={savingMd || activeMatches.length === 0} onClick={() => void saveMatchday()}>
                    {savingMd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save matchday
                  </Button>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <Switch checked={isPublished} disabled={toggling || !activeMdId} onCheckedChange={(on) => void onPublishToggle(on)} />
                    {isPublished ? "Published" : "Publish"}
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                {activeMatches.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No matches in this matchday.</p>
                ) : (
                  activeMatchesByGroup.flatMap(([gKey, gMatches]) => [
                    ...(gKey
                      ? [
                          <div key={`g-${gKey}`} className="flex items-center gap-2 pt-2 first:pt-0">
                            <span className="h-px flex-1 bg-border/50" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-glow">{gKey}</span>
                            <span className="h-px flex-1 bg-border/50" />
                          </div>,
                        ]
                      : []),
                    ...gMatches.map((m) => renderMatchRow(m)),
                  ])
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-6 space-y-2 border-t border-border/50 pt-4">
        <SubmissionsReview tournament={tournament} data={data} />
      </div>

      <KnockoutSetupPanel
        tournament={tournament}
        data={data}
        open={setupKoOpen}
        onClose={() => setSetupKoOpen(false)}
      />
    </div>
  );
}
