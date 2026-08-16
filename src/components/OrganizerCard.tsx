import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFollowerCount } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Users, Trophy, CheckCircle2, ChevronRight, Shield } from "lucide-react";

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

export function OrganizerCard({
  organizer,
  queryKeyPrefix = "org_card",
}: {
  organizer: OrganizerCardData;
  queryKeyPrefix?: string;
}) {
  const { data: extra } = useQuery({
    queryKey: [queryKeyPrefix, organizer.id],
    queryFn: () => organizerExtra(organizer.id),
    staleTime: 60_000,
    enabled: !!organizer.id && !String(organizer.id).startsWith("seed-"),
  });

  const slug = (organizer.slug || "").trim();
  const logo =
    organizer.logo_url ||
    organizer.cover_url ||
    organizer.banner_url ||
    null;

  if (!slug) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 opacity-60">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-neutral-900">
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
      className="block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-sky-400/40 hover:bg-white/[0.06] active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
          {logo ? (
            <img
              src={logo}
              alt={organizer.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-sm font-bold text-neutral-400">
              {(organizer.name || "?").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[15px] font-semibold text-white">
              {organizer.name}
            </h2>
            {organizer.is_verified && (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-400">
            {organizer.tagline || organizer.description || "Organizer"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 text-sky-400/80" />
              <span className="font-medium text-neutral-300">
                {extra?.followers ?? 0}
              </span>{" "}
              followers
            </span>
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-400/80" />
              <span className="font-medium text-neutral-300">
                {extra?.tournaments ?? 0}
              </span>{" "}
              tournaments
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-neutral-500" />
      </div>
    </Link>
  );
}
