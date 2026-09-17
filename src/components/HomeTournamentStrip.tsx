/**
 * Live / Upcoming tournament discovery — polished cards + clear empty state.
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

const LIVE = new Set(["live", "ongoing", "in_progress", "check_in"]);
const UPCOMING = new Set([
  "upcoming",
  "registration_open",
  "registration_closed",
  "draft",
  "scheduled",
  "open",
  "registration",
]);

function statusLabel(status: string) {
  const s = String(status).toLowerCase();
  if (LIVE.has(s)) return "LIVE";
  if (s === "registration_open" || s === "open" || s === "registration") return "REG OPEN";
  if (UPCOMING.has(s)) return "UPCOMING";
  return status?.toUpperCase?.() || "OPEN";
}

function statusTone(status: string) {
  const s = String(status).toLowerCase();
  if (LIVE.has(s)) return "bg-rose-500 text-white shadow-sm shadow-rose-500/40";
  if (UPCOMING.has(s)) return "bg-sky-500 text-white shadow-sm shadow-sky-500/30";
  return "bg-neutral-600 text-white";
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
            list.map((t) => t.organizer_id).filter((id): id is string => !!id),
          ),
        ];
        const orgMap = new Map<
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
            organizers: t.organizer_id ? orgMap.get(t.organizer_id) ?? null : null,
          }));
        }

        const active = list.filter((t) => {
          const s = String(t.status || "").toLowerCase();
          return LIVE.has(s) || UPCOMING.has(s);
        });

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
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-xs font-semibold text-white sm:text-sm">Cups</span>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 w-56 shrink-0 animate-pulse rounded-2xl bg-white/[0.06] sm:w-64"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-xs font-semibold text-white sm:text-sm">Cups</span>
        </div>
        <Link
          to="/tournaments"
          className="flex items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-5 text-sm text-neutral-400 transition hover:border-sky-400/40 hover:bg-sky-500/5 hover:text-sky-300 active:scale-[0.99]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5">
            <Swords className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-semibold text-neutral-200">No live cups right now</p>
            <p className="text-xs text-neutral-500">Browse all tournaments &amp; organizers</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-xs font-semibold text-white sm:text-sm">Live &amp; upcoming</span>
        <Link
          to="/tournaments"
          className="ml-auto text-[11px] font-medium text-sky-400 hover:underline sm:text-xs"
        >
          See all
        </Link>
      </div>
      <div className="-mx-0.5 flex gap-3 overflow-x-auto px-0.5 pb-1 scrollbar-none">
        {rows.map((t) => {
          const org = t.organizers;
          const cover = t.banner_url || org?.logo_url || t.logo_url || null;
          const coverIsOrgLogo = !t.banner_url && !!(org?.logo_url || t.logo_url);
          const isLive = LIVE.has(String(t.status).toLowerCase());
          return (
            <Link
              key={t.id}
              to="/tournaments/$id"
              params={{ id: t.id }}
              className="group relative w-56 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-white/[0.06] hover:shadow-md hover:shadow-sky-500/10 active:scale-[0.98] sm:w-64"
            >
              <div className="relative h-24 bg-gradient-to-br from-neutral-800 to-neutral-950 sm:h-28">
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className={cn(
                      "h-full w-full opacity-90 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100",
                      coverIsOrgLogo ? "object-contain p-4" : "object-cover",
                    )}
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <span className="text-xl font-bold text-neutral-500">
                      {(org?.name || t.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <span
                  className={cn(
                    "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide",
                    statusTone(t.status),
                  )}
                >
                  {isLive && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                  )}
                  {statusLabel(t.status)}
                </span>
              </div>
              <div className="space-y-2 p-3">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-[13px]">
                  {t.name}
                </p>
                {org && (
                  <div className="flex items-center gap-1.5">
                    <div className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-[8px] font-bold ring-1 ring-white/10">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (org.name || "?").slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="flex min-w-0 items-center gap-0.5 truncate text-[10px] text-neutral-400 sm:text-[11px]">
                      <span className="truncate">{org.name}</span>
                      {org.is_verified && (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-sky-400" />
                      )}
                    </span>
                  </div>
                )}
                {["registration_open", "open", "registration", "upcoming"].includes(
                  String(t.status).toLowerCase(),
                ) && (
                  <span className="inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-2 py-2 text-[10px] font-bold text-white shadow-sm shadow-sky-500/25 transition group-hover:bg-sky-400 sm:text-[11px]">
                    Request to join
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
