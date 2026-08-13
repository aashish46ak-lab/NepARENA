import { supabase } from "./supabase";

export type StreakResult = {
  ok: boolean;
  streak: number;
  longest: number;
  already_today?: boolean;
  error?: string;
};

/** Record today's login and return updated streak (server-side calendar logic). */
export async function recordLoginStreak(): Promise<StreakResult> {
  const { data, error } = await supabase.rpc("record_login_streak");
  if (error) {
    return { ok: false, streak: 0, longest: 0, error: error.message };
  }
  const row = data as {
    ok?: boolean;
    streak?: number;
    longest?: number;
    already_today?: boolean;
    error?: string;
  } | null;
  return {
    ok: !!row?.ok,
    streak: Number(row?.streak ?? 0),
    longest: Number(row?.longest ?? 0),
    already_today: !!row?.already_today,
    error: row?.error,
  };
}

export async function fetchProfileStreak(userId: string): Promise<{
  streak: number;
  longest: number;
}> {
  const { data } = await supabase
    .from("profiles")
    .select("login_streak, longest_login_streak")
    .eq("id", userId)
    .maybeSingle();
  return {
    streak: Number((data as { login_streak?: number } | null)?.login_streak ?? 0),
    longest: Number(
      (data as { longest_login_streak?: number } | null)?.longest_login_streak ?? 0,
    ),
  };
}

export function formatStreak(days: number): string {
  if (days <= 0) return "⚽ Start your streak";
  return `🔥⚽ ${days} Day Streak`;
}
