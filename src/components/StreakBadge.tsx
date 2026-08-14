import { cn } from "@/lib/utils";

/**
 * Curved pill: fire emoji on the left, black number on the right.
 * Used beside usernames and on profiles.
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
        "inline-flex h-6 shrink-0 items-center overflow-hidden rounded-full border border-orange-500/40 bg-gradient-to-r from-orange-600/90 via-amber-500/80 to-amber-400/70 shadow-[0_0_10px_rgba(251,146,60,0.35)]",
        className,
      )}
      title={`${n} day login streak`}
    >
      <span className="flex h-full items-center justify-center pl-1.5 pr-0.5 text-[13px] leading-none" aria-hidden>
        🔥
      </span>
      <span className="flex h-full items-center rounded-full bg-black/85 px-1.5 text-[11px] font-black tabular-nums leading-none text-white ring-1 ring-orange-400/30">
        {n > 99 ? "99+" : n}
      </span>
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
        ⚽ No streak yet
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
      <span className="text-xs font-medium text-orange-200/90">day streak</span>
      {longest != null && longest > streak && (
        <span className="text-xs font-normal text-orange-200/55">· best {longest}</span>
      )}
    </span>
  );
}
