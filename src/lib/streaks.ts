import { supabase } from "./supabase";

export type StreakResult = {
  ok: boolean;
  streak: number;
  longest: number;
  already_today?: boolean;
  dim_until?: string | null;
  local_date?: string | null;
  error?: string;
};

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kathmandu";
  } catch {
    return "Asia/Kathmandu";
  }
}

export function localDateString(tz = detectUserTimezone(), d = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export async function recordLoginStreak(): Promise<StreakResult> {
  const tz = detectUserTimezone();
  let { data, error } = await supabase.rpc("record_login_streak", { p_tz: tz });
  if (error) {
    const retry = await supabase.rpc("record_login_streak");
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    return { ok: false, streak: 0, longest: 0, error: error.message };
  }
  const row = data as {
    ok?: boolean;
    streak?: number;
    longest?: number;
    already_today?: boolean;
    dim_until?: string;
    local_date?: string;
    error?: string;
  } | null;
  return {
    ok: !!row?.ok,
    streak: Number(row?.streak ?? 0),
    longest: Number(row?.longest ?? 0),
    already_today: !!row?.already_today,
    dim_until: row?.dim_until ?? null,
    local_date: row?.local_date ?? null,
    error: row?.error,
  };
}

export async function fetchProfileStreak(userId: string): Promise<{
  streak: number;
  longest: number;
  dimmed: boolean;
  last_login_date?: string | null;
}> {
  const { data } = await supabase
    .from("profiles")
    .select("login_streak, longest_login_streak, last_login_date")
    .eq("id", userId)
    .maybeSingle();

  const raw = Number((data as { login_streak?: number } | null)?.login_streak ?? 0);
  const longest = Number(
    (data as { longest_login_streak?: number } | null)?.longest_login_streak ?? 0,
  );
  const last = (data as { last_login_date?: string | null } | null)?.last_login_date ?? null;

  const tz = detectUserTimezone();
  const today = localDateString(tz);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = localDateString(tz, y);

  let streak = raw;
  let dimmed = false;

  if (!last) {
    streak = 0;
  } else if (last === today) {
    dimmed = false;
  } else if (last === yesterday) {
    dimmed = true;
  } else {
    streak = 0;
    dimmed = true;
  }

  return { streak, longest, dimmed, last_login_date: last };
}

export function formatStreak(days: number): string {
  if (days <= 0) return "⚽ Start your streak";
  return `🔥⚽ ${days} Day Streak`;
}
