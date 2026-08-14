import { cn } from "@/lib/utils";

/** Premium flame with number inside — used beside usernames everywhere */
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
        "relative inline-flex h-5 min-w-5 items-center justify-center",
        className,
      )}
      title={`${n} day login streak`}
    >
      <span
        className="pointer-events-none absolute inset-0 animate-pulse rounded-full bg-orange-500/25 blur-[6px]"
        aria-hidden
      />
      <span className="relative text-[15px] leading-none drop-shadow-[0_0_6px_rgba(251,146,60,0.7)]" aria-hidden>
        🔥
      </span>
      <span className="absolute inset-0 flex items-center justify-center pt-[3px] text-[9px] font-bold tabular-nums leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
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
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-100",
        className,
      )}
      title={longest ? `Best: ${longest} days` : undefined}
    >
      <InlineStreak streak={streak} />
      <span className="font-medium text-orange-200/90">day streak</span>
      {longest != null && longest > streak && (
        <span className="font-normal text-orange-200/55">· best {longest}</span>
      )}
    </span>
  );
}
