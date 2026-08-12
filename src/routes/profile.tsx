import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase, type Profile } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ImageUpload";
import {
  AllTimeXiView,
  emptyXi,
  parseXi,
  type AllTimeXi,
} from "@/components/AllTimeXi";
import { toast } from "sonner";
import { Loader2, Shield, UserCog } from "lucide-react";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Profile — NepARENA" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, isAdmin, isOwner, refreshProfile } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [row, setRow] = useState<Profile | null>(null);
  const [xi, setXi] = useState<AllTimeXi>(emptyXi());
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
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
        setRow(p);
        const links = (p.social_links ?? {}) as Record<string, string>;
        setXi(parseXi(links.all_time_xi) ?? emptyXi());
      });
  }, [user]);

  const save = async () => {
    if (!row || !user) return;
    const raw = (row.username ?? "").trim();
    if (raw) {
      if (/\s/.test(raw)) {
        return toast.error("Display Name cannot contain spaces");
      }
      if (!/^[A-Za-z0-9._]{3,24}$/.test(raw)) {
        return toast.error("Display Name: 3–24 chars, letters/numbers/._ only");
      }
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", raw)
        .neq("id", user.id)
        .maybeSingle();
      if (taken) return toast.error("Display Name is already taken");
    }
    setSaving(true);
    const links = {
      ...((row.social_links ?? {}) as Record<string, string>),
      all_time_xi: JSON.stringify(xi),
    };
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: raw || null,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      favourite_club: row.favourite_club,
      bio: row.bio,
      social_links: links,
    });
    setSaving(false);
    if (error) {
      if (error.message.toLowerCase().includes("unique")) {
        return toast.error("Display Name is already taken");
      }
      return toast.error(error.message);
    }
    toast.success("Profile saved");
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
    await refreshProfile();
    qc.invalidateQueries({ queryKey: ["latest_members"] });
    qc.invalidateQueries({ queryKey: ["member_count"] });
    qc.invalidateQueries({ queryKey: ["member_profile"] });
  };

  if (loading || !user || !row) {
    return (
      <PageShell>
        <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand glow-brand">
            <UserCog className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold md:text-3xl">My profile</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {user.email}
              {isOwner && (
                <Badge className="bg-brand/25 text-brand-glow">Owner</Badge>
              )}
              {!isOwner && isAdmin && (
                <Badge className="bg-brand/25 text-brand-glow">Moderator</Badge>
              )}
            </div>
          </div>
          {isAdmin && (
            <Button asChild variant="outline" className="border-brand/40">
              <Link to="/dashboard">
                <Shield className="mr-2 h-4 w-4" /> Admin dashboard
              </Link>
            </Button>
          )}
        </div>

        <div className="glass space-y-8 rounded-2xl p-6">
          <div>
            <h2 className="text-lg font-bold">Profile settings</h2>
            <p className="text-sm text-muted-foreground">
              Your picture, name and club appear across NepARENA.
            </p>
            <div className="mt-5 grid gap-6 md:grid-cols-[220px_1fr]">
              <div>
                <div className="mb-1.5 text-sm font-medium">Profile picture</div>
                <ImageUpload
                  value={row.avatar_url}
                  onChange={(u) => setRow({ ...row, avatar_url: u })}
                  folder={`avatars/${row.id}`}
                  aspect="square"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    value={row.username ?? ""}
                    onChange={(e) =>
                      setRow({
                        ...row,
                        username: e.target.value.replace(/\s/g, ""),
                      })
                    }
                    placeholder="Like Instagram (no spaces)"
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Unique · no spaces · letters, numbers, . and _
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full name</label>
                  <Input
                    value={row.full_name ?? ""}
                    onChange={(e) =>
                      setRow({ ...row, full_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Favourite club</label>
                  <Input
                    value={row.favourite_club ?? ""}
                    onChange={(e) =>
                      setRow({ ...row, favourite_club: e.target.value })
                    }
                    placeholder="e.g. Barcelona"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bio</label>
                  <Textarea
                    rows={4}
                    value={row.bio ?? ""}
                    onChange={(e) => setRow({ ...row, bio: e.target.value })}
                    placeholder="Tell the community about yourself"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-6">
            <AllTimeXiView xi={xi} editable onChange={setXi} showDownload />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pick legends for your dream XI — eFootball-style cards. Download or Save.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              className={`bg-gradient-brand text-primary-foreground transition ${
                savedFlash ? "scale-105 ring-2 ring-emerald-400/60" : ""
              }`}
              style={
                savedFlash
                  ? { animation: "spin 0.55s ease-in-out" }
                  : undefined
              }
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedFlash ? (
                "Saved ✓"
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
