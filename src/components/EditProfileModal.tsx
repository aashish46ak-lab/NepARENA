/**
 * Expandable Edit Profile modal — Instagram-style sheet.
 * Fields: photo, banner, display name, username, bio, club, national team,
 * player, country, social links, tags. Preview + Save.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase, type Profile } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = {
  avatar_url: string | null;
  banner_url: string | null;
  full_name: string;
  username: string;
  bio: string;
  favourite_club: string;
  favourite_national_team: string;
  favourite_player: string;
  country: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  youtube: string;
  tags: string;
};

function linksOf(p: Profile | null): Record<string, string> {
  return ((p?.social_links ?? {}) as Record<string, string>) || {};
}

function fromProfile(p: Profile): FormState {
  const links = linksOf(p);
  return {
    avatar_url: p.avatar_url,
    banner_url: links.banner_url || null,
    full_name: p.full_name ?? "",
    username: p.username ?? "",
    bio: p.bio ?? "",
    favourite_club: p.favourite_club ?? "",
    favourite_national_team: links.favourite_national_team ?? "",
    favourite_player: links.favourite_player ?? "",
    country: p.country ?? "",
    instagram: links.instagram ?? "",
    twitter: links.twitter ?? links.x ?? "",
    tiktok: links.tiktok ?? "",
    youtube: links.youtube ?? "",
    tags: links.tags ?? "",
  };
}

export function EditProfileModal({ open, onOpenChange }: Props) {
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const p =
        (data as Profile) ??
        ({
          id: user.id,
          username: null,
          full_name: null,
          avatar_url: null,
          favourite_club: null,
          bio: null,
          country: null,
          social_links: {},
          is_suspended: false,
          has_password: false,
          created_at: new Date().toISOString(),
        } as Profile);
      setForm(fromProfile(p));
      setLoading(false);
      setPreview(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const save = async () => {
    if (!form || !user) return;
    const raw = form.username.trim();
    if (raw) {
      if (/\s/.test(raw)) return toast.error("Username cannot contain spaces");
      if (!/^[A-Za-z0-9._]{3,24}$/.test(raw)) {
        return toast.error("Username: 3–24 chars, letters/numbers/._ only");
      }
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", raw)
        .neq("id", user.id)
        .maybeSingle();
      if (taken) return toast.error("Username is already taken");
    }

    setSaving(true);
    const social_links: Record<string, string> = {};
    if (form.banner_url) social_links.banner_url = form.banner_url;
    if (form.favourite_national_team.trim())
      social_links.favourite_national_team = form.favourite_national_team.trim();
    if (form.favourite_player.trim())
      social_links.favourite_player = form.favourite_player.trim();
    if (form.instagram.trim()) social_links.instagram = form.instagram.trim();
    if (form.twitter.trim()) social_links.twitter = form.twitter.trim();
    if (form.tiktok.trim()) social_links.tiktok = form.tiktok.trim();
    if (form.youtube.trim()) social_links.youtube = form.youtube.trim();
    if (form.tags.trim()) social_links.tags = form.tags.trim();

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: raw || null,
      full_name: form.full_name.trim() || null,
      avatar_url: form.avatar_url,
      favourite_club: form.favourite_club.trim() || null,
      bio: form.bio.trim() || null,
      country: form.country.trim() || null,
      social_links,
    });
    setSaving(false);
    if (error) {
      if (error.message.toLowerCase().includes("unique")) {
        return toast.error("Username is already taken");
      }
      return toast.error(error.message);
    }
    toast.success("Profile updated");
    await refreshProfile();
    void qc.invalidateQueries({ queryKey: ["member_profile"] });
    void qc.invalidateQueries({ queryKey: ["latest_members"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden border-white/12 bg-[#121214] p-0 sm:max-w-lg [&>button]:hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-base font-semibold text-white">
              Edit profile
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                preview
                  ? "bg-sky-500/20 text-sky-300"
                  : "text-neutral-400 hover:bg-white/8 hover:text-white",
              )}
            >
              {preview ? "Edit" : "Preview"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading || !form ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          ) : preview ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="relative h-28 bg-gradient-to-br from-sky-900 via-slate-900 to-violet-950">
                {form.banner_url ? (
                  <img
                    src={form.banner_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              </div>
              <div className="relative px-4 pb-5">
                <div className="-mt-10 mb-3 h-20 w-20 overflow-hidden rounded-full ring-4 ring-[#121214]">
                  {form.avatar_url ? (
                    <img
                      src={form.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-white/10 text-lg font-bold text-white">
                      {(form.username || form.full_name || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="text-lg font-semibold text-white">
                  {form.full_name || form.username || "Display name"}
                </p>
                {form.username && (
                  <p className="text-sm text-neutral-400">@{form.username}</p>
                )}
                {form.bio && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">
                    {form.bio}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-400">
                  {form.country && <span>📍 {form.country}</span>}
                  {form.favourite_club && <span>⚽ {form.favourite_club}</span>}
                  {form.favourite_national_team && (
                    <span>🏳️ {form.favourite_national_team}</span>
                  )}
                  {form.favourite_player && <span>⭐ {form.favourite_player}</span>}
                </div>
                {form.tags && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.tags
                      .split(/[,#]+/)
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-neutral-300"
                        >
                          #{t}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Banner
                </p>
                <ImageUpload
                  value={form.banner_url}
                  onChange={(url) => set("banner_url", url)}
                  folder="profiles"
                  aspect="wide"
                  label=""
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Profile photo
                </p>
                <ImageUpload
                  value={form.avatar_url}
                  onChange={(url) => set("avatar_url", url)}
                  folder="profiles"
                  aspect="square"
                  label=""
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">
                    Display name
                  </label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    className="h-10 border-white/10 bg-white/[0.04]"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">
                    Username
                  </label>
                  <Input
                    value={form.username}
                    onChange={(e) => set("username", e.target.value)}
                    className="h-10 border-white/10 bg-white/[0.04]"
                    placeholder="unique_handle"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400">Bio</label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  rows={3}
                  maxLength={280}
                  className="resize-none border-white/10 bg-white/[0.04]"
                  placeholder="Tell the community about yourself"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Country</label>
                  <Input
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    className="h-10 border-white/10 bg-white/[0.04]"
                    placeholder="Nepal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Favorite club</label>
                  <Input
                    value={form.favourite_club}
                    onChange={(e) => set("favourite_club", e.target.value)}
                    className="h-10 border-white/10 bg-white/[0.04]"
                    placeholder="e.g. Barcelona"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Favorite national team</label>
                  <Input
                    value={form.favourite_national_team}
                    onChange={(e) => set("favourite_national_team", e.target.value)}
                    className="h-10 border-white/10 bg-white/[0.04]"
                    placeholder="e.g. Brazil"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Favorite player</label>
                  <Input
                    value={form.favourite_player}
                    onChange={(e) => set("favourite_player", e.target.value)}
                    className="h-10 border-white/10 bg-white/[0.04]"
                    placeholder="e.g. Messi"
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Social links</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["instagram", "twitter", "tiktok", "youtube"] as const).map((key) => (
                    <Input
                      key={key}
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className="h-10 border-white/10 bg-white/[0.04]"
                      placeholder={key === "twitter" ? "X / Twitter" : key[0].toUpperCase() + key.slice(1)}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400">Tags</label>
                <Input
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  className="h-10 border-white/10 bg-white/[0.04]"
                  placeholder="efootball, striker, nepal (comma separated)"
                />
              </div>
            </div>
          )}
        </div>

        {!loading && form && (
          <div className="shrink-0 border-t border-white/8 px-4 py-3">
            <Button
              className="w-full rounded-xl bg-sky-500 font-semibold text-white hover:bg-sky-400"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
