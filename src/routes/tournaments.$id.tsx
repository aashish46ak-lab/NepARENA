import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Calendar, Users, ShieldAlert, List, Table2, FileText,
  Award, Loader2, ExternalLink, UserPlus, CheckCircle2, ImagePlus, X,
  ChevronLeft, ChevronRight,
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
import { uploadPublicImage } from "@/lib/upload";
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
        supabase.from("tournament_participants").select("*").eq("tournament_id", id).order("created_at"),
        supabase.from("matches").select("*").eq("tournament_id", id).order("round").order("position"),
        supabase.from("matchdays").select("*").eq("tournament_id", id).order("sort_order"),
        supabase.from("tournament_standings").select("*").eq("tournament_id", id),
      ]);
      const allParticipants = (p.data ?? []) as TournamentParticipant[];
      return {
        tournament: (t.data as Tournament | null) ?? null,
        players: allParticipants.filter((x) => x.status === "approved"),
        allParticipants,
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

  const { tournament, players, allParticipants, matches, matchdays, standings } = data;

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
            {tournament.registration_open && <RegisterButton tournament={tournament} allParticipants={allParticipants} />}
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
                        <th className="p-3">Club</th>
                        <th className="p-3 text-center font-bold">Pts</th>
                        <th className="p-3 text-center">MP</th>
                        <th className="p-3 text-center">W</th>
                        <th className="p-3 text-center">D</th>
                        <th className="p-3 text-center">L</th>
                        <th className="p-3 text-center">GF</th>
                        <th className="p-3 text-center">GA</th>
                        <th className="p-3 text-center">GD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => {
                        const displayName = s.club?.trim() || s.player_name || "Player";
                        const participant = players.find((p) => p.id === s.participant_id);
                        const logo = participant?.club_logo_url || participant?.photo_url || null;
                        return (
                          <tr key={s.participant_id} className="border-b border-border/40">
                            <td className="p-3 text-muted-foreground">{i + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-7 w-7 shrink-0">
                                  <AvatarImage src={logo ?? undefined} />
                                  <AvatarFallback className="bg-secondary text-[10px]">
                                    {displayName.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{displayName}</div>
                                  {s.club?.trim() && s.player_name !== s.club && (
                                    <div className="truncate text-xs text-muted-foreground">{s.player_name}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-brand-glow">{s.points}</td>
                            <td className="p-3 text-center">{s.played}</td>
                            <td className="p-3 text-center">{s.won}</td>
                            <td className="p-3 text-center">{s.drawn}</td>
                            <td className="p-3 text-center">{s.lost}</td>
                            <td className="p-3 text-center">{s.goals_for}</td>
                            <td className="p-3 text-center">{s.goals_against}</td>
                            <td className="p-3 text-center">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
                          </tr>
                        );
                      })}
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

function RegisterButton({ tournament, allParticipants }: { tournament: Tournament; allParticipants: TournamentParticipant[] }) {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const existing = user ? allParticipants.find((p) => p.user_id === user.id) : undefined;

  if (!user) {
    return (
      <Button asChild className="bg-gradient-brand">
        <Link to="/auth">
          <UserPlus className="mr-2 h-4 w-4" /> Sign in to join
        </Link>
      </Button>
    );
  }

  if (existing?.status === "approved") {
    return (
      <Badge className="bg-emerald-500/20 px-4 py-2 text-emerald-300">
        <CheckCircle2 className="mr-1.5 h-4 w-4" /> You're registered
      </Badge>
    );
  }

  if (existing?.status === "pending") {
    return (
      <Badge className="bg-amber-500/20 px-4 py-2 text-amber-300">
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Join request pending
      </Badge>
    );
  }

  if (existing?.status === "rejected") {
    return (
      <Badge variant="outline" className="px-4 py-2 text-destructive border-destructive/40">
        Join request rejected
      </Badge>
    );
  }

  const requestToJoin = async () => {
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
    else toast.success("Join request sent — an admin will approve you shortly.");
  };

  return (
    <Button onClick={requestToJoin} disabled={busy} className="bg-gradient-brand">
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      Request to join
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
      screenshot_url: string[] | null;
    }[]
  >([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

  const openLightbox = (photos: string[], index: number) => setLightbox({ photos, index });
  const closeLightbox = () => setLightbox(null);
  const nextPhoto = () =>
    setLightbox((l) => (l ? { ...l, index: (l.index + 1) % l.photos.length } : l));
  const prevPhoto = () =>
    setLightbox((l) => (l ? { ...l, index: (l.index - 1 + l.photos.length) % l.photos.length } : l));

  let touchStartX = 0;
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) nextPhoto();
    else prevPhoto();
  };

  const loadMyReports = async () => {
    if (!user) return;
    setLoadingReports(true);
    const { data, error } = await supabase
      .from("reports")
      .select("id, reason, description, player_name, status, created_at, resolved_at, screenshot_url")
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

  const isParticipant = players.some((p) => p.user_id === user.id);

  if (!isParticipant) {
    return (
      <div className="py-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Only players registered in this tournament can submit a report.
        </p>
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
      const next = [...prev, ...validFiles].slice(0, MAX_SCREENSHOTS);
      if (prev.length + validFiles.length > MAX_SCREENSHOTS) {
        toast.error(`You can attach up to ${MAX_SCREENSHOTS} screenshots.`);
      }
      return next;
    });
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 4) {
      toast.error("Please describe the reason for the report.");
      return;
    }

    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of screenshots) {
        urls.push(await uploadPublicImage(file, "reports"));
      }

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        type: "tournament",
        tournament_id: tournament.id,
        player_name: player.trim() || null,
        reason: trimmedReason.slice(0, 200),
        description: details.trim() ? details.trim().slice(0, 2000) : null,
        screenshot_url: urls.length > 0 ? JSON.stringify(urls) : null,
        status: "pending",
      });
      if (error) throw error;

      toast.success("Report submitted — the admins will review it.");
      setPlayer("");
      setReason("");
      setDetails("");
      setScreenshots([]);
      await loadMyReports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setBusy(false);
    }
  };

  const screenshotList = (raw: string | string[] | null): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((u) => typeof u === "string") : [raw];
    } catch {
      return [raw];
    }
  };

  const statusColor = (status: string) =>
    status === "resolved"
      ? "bg-emerald-500/20 text-emerald-300"
      : status === "dismissed"
        ? "bg-secondary text-muted-foreground"
        : status === "in_review"
          ? "bg-brand/25 text-brand-glow"
          : "bg-amber-500/20 text-amber-300";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-xl font-bold">Report an issue</h2>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Player involved (optional)</label>
          <Select value={player} onValueChange={setPlayer}>
            <SelectTrigger>
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              {players.map((p) => (
                <SelectItem key={p.id} value={p.player_name}>
                  {p.player_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Reason</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Match result dispute"
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Details (optional)</label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe what happened…"
            rows={4}
            maxLength={2000}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Screenshots (up to {MAX_SCREENSHOTS})
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground transition hover:bg-accent/40">
            <ImagePlus className="h-5 w-5" />
            Add screenshots
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative">
                  <img src={src} alt={`Screenshot ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(i)}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                    aria-label="Remove screenshot"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={busy} className="bg-gradient-brand">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit report
        </Button>
      </form>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Your reports</h2>
        {loadingReports ? (
          <div className="grid place-items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : myReports.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            You haven't submitted any reports for this tournament.
          </p>
        ) : (
          <div className="space-y-3">
            {myReports.map((r) => (
              <div key={r.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{r.reason}</p>
                  <Badge className={cn("capitalize", statusColor(r.status))}>
                    {r.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {r.player_name && (
                  <p className="mt-1 text-sm text-muted-foreground">Player: {r.player_name}</p>
                )}
                {r.description && (
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{r.description}</p>
                )}
                {screenshotList(r.screenshot_url).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {screenshotList(r.screenshot_url).map((u, i) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => openLightbox(screenshotList(r.screenshot_url), i)}
                        className="overflow-hidden rounded-lg border border-border/60"
                      >
                        <img src={u} alt="Report screenshot" className="h-14 w-14 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {lightbox.photos.length > 1 && (
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-2 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <img
            src={lightbox.photos[lightbox.index]}
            alt={`Screenshot ${lightbox.index + 1}`}
            className="max-h-[85vh] max-w-full rounded-lg object-contain select-none"
          />

          {lightbox.photos.length > 1 && (
            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-2 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {lightbox.photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {lightbox.index + 1} / {lightbox.photos.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
