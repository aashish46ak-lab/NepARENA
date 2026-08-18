/**
 * Premium organizer card — tournament-poster style.
 * Full-width banner, overlapping logo, clear name + stats.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFollowerCount } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Users, Trophy, CheckCircle2, Shield, ChevronRight } from "lucide-react";
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
  efootball: "from-sky-600 via-blue-700 to-[#0a0a0a]",
  free_fire: "from-orange-600 via-amber-700 to-[#0a0a0a]",
  pubg: "from-yellow-600 via-amber-800 to-[#0a0a0a]",
  mlbb: "from-violet-600 via-fuchsia-800 to-[#0a0a0a]",
  ea_fc: "from-emerald-600 via-teal-800 to-[#0a0a0a]",
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
  const accent = GAME_ACCENT[gameKey] || "from-sky-600 via-violet-800 to-[#0a0a0a]";

  if (!slug) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 opacity-60",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-900 ring-1 ring-white/10">
            <Shield className="h-5 w-5 text-neutral-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white">{organizer.name}</p>
            <p className="text-xs text-neutral-500">Unavailable</p>
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
        "group block overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10]",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition duration-300",
        "hover:border-sky-400/40 hover:shadow-[0_12px_40px_-12px_rgba(56,189,248,0.35)] active:scale-[0.99]",
        className,
      )}
    >
      <div className="relative h-28 w-full overflow-hidden sm:h-32">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/40 to-transparent" />
        {gameLabel && (
          <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
            {gameLabel}
          </span>
        )}
      </div>

      <div className="relative -mt-8 px-4 pb-4">
        <div className="flex items-end gap-3">
          <div className="relative shrink-0">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-neutral-950 ring-[3px] ring-[#0e0e10] shadow-xl">
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
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400/30 to-violet-500/30 text-base font-bold text-sky-100">
                  {(organizer.name || "?").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {organizer.is_verified && (
              <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-[#0e0e10] ring-1 ring-sky-400/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-0.5">
            <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
              {organizer.name}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-neutral-400">
              {organizer.tagline || organizer.description || "Tournament organizer"}
            </p>
          </div>

          <ChevronRight className="mb-1 h-5 w-5 shrink-0 text-neutral-600 transition group-hover:translate-x-0.5 group-hover:text-sky-400" />
        </div>

        <div className="mt-3 flex items-center gap-4 border-t border-white/[0.06] pt-3 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-semibold tabular-nums text-neutral-200">
              {extra?.followers ?? 0}
            </span>
            <span className="text-neutral-500">followers</span>
          </span>
          <span className="h-3.5 w-px bg-white/10" />
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold tabular-nums text-neutral-200">
              {extra?.tournaments ?? 0}
            </span>
            <span className="text-neutral-500">tourneys</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
