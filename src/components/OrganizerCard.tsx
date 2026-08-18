/**
 * Organizer card — 1-col friendly, ~70% width parent, height ≈ 50% of width (aspect 2/1).
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFollowerCount } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Users, Trophy, CheckCircle2, Shield } from "lucide-react";
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
  if (!organizerId || String(organizerId).startsWith("seed-") || String(organizerId).startsWith("default-")) {
    const [tournaments] = await Promise.all([
      supabase.from("tournaments").select("id", { count: "exact", head: true }),
    ]);
    return { tournaments: tournaments.count ?? 0, followers: 0 };
  }
  const [byOrg, followers, allT] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId),
    getFollowerCount(organizerId),
    supabase.from("tournaments").select("id", { count: "exact", head: true }),
  ]);
  let tCount = byOrg.count ?? 0;
  if (tCount === 0 && (allT.count ?? 0) > 0) {
    tCount = allT.count ?? 0;
  }
  return {
    tournaments: tCount,
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
    enabled: !!organizer.id,
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
          "flex aspect-[2/1] w-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 opacity-60",
          className,
        )}
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-900 ring-1 ring-white/10">
          <Shield className="h-5 w-5 text-neutral-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{organizer.name}</p>
          <p className="text-[10px] text-neutral-500">Unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/o/$slug"
      params={{ slug }}
      className={cn(
        "group relative flex aspect-[2/1] w-full overflow-hidden rounded-xl border border-white/10 bg-[#121214]",
        "transition active:scale-[0.99] hover:border-sky-400/35",
        className,
      )}
    >
      <div className="relative h-full w-[36%] shrink-0 overflow-hidden">
        {banner ? (
          <img
            src={banner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", accent)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#121214]/80" />
        {gameLabel && (
          <span className="absolute left-1.5 top-1.5 rounded-full border border-white/15 bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90">
            {gameLabel}
          </span>
        )}
      </div>

      <div className="relative flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2">
        <div className="relative shrink-0">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-neutral-950 ring-2 ring-[#121214] shadow">
            {logo ? (
              <img
                src={logo}
                alt={organizer.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400/25 to-violet-500/25 text-[11px] font-bold text-sky-100">
                {(organizer.name || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          {organizer.is_verified && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#121214]">
              <CheckCircle2 className="h-3 w-3 text-sky-400" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-tight text-white">
            {organizer.name}
          </h2>
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-400">
            {organizer.tagline || organizer.description || "Tournament organizer"}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 text-sky-400/90" />
              <span className="font-semibold tabular-nums text-neutral-200">
                {extra?.followers ?? 0}
              </span>
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-400/90" />
              <span className="font-semibold tabular-nums text-neutral-200">
                {extra?.tournaments ?? 0}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
