/**
 * Premium organizer card — logo-first, stats, verified, clear CTA.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFollowerCount } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Users, Trophy, CheckCircle2, ChevronRight, Shield, Sparkles } from "lucide-react";
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
  const logo = organizer.logo_url || organizer.cover_url || null;
  const gameKey = (organizer.primary_game || "").toLowerCase();
  const gameLabel = gameKey ? GAME_LABEL[gameKey] || gameKey : null;

  if (!slug) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4 opacity-60",
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
        "group relative block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition duration-300",
        "hover:border-sky-400/40 hover:shadow-[0_8px_32px_-12px_rgba(56,189,248,0.35)] hover:from-sky-500/[0.08] active:scale-[0.99]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-center gap-3.5 p-4">
        <div className="relative shrink-0">
          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-white/12 shadow-inner sm:h-16 sm:w-16">
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
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400/20 to-violet-500/20 text-sm font-bold tracking-wide text-sky-200/90">
                {(organizer.name || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          {organizer.is_verified && (
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-[#0b0b0c] ring-1 ring-sky-400/50">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-white sm:text-base">
              {organizer.name}
            </h2>
            {organizer.is_verified && (
              <Sparkles className="hidden h-3.5 w-3.5 shrink-0 text-amber-400/80 sm:block" />
            )}
          </div>

          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-400">
            {organizer.tagline || organizer.description || "Esports organizer on NepARENA"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {gameLabel && (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-300">
                {gameLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
              <Users className="h-3 w-3 text-sky-400/90" />
              <span className="font-semibold tabular-nums text-neutral-200">
                {extra?.followers ?? 0}
              </span>
              <span className="text-neutral-500">followers</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
              <Trophy className="h-3 w-3 text-amber-400/90" />
              <span className="font-semibold tabular-nums text-neutral-200">
                {extra?.tournaments ?? 0}
              </span>
              <span className="text-neutral-500">cups</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-200 opacity-0 transition group-hover:opacity-100">
            Open
          </span>
          <ChevronRight className="h-5 w-5 text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
        </div>
      </div>
    </Link>
  );
}
