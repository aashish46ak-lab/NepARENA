import { formatStreak } from "@/lib/streaks";
import { cn } from "@/lib/utils";

export function StreakBadge({
  streak,
  longest,
  className,
}: {
  streak: number;
  longest?: number;
  className?: string;
}) {
  if (!streak || streak <= 0) {
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
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-200",
        className,
      )}
      title={longest ? `Best: ${longest} days` : undefined}
    >
      {formatStreak(streak)}
      {longest != null && longest > streak && (
        <span className="font-normal text-amber-200/60">· best {longest}</span>
      )}
    </span>
  );
}
