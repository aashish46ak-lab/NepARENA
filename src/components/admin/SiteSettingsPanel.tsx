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
import {
  buildCover,
  getTheme,
  THEME_PRESETS,
  type ThemeId,
} from "@/lib/themes";
import { DEFAULT_ORGANIZER_SLUG } from "@/lib/organizers";
import { saveOrganizerTheme } from "@/lib/save-organizer-theme";
import { cn } from "@/lib/utils";

export function SiteSettingsPanel() {
  const [row, setRow] = useState<SiteSettings | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>("black-silver");
  const [startColor, setStartColor] = useState("#0a0a0a");
  const [endColor, setEndColor] = useState("#525252");
  const [angle, setAngle] = useState(135);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("site_settings").select("*").maybeSingle();
      setRow(data as SiteSettings | null);
      const { data: org } = await supabase
        .from("organizers")
        .select("theme_id, primary_color, secondary_color")
        .eq("slug", DEFAULT_ORGANIZER_SLUG)
        .maybeSingle();
      const fromOrg = (org as { theme_id?: string | null } | null)?.theme_id;
      const fromSite = (data as SiteSettings & { theme_id?: string | null } | null)?.theme_id;
      const id = (fromOrg || fromSite || "black-silver") as ThemeId;
      const preset = THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0]!;
      setThemeId(THEME_PRESETS.some((t) => t.id === id) ? id : "black-silver");
      const pc = (org as { primary_color?: string | null } | null)?.primary_color;
      const sc = (org as { secondary_color?: string | null } | null)?.secondary_color;
      setStartColor(pc || preset.swatch[0]);
      setEndColor(sc || preset.swatch[1]);
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

  const theme = getTheme(themeId, {
    start: startColor,
    end: endColor,
    accent: endColor,
  });
  const liveCover = buildCover(startColor, endColor, angle);

  const pickPreset = (id: ThemeId) => {
    const p = THEME_PRESETS.find((t) => t.id === id);
    if (!p) return;
    setThemeId(id);
    setStartColor(p.swatch[0]);
    setEndColor(p.swatch[1]);
    setAngle(135);
  };

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
        theme_id: themeId,
        primary_color: startColor,
        secondary_color: endColor,
      });

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
      <div className="h-2 rounded-t-xl" style={{ background: liveCover }} />

      <AdminSection
        title="Site settings"
        description={`Live theme: ${theme.label}. Templates + color graph. Save applies to public page.`}
      >
        <div className="mb-4">
          <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
            Templates
          </Label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {THEME_PRESETS.map((th) => {
              const selected = themeId === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  title={th.label}
                  onClick={() => pickPreset(th.id)}
                  className={cn(
                    "relative overflow-hidden rounded-lg border-2 transition",
                    selected
                      ? "border-white ring-2 ring-white/30"
                      : "border-white/15 hover:border-white/40",
                  )}
                >
                  <div className="h-8 w-full" style={{ background: th.cover }} />
                  <p className="truncate bg-black/50 px-1 py-0.5 text-center text-[9px] text-white">
                    {th.label}
                  </p>
                  {selected && (
                    <span className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-white/10 bg-black/30 p-3">
          <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
            Color graph
          </Label>
          <div
            className="relative h-14 w-full overflow-hidden rounded-lg ring-1 ring-white/15"
            style={{ background: liveCover }}
          >
            <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 py-1 text-[10px] font-mono text-white/90 drop-shadow">
              <span>{startColor}</span>
              <span>{angle}°</span>
              <span>{endColor}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="mb-1 text-[10px] text-muted-foreground">Start</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={startColor}
                  onChange={(e) => {
                    setStartColor(e.target.value);
                    setThemeId("custom");
                  }}
                  className="h-9 w-12 cursor-pointer rounded border border-white/20 bg-transparent"
                />
                <Input
                  value={startColor}
                  onChange={(e) => {
                    setStartColor(e.target.value);
                    setThemeId("custom");
                  }}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] text-muted-foreground">End</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={endColor}
                  onChange={(e) => {
                    setEndColor(e.target.value);
                    setThemeId("custom");
                  }}
                  className="h-9 w-12 cursor-pointer rounded border border-white/20 bg-transparent"
                />
                <Input
                  value={endColor}
                  onChange={(e) => {
                    setEndColor(e.target.value);
                    setThemeId("custom");
                  }}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>
            <div className="col-span-2">
              <p className="mb-1 text-[10px] text-muted-foreground">Angle {angle}°</p>
              <input
                type="range"
                min={0}
                max={360}
                value={angle}
                onChange={(e) => {
                  setAngle(Number(e.target.value));
                  setThemeId("custom");
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-white/10">
          <div className="h-16 w-full sm:h-20" style={{ background: liveCover }} />
          <div className="bg-black/40 p-3">
            <p className="text-base font-bold" style={{ color: endColor, textShadow: theme.nameShadow }}>
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
            <Field label="Logo">
              <ImageUpload value={row.logo_url} onChange={(u) => patch({ logo_url: u })} folder="branding" aspect="square" />
            </Field>
            <Field label="Hero / cover image">
              <ImageUpload value={row.hero_image_url} onChange={(u) => patch({ hero_image_url: u })} folder="branding" aspect="wide" />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => void save()} disabled={saving} className="text-black" style={{ background: liveCover }}>
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
