/**
 * Client-side security helpers for NepARENA.
 * Real enforcement is Supabase RLS + SECURITY DEFINER RPCs.
 * These helpers prevent accidental client misuse and strip noisy errors.
 */
import { supabase } from "./supabase";
import { isSuperAdminEmail } from "./organizers";

export function publicErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : fallback;

  // Never surface internal DB / schema details to end users
  const lower = raw.toLowerCase();
  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("jwt") ||
    lower.includes("policy") ||
    lower.includes("column") ||
    lower.includes("relation") ||
    lower.includes("schema cache") ||
    lower.includes("violates") ||
    lower.includes("sql")
  ) {
    return "You don’t have permission to do that.";
  }
  if (raw.length > 160) return fallback;
  return raw || fallback;
}

export async function requireSessionUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sign in required");
  }
  return data.user.id;
}

export async function requireSameUser(claimedUserId: string): Promise<string> {
  const uid = await requireSessionUserId();
  if (uid !== claimedUserId) {
    throw new Error("Unauthorized");
  }
  return uid;
}

export function assertSuperAdminEmail(email: string | null | undefined): void {
  if (!isSuperAdminEmail(email)) {
    throw new Error("Forbidden");
  }
}
