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

const ORGANIZER_THEMES = [
  { id: "black-silver", label: "Black & Silver" },
  { id: "midnight-blue", label: "Midnight Blue" },
  { id: "emerald", label: "Emerald" },
  { id: "crimson", label: "Crimson" },
  { id: "royal-gold", label: "Royal Gold" },
  { id: "violet", label: "Violet" },
  { id: "slate", label: "Slate" },
] as const;

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
    const themeId =
      (row as SiteSettings & { theme_id?: string | null }).theme_id ??
      "black-silver";
    const { error } = await supabase.from("site_settings").update({
      site_name: row.site_name, tagline: row.tagline, logo_url: row.logo_url,
      hero_title: row.hero_title, hero_subtitle: row.hero_subtitle, hero_image_url: row.hero_image_url,
      about_short: row.about_short, footer_text: row.footer_text,
    }).eq("id", row.id);
    await supabase
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
      .eq("slug", "efootball-nepal");
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Site settings saved — theme applied to public page");
    qc.invalidateQueries({ queryKey: ["site_settings"] });
    qc.invalidateQueries({ queryKey: ["organizer"] });
    qc.invalidateQueries({ queryKey: ["active_organizers_page"] });
  };

  const currentTheme =
    (row as SiteSettings & { theme_id?: string | null }).theme_id ?? "black-silver";

  return (
    <AdminSection title="Site settings" description="Branding, hero, theme, and site-wide text.">
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
          <Field label="Theme">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ORGANIZER_THEMES.map((th) => {
                const selected = currentTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => patch({ theme_id: th.id } as Partial<SiteSettings>)}
                    className={`aspect-square rounded-xl border-2 p-2 text-left transition ${
                      selected
                        ? "border-white ring-2 ring-white/30"
                        : "border-white/10 hover:border-white/25"
                    }`}
                    style={{
                      background:
                        th.id === "midnight-blue"
                          ? "linear-gradient(135deg,#1e3a8a,#60a5fa)"
                          : th.id === "emerald"
                            ? "linear-gradient(135deg,#047857,#34d399)"
                            : th.id === "crimson"
                              ? "linear-gradient(135deg,#b91c1c,#f87171)"
                              : th.id === "royal-gold"
                                ? "linear-gradient(135deg,#a16207,#fbbf24)"
                                : th.id === "violet"
                                  ? "linear-gradient(135deg,#6d28d9,#a78bfa)"
                                  : th.id === "slate"
                                    ? "linear-gradient(135deg,#334155,#94a3b8)"
                                    : "linear-gradient(135deg,#0a0a0a,#d4d4d4)",
                    }}
                  >
                    <span className="block text-[10px] font-semibold text-white drop-shadow">
                      {th.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
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
