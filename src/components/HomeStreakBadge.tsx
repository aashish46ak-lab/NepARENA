import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfileStreak, recordLoginStreak } from "@/lib/streaks";

/** Shows beside NepARENA title — starts from day 1 on first login */
export function HomeStreakBadge() {
  const { user, loading } = useAuth();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const rec = await recordLoginStreak();
      let s = rec.ok ? rec.streak : 0;
      if (!s) {
        const f = await fetchProfileStreak(user.id);
        s = f.streak;
      }
      // Day-one: show at least 1 after successful record
      if (rec.ok && s < 1) s = 1;
      if (!cancelled) setStreak(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (!user) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-100"
      title="Your login streak"
    >
      <span className="relative grid h-6 w-6 place-items-center">
        <span className="text-base leading-none">⚽</span>
        <span className="absolute -right-0.5 -top-0.5 text-[10px]">🔥</span>
      </span>
      <span className="tabular-nums">{streak || 1}</span>
      <span className="font-medium text-amber-200/80">day streak</span>
    </span>
  );
}
