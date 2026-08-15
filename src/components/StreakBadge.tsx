import { cn } from "@/lib/utils";

/**
 * Compact streak chip — fire left, number right.
 * Fire is lit when streak > 0 (logged in on consecutive Nepal calendar days).
 * At local midnight (Asia/Kathmandu) the day rolls; missing the next day resets streak.
 */
export function InlineStreak({
  streak,
  className,
  dimmed,
}: {
  streak?: number | null;
  className?: string;
  /** Show cooled fire (e.g. preview of broken streak) */
  dimmed?: boolean;
}) {
  const n = Number(streak ?? 0);
  if (!n || n < 1) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ring-1",
        dimmed
          ? "bg-neutral-500/15 text-neutral-400 ring-neutral-500/25"
          : "bg-orange-500/15 text-orange-300 ring-orange-500/25",
        className,
      )}
      title={`${n} day login streak · resets at midnight (Nepal time) if you miss a day`}
    >
      <span
        className={cn("text-[12px] leading-none", dimmed && "grayscale opacity-60")}
        aria-hidden
      >
        🔥
      </span>
      <span className="leading-none">{n > 99 ? "99+" : n}</span>
    </span>
  );
}

export function StreakBadge({
  streak,
  longest,
  className,
  compact,
}: {
  streak: number;
  longest?: number;
  className?: string;
  compact?: boolean;
}) {
  if (!streak || streak <= 0) {
    if (compact) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-400",
          className,
        )}
      >
        <span className="grayscale opacity-50" aria-hidden>
          🔥
        </span>
        No streak yet — log in daily
      </span>
    );
  }

  if (compact) {
    return <InlineStreak streak={streak} className={className} />;
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={longest ? `Best: ${longest} days · Nepal midnight calendar` : "Nepal midnight calendar"}
    >
      <InlineStreak streak={streak} />
      <span className="text-xs font-medium text-orange-200/80">day streak</span>
      {longest != null && longest > streak && (
        <span className="text-xs font-normal text-orange-200/50">· best {longest}</span>
      )}
    </span>
  );
}
