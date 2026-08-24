import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Users, Table2, FileText, ShieldAlert, Loader2, ExternalLink,
  ArrowLeft, MoreHorizontal, Share2, MessageCircle, Flag, Gamepad2, CalendarDays,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ReportForm } from "@/components/ReportForm";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase, type Tournament, type TournamentParticipant, type Match } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { loadPendingMatches, loadMySubmissions, type PendingMatch, type MatchSubmission } from "@/lib/matches-pending";
import { BracketTree } from "@/components/BracketTree";
import {
  parseFormatConfig,
  hasGroupStage,
  hasKnockoutStage,
  hasStandingsStage,
} from "@/lib/tournament-format";
import { MyMatchesPanel, FixturesByMatchday, StandingsTable, PlayersList } from "@/components/TournamentDetailHelpers";
import { getOrCreateDm } from "@/lib/dm";

type TabId = "my_matches" | "fixtures" | "standings" | "bracket" | "players" | "rules" | "report";

export function TournamentDetailPage() {
  const { id } = useParams({ from: "/tournaments/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("my_matches");
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
        const { data: o } = await supabase.from("organizers").select("id, name, slug, logo_url").eq("id", orgId).maybeSingle();
        if (o) organizer = o as typeof organizer;
      }
      if (!organizer) {
        const { data: def } = await supabase
          .from("organizers")
          .select("id, name, slug, logo_url")
          .or("slug.eq.efootball-nepal,name.ilike.%efootball%")
          .limit(1)
          .maybeSingle();
        if (def) organizer = def as typeof organizer;
      }

      const participants = (pRes.data ?? []) as Record<string, unknown>[];
      const userIds = [
        ...new Set(
          participants
            .map((x) => (x.user_id ? String(x.user_id) : null))
            .filter((x): x is string => !!x),
        ),
      ];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds);
        const pmap = new Map(
          (profs ?? []).map((pr: { id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }) => [
            pr.id,
            pr,
          ]),
        );
        for (const part of participants) {
          const uid = part.user_id ? String(part.user_id) : null;
          if (!uid) continue;
          const pr = pmap.get(uid);
          if (!pr) continue;
          if (!part.photo_url && pr.avatar_url) part.photo_url = pr.avatar_url;
          if (!part.avatar_url && pr.avatar_url) part.avatar_url = pr.avatar_url;
          const pname =
            (pr.full_name && String(pr.full_name).trim()) ||
            (pr.username && String(pr.username).trim()) ||
            null;
          if (pname) {
            part.profile_name = pname;
            if (!part.player_name) part.player_name = pname;
          }
        }
      }

      return {
        tournament: tour,
        participants,
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
      return mine.map((pm) => ({ pm, submission: subs.get(pm.match.id) ?? null })) as { pm: PendingMatch; submission: MatchSubmission | null }[];
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
      .on("postgres_changes", { event: "*", schema: "public", table: "match_submissions" }, () => { void refetchPending(); })
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

  const knockoutMatches = useMemo(() => {
    const all = (data?.matches ?? []) as unknown as Match[];
    const bracketType = String((data?.tournament as Tournament | null | undefined)?.bracket_type ?? "");
    const isPureKo = ["single_elimination", "double_elimination", "knockout"].includes(bracketType);
    const ko = all.filter((m) => {
      const st = String(m.stage_type ?? "");
      if (st === "group" || st === "league") return false;
      if (m.group_key) return false;
      if (st === "knockout" || st === "final" || st === "third_place" || st === "semi_final" || st === "quarter_final") return true;
      if (typeof m.round === "number" && m.round >= 100) return true;
      return false;
    });
    if (ko.length > 0) return ko;
    if (isPureKo) return all.filter((m) => !m.group_key && m.stage_type !== "group" && m.stage_type !== "league");
    return [];
  }, [data?.matches, data?.tournament]);

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
  const organizer = data.organizer;
  const regFlag = !!(tournament as { registration_open?: boolean }).registration_open;
  const registrationOpen =
    regFlag ||
    ["registration_open", "upcoming", "open", "registration"].includes(status);
  const registrationClosed =
    !registrationOpen &&
    ["registration_closed", "live", "ongoing", "check_in", "completed", "archived"].includes(status);

  const tournamentTyped = tournament as unknown as Tournament;
  const playersTyped = data.participants as unknown as TournamentParticipant[];

  const formatCfg = parseFormatConfig(
    (tournament as { format_config?: unknown }).format_config,
    (tournament as { bracket_type?: string | null }).bracket_type,
  );
  const pureKnockout = ["single_elimination", "double_elimination", "knockout"].includes(
    String((tournament as { bracket_type?: string }).bracket_type ?? "").toLowerCase(),
  );
  const isKnockoutOnly =
    hasKnockoutStage(formatCfg) && !hasGroupStage(formatCfg) && !hasStandingsStage(formatCfg);
  const showBracketTab =
    hasKnockoutStage(formatCfg) &&
    (pureKnockout || isKnockoutOnly || formatCfg.knockoutStarted === true);
  const showStandingsTab = hasStandingsStage(formatCfg);

  const tabs: { id: TabId; label: string; icon: typeof Trophy }[] = [
    { id: "my_matches", label: "My Matches", icon: Gamepad2 },
    { id: "fixtures", label: "Fixtures", icon: CalendarDays },
    ...(showStandingsTab
      ? [{ id: "standings" as const, label: "Standings", icon: Table2 }]
      : []),
    ...(showBracketTab
      ? [{ id: "bracket" as const, label: "Bracket", icon: Trophy }]
      : []),
    { id: "players", label: "Players", icon: Users },
    { id: "rules", label: "Rules", icon: FileText },
    { id: "report", label: "Report", icon: ShieldAlert },
  ];

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
      try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.message(url); }
    }
    setMenuOpen(false);
  };

  const contactOrganizer = async () => {
    setMenuOpen(false);
    if (!user) { toast.message("Sign in to message"); void navigate({ to: "/auth" }); return; }
    if (!organizer) { toast.message("Organizer contact unavailable"); return; }
    const { data: members } = await supabase.from("organizer_members").select("user_id, role").eq("organizer_id", organizer.id).in("role", ["owner", "admin"]).limit(1);
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

  const bracketMatches = knockoutMatches.map((m) => {
    const md = data.matchdays.find((d) => String((d as { id?: string }).id) === String(m.matchday_id)) as { name?: string } | undefined;
    return { ...m, matchday: md?.name ?? null };
  });

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-[100dvh] bg-[#0a0a0a] pb-24">
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5 sm:max-w-2xl">
            <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else void navigate({ to: "/" }); }} className="rounded-full border border-white/10 p-2.5 text-neutral-300 hover:bg-white/[0.06]" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            {(() => {
              const headerLogo =
                (tournament as { logo_url?: string | null }).logo_url ||
                organizer?.logo_url ||
                null;
              if (headerLogo && organizer) {
                return (
                  <Link to="/o/$slug" params={{ slug: organizer.slug }} className="shrink-0">
                    <Avatar className="h-10 w-10 rounded-xl">
                      <AvatarImage src={headerLogo} className="rounded-xl object-cover" />
                      <AvatarFallback className="rounded-xl text-xs">{name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  </Link>
                );
              }
              if (headerLogo) {
                return (
                  <Avatar className="h-10 w-10 shrink-0 rounded-xl">
                    <AvatarImage src={headerLogo} className="rounded-xl object-cover" />
                    <AvatarFallback className="rounded-xl text-xs">{name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                );
              }
              return (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Trophy className="h-5 w-5 text-amber-400" />
                </div>
              );
            })()}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-sm font-bold text-white sm:text-base">{name}</h1>
                {isLive && <span className="shrink-0 rounded-full bg-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-200">LIVE</span>}
              </div>
              {organizer && <p className="truncate text-[11px] text-neutral-500">{organizer.name}</p>}
            </div>
            <button ref={menuBtnRef} type="button" onClick={openMenu} className="rounded-full border border-white/12 p-2.5 text-neutral-300 hover:bg-white/[0.06]" aria-label="More">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <div ref={tabRef} className="mx-auto flex max-w-lg gap-1.5 overflow-x-auto px-2 pb-2.5 sm:max-w-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} type="button" data-tab={t.id} onClick={() => selectTab(t.id)} className={cn("flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition", active ? "bg-white/12 text-white" : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200")}>
                  <Icon className={cn("h-5 w-5", active && "text-sky-400")} strokeWidth={2} />
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-lg px-3 pt-4 sm:max-w-2xl sm:px-4">
          {tab === "my_matches" && (
            <MyMatchesPanel userId={user?.id} tournamentId={id} myPart={myPart} registrationOpen={registrationOpen} registrationClosed={registrationClosed && !myPart} pendingItems={pendingItems} matches={data.matches} participants={data.participants} onDone={() => { void refetchPending(); void qc.invalidateQueries({ queryKey: ["tournament", id] }); }} />
          )}
          {tab === "fixtures" && (
            <FixturesByMatchday matches={data.matches} matchdays={data.matchdays} participants={data.participants} />
          )}
          {tab === "bracket" && showBracketTab && (
            <BracketTree
              matches={bracketMatches}
              allMatches={(data.matches ?? []) as unknown as Match[]}
              players={playersTyped}
              tournamentName={name}
              tournamentLogo={tournamentTyped.logo_url}
              bannerUrl={tournamentTyped.banner_url}
              organizerName={organizer?.name}
              organizerLogo={organizer?.logo_url}
              eventDate={(tournament as { starts_at?: string | null }).starts_at ?? null}
              groupCount={4}
            />
          )}
          {tab === "standings" && showStandingsTab && (
            <StandingsTable standings={data.standings} participants={data.participants} matches={data.matches} />
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
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => void shareTournament()}><Share2 className="h-4 w-4 text-sky-400" /> Share Tournament</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => void contactOrganizer()}><MessageCircle className="h-4 w-4 text-violet-400" /> Contact Organizer</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); selectTab("rules"); }}><FileText className="h-4 w-4 text-neutral-300" /> Rules</button>
              <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-neutral-400 hover:bg-white/[0.06]" onClick={() => { setMenuOpen(false); selectTab("report"); }}><Flag className="h-4 w-4" /> Report Tournament</button>
            </div>
          </>,
          document.body,
        )}
      </div>
    </PageShell>
  );
}
