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

/**
 * Persist theme to organizers with resilient fallbacks:
 * 1) Prefer secure RPC (bypasses RLS when available)
 * 2) Update by DEFAULT_ORGANIZER_SLUG
 * 3) Update first active organizer
 * 4) Insert default organizer row
 */
export async function saveOrganizerTheme(
  payload: OrgThemePayload,
): Promise<{ id: string }> {
  const orgPayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  // 1) Prefer SECURITY DEFINER RPC if deployed (22 SQL)
  try {
    const rpc = await supabase.rpc("admin_save_organizer_theme", {
      p_slug: DEFAULT_ORGANIZER_SLUG,
      p_name: payload.name,
      p_tagline: payload.tagline,
      p_description: payload.description,
      p_logo_url: payload.logo_url,
      p_banner_url: payload.banner_url,
      p_theme_id: payload.theme_id,
      p_primary_color: payload.primary_color,
      p_secondary_color: payload.secondary_color,
    });
    if (!rpc.error && rpc.data) {
      const id =
        typeof rpc.data === "string"
          ? rpc.data
          : (rpc.data as { id?: string })?.id;
      if (id) return { id };
    }
  } catch {
    // RPC not deployed yet — fall through
  }

  // 2) Direct update by slug
  let { data: updated, error: orgErr } = await supabase
    .from("organizers")
    .update(orgPayload)
    .eq("slug", DEFAULT_ORGANIZER_SLUG)
    .select("id")
    .maybeSingle();

  // 3) First active organizer fallback
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

  // 4) Insert default row
  if (!updated && !orgErr) {
    const ins = await supabase
      .from("organizers")
      .insert({
        slug: DEFAULT_ORGANIZER_SLUG,
        status: "active",
        is_verified: true,
        contact_email: "aashish46ak@gmail.com",
        ...orgPayload,
      })
      .select("id")
      .maybeSingle();
    updated = ins.data;
    orgErr = ins.error;
  }

  if (orgErr) {
    const msg = orgErr.message || "Unknown error";
    if (msg.includes("theme_id") || msg.includes("column")) {
      throw new Error(
        "DB missing theme columns — run supabase-setup/20-security-hardening.sql and 21-organizer-requests.sql in Supabase SQL Editor",
      );
    }
    if (
      msg.toLowerCase().includes("row") ||
      msg.toLowerCase().includes("policy") ||
      msg.toLowerCase().includes("permission") ||
      msg.toLowerCase().includes("rls")
    ) {
      throw new Error(
        "Organizer row not found / RLS blocked — run SQL 20 + 21 + 22, then retry. Sign in as platform super admin.",
      );
    }
    throw new Error(msg);
  }
  if (!updated?.id) {
    throw new Error(
      "Organizer row not found for theme save — run supabase-setup/21-organizer-requests.sql and 22-theme-save-rpc.sql",
    );
  }
  return { id: updated.id as string };
}
