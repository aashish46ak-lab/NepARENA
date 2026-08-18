/**
 * Live / Upcoming tournament discovery for the homepage.
 * Followed organizers' tournaments are pinned first.
 * Each card shows organizer logo+name and tournament banner+title.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Swords, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  status: string;
  starts_at?: string | null;
  organizer_id?: string | null;
  is_published?: boolean | null;
  banner_url?: string | null;
  cover_url?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  organizers?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified?: boolean;
  } | null;
};

const LIVE = new Set(["live", "ongoing", "in_progress"]);
const UPCOMING = new Set([
  "upcoming",
  "registration_open",
  "registration_closed",
  "draft",
  "scheduled",
]);

function statusLabel(status: string) {
  const s = String(status).toLowerCase();
  if (LIVE.has(s)) return "LIVE";
  if (UPCOMING.has(s)) return "UPCOMING";
  return status?.toUpperCase?.() || "OPEN";
}

function statusTone(status: string) {
  const s = String(status).toLowerCase();
  if (LIVE.has(s)) return "bg-rose-500/90 text-white";
  if (UPCOMING.has(s)) return "bg-sky-500/90 text-white";
  return "bg-neutral-600/90 text-white";
}

export function HomeTournamentStrip() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        let followedIds = new Set<string>();
        if (user?.id) {
          const { data: follows } = await supabase
            .from("organizer_followers")
            .select("organizer_id")
            .eq("user_id", user.id);
          followedIds = new Set(
            (follows ?? []).map((f: { organizer_id: string }) => f.organizer_id),
          );
        }

        const { data } = await supabase
          .from("tournaments")
          .select(
            "id, name, status, starts_at, organizer_id, is_published, banner_url, logo_url",
          )
          .eq("is_published", true)
          .order("starts_at", { ascending: true, nullsFirst: false })
          .limit(36);

        if (cancelled) return;
        let list = ((data ?? []) as unknown as Row[]).filter(Boolean);

        const orgIds = [
          ...new Set(
            list
              .map((t) => t.organizer_id)
              .filter((id): id is string => !!id),
          ),
        ];
        let orgMap = new Map<
          string,
          { id: string; name: string; slug: string; logo_url: string | null; is_verified?: boolean }
        >();
        if (orgIds.length) {
          const { data: orgs } = await supabase
            .from("organizers")
            .select("id, name, slug, logo_url, is_verified")
            .in("id", orgIds);
          for (const o of orgs ?? []) {
            orgMap.set(o.id, o as {
              id: string;
              name: string;
              slug: string;
              logo_url: string | null;
              is_verified?: boolean;
            });
          }
          list = list.map((t) => ({
            ...t,
            organizers: t.organizer_id
              ? orgMap.get(t.organizer_id) ?? null
              : null,
          }));
        }

        const active = list.filter((t) => {
          const s = String(t.status || "").toLowerCase();
          return LIVE.has(s) || UPCOMING.has(s);
        });

        // Followed organizers first, then the rest
        const followed = active.filter(
          (t) => t.organizer_id && followedIds.has(t.organizer_id),
        );
        const rest = active.filter(
          (t) => !t.organizer_id || !followedIds.has(t.organizer_id),
        );
        setRows([...followed, ...rest].slice(0, 18));
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-xs font-semibold text-white">Live Tournaments</span>
        </div>
        <div className="flex gap-2.5 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 w-56 shrink-0 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-xs font-semibold text-white">Live Tournaments</span>
        </div>
        <Link
          to="/tournaments"
          className="flex items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-sm text-neutral-400 transition hover:border-sky-400/30 hover:text-sky-300"
        >
          <Swords className="h-4 w-4" />
          <span className="flex-1">Discover tournaments</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-xs font-semibold text-white">Live Tournaments</span>
        <Link
          to="/tournaments"
          className="ml-auto text-[11px] font-medium text-sky-400 hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {rows.map((t) => {
          const org = t.organizers;
          const banner = t.banner_url || t.logo_url || null;
          return (
            <Link
              key={t.id}
              to="/tournaments/$id"
              params={{ id: t.id }}
              className="group relative w-56 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-sky-400/40 hover:bg-white/[0.05]"
            >
              <div className="relative h-20 bg-gradient-to-br from-neutral-800 to-neutral-900">
                {banner ? (
                  <img
                    src={banner}
                    alt=""
                    className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <Swords className="h-6 w-6 text-neutral-600" />
                  </div>
                )}
                <span
                  className={cn(
                    "absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide",
                    statusTone(t.status),
                  )}
                >
                  {statusLabel(t.status)}
                </span>
              </div>
              <div className="space-y-1.5 p-2.5">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">
                  {t.name}
                </p>
                {org && (
                  <div className="flex items-center gap-1.5">
                    <div className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-[8px] font-bold">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (org.name || "?").slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="flex min-w-0 items-center gap-0.5 truncate text-[10px] text-neutral-400">
                      <span className="truncate">{org.name}</span>
                      {org.is_verified && (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-sky-400" />
                      )}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
