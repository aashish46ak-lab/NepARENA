import { useEffect, useState } from "react";
import { AdminSection } from "./AdminUI";
import { supabase, type SiteSettings } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getTheme, THEME_PRESETS, type ThemeId } from "@/lib/themes";
import { DEFAULT_ORGANIZER_SLUG } from "@/lib/organizers";

export function SiteSettingsPanel() {
  const [row, setRow] = useState<SiteSettings | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>("black-silver");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("site_settings").select("*").maybeSingle();
      setRow(data as SiteSettings | null);
      // Prefer theme from organizer row (source of truth for public page)
      const { data: org } = await supabase
        .from("organizers")
        .select("theme_id")
        .eq("slug", DEFAULT_ORGANIZER_SLUG)
        .maybeSingle();
      const fromOrg = (org as { theme_id?: string | null } | null)?.theme_id;
      const fromSite = (data as SiteSettings & { theme_id?: string | null } | null)?.theme_id;
      const id = (fromOrg || fromSite || "black-silver") as ThemeId;
      setThemeId(
        THEME_PRESETS.some((t) => t.id === id) ? id : "black-silver",
      );
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div className="text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  if (!row)
    return (
      <div className="text-muted-foreground">
        No site_settings row found. Run the SQL setup script.
      </div>
    );

  const patch = (p: Partial<SiteSettings>) => setRow({ ...row, ...p });
  const theme = getTheme(themeId);

  const save = async () => {
    setSaving(true);
    try {
      // Save site_settings (ignore unknown theme_id column errors)
      const { error } = await supabase
        .from("site_settings")
        .update({
          site_name: row.site_name,
          tagline: row.tagline,
          logo_url: row.logo_url,
          hero_title: row.hero_title,
          hero_subtitle: row.hero_subtitle,
          hero_image_url: row.hero_image_url,
          about_short: row.about_short,
          footer_text: row.footer_text,
        })
        .eq("id", row.id);
      if (error) throw error;

      // Theme MUST land on organizers — public /o/$slug reads this
      const { error: orgErr } = await supabase
        .from("organizers")
        .update({
          name: row.site_name || "eFootball Nepal",
          tagline: row.tagline,
          description: row.about_short,
          logo_url: row.logo_url,
          banner_url: row.hero_image_url,
          theme_id: themeId,
          updated_at: new Date().toISOString(),
        })
        .eq("slug", DEFAULT_ORGANIZER_SLUG);
      if (orgErr) throw orgErr;

      // Best-effort site_settings.theme_id if column exists
      await supabase
        .from("site_settings")
        .update({ theme_id: themeId } as Record<string, unknown>)
        .eq("id", row.id);

      toast.success("Saved — theme applied on public organizer page");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
      qc.invalidateQueries({ queryKey: ["organizer"] });
      qc.invalidateQueries({ queryKey: ["active_organizers_page"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSection
      title="Site settings"
      description="Branding, hero, theme, and site-wide text. Theme applies to your public organizer page."
    >
      {/* Live theme preview */}
      <div
        className="mb-6 overflow-hidden rounded-2xl border border-white/10"
        style={{ backgroundImage: theme.pageBg }}
      >
        <div className="h-24 w-full" style={{ background: theme.cover }} />
        <div className="p-4">
          <p
            className="text-lg font-bold text-foreground"
            style={{ textShadow: theme.nameShadow, color: theme.accent }}
          >
            {row.site_name || "Organizer"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Live preview · {theme.label}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Field label="Site name">
            <Input
              value={row.site_name}
              onChange={(e) => patch({ site_name: e.target.value })}
            />
          </Field>
          <Field label="Tagline">
            <Input
              value={row.tagline}
              onChange={(e) => patch({ tagline: e.target.value })}
            />
          </Field>
          <Field label="Hero title">
            <Input
              value={row.hero_title}
              onChange={(e) => patch({ hero_title: e.target.value })}
            />
          </Field>
          <Field label="Hero subtitle">
            <Textarea
              rows={3}
              value={row.hero_subtitle}
              onChange={(e) => patch({ hero_subtitle: e.target.value })}
            />
          </Field>
          <Field label="About (short)">
            <Textarea
              rows={4}
              value={row.about_short}
              onChange={(e) => patch({ about_short: e.target.value })}
            />
          </Field>
          <Field label="Footer text">
            <Input
              value={row.footer_text}
              onChange={(e) => patch({ footer_text: e.target.value })}
            />
          </Field>
        </div>
        <div className="space-y-4">
          <Field label="Theme (tap to preview)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THEME_PRESETS.map((th) => {
                const selected = themeId === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setThemeId(th.id)}
                    className={`aspect-square rounded-xl border-2 p-2 text-left transition ${
                      selected
                        ? "border-white ring-2 ring-white/40 scale-[1.02]"
                        : "border-white/10 hover:border-white/25"
                    }`}
                    style={{ background: th.cover }}
                  >
                    <span className="block text-[10px] font-semibold text-white drop-shadow">
                      {th.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Selected: <strong>{theme.label}</strong> — click Save to apply on public page
            </p>
          </Field>
          <Field label="Logo">
            <ImageUpload
              value={row.logo_url}
              onChange={(u) => patch({ logo_url: u })}
              folder="branding"
              aspect="square"
            />
          </Field>
          <Field label="Hero / cover image">
            <ImageUpload
              value={row.hero_image_url}
              onChange={(u) => patch({ hero_image_url: u })}
              folder="branding"
              aspect="wide"
            />
          </Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => void save()}
          disabled={saving}
          className="bg-gradient-brand text-primary-foreground"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>
    </AdminSection>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
