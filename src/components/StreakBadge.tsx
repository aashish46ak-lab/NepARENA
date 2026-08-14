import { cn } from "@/lib/utils";

/** White circle in fire with black number — used beside usernames everywhere */
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
        "relative inline-flex h-6 w-6 shrink-0 items-center justify-center",
        className,
      )}
      title={`${n} day login streak`}
    >
      <span
        className="pointer-events-none absolute -inset-1 animate-pulse rounded-full bg-gradient-to-t from-orange-600/50 via-amber-400/30 to-transparent blur-[4px]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-300 opacity-90"
        aria-hidden
        style={{
          maskImage:
            "radial-gradient(circle at 50% 55%, transparent 42%, black 46%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 55%, transparent 42%, black 46%)",
        }}
      />
      <span className="pointer-events-none absolute -top-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-300/90 blur-[1px]" aria-hidden />
      <span className="relative z-[1] grid h-[18px] w-[18px] place-items-center rounded-full bg-white shadow-[0_0_6px_rgba(251,146,60,0.55)] ring-1 ring-orange-400/40">
        <span className="text-[9px] font-black tabular-nums leading-none text-black">
          {n > 99 ? "99+" : n}
        </span>
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
