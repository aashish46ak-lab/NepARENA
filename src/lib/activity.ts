import { supabase } from "@/lib/supabase";

/** Best-effort admin audit trail — never blocks the UI. */
export async function logActivity(action: string, details: Record<string, unknown> = {}) {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({ actor_id: data.user?.id ?? null, action, details });
  } catch {
    /* logging must never break the action it records */
  }
}