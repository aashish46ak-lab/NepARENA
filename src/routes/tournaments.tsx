import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
  useNavigate,
} from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { OrganizerSubnav } from "@/components/OrganizerSubnav";
import { useTournaments } from "@/hooks/useContent";
import { useAuth } from "@/hooks/useAuth";
import { supabase, type Tournament } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Users,
  Award,
  Calendar,
  UserPlus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tournaments")({
  head: () => ({
    ...buildSeoHead({
      title: "Tournaments",
      description:
        "Browse upcoming, ongoing, and completed esports tournaments on NepARENA.",
      path: "/tournaments",
    }),
  }),
  component: TournamentsLayout,
});

function TournamentsLayout() {
  const matchRoute = useMatchRoute();
  const isDetail = matchRoute({ to: "/tournaments/$id", fuzzy: false });
  if (isDetail) return <Outlet />;
  return <TournamentsList />;
}

function TournamentsList() {
  const { data: all = [], isLoading } = useTournaments();
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "completed">("all");

  const liveStatuses = new Set(["live", "ongoing", "in_progress"]);
  const upcomingStatuses = new Set([
    "upcoming",
    "registration_open",
    "registration_closed",
    "scheduled",
    "draft",
  ]);
  const completedStatuses = new Set(["completed", "finished", "cancelled"]);

  const list = all.filter((t) => {
    const s = String(t.status).toLowerCase();
    if (filter === "live") return liveStatuses.has(s);
    if (filter === "upcoming")
      return upcomingStatuses.has(s) || (!liveStatuses.has(s) && !completedStatuses.has(s));
    if (filter === "completed") return completedStatuses.has(s);
    return true;
  });

  return (
    <PageShell force="organizer" hideChrome>
      <OrganizerSubnav title="Tournaments" />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-2">
        <h1 className="text-2xl font-bold text-white">Tournaments</h1>
        <p className="mt-1 text-sm text-neutral-400">Live, upcoming, and completed events.</p>

        <div className="mt-4 flex gap-1.5 overflow-x-auto scrollbar-none">
          {(
            [
              ["all", "All"],
              ["live", "Live"],
              ["upcoming", "Upcoming"],
              ["completed", "Completed"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={
                filter === id
                  ? "shrink-0 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                  : "shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-white/[0.08]"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-white/12 bg-white/[0.03] p-8 text-center">
            <p className="text-sm font-medium text-white">No tournaments here</p>
            <p className="mt-1 text-xs text-neutral-500">
              Explore organizers to find communities running events.
            </p>
            <Link
              to="/organizers"
              className="mt-4 inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-200"
            >
              Explore organizers
            </Link>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {list.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<
    "none" | "pending" | "approved" | "rejected"
  >("none");

  useEffect(() => {
    if (!user) {
      setJoined("none");
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("tournament_participants")
        .select("status")
        .eq("tournament_id", t.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) setJoined("none");
      else if (data.status === "approved") setJoined("approved");
      else if (data.status === "rejected") setJoined("rejected");
      else setJoined("pending");
    })();
  }, [user?.id, t.id]);

  const requestJoin = async () => {
    if (!user) {
      toast.message("Sign in to join tournaments");
      return;
    }
    setBusy(true);
    try {
      const { data: existing } = await supabase
        .from("tournament_participants")
        .select("id, status")
        .eq("tournament_id", t.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        if (existing.status === "approved") {
          setJoined("approved");
          toast.message("You are already registered");
        } else if (existing.status === "rejected") {
          setJoined("rejected");
          toast.error("Previous request was rejected");
        } else {
          setJoined("pending");
          toast.message("Request already pending");
        }
        return;
      }
      const { data: inserted, error } = await supabase
        .from("tournament_participants")
        .insert({
          tournament_id: t.id,
          user_id: user.id,
          player_name: user.email?.split("@")[0] ?? "Player",
          status: "pending",
        })
        .select("id, status")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (inserted && inserted.status !== "pending") {
        await supabase
          .from("tournament_participants")
          .update({ status: "pending" })
          .eq("id", inserted.id);
      }
      setJoined("pending");
      toast.success("Join request sent");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <Link to="/tournaments/$id" params={{ id: t.id }} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5 sm:h-16 sm:w-16">
          {t.banner_url ? (
            <img src={t.banner_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Trophy className="h-6 w-6 text-neutral-500" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="border-white/10 bg-white/5 text-[10px] capitalize text-neutral-300 sm:text-xs">
              {String(t.status).replace(/_/g, " ")}
            </Badge>
            {t.registration_open && (
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-300 sm:text-xs">
                Registration open
              </Badge>
            )}
          </div>
          <h3 className="line-clamp-2 break-words text-base font-bold leading-snug text-white sm:text-lg">
            {t.name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400 sm:text-sm">
            {t.prize_pool && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Award className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[120px] truncate sm:max-w-none">{t.prize_pool}</span>
              </span>
            )}
            <span className="inline-flex shrink-0 items-center gap-1">
              <Users className="h-3.5 w-3.5 shrink-0" />
              {t.participants_count} players
            </span>
            {t.starts_at && (
              <span className="inline-flex shrink-0 items-center gap-1">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {new Date(t.starts_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="border-t border-white/8 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
        <div className="pt-3">
          {joined === "approved" ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> You are registered
            </div>
          ) : joined === "pending" ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-amber-300">
              <Loader2 className="h-4 w-4 shrink-0" /> Request pending
            </div>
          ) : joined === "rejected" ? (
            <p className="text-xs text-rose-400">Previous request was rejected</p>
          ) : t.registration_open ? (
            <Button
              type="button"
              className="w-full bg-neutral-100 text-black hover:bg-white sm:w-auto"
              disabled={busy}
              onClick={requestJoin}
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-4 w-4" />
              )}
              Request to join
            </Button>
          ) : (
            <p className="text-xs text-neutral-500">Registration closed</p>
          )}
        </div>
      </div>
    </div>
  );
}
