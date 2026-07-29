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

export function SiteSettingsPanel() {
  const [row, setRow] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.from("site_settings").select("*").maybeSingle().then(({ data }) => {
      setRow(data as SiteSettings | null);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (!row) return <div className="text-muted-foreground">No site_settings row found. Run the SQL setup script.</div>;

  const patch = (p: Partial<SiteSettings>) => setRow({ ...row, ...p });
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({
      site_name: row.site_name, tagline: row.tagline, logo_url: row.logo_url,
      hero_title: row.hero_title, hero_subtitle: row.hero_subtitle, hero_image_url: row.hero_image_url,
      about_short: row.about_short, footer_text: row.footer_text,
    }).eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Site settings saved");
    qc.invalidateQueries({ queryKey: ["site_settings"] });
  };

  return (
    <AdminSection title="Site settings" description="Branding, hero, and site-wide text.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Field label="Site name"><Input value={row.site_name} onChange={(e) => patch({ site_name: e.target.value })} /></Field>
          <Field label="Tagline"><Input value={row.tagline} onChange={(e) => patch({ tagline: e.target.value })} /></Field>
          <Field label="Hero title"><Input value={row.hero_title} onChange={(e) => patch({ hero_title: e.target.value })} /></Field>
          <Field label="Hero subtitle"><Textarea rows={3} value={row.hero_subtitle} onChange={(e) => patch({ hero_subtitle: e.target.value })} /></Field>
          <Field label="About (short)"><Textarea rows={4} value={row.about_short} onChange={(e) => patch({ about_short: e.target.value })} /></Field>
          <Field label="Footer text"><Input value={row.footer_text} onChange={(e) => patch({ footer_text: e.target.value })} /></Field>
        </div>
        <div className="space-y-4">
          <Field label="Logo"><ImageUpload value={row.logo_url} onChange={(u) => patch({ logo_url: u })} folder="branding" aspect="square" /></Field>
          <Field label="Hero image"><ImageUpload value={row.hero_image_url} onChange={(u) => patch({ hero_image_url: u })} folder="branding" aspect="wide" /></Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>
    </AdminSection>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}