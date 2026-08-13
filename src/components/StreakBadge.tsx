import { cn } from "@/lib/utils";

/** Compact identity badge: 🔥12 — used beside usernames everywhere */
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
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums text-amber-300",
        className,
      )}
      title={`${n} day login streak`}
    >
      <span aria-hidden>🔥</span>
      {n}
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
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-200",
        className,
      )}
      title={longest ? `Best: ${longest} days` : undefined}
    >
      <span aria-hidden>🔥⚽</span>
      <span className="tabular-nums">{streak}</span>
      <span className="font-medium text-amber-200/80">day streak</span>
      {longest != null && longest > streak && (
        <span className="font-normal text-amber-200/60">· best {longest}</span>
      )}
    </span>
  );
}
