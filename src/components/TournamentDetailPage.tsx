import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  Users,
  Table2,
  FileText,
  ShieldAlert,
  Loader2,
  ExternalLink,
  ArrowLeft,
  MoreHorizontal,
  Share2,
  MessageCircle,
  Flag,
  Gamepad2,
  CalendarDays,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ReportForm } from "@/components/ReportForm";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  supabase,
  type Tournament,
  type TournamentParticipant,
  type Match,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  loadPendingMatches,
  loadMySubmissions,
  type PendingMatch,
  type MatchSubmission,
} from "@/lib/matches-pending";
import { BracketTree } from "@/components/BracketTree";
import {
  MyMatchesPanel,
  FixturesByMatchday,
  StandingsTable,
  PlayersList,
} from "@/components/TournamentDetailHelpers";
import { getOrCreateDm } from "@/lib/dm";

type TabId =
  | "my_matches"
  | "fixtures"
  | "standings"
  | "bracket"
  | "players"
  | "rules"
  | "report";

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

  const knockoutMatches = useMemo(() => {
    const all = (data?.matches ?? []) as unknown as Match[];
    const bracketType = String((data?.tournament as Tournament | null | undefined)?.bracket_type ?? "");
    const ko = all.filter(
      (m) =>
        m.stage_type === "knockout" ||
        m.stage_type === "final" ||
        m.stage_type === "third_place" ||
        (typeof m.round === "number" && m.round >= 100),
    );
    if (ko.length === 0 && ["single_elimination", "double_elimination", "knockout"].includes(bracketType)) {
      return all;
    }
    return ko.length ? ko : all;
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
          <Button asChild variant="outline">
            <Link to="/tournaments">Back to tournaments</Link>
          </Button>
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
  const registrationOpen = status === "registration_open" || status === "upcoming";
  const registrationClosed = ["registration_closed", "live", "ongoing", "check_in", "completed", "archived"].includes(status);

  const tabs: { id: TabId; label: string; icon: typeof Trophy }[] = [
    { id: "my_matches", label: "My Matches", icon: Gamepad2 },
    { id: "fixtures", label: "Fixtures", icon: CalendarDays },
    { id: "standings", label: "Standings", icon: Table2 },
    { id: "bracket", label: "Bracket", icon: Trophy },
    { id: "players", label: "Players", icon: Users },
    { id: "rules", label: "Rules", icon: FileText },
    { id: "report", label: "Report", icon: ShieldAlert },
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
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      } catch {
        toast.message(url);
      }
    }
    setMenuOpen(false);
  };

  const contactOrganizer = async () => {
    setMenuOpen(false);
    if (!user) {
      toast.message("Sign in to message");
      void navigate({ to: "/auth" });
      return;
    }
    if (!organizer) {
      toast.message("Organizer contact unavailable");
      return;
    }
    const { data: members } = await supabase
      .from("organizer_members")
      .select("user_id, role")
      .eq("organizer_id", organizer.id)
      .in("role", ["owner", "admin"])
      .limit(1);
    const contactId = (members?.[0] as { user_id?: string } | undefined)?.user_id;
    if (!contactId) {
      toast.message("Organizer contact unavailable");
      return;
    }
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
      tabRef.current?.querySelector<HTMLElement>(`[data-tab="${tid}"]`)?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    });
  };

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-[100dvh] bg-[#0a0a0a] pb-24">
        <div className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5 sm:max-w-2xl">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else void navigate({ to: "/" });
              }}
              className="rounded-full border border-white/10 p-2.5 text-neutral-300 hover:bg-white/[0.06]"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {organizer?.logo_url ? (
              <Link to="/o/$slug" params={{ slug: organizer.slug }} className="shrink-0">
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarImage src={organizer.logo_url} className="rounded-xl object-cover" />
                  <AvatarFallback className="rounded-xl text-xs">{name.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <Trophy className="h-5 w-5 text-amber-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-sm font-bold text-white sm:text-base">{name}</h1>
                {isLive && (
                  <span className="shrink-0 rounded-full bg-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-200">LIVE</span>
                )}
              </div>
              {organizer && <p className="truncate text-[11px] text-neutral-500">{organizer.name}</p>}
            </div>
            <button
              ref={menuBtnRef}
              type="button"
              onClick={openMenu}
              className="rounded-full border border-white/12 p-2.5 text-neutral-300 hover:bg-white/[0.06]"
              aria-label="More"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <div
            ref={tabRef}
            className="mx-auto flex max-w-lg gap-1.5 overflow-x-auto px-2 pb-2.5 sm:max-w-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-tab={t.id}
                  onClick={() => selectTab(t.id)}
                  className={cn(
                    "flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition",
                    active ? "bg-white/12 text-white" : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-sky-400")} strokeWidth={2} />
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-lg px-3 pt-4 sm:max-w-2xl sm:px-4">
          {tab === "my_matches" && (
            <MyMatchesPanel
              userId={user?.id}
              tournamentId={id}
              myPart={myPart}
              registrationOpen={registrationOpen}
              registrationClosed={registrationClosed && !myPart}
              pendingItems={pendingItems}
              matches={data.matches}
              participants={data.participants}
              onDone={() => void refetchPending()}
            />
          )}

          {tab === "fixtures" && (
            <FixturesByMatchday
              matches={data.matches}
              matchdays={data.matchdays}
              participants={data.participants}
            />
          )}
          {tab === "bracket" && (
            <BracketTree
              matches={knockoutMatches}
              players={playersTyped}
              tournamentName={name}
              tournamentLogo={tournamentTyped.logo_url}
              bannerUrl={tournamentTyped.banner_url}
              organizerName={organizer?.name}
              organizerLogo={organizer?.logo_url}
            />
          )}
          {tab === "standings" && (
            <StandingsTable
              standings={data.standings}
              participants={data.participants}
              matches={data.matches}
            />
          )}
          {tab === "players" && <PlayersList participants={data.participants} />}

          {tab === "rules" && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" /> Tournament rules
              </h2>
              {rulesText ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{rulesText}</p>
              ) : rulesUrl ? (
                <Button asChild variant="outline">
                  <a href={rulesUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> View rules document
                  </a>
                </Button>
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
            <div
              className="fixed z-[350] w-56 overflow-hidden rounded-xl border border-white/12 bg-[#161618] py-1 shadow-2xl"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
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
