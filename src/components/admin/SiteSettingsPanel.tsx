import { useEffect, useState } from "react";
import { AdminSection } from "./AdminUI";
import { supabase, type SiteSettings } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getTheme, THEME_PRESETS, type ThemeId } from "@/lib/themes";
import { DEFAULT_ORGANIZER_SLUG } from "@/lib/organizers";
import { cn } from "@/lib/utils";

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
      const { data: org } = await supabase
        .from("organizers")
        .select("theme_id")
        .eq("slug", DEFAULT_ORGANIZER_SLUG)
        .maybeSingle();
      const fromOrg = (org as { theme_id?: string | null } | null)?.theme_id;
      const fromSite = (data as SiteSettings & { theme_id?: string | null } | null)?.theme_id;
      const id = (fromOrg || fromSite || "black-silver") as ThemeId;
      setThemeId(THEME_PRESETS.some((t) => t.id === id) ? id : "black-silver");
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

      // Primary write: organizers.theme_id powers public /o/$slug
      const { data: updated, error: orgErr } = await supabase
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
        .eq("slug", DEFAULT_ORGANIZER_SLUG)
        .select("id, theme_id")
        .maybeSingle();

      if (orgErr) {
        // Column may be missing — try SQL hint
        throw new Error(
          orgErr.message.includes("theme_id")
            ? "theme_id column missing — run supabase-setup/19-messages-theme-storage.sql"
            : orgErr.message,
        );
      }
      if (!updated) {
        throw new Error("Organizer row not found for theme save");
      }

      await supabase
        .from("site_settings")
        .update({ theme_id: themeId } as Record<string, unknown>)
        .eq("id", row.id);

      toast.success(`Theme “${theme.label}” saved — open public organizer page`);
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
    <div
      className="rounded-2xl border border-white/10 p-1 transition-all duration-300"
      style={{
        backgroundImage: theme.pageBg,
        backgroundColor: "rgba(10,10,10,0.92)",
      }}
    >
      {/* Mini cover strip so whole settings panel feels themed */}
      <div className="h-2 rounded-t-xl" style={{ background: theme.cover }} />

      <AdminSection
        title="Site settings"
        description={`Live theme: ${theme.label}. Save applies to the full public organizer page.`}
      >
        <div className="mb-5">
          <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
            Theme
          </Label>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map((th) => {
              const selected = themeId === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  title={th.label}
                  onClick={() => setThemeId(th.id)}
                  className={cn(
                    "relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 transition",
                    selected
                      ? "border-white scale-110 shadow-lg"
                      : "border-white/20 hover:border-white/50",
                  )}
                  style={{ background: th.cover }}
                >
                  {selected && (
                    <span className="absolute inset-0 grid place-items-center bg-black/30">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs" style={{ color: theme.accent }}>
            {theme.label} — panel preview live · Save to publish
          </p>
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-white/10">
          <div className="h-16 w-full sm:h-20" style={{ background: theme.cover }} />
          <div className="bg-black/40 p-3">
            <p className="text-base font-bold" style={{ color: theme.accent, textShadow: theme.nameShadow }}>
              {row.site_name || "Organizer"}
            </p>
            <p className="text-xs text-neutral-400">{row.tagline || "Public page preview"}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Site name">
              <Input value={row.site_name} onChange={(e) => patch({ site_name: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={row.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
            </Field>
            <Field label="Hero title">
              <Input value={row.hero_title} onChange={(e) => patch({ hero_title: e.target.value })} />
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
              <Input value={row.footer_text} onChange={(e) => patch({ footer_text: e.target.value })} />
            </Field>
          </div>
          <div className="space-y-4">
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
            className="text-black"
            style={{ background: theme.cover }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </AdminSection>
    </div>
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
