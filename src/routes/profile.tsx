import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Building2, Loader2, Shield, UserCog } from "lucide-react";

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

  // Guest view when not signed in — no hard redirect

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

  const { data: followingOrgs = [] } = useQuery({
    queryKey: ["my_following_orgs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: follows } = await supabase
        .from("organizer_followers")
        .select("organizer_id")
        .eq("user_id", user!.id);
      const ids = (follows ?? []).map(
        (f: { organizer_id: string }) => f.organizer_id,
      );
      if (!ids.length) return [];
      const { data: orgs } = await supabase
        .from("organizers")
        .select("id, name, slug, logo_url, is_verified")
        .in("id", ids)
        .eq("status", "active");
      return (orgs ?? []) as {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
        is_verified: boolean;
      }[];
    },
  });

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

  if (loading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-lg px-3 pb-28 pt-3">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#121214]/90 shadow-2xl ring-1 ring-white/5">
            <div className="relative h-32 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black sm:h-40">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>
            <div className="relative px-4 pb-8">
              <div className="-mt-12 h-24 w-24 rounded-full bg-neutral-800 ring-4 ring-[#121214]" />
              <h1 className="mt-3 text-xl font-bold text-white">Guest</h1>
              <p className="text-sm text-neutral-500">Sign in to unlock your profile</p>
              <div className="mt-4 flex flex-wrap gap-6 text-sm text-neutral-400">
                <span><strong className="text-white">0</strong> followers</span>
                <span><strong className="text-white">0</strong> following</span>
                <span><strong className="text-white">0</strong> posts</span>
              </div>
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-center text-sm text-neutral-400">
                  Create an account or sign in to post, follow organizers, and chat.
                </p>
                <Button asChild className="w-full max-w-xs rounded-full bg-sky-500 text-white hover:bg-sky-400">
                  <Link to="/auth">Sign In / Register</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!row) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
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
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/members/$id" params={{ id: user.id }}>
                Public profile
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="outline" className="border-brand/40">
                <Link to="/dashboard">
                  <Shield className="mr-2 h-4 w-4" /> Admin dashboard
                </Link>
              </Button>
            )}
          </div>
        </div>

        {followingOrgs.length > 0 && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
              <Building2 className="h-3.5 w-3.5" /> Following organizers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {followingOrgs.map((o) => (
                <Link
                  key={o.id}
                  to="/o/$slug"
                  params={{ slug: o.slug }}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-2.5 text-xs font-medium text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  {o.logo_url ? (
                    <img
                      src={o.logo_url}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-neutral-700 text-[9px] font-bold">
                      {o.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="truncate">{o.name}</span>
                  {o.is_verified && <span className="text-sky-400">✓</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

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
