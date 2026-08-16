import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFollowerCount } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Shield, Users, Trophy, CheckCircle2 } from "lucide-react";

export type OrganizerCardData = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description?: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
};

async function organizerExtra(organizerId: string) {
  const [members, tournaments, followers] = await Promise.all([
    supabase
      .from("organizer_members")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId),
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId),
    getFollowerCount(organizerId),
  ]);
  let tCount = tournaments.count ?? 0;
  if (tCount === 0) {
    const { count } = await supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true });
    tCount = count ?? 0;
  }
  return {
    members: members.count ?? 0,
    tournaments: tCount,
    followers,
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
  });

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-black/40 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-cyan-400/40 hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-20 w-20 rounded-full bg-cyan-500/10 blur-2xl" />

      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-neutral-900 via-[#0c1220] to-black">
        {organizer.banner_url ? (
          <img
            src={organizer.banner_url}
            alt=""
            className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-95"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),transparent_50%,rgba(139,92,246,0.12))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      </div>

      <div className="relative px-4 pb-4">
        <div className="-mt-9 flex items-end gap-3">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border-2 border-cyan-400/30 bg-neutral-950 shadow-[0_0_16px_rgba(34,211,238,0.2)] ring-4 ring-black">
            {organizer.logo_url ? (
              <img
                src={organizer.logo_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Shield className="h-7 w-7 text-cyan-400/70" />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-lg font-bold tracking-tight text-white">
                {organizer.name}
              </h2>
              {organizer.is_verified && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm text-neutral-400">
              {organizer.tagline || organizer.description || "Organizer"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-400">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">
            <Users className="h-3.5 w-3.5 text-cyan-400/80" />
            {extra?.followers ?? 0} followers
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">
            <Trophy className="h-3.5 w-3.5 text-violet-300/80" />
            {extra?.tournaments ?? "—"} tournaments
          </span>
          {organizer.is_verified && (
            <Badge
              variant="secondary"
              className="border border-cyan-400/30 bg-cyan-500/10 text-[10px] text-cyan-300"
            >
              Verified
            </Badge>
          )}
        </div>

        <Button
          asChild
          className="mt-5 w-full rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white shadow-[0_0_20px_rgba(34,211,238,0.1)] backdrop-blur-sm transition hover:from-cyan-500/30 hover:to-violet-500/30 hover:border-cyan-300/50"
        >
          <Link to="/o/$slug" params={{ slug: organizer.slug }}>
            Open profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
