import { cn } from "@/lib/utils";

/**
 * Clean compact streak chip — flame + number, no heavy gradient bar.
 */
export function InlineStreak({
  streak,
  className,
}: {
  streak?: number | null;
  className?: string;
}) {
  const n = Number(streak ?? 0);
  if (!n || n < 1) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-orange-300 ring-1 ring-orange-500/25",
        className,
      )}
      title={`${n} day login streak`}
    >
      <span className="text-[12px] leading-none" aria-hidden>
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
        No streak yet
      </span>
    );
  }

  if (compact) {
    return <InlineStreak streak={streak} className={className} />;
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={longest ? `Best: ${longest} days` : undefined}
    >
      <InlineStreak streak={streak} />
      <span className="text-xs font-medium text-orange-200/80">day streak</span>
      {longest != null && longest > streak && (
        <span className="text-xs font-normal text-orange-200/50">· best {longest}</span>
      )}
    </span>
  );
}
