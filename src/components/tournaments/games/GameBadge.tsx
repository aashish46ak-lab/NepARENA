import { getGame } from "@/lib/games";
import { cn } from "@/lib/utils";

export function GameBadge({
  gameId,
  className,
}: {
  gameId?: string | null;
  className?: string;
}) {
  const g = getGame(gameId);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        g.theme.badgeClass,
        className,
      )}
    >
      <span aria-hidden>{g.theme.iconHint}</span>
      {g.shortName}
    </span>
  );
}
