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
  const list = all.filter((t) => t.status !== "completed");

  return (
    <PageShell force="organizer" hideChrome>
      <OrganizerSubnav title="Tournaments" />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-2">
        <h1 className="text-2xl font-bold text-white">Tournaments</h1>
        <p className="mt-1 text-sm text-neutral-400">Active and upcoming events.</p>

        {isLoading && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-neutral-500">
            No active tournaments — see{" "}
            <Link to="/history" className="text-sky-400 hover:underline">
              tournament history
            </Link>
            .
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
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<
    "pending" | "approved" | "rejected" | null
  >(null);

  useEffect(() => {
    if (!user) {
      setJoined(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tournament_participants")
        .select("status")
        .eq("tournament_id", t.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) setJoined(null);
      else if (data.status === "approved") setJoined("approved");
      else if (data.status === "rejected") setJoined("rejected");
      else setJoined("pending");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, t.id]);

  const requestJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.message("Sign in to request joining a tournament");
      navigate({ to: "/auth" });
      return;
    }

    if (!t.registration_open) {
      toast.error("Registration is closed for this tournament");
      return;
    }

    setBusy(true);

    const { data: existing } = await supabase
      .from("tournament_participants")
      .select("id, status")
      .eq("tournament_id", t.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      setBusy(false);
      if (existing.status === "approved") {
        setJoined("approved");
        toast.message("You are already in this tournament");
      } else if (existing.status === "rejected") {
        setJoined("rejected");
        toast.message("Your previous request was rejected");
      } else {
        setJoined("pending");
        toast.message("Your join request is already pending");
      }
      return;
    }

    const { data: inserted, error } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: t.id,
        user_id: user.id,
        player_name:
          profile?.full_name ||
          profile?.username ||
          user.email?.split("@")[0] ||
          "Player",
        club: profile?.favourite_club ?? null,
        photo_url: profile?.avatar_url ?? null,
        status: "pending",
      })
      .select("id, status")
      .single();

    if (error) {
      setBusy(false);
      toast.error(
        error.message.includes("duplicate")
          ? "You already requested to join"
          : error.message,
      );
      return;
    }

    if (inserted && inserted.status !== "pending") {
      await supabase
        .from("tournament_participants")
        .update({ status: "pending" })
        .eq("id", inserted.id);
    }

    setBusy(false);
    setJoined("pending");
    toast.success("Join request sent — waiting for admin approval");
  };

  const thumb = t.logo_url || t.banner_url || t.image_url;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 transition hover:border-white/20">
      <Link
        to="/tournaments/$id"
        params={{ id: t.id }}
        className="flex min-w-0 cursor-pointer gap-3 p-3 sm:p-4"
      >
        <div className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-sky-900/40 to-violet-950/40">
              <Trophy className="h-8 w-8 text-sky-400/70" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="bg-sky-500/20 text-sky-300 capitalize text-[10px] sm:text-xs">
              {t.status.replace(/_/g, " ")}
            </Badge>
            {t.registration_open && (
              <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs">
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
                <span className="max-w-[120px] truncate sm:max-w-none">
                  {t.prize_pool}
                </span>
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
