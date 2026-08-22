import { Link } from "@tanstack/react-router";
import { Calendar, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Tourney = {
  id: string; name: string; status: string; starts_at: string | null;
  ends_at: string | null; game?: string | null; banner_url?: string | null; is_published?: boolean; registration_open?: boolean;
};

export function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-neutral-500">{text}</p>;
}

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
  } catch {
    return null;
  }
}

/** Statuses for Live tab cards */
const LIVE_STATUSES = new Set(["live", "ongoing", "check_in", "in_progress"]);
const UPCOMING_STATUSES = new Set([
  "upcoming",
  "registration_open",
  "registration_closed",
  "draft",
  "scheduled",
  "open",
  "registration",
]);
const HISTORY_STATUSES = new Set(["completed", "archived"]);

export function isLiveStatus(status: string) {
  return LIVE_STATUSES.has(String(status || "").toLowerCase());
}

export function isUpcomingStatus(status: string) {
  return UPCOMING_STATUSES.has(String(status || "").toLowerCase());
}

export function isHistoryStatus(status: string) {
  return HISTORY_STATUSES.has(String(status || "").toLowerCase());
}

function statusTag(status: string): { label: string; tone: string; pulse?: boolean } {
  const s = String(status || "").toLowerCase();
  if (LIVE_STATUSES.has(s)) {
    return { label: "LIVE", tone: "bg-rose-500 text-white shadow-lg shadow-rose-500/40", pulse: true };
  }
  if (s === "registration_open" || s === "open" || s === "registration") {
    return { label: "REG OPEN", tone: "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" };
  }
  if (UPCOMING_STATUSES.has(s)) {
    return { label: "UPCOMING", tone: "bg-sky-500 text-white shadow-md shadow-sky-500/30" };
  }
  if (HISTORY_STATUSES.has(s)) {
    return { label: "Completed", tone: "bg-neutral-800/90 text-neutral-300 ring-1 ring-white/10" };
  }
  return { label: s.replace(/_/g, " ") || "OPEN", tone: "bg-amber-400 text-black shadow-md shadow-amber-500/25" };
}

export function SquareCard({ t, variant }: { t: Tourney; variant: "live" | "upcoming" | "history" }) {
  const unpublished = t.is_published === false;
  const start = formatShortDate(t.starts_at);
  const end = formatShortDate(t.ends_at);
  const dateLine =
    variant === "history"
      ? [start, end].filter(Boolean).join(" → ") || "—"
      : start || "Date TBA";

  // Live/Upcoming: always show the card (tag DRAFT if unpublished) so Live tab is never blank
  // History: keep hard lock for unpublished
  if (unpublished && variant === "history") {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e]">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
          style={{
            backgroundImage: t.banner_url
              ? `url(${t.banner_url})`
              : "linear-gradient(135deg,#1e293b,#0a0a0a)",
          }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur-md">
            <Lock className="h-5 w-5 text-neutral-100" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-neutral-100">Not published</span>
        </div>
      </div>
    );
  }

  const tag = unpublished
    ? { label: "DRAFT", tone: "bg-neutral-700 text-neutral-200 ring-1 ring-white/15", pulse: false as boolean | undefined }
    : statusTag(t.status);
  const isLive = !unpublished && isLiveStatus(t.status);
  const isHistory = variant === "history";

  return (
    <>
      <Link
        to="/tournaments/$id"
        params={{ id: t.id }}
        className={cn(
          "group relative block aspect-[16/9] overflow-hidden rounded-2xl border transition duration-300 active:scale-[0.99]",
          isLive
            ? "border-rose-500/35 shadow-[0_0_0_1px_rgba(244,63,94,0.12)] hover:border-rose-400/55 hover:shadow-[0_16px_40px_-14px_rgba(244,63,94,0.45)]"
            : isHistory
              ? "border-white/10 hover:border-white/20 hover:shadow-[0_12px_32px_-14px_rgba(0,0,0,0.6)]"
              : "border-white/10 hover:border-sky-400/40 hover:shadow-[0_16px_40px_-14px_rgba(56,189,248,0.35)]",
        )}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.06]"
          style={{
            backgroundImage: t.banner_url
              ? `url(${t.banner_url})`
              : "linear-gradient(135deg,#1e293b 0%,#0f172a 50%,#0a0a0a 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
        {isLive && <div className="pointer-events-none absolute inset-0 bg-rose-500/[0.07]" />}

        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md",
              tag.tone,
            )}
          >
            {tag.pulse && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            )}
            {tag.label}
          </span>
          {t.game && (
            <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-md">
              {t.game}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-white drop-shadow-sm sm:text-base">
            {t.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-300/90">
            <Calendar className="h-3 w-3 shrink-0 opacity-70" />
            <span className="truncate">{dateLine}</span>
          </div>
        </div>
      </Link>
      {variant !== "history" && (
        <Link
          to="/tournaments/$id"
          params={{ id: t.id }}
          className="mt-2 flex w-full items-center justify-center rounded-xl border border-sky-500/35 bg-sky-500/15 px-3 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25"
        >
          Request to join
        </Link>
      )}
    </>
  );
}
