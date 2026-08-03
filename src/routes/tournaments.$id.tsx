import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Calendar, Users, ShieldAlert, List, Table2, FileText,
  Award, Loader2, ExternalLink, UserPlus, CheckCircle2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { SmartImage } from "@/components/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  supabase,
  type Tournament, type TournamentParticipant, type Match, type Matchday,
} from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sortStandings, type StandingRow } from "@/components/tournament-manager/shared";

export const Route = createFileRoute("/tournaments/$id")({
  head: () => ({
    meta: [
      { title: "Tournament — eFootball Nepal" },
      { name: "description", content: "Tournament standings, fixtures, rules and registration for eFootball Nepal competitions." },
      { property: "og:title", content: "Tournament — eFootball Nepal" },
      { property: "og:description", content: "Tournament standings, fixtures, rules and registration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TournamentDetailPage,
});

const TABS = [
  { id: "overview", label: "Overview", icon: Trophy },
  { id: "standings", label: "Standings", icon: Table2 },
  { id: "fixtures", label: "Fixtures", icon: List },
  { id: "rules", label: "Rules", icon: FileText },
  { id: "report", label: "Report", icon: ShieldAlert },
] as const;

function TournamentDetailPage() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<string>("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["public_tournament", id],
    queryFn: async () => {
      const [t, p, m, md, s] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
        supabase.from("tournament_participants").select("*").eq("tournament_id", id).eq("status", "approved").order("created_at"),
        supabase.from("matches").select("*").eq("tournament_id", id).order("round").order("position"),
        supabase.from("matchdays").select("*").eq("tournament_id", id).order("sort_order"),
        supabase.from("tournament_standings").select("*").eq("tournament_id", id),
      ]);
      return {
        tournament: (t.data as Tournament | null) ?? null,
        players: (p.data ?? []) as TournamentParticipant[],
        matches: (m.data ?? []) as Match[],
        matchdays: (md.data ?? []) as Matchday[],
        standings: sortStandings((s.data ?? []) as StandingRow[]),
      };
    },
  });

  if (isLoading || !data) {
    return (
      <PageShell>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  const { tournament, players, matches, matchdays, standings } = data;

  if (!tournament) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl py-24 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Tournament not found</h1>
          <Button asChild className="mt-6 bg-gradient-brand">
            <Link to="/tournaments">Browse tournaments</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
        <div className="glass overflow-hidden rounded-3xl">
          {tournament.banner_url && (
            <SmartImage src={tournament.banner_url} alt={tournament.name} ratio="aspect-[21/9]" zoom={false} />
          )}
          <div className="flex flex-wrap items-center gap-4 p-6">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand">
              <Trophy className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold md:text-3xl">{tournament.name}</h1>
                <Badge className="bg-brand/25 text-brand-glow capitalize">
                  {tournament.status.replace(/_/g, " ")}
                </Badge>
                {tournament.registration_open && (
                  <Badge className="bg-emerald-500/20 text-emerald-300">Registration open</Badge>
                )}
              </div>
              {tournament.description && (
                <p className="mt-1 text-sm text-muted-foreground">{tournament.description}</p>
              )}
            </div>
            {tournament.registration_open && <RegisterButton tournament={tournament} players={players} />}
          </div>
        </div>

        <div className="glass flex flex-wrap gap-2 rounded-2xl p-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition",
                tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl p-6">
          {tab === "overview" && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <Info icon={<Users className="h-5 w-5 text-brand-glow" />} title="Players" value={players.length} />
              <Info
                icon={<Calendar className="h-5 w-5 text-brand-glow" />}
                title="Starts"
                value={tournament.starts_at ? new Date(tournament.starts_at).toLocaleDateString() : "—"}
              />
              <Info icon={<Award className="h-5 w-5 text-brand-glow" />} title="Prize Pool" value={tournament.prize_pool || "—"} />
              <Info
                icon={<List className="h-5 w-5 text-brand-glow" />}
                title="Matches"
                value={`${matches.filter((m) => m.played).length} / ${matches.length}`}
              />
            </div>
          )}

          {tab === "standings" && (
            <div>
              <h2 className="mb-5 text-xl font-bold">Standings</h2>
              {standings.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Standings appear once matches are played.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="p-3">#</th>
                        <th className="p-3">Player</th>
                        <th className="p-3 text-center">MP</th>
                        <th className="p-3 text-center">W</th>
                        <th className="p-3 text-center">D</th>
                        <th className="p-3 text-center">L</th>
                        <th className="p-3 text-center">GF</th>
                        <th className="p-3 text-center">GA</th>
                        <th className="p-3 text-center">GD</th>
                        <th className="p-3 text-center font-bold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr key={s.participant_id} className="border-b border-border/40">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">{s.player_name}</td>
                          <td className="p-3 text-center">{s.played}</td>
                          <td className="p-3 text-center">{s.won}</td>
                          <td className="p-3 text-center">{s.drawn}</td>
                          <td className="p-3 text-center">{s.lost}</td>
                          <td className="p-3 text-center">{s.goals_for}</td>
                          <td className="p-3 text-center">{s.goals_against}</td>
                          <td className="p-3 text-center">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
                          <td className="p-3 text-center font-bold text-brand-glow">{s.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "fixtures" && (
            <PublicFixtures matches={matches} matchdays={matchdays} players={players} />
          )}

          {tab === "rules" && (
            <div>
              <h2 className="mb-4 text-xl font-bold">Tournament Rules</h2>
              {tournament.rules_text ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {tournament.rules_text}
                </p>
              ) : tournament.rules_url ? (
                <Button asChild variant="outline">
                  <a href={tournament.rules_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> View rules document
                  </a>
                </Button>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Rules for this tournament haven't been published yet.
                </p>
              )}
              {tournament.rules_text && tournament.rules_url && (
                <Button asChild variant="outline" className="mt-4">
                  <a href={tournament.rules_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Full rules document
                  </a>
                </Button>
              )}
            </div>
          )}

          {tab === "report" && <ReportForm tournament={tournament} players={players} />}
        </div>
      </div>
    </PageShell>
  );
}

function PublicFixtures({
  matches,
  matchdays,
  players,
}: {
  matches: Match[];
  matchdays: Matchday[];
  players: TournamentParticipant[];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const label =
        matchdays.find((d) => d.id === m.matchday_id)?.name ?? `Round ${m.round}`;
      map.set(label, [...(map.get(label) ?? []), m]);
    }
    return [...map.entries()];
  }, [matches, matchdays]);

  const [selected, setSelected] = useState<string | null>(null);
  const tabRefs = useState(() => new Map<string, HTMLButtonElement>())[0];

  const activeName =
    selected && groups.some(([n]) => n === selected) ? selected : groups[0]?.[0] ?? null;
  const activeMatches = groups.find(([n]) => n === activeName)?.[1] ?? [];

  const selectMatchday = (name: string) => {
    setSelected(name);
    tabRefs.get(name)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const labelOf = (id: string | null) => {
    if (!id) return "TBD";
    const p = players.find((x) => x.id === id);
    if (!p) return "TBD";
    return p.club?.trim() || p.player_name;
  };

  const photoOf = (id: string | null) => {
    if (!id) return null;
    const p = players.find((x) => x.id === id);
    return p?.photo_url ?? null;
  };

  if (matches.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Fixtures haven't been generated yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto flex w-full max-w-[340px] overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {groups.map(([name, list]) => {
          const played = list.filter((m) => m.played).length;
          const isActive = name === activeName;
          return (
            <button
              key={name}
              ref={(el) => {
                if (el) tabRefs.set(name, el);
                else tabRefs.delete(name);
              }}
              type="button"
              onClick={() => selectMatchday(name)}
              className={cn(
                "flex shrink-0 basis-1/3 snap-start flex-col items-center rounded-xl border px-3 py-2.5 text-center transition",
                isActive
                  ? "border-brand bg-brand/15"
                  : "border-border/60 bg-secondary/30 hover:bg-secondary/50",
              )}
            >
              <div className={cn("text-sm font-semibold truncate w-full", isActive && "text-brand-glow")}>
                {name}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {played}/{list.length} played
              </div>
            </button>
          );
        })}
      </div>

      {activeName && (
        <div className="glass inline-block w-full max-w-[340px] rounded-2xl p-4 space-y-2 overflow-hidden">
          <div className="space-y-2 overflow-x-auto">
          {activeMatches.map((m) => {
            const home = labelOf(m.home_id);
            const away = labelOf(m.away_id);
            const homePhoto = photoOf(m.home_id);
            const awayPhoto = photoOf(m.away_id);
            const score =
              m.played && m.home_score != null && m.away_score != null
                ? `${m.home_score}-${m.away_score}`
                : "";

            return (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                  <span className="text-sm font-semibold truncate max-w-[140px] text-right">{home}</span>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={homePhoto ?? undefined} />
                    <AvatarFallback className="bg-secondary text-[10px]">
                      {home.slice(0, 2).toUpperCase()}
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
                      {away.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold truncate max-w-[140px]">{away}</span>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ icon, title, value }: { icon: React.ReactNode; title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 p-5">
      {icon}
      <p className="mt-2 text-sm text-muted-foreground">{title}</p>
      <h3 className="text-xl font-bold">{value}</h3>
    </div>
  );
}

function RegisterButton({ tournament, players }: { tournament: Tournament; players: TournamentParticipant[] }) {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const existing = user ? players.find((p) => p.user_id === user.id) : undefined;

  if (!user) {
    return (
      <Button asChild className="bg-gradient-brand">
        <Link to="/auth">
          <UserPlus className="mr-2 h-4 w-4" /> Sign in to register
        </Link>
      </Button>
    );
  }
  if (existing) {
    return (
      <Badge className="bg-emerald-500/20 px-4 py-2 text-emerald-300">
        <CheckCircle2 className="mr-1.5 h-4 w-4" /> You're registered
      </Badge>
    );
  }

  const register = async () => {
    setBusy(true);
    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournament.id,
      user_id: user.id,
      player_name: profile?.full_name || profile?.username || user.email?.split("@")[0] || "Player",
      club: profile?.favourite_club ?? null,
      photo_url: profile?.avatar_url ?? null,
      status: "pending",
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Registration submitted — an admin will approve you shortly.");
  };

  return (
    <Button onClick={register} disabled={busy} className="bg-gradient-brand">
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      Register
    </Button>
  );
}

const MAX_SCREENSHOTS = 5;

function ReportForm({ tournament, players }: { tournament: Tournament; players: TournamentParticipant[] }) {
  const { user } = useAuth();
  const [player, setPlayer] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [myReports, setMyReports] = useState<
    {
      id: string;
      reason: string;
      description: string | null;
      player_name: string | null;
      status: string;
      created_at: string;
      resolved_at: string | null;
      screenshot_urls: string[] | null;
    }[]
  >([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const loadMyReports = async () => {
    if (!user) return;
    setLoadingReports(true);
    const { data, error } = await supabase
      .from("reports")
      .select("id, reason, description, player_name, status, created_at, resolved_at, screenshot_urls")
      .eq("reporter_id", user.id)
      .eq("tournament_id", tournament.id)
      .order("created_at", { ascending: false });
    setLoadingReports(false);
    if (error) {
      console.error(error);
      return;
    }
    setMyReports(data ?? []);
  };

  useEffect(() => {
    void loadMyReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tournament.id]);

  useEffect(() => {
    const urls = screenshots.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [screenshots]);

  if (!user) {
    return (
      <div className="py-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Sign in to submit a report and track status.</p>
        <Button asChild className="mt-4 bg-gradient-brand">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} isn't an image, skipped.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is over 5MB, skipped.`);
        continue;
      }
      validFiles.push(file);
    }

    setScreenshots((prev) => {
      const combined = [...prev, ...validFiles];
      if (combined.length > MAX_SCREENSHOTS) {
        toast.error(`Only ${MAX_SCREENSHOTS} screenshots allowed — extra ones were dropped.`);
      }
      return combined.slice(0, MAX_SCREENSHOTS);
    });
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Please give a short reason.");
      return;
    }
    setBusy(true);

    const uploadedUrls: string[] = [];

    for (const file of screenshots) {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${tournament.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("report-screenshots")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setBusy(false);
        toast.error(`Screenshot upload failed: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("report-screenshots").getPublicUrl(path);
      uploadedUrls.push(publicUrlData.publicUrl);
    }

    const selectedPlayer = players.find((p) => p.id === player);

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      type: player ? "player" : "tournament",
      tournament_id: tournament.id,
      player_name: selectedPlayer?.player_name ?? null,
      reason: reason.trim(),
      description: details.trim() || null,
      screenshot_urls: uploadedUrls,
      status: "pending",
    });

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Report submitted — an admin will review it shortly.");
    setPlayer("");
    setReason("");
    setDetails("");
    setScreenshots([]);
    void loadMyReports();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Submit a Report</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Player (optional)</label>
            <Select value={player} onValueChange={setPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="General tournament issue" />
              </SelectTrigger>
              <SelectContent>
                {players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.player_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Reason</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. No-show, unfair play, wrong score"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Details (optional)</label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Explain what happened..."
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Screenshots (optional, up to {MAX_SCREENSHOTS})
          </label>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" type="button" disabled={screenshots.length >= MAX_SCREENSHOTS}>
              <label className={cn("cursor-pointer", screenshots.length >= MAX_SCREENSHOTS && "pointer-events-none opacity-50")}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={screenshots.length >= MAX_SCREENSHOTS}
                />
                Add images
              </label>
            </Button>
            {screenshots.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {screenshots.length}/{MAX_SCREENSHOTS} selected
              </span>
            )}
          </div>

          {previews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt={`Screenshot ${i + 1}`}
                    className="h-20 w-20 rounded-lg border border-border/60 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(i)}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={submit} disabled={busy} className="bg-gradient-brand">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
          Submit report
        </Button>
      </div>

      <div className="space-y-3 border-t border-border/60 pt-6">
        <h3 className="text-lg font-semibold">Your reports for this tournament</h3>

        {loadingReports ? (
          <div className="grid place-items-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : myReports.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">You haven't submitted any reports yet.</p>
        ) : (
          <div className="space-y-3">
            {myReports.map((r) => (
              <div key={r.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.player_name || "Tournament issue"}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>
                {r.description && (
                  <p className="mt-1 text-sm text-muted-foreground/80 whitespace-pre-line">{r.description}</p>
                )}
                {r.screenshot_urls && r.screenshot_urls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.screenshot_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt={`Report screenshot ${i + 1}`}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {new Date(r.created_at).toLocaleString()}
                  {r.resolved_at && ` · Resolved ${new Date(r.resolved_at).toLocaleString()}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-300",
    resolved: "bg-emerald-500/20 text-emerald-300",
    rejected: "bg-red-500/20 text-red-300",
  };
  return (
    <Badge className={cn("capitalize", styles[status] ?? "bg-secondary text-muted-foreground")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
