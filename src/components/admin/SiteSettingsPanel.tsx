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
import { DEFAULT_ORGANIZER_SLUG } from "@/lib/organizers";
import { saveOrganizerTheme } from "@/lib/save-organizer-theme";

export function SiteSettingsPanel() {
  const [row, setRow] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("site_settings").select("*").maybeSingle();
      setRow(data as SiteSettings | null);
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

      await saveOrganizerTheme({
        name: row.site_name || "eFootball Nepal",
        tagline: row.tagline,
        description: row.about_short,
        logo_url: row.logo_url,
        banner_url: row.hero_image_url,
        theme_id: "black-silver",
        primary_color: "#0a0a0a",
        secondary_color: "#525252",
      });

      toast.success("Branding saved — logo applied to organizer card & public page");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
      qc.invalidateQueries({ queryKey: ["organizer"] });
      qc.invalidateQueries({ queryKey: ["active_organizers_page"] });
      qc.invalidateQueries({ queryKey: ["org_card"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-1">
      <AdminSection
        title="Site branding"
        description="Logo and cover sync to the public organizer card and /o page. Theme options will return later."
      >
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/15">
            {row.logo_url ? (
              <img src={row.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-neutral-500">Logo</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">{row.site_name || "Organizer"}</p>
            <p className="truncate text-xs text-neutral-400">{row.tagline || "Public card preview"}</p>
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
              <Textarea rows={3} value={row.hero_subtitle} onChange={(e) => patch({ hero_subtitle: e.target.value })} />
            </Field>
            <Field label="About (short)">
              <Textarea rows={4} value={row.about_short} onChange={(e) => patch({ about_short: e.target.value })} />
            </Field>
            <Field label="Footer text">
              <Input value={row.footer_text} onChange={(e) => patch({ footer_text: e.target.value })} />
            </Field>
          </div>
          <div className="space-y-4">
            <Field label="Logo (organizer card)">
              <ImageUpload value={row.logo_url} onChange={(u) => patch({ logo_url: u })} folder="branding" aspect="square" />
              <p className="mt-1 text-[11px] text-neutral-500">Shown on organizer cards and public profile.</p>
            </Field>
            <Field label="Banner / cover image">
              <ImageUpload value={row.hero_image_url} onChange={(u) => patch({ hero_image_url: u })} folder="branding" aspect="wide" />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save branding"}
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
