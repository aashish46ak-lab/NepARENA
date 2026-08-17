import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Users, Table2, FileText, ShieldAlert,
  Loader2, ExternalLink, Banknote, Lock, ArrowLeft, MoreHorizontal,
  Share2, MessageCircle, Flag, Radio, Gamepad2, CalendarDays,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ReportForm } from "@/components/ReportForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase, type Tournament, type TournamentParticipant } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  loadPendingMatches,
  loadMySubmissions,
  type PendingMatch,
  type MatchSubmission,
} from "@/lib/matches-pending";
import { SubmitResultCard } from "@/components/SubmitResultCard";
import { getOrCreateDm } from "@/lib/dm";

export const Route = createFileRoute("/tournaments/$id")({
  head: () => ({
    meta: [
      { title: "Tournament — NepARENA" },
      { name: "description", content: "Tournament standings, fixtures, rules and registration." },
    ],
  }),
  component: TournamentDetailPage,
});

type TabId = "live" | "my_matches" | "fixtures" | "standings" | "players" | "rules" | "report";

function TournamentDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("live");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tournament", id],
    enabled: !!id,
    queryFn: async () => {
      const [tRes, pRes, mRes, mdRes, sRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
        supabase.from("tournament_participants").select("*").eq("tournament_id", id).order("created_at"),
        supabase.from("matches").select("*").eq("tournament_id", id).order("round").order("position"),
        supabase.from("matchdays").select("*").eq("tournament_id", id).order("sort_order"),
        supabase.from("tournament_standings").select("*").eq("tournament_id", id),
      ]);
      if (tRes.error) throw tRes.error;
      const tour = tRes.data as Record<string, unknown> | null;
      let organizer: { id: string; name: string; slug: string; logo_url: string | null } | null = null;
      const orgId = tour?.organizer_id as string | null | undefined;
      if (orgId) {
        const { data: o } = await supabase
          .from("organizers")
          .select("id, name, slug, logo_url")
          .eq("id", orgId)
          .maybeSingle();
        if (o) organizer = o as typeof organizer;
      }
      return {
        tournament: tour,
        participants: (pRes.data ?? []) as Record<string, unknown>[],
        matches: (mRes.data ?? []) as Record<string, unknown>[],
        matchdays: (mdRes.data ?? []) as Record<string, unknown>[],
        standings: (sRes.data ?? []) as Record<string, unknown>[],
        organizer,
      };
    },
  });

  const myPart = useMemo(() => {
    if (!user || !data) return null;
    return data.participants.find((p) => p.user_id === user.id && String(p.status) === "approved") ?? null;
  }, [user, data]);

  const { data: pendingItems = [], refetch: refetchPending } = useQuery({
    queryKey: ["tour_pending", id, user?.id],
    enabled: !!id && !!user?.id,
    queryFn: async () => {
      const pms = await loadPendingMatches(user!.id);
      const mine = pms.filter((p) => p.tournamentId === id);
      const subs = await loadMySubmissions(user!.id, mine.map((p) => p.match.id));
      return mine.map((pm) => ({
        pm,
        submission: subs.get(pm.match.id) ?? null,
      })) as { pm: PendingMatch; submission: MatchSubmission | null }[];
    },
  });

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel("tour-" + id)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: "tournament_id=eq." + id }, () => {
        void qc.invalidateQueries({ queryKey: ["tournament", id] });
        void refetchPending();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_submissions" }, () => {
        void refetchPending();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, qc, refetchPending]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuOpen]);

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !data?.tournament) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-lg space-y-3 py-20 text-center">
          <p className="text-muted-foreground">Tournament not found</p>
          <Button asChild variant="outline"><Link to="/tournaments">Back to tournaments</Link></Button>
        </div>
      </PageShell>
    );
  }

  const tournament = data.tournament;
  const name = String(tournament.name ?? "Tournament");
  const status = String(tournament.status ?? "");
  const isLive = ["live", "ongoing", "check_in"].includes(status);
  const rulesText = (tournament.rules_text as string | null) ?? null;
  const rulesUrl = (tournament.rules_url as string | null) ?? null;
  const description = (tournament.description as string | null) ?? null;
  const prize = tournament.prize_pool;
  const organizer = data.organizer;
  const completedMatches = data.matches.filter((m) => m.played);
  const total = data.matches.length;
  const remaining = Math.max(0, total - completedMatches.length);
  const completionPct = total > 0 ? Math.round((completedMatches.length / total) * 100) : 0;
  const registrationOpen = status === "registration_open" || status === "upcoming";
  const registrationClosed = ["registration_closed", "live", "ongoing", "check_in", "completed", "archived"].includes(status);

  const tabs: { id: TabId; label: string; icon: typeof Trophy }[] = [
    { id: "live", label: "Live", icon: Radio },
    { id: "my_matches", label: "My Matches", icon: Gamepad2 },
    { id: "fixtures", label: "Fixtures", icon: CalendarDays },
    { id: "standings", label: "Standings", icon: Table2 },
    { id: "players", label: "Players", icon: Users },
    { id: "rules", label: "Rules", icon: FileText },
  ];

  const tournamentTyped = tournament as unknown as Tournament;
  const playersTyped = data.participants as unknown as TournamentParticipant[];

  const openMenu = () => {
    const el = menuBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setMenuOpen((v) => !v);
  };

  const shareTournament = async () => {
    const url = `${window.location.origin}/tournaments/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {
      try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
      catch { toast.message(url); }
    }
    setMenuOpen(false);
  };

  const contactOrganizer = async () => {
    setMenuOpen(false);
    if (!user) { toast.message("Sign in to message"); void navigate({ to: "/auth" }); return; }
    if (!organizer) { toast.message("Organizer contact unavailable"); return; }
    const { data: members } = await supabase
      .from("organizer_members")
      .select("user_id, role")
      .eq("organizer_id", organizer.id)
      .in("role", ["owner", "admin"])
      .limit(1);
    const contactId = (members?.[0] as { user_id?: string } | undefined)?.user_id;
    if (!contactId) { toast.message("Organizer contact unavailable"); return; }
    try {
      const convId = await getOrCreateDm(contactId);
      if (convId) void navigate({ to: "/messages", search: { c: convId } });
      else void navigate({ to: "/messages", search: { with: contactId } });
    } catch {
      void navigate({ to: "/messages", search: { with: contactId } });
    }
  };

  const selectTab = (tid: TabId) => {
    setTab(tid);
    requestAnimationFrame(() => {
      tabRef.current?.querySelector<HTMLElement>(`[data-tab="${tid}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  };

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-[100dvh] bg-[#0a0a0a] pb-24">
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5 sm:max-w-2xl">
            <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else void navigate({ to: "/" }); }} className="rounded-full border border-white/10 p-2 text-neutral-300 hover:bg-white/[0.06]" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            {organizer?.logo_url ? (
              <Link to="/o/$slug" params={{ slug: organizer.slug }} className="shrink-0">
                <Avatar className="h-9 w-9 rounded-xl">
                  <AvatarImage src={organizer.logo_url} className="rounded-xl object-cover" />
                  <AvatarFallback className="rounded-xl text-xs">{name.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-sm font-bold text-white sm:text-base">{name}</h1>
                {isLive && <span className="shrink-0 rounded-full bg-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-200">LIVE</span>}
              </div>
              {organizer && <p className="truncate text-[11px] text-neutral-500">{organizer.name}</p>}
            </div>
            <button ref={menuBtnRef} type="button" onClick={openMenu} className="rounded-full border border-white/12 p-2 text-neutral-300 hover:bg-white/[0.06]" aria-label="More">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <div ref={tabRef} className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-2 pb-2 sm:max-w-2xl" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} type="button" data-tab={t.id} onClick={() => selectTab(t.id)} className={cn("flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl px-3.5 py-2 text-[11px] font-semibold transition", active ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200")}>
                  <Icon className={cn("h-[22px] w-[22px]", active && "text-sky-400")} />
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-lg px-3 pt-4 sm:max-w-2xl sm:px-4">
          {tab === "live" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{status.replaceAll("_", " ")}</Badge>
                  {prize != null && prize !== "" && (
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-400"><Banknote className="h-3.5 w-3.5" /> {String(prize)}</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-400"><Users className="h-3.5 w-3.5" /> {data.participants.length} players</span>
                </div>
                {description && <p className="mt-2 text-sm text-neutral-400">{description}</p>}
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Progress</span>
                    <span className="font-semibold tabular-nums text-white">{completionPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${completionPct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-neutral-500">{completedMatches.length} finished · {remaining} remaining</p>
                </div>
              </div>
              {pendingItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    <h2 className="text-sm font-bold text-red-400">Your pending matches</h2>
                  </div>
                  {pendingItems.slice(0, 3).map((it) => (
                    <SubmitResultCard key={it.pm.match.id} matchId={it.pm.match.id} homeLabel={it.pm.homeLabel} awayLabel={it.pm.awayLabel} homePhoto={it.pm.homePhoto} awayPhoto={it.pm.awayPhoto} meta={it.pm.matchdayName} participantId={it.pm.myParticipantId} submission={it.submission} onDone={() => void refetchPending()} />
                  ))}
                  <button type="button" className="text-xs font-semibold text-sky-400" onClick={() => selectTab("my_matches")}>View all my matches →</button>
                </div>
              )}
            </div>
          )}

          {tab === "my_matches" && (
            <MyMatchesPanel userId={user?.id} tournamentId={id} myPart={myPart} registrationOpen={registrationOpen} registrationClosed={registrationClosed && !myPart} pendingItems={pendingItems} matches={data.matches} participants={data.participants} onDone={() => void refetchPending()} />
          )}

          {tab === "fixtures" && (
            <FixturesByMatchday matches={data.matches} matchdays={data.matchdays} participants={data.participants} />
          )}

          {tab === "standings" && (
            <StandingsTable standings={data.standings} participants={data.participants} />
          )}

          {tab === "players" && <PlayersList participants={data.participants} />}

          {tab === "rules" && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" /> Tournament rules</h2>
              {rulesText ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{rulesText}</p>
              ) : rulesUrl ? (
                <Button asChild variant="outline"><a href={rulesUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> View rules document</a></Button>
              ) : (
                <p className="text-sm text-muted-foreground">No rules published yet.</p>
              )}
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => selectTab("report")}>
                <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Report an issue
              </Button>
            </div>
          )}

          {tab === "report" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <ReportForm tournament={tournamentTyped} players={playersTyped} />
            </div>
          )}

          <footer className="mt-10 border-t border-white/5 py-6 text-center text-[11px] text-neutral-600">
            <p>All rights reserved · Designed by NepARENA</p>
          </footer>
        </div>

        {menuOpen && menuPos && createPortal(
          <>
            <div className="fixed inset-0 z-[340]" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-white/12 bg-[#161618] py-1 shadow-2xl" style={{ top: menuPos.top, right: menuPos.right }}>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => void shareTournament()}>
                <Share2 className="h-4 w-4 text-sky-400" /> Share Tournament
              </button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => void contactOrganizer()}>
                <MessageCircle className="h-4 w-4 text-violet-400" /> Contact Organizer
              </button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); selectTab("rules"); }}>
                <FileText className="h-4 w-4 text-neutral-300" /> Rules
              </button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-neutral-400 hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); selectTab("report"); }}>
                <Flag className="h-4 w-4" /> Report Tournament
              </button>
            </div>
          </>,
          document.body,
        )}
      </div>
    </PageShell>
  );
}

