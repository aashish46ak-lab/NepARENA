/**
 * Premium organizer card — banner accent, logo, stats, verified, game badge.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFollowerCount } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Users, Trophy, CheckCircle2, ChevronRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrganizerCardData = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  logo_url: string | null;
  banner_url?: string | null;
  cover_url?: string | null;
  is_verified: boolean;
  status?: string;
  primary_game?: string | null;
};

async function organizerExtra(organizerId: string) {
  const [tournaments, followers] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId),
    getFollowerCount(organizerId),
  ]);
  return {
    tournaments: tournaments.count ?? 0,
    followers: followers ?? 0,
  };
}

const GAME_LABEL: Record<string, string> = {
  efootball: "eFootball",
  free_fire: "Free Fire",
  pubg: "PUBG",
  mlbb: "MLBB",
  ea_fc: "EA FC",
};

const GAME_ACCENT: Record<string, string> = {
  efootball: "from-sky-500/50 via-blue-600/30 to-transparent",
  free_fire: "from-orange-500/50 via-amber-600/30 to-transparent",
  pubg: "from-yellow-500/40 via-amber-700/30 to-transparent",
  mlbb: "from-violet-500/50 via-fuchsia-600/30 to-transparent",
  ea_fc: "from-emerald-500/50 via-teal-600/30 to-transparent",
};

export function OrganizerCard({
  organizer,
  queryKeyPrefix = "org_card",
  className,
}: {
  organizer: OrganizerCardData;
  queryKeyPrefix?: string;
  className?: string;
}) {
  const { data: extra } = useQuery({
    queryKey: [queryKeyPrefix, organizer.id],
    queryFn: () => organizerExtra(organizer.id),
    staleTime: 60_000,
    enabled: !!organizer.id && !String(organizer.id).startsWith("seed-"),
  });

  const slug = (organizer.slug || "").trim();
  const logo = organizer.logo_url || null;
  const banner = organizer.banner_url || organizer.cover_url || null;
  const gameKey = (organizer.primary_game || "").toLowerCase();
  const gameLabel = gameKey ? GAME_LABEL[gameKey] || gameKey : null;
  const accent = GAME_ACCENT[gameKey] || "from-sky-500/40 via-violet-600/25 to-transparent";

  if (!slug) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 opacity-60",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-neutral-900 ring-1 ring-white/10">
            <Shield className="h-6 w-6 text-neutral-500" />
          </div>
          <div>
            <p className="font-semibold text-white">{organizer.name}</p>
            <p className="text-xs text-neutral-500">Profile unavailable</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/o/$slug"
      params={{ slug }}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-white/10 bg-[#121214]",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition duration-300",
        "hover:border-sky-400/35 hover:shadow-[0_12px_40px_-16px_rgba(56,189,248,0.4)] active:scale-[0.99]",
        className,
      )}
    >
      <div className="relative h-16 overflow-hidden sm:h-[4.5rem]">
        {banner ? (
          <img
            src={banner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", accent)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {gameLabel && (
          <span className="absolute right-2.5 top-2.5 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-md">
            {gameLabel}
          </span>
        )}
      </div>

      <div className="relative px-3.5 pb-3.5 pt-0">
        <div className="-mt-8 flex items-end gap-3">
          <div className="relative shrink-0">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-neutral-950 ring-[3px] ring-[#121214] shadow-lg sm:h-16 sm:w-16">
              {logo ? (
                <img
                  src={logo}
                  alt={organizer.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400/25 to-violet-500/25 text-sm font-bold tracking-wide text-sky-100">
                  {(organizer.name || "?").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {organizer.is_verified && (
              <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#121214] ring-1 ring-sky-400/60">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-0.5">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-white sm:text-base">
              {organizer.name}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-neutral-400">
              {organizer.tagline || organizer.description || "Tournament organizer"}
            </p>
          </div>

          <ChevronRight className="mb-1 h-5 w-5 shrink-0 text-neutral-600 transition group-hover:translate-x-0.5 group-hover:text-sky-400" />
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-white/[0.06] pt-2.5 text-[11px] text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 text-sky-400/90" />
            <span className="font-semibold tabular-nums text-neutral-200">
              {extra?.followers ?? 0}
            </span>
            followers
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-3 w-3 text-amber-400/90" />
            <span className="font-semibold tabular-nums text-neutral-200">
              {extra?.tournaments ?? 0}
            </span>
            tournaments
          </span>
          {organizer.status && organizer.status !== "active" && (
            <>
              <span className="h-3 w-px bg-white/10" />
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium capitalize text-amber-300">
                {organizer.status}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
