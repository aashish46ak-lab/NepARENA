/**
 * Lightweight Live / Upcoming tournament discovery for the homepage.
 * Uses real data only — hides when empty.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Swords, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  status: string;
  starts_at?: string | null;
  organizer_id?: string | null;
  is_published?: boolean | null;
};

const LIVE = new Set(["live", "ongoing", "in_progress"]);
const UPCOMING = new Set([
  "upcoming",
  "registration_open",
  "registration_closed",
  "draft",
  "scheduled",
]);

export function HomeTournamentStrip() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("tournaments")
          .select("id, name, status, starts_at, organizer_id, is_published")
          .eq("is_published", true)
          .order("starts_at", { ascending: true, nullsFirst: false })
          .limit(24);
        if (cancelled) return;
        const list = (data ?? []) as Row[];
        const active = list.filter(
          (t) => LIVE.has(String(t.status).toLowerCase()) || UPCOMING.has(String(t.status).toLowerCase()),
        );
        setRows((active.length ? active : list).slice(0, 6));
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-1 flex gap-2 overflow-hidden">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 w-40 shrink-0 animate-pulse rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <Link
        to="/tournaments"
        className="mb-1 flex items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-neutral-400 transition hover:border-sky-400/30 hover:text-neutral-200"
      >
        <Swords className="h-3.5 w-3.5 text-sky-400" />
        <span className="flex-1">Discover tournaments</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <div className="mb-1">
      <div className="mb-1.5 flex items-center gap-2">
        <Swords className="h-3.5 w-3.5 text-sky-400" />
        <span className="text-xs font-semibold text-white">Tournaments</span>
        <Link to="/tournaments" className="ml-auto text-[11px] font-medium text-sky-400 hover:underline">
          See all
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {rows.map((t) => {
          const st = String(t.status).toLowerCase();
          const isLive = LIVE.has(st);
          return (
            <Link
              key={t.id}
              to="/tournaments/$id"
              params={{ id: t.id }}
              className="w-44 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 transition hover:border-sky-400/30 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    isLive ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/15 text-sky-300",
                  )}
                >
                  {isLive ? "Live" : "Upcoming"}
                </span>
              </div>
              <p className="mt-1 truncate text-xs font-semibold text-white">{t.name}</p>
              {t.starts_at && (
                <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                  {new Date(t.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
