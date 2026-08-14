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
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="relative h-28 bg-gradient-to-br from-neutral-800 to-neutral-900">
        {organizer.banner_url && (
          <img
            src={organizer.banner_url}
            alt=""
            className="h-full w-full object-cover opacity-80"
            loading="lazy"
          />
        )}
      </div>
      <div className="relative px-4 pb-4">
        <div className="-mt-8 flex items-end gap-3">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border-4 border-[#0a0a0a] bg-neutral-900">
            {organizer.logo_url ? (
              <img src={organizer.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Shield className="h-7 w-7 text-neutral-500" />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-lg font-semibold">{organizer.name}</h2>
              {organizer.is_verified && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
              {organizer.tagline || organizer.description || "Organizer"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {extra?.followers ?? 0} followers
          </span>
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            {extra?.tournaments ?? "—"} tournaments
          </span>
          {organizer.is_verified && (
            <Badge variant="secondary" className="text-[10px]">
              Verified
            </Badge>
          )}
        </div>
        <Button asChild className="mt-5 w-full bg-neutral-100 text-black hover:bg-white">
          <Link to="/o/$slug" params={{ slug: organizer.slug }}>
            Open profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