function MyMatchesPanel({
  userId, tournamentId, myPart, registrationOpen, registrationClosed, pendingItems, matches, participants, onDone,
}: {
  userId?: string; tournamentId: string; myPart: Record<string, unknown> | null; registrationOpen: boolean; registrationClosed: boolean;
  pendingItems: { pm: PendingMatch; submission: MatchSubmission | null }[]; matches: Record<string, unknown>[]; participants: Record<string, unknown>[]; onDone: () => void;
}) {
  if (!userId) return <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-neutral-500">Sign in to see your matches</p>;
  if (!myPart) {
    if (registrationOpen) {
      return (
        <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-white">Join the tournament</p>
          <p className="mt-1 text-xs text-neutral-400">Register to see your matches here.</p>
        </div>
      );
    }
    if (registrationClosed) {
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-amber-100">You're late!</p>
          <p className="mt-1 text-xs text-neutral-400">Registration has closed for this tournament.</p>
        </div>
      );
    }
    return <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-neutral-500">You are not in this tournament</p>;
  }
  const myId = String(myPart.id);
  const myFinished = matches.filter((m) => m.played && (String(m.home_id) === myId || String(m.away_id) === myId));
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h2 className="text-sm font-bold text-red-400">Pending matches ({pendingItems.length})</h2>
        </div>
        {pendingItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-neutral-500">No matches need your attention right now</p>
        ) : pendingItems.map((it) => (
          <SubmitResultCard key={it.pm.match.id} matchId={it.pm.match.id} homeLabel={it.pm.homeLabel} awayLabel={it.pm.awayLabel} homePhoto={it.pm.homePhoto} awayPhoto={it.pm.awayPhoto} meta={it.pm.matchdayName} participantId={it.pm.myParticipantId} submission={it.submission} onDone={onDone} />
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-300">Recent results</h2>
        {myFinished.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-neutral-500">No finalized results yet</p>
        ) : (
          <div className="space-y-2">
            {myFinished.map((m) => {
              const homeName = labelOf(participants, m.home_id);
              const awayName = labelOf(participants, m.away_id);
              const hs = Number(m.home_score ?? 0);
              const as_ = Number(m.away_score ?? 0);
              const iAmHome = String(m.home_id) === myId;
              const won = iAmHome ? hs > as_ : as_ > hs;
              const draw = hs === as_;
              return (
                <div key={String(m.id)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-right font-medium text-white">{homeName}</span>
                  <span className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 font-bold tabular-nums text-sky-300">{hs} – {as_}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-white">{awayName}</span>
                  <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase", draw ? "bg-neutral-500/20 text-neutral-300" : won ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
                    {draw ? "Draw" : won ? "Win" : "Loss"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function labelOf(participants: Record<string, unknown>[], pid: unknown) {
  const p = participants.find((x) => x.id === pid);
  if (!p) return "TBD";
  return String(p.player_name || p.club || "TBD").trim() || "TBD";
}
function photoOf(participants: Record<string, unknown>[], pid: unknown): string | null {
  const p = participants.find((x) => x.id === pid);
  return (p?.photo_url as string | null) ?? null;
}
function userIdOf(participants: Record<string, unknown>[], pid: unknown): string | null {
  const p = participants.find((x) => x.id === pid);
  return (p?.user_id as string | null) ?? null;
}

function FixturesByMatchday({ matches, matchdays, participants }: { matches: Record<string, unknown>[]; matchdays: Record<string, unknown>[]; participants: Record<string, unknown>[] }) {
  const groups = useMemo(() => {
    type G = { id: string | null; name: string; published: boolean; matches: Record<string, unknown>[] };
    const map = new Map<string, G>();
    for (const m of matches) {
      const md = matchdays.find((d) => d.id === m.matchday_id);
      const name = String(md?.name ?? `Round ${m.round ?? "?"}`);
      const existing = map.get(name);
      if (existing) existing.matches.push(m);
      else map.set(name, { id: (md?.id as string) ?? (m.matchday_id as string) ?? null, name, published: md ? !!md.is_published : true, matches: [m] });
    }
    for (const md of matchdays) {
      const name = String(md.name);
      if (!map.has(name)) map.set(name, { id: md.id as string, name, published: !!md.is_published, matches: [] });
    }
    return [...map.values()].sort((a, b) => {
      const oa = Number(matchdays.find((d) => d.id === a.id)?.sort_order ?? 999);
      const ob = Number(matchdays.find((d) => d.id === b.id)?.sort_order ?? 999);
      return oa - ob;
    });
  }, [matches, matchdays]);
  const [selected, setSelected] = useState<string | null>(null);
  const activeName = selected && groups.some((g) => g.name === selected) ? selected : groups[0]?.name ?? null;
  const active = groups.find((g) => g.name === activeName);
  if (!matches.length && !matchdays.length) return <p className="text-sm text-muted-foreground">No fixtures yet.</p>;
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <button key={g.name} type="button" onClick={() => setSelected(g.name)} className={cn("shrink-0 rounded-xl border px-3 py-2 text-center transition", g.name === activeName ? "border-sky-500/50 bg-sky-500/15 text-white" : "border-white/10 bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06]")}>
            <div className="text-xs font-semibold">{g.name}</div>
            <div className="mt-0.5 text-[10px] opacity-70">{g.matches.filter((m) => m.played).length}/{g.matches.length}{g.published ? " · Live" : " · Locked"}</div>
          </button>
        ))}
      </div>
      {active && (
        <div className="relative min-h-[120px]">
          {!active.published && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/55 backdrop-blur-md">
              <Lock className="mb-2 h-8 w-8 text-neutral-300" />
              <p className="text-sm font-semibold text-white">Fixtures locked</p>
              <p className="mt-1 max-w-xs text-center text-xs text-neutral-400">This matchday is not published yet.</p>
            </div>
          )}
          <div className={cn("space-y-2", !active.published && "pointer-events-none select-none opacity-40")}>
            {active.matches.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches in this matchday.</p>
            ) : active.matches.map((m) => {
              const homeName = labelOf(participants, m.home_id);
              const awayName = labelOf(participants, m.away_id);
              const homeUid = userIdOf(participants, m.home_id);
              const awayUid = userIdOf(participants, m.away_id);
              const homePhoto = photoOf(participants, m.home_id);
              const awayPhoto = photoOf(participants, m.away_id);
              return (
                <div key={String(m.id)} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm">
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    {homeUid ? <Link to="/members/$id" params={{ id: homeUid }} className="truncate font-semibold text-white hover:underline">{homeName}</Link> : <span className="truncate font-semibold text-white">{homeName}</span>}
                    <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={homePhoto ?? undefined} /><AvatarFallback className="text-[9px]">{homeName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  </div>
                  <span className="w-12 shrink-0 text-center font-bold tabular-nums text-sky-300">{m.played ? `${m.home_score}-${m.away_score}` : "vs"}</span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={awayPhoto ?? undefined} /><AvatarFallback className="text-[9px]">{awayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    {awayUid ? <Link to="/members/$id" params={{ id: awayUid }} className="truncate font-semibold text-white hover:underline">{awayName}</Link> : <span className="truncate font-semibold text-white">{awayName}</span>}
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

function StandingsTable({ standings, participants }: { standings: Record<string, unknown>[]; participants: Record<string, unknown>[] }) {
  if (!standings.length) return <p className="text-sm text-muted-foreground">Standings not available yet.</p>;
  const sorted = [...standings].sort((a, b) => {
    const pts = Number(b.points ?? 0) - Number(a.points ?? 0);
    if (pts !== 0) return pts;
    const gd = Number(b.goal_difference ?? b.gd ?? 0) - Number(a.goal_difference ?? a.gd ?? 0);
    if (gd !== 0) return gd;
    return Number(b.goals_for ?? b.gf ?? 0) - Number(a.goals_for ?? a.gf ?? 0);
  });
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-white/5 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-2.5 font-medium">#</th>
            <th className="px-2 py-2.5 font-medium">Player</th>
            <th className="px-1.5 py-2.5 text-center font-medium">Pts</th>
            <th className="px-1.5 py-2.5 text-center font-medium">MP</th>
            <th className="px-1.5 py-2.5 text-center font-medium">W</th>
            <th className="px-1.5 py-2.5 text-center font-medium">D</th>
            <th className="px-1.5 py-2.5 text-center font-medium">L</th>
            <th className="px-1.5 py-2.5 text-center font-medium">GF</th>
            <th className="px-1.5 py-2.5 text-center font-medium">GA</th>
            <th className="px-1.5 py-2.5 text-center font-medium">GD</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const pid = row.participant_id;
            const displayName = labelOf(participants, pid) || String(row.player_name ?? "—");
            const photo = photoOf(participants, pid);
            const uid = userIdOf(participants, pid);
            const gf = Number(row.goals_for ?? row.gf ?? 0);
            const ga = Number(row.goals_against ?? row.ga ?? 0);
            const gd = Number(row.goal_difference ?? row.gd ?? gf - ga);
            const nameCell = (
              <span className="flex min-w-0 items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={photo ?? undefined} /><AvatarFallback className="text-[9px]">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <span className="truncate font-semibold text-white">{displayName}</span>
              </span>
            );
            return (
              <tr key={String(row.id ?? i)} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-2 py-2.5 tabular-nums text-neutral-400">{i + 1}</td>
                <td className="px-2 py-2.5">{uid ? <Link to="/members/$id" params={{ id: uid }} className="hover:underline">{nameCell}</Link> : nameCell}</td>
                <td className="px-1.5 py-2.5 text-center font-bold tabular-nums text-sky-300">{Number(row.points ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{Number(row.played ?? row.matches_played ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{Number(row.won ?? row.wins ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{Number(row.drawn ?? row.draws ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{Number(row.lost ?? row.losses ?? 0)}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{gf}</td>
                <td className="px-1.5 py-2.5 text-center tabular-nums">{ga}</td>
                <td className={cn("px-1.5 py-2.5 text-center font-medium tabular-nums", gd > 0 ? "text-emerald-400" : gd < 0 ? "text-rose-400" : "")}>{gd > 0 ? `+${gd}` : gd}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlayersList({ participants }: { participants: Record<string, unknown>[] }) {
  if (!participants.length) return <p className="text-sm text-muted-foreground">No players yet.</p>;
  return (
    <ul className="space-y-2">
      {participants.map((p) => {
        const uid = p.user_id as string | null;
        const name = String(p.player_name || p.club || "Player");
        const photo = (p.photo_url as string | null) ?? null;
        const inner = (
          <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="h-8 w-8"><AvatarImage src={photo ?? undefined} /><AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <span className="truncate font-semibold text-white">{name}</span>
            </span>
            <Badge variant="outline" className="capitalize">{String(p.status ?? "")}</Badge>
          </div>
        );
        return uid ? (
          <li key={String(p.id)}><Link to="/members/$id" params={{ id: uid }} className="block rounded-xl transition hover:bg-white/[0.03]">{inner}</Link></li>
        ) : (
          <li key={String(p.id)}>{inner}</li>
        );
      })}
    </ul>
  );
}
