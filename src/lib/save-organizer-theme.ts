import { supabase } from "./supabase";
import { DEFAULT_ORGANIZER_SLUG } from "./organizers";

export type OrgThemePayload = {
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  theme_id: string;
  primary_color: string;
  secondary_color: string;
};

/** Persist theme to organizers with resilient fallbacks (slug → first active → insert). */
export async function saveOrganizerTheme(payload: OrgThemePayload): Promise<{ id: string }> {
  const orgPayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  let { data: updated, error: orgErr } = await supabase
    .from("organizers")
    .update(orgPayload)
    .eq("slug", DEFAULT_ORGANIZER_SLUG)
    .select("id")
    .maybeSingle();

  if (!updated && !orgErr) {
    const { data: anyOrg } = await supabase
      .from("organizers")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (anyOrg?.id) {
      const res = await supabase
        .from("organizers")
        .update(orgPayload)
        .eq("id", anyOrg.id)
        .select("id")
        .maybeSingle();
      updated = res.data;
      orgErr = res.error;
    }
  }

  if (!updated && !orgErr) {
    const ins = await supabase
      .from("organizers")
      .insert({
        slug: DEFAULT_ORGANIZER_SLUG,
        status: "active",
        is_verified: true,
        ...orgPayload,
      })
      .select("id")
      .maybeSingle();
    updated = ins.data;
    orgErr = ins.error;
  }

  if (orgErr) {
    throw new Error(
      orgErr.message.includes("theme_id")
        ? "theme_id column missing — run supabase-setup/21-organizer-requests.sql"
        : orgErr.message,
    );
  }
  if (!updated?.id) {
    throw new Error("Could not save theme — run SQL 21 (creates default organizer)");
  }
  return { id: updated.id as string };
}
